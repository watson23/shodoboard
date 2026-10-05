export const maxDuration = 60;

import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { NextRequest, NextResponse } from "next/server";
import { getClient, hasApiKey, cachedSystem, todayLine, COACH_MODEL, EFFORT, FALLBACKS, FALLBACK_BETAS } from "@/lib/ai";
import { getPortfolioSystemPrompt } from "@/lib/prompts";
import { serializeBoardHierarchical } from "@/lib/utils";
import { ADMIN_COACHING_INSTRUCTIONS } from "@/lib/coaching-instructions";
import type { BoardState } from "@/types/board";

const SYSTEM = getPortfolioSystemPrompt(ADMIN_COACHING_INSTRUCTIONS);

const PortfolioSchema = z.object({
  summary: z.string().describe("2-4 sentences about the portfolio as a whole"),
  themes: z
    .array(
      z.object({
        title: z.string(),
        kind: z.enum([
          "duplicated-intent",
          "orphan-goal",
          "vocabulary-mismatch",
          "conflicting-bets",
          "shared-dependency",
          "portfolio-balance",
          "other",
        ]),
        boardIds: z.array(z.string()).describe("Board IDs this theme concerns"),
        whyItMatters: z.string().describe("1-3 sentences"),
        suggestedAction: z.string().describe("One concrete next step"),
      })
    )
    .describe("2-6 cross-board observations, most important first"),
  vocabulary: z
    .array(
      z.object({
        term: z.string(),
        usages: z.array(
          z.object({
            boardId: z.string(),
            meaning: z.string().describe("How this board seems to use the term"),
          })
        ),
      })
    )
    .describe("Terms used on more than one board with visibly different meanings"),
});

export type PortfolioOutput = z.infer<typeof PortfolioSchema>;

interface PortfolioBoard {
  boardId: string;
  boardState: BoardState;
}

/**
 * Cross-board coaching. The whole portfolio fits in one context window, so
 * one call can see what no single board's coach can: duplicated bets, goals
 * nothing feeds, and the same words meaning different things on different boards.
 */
export async function POST(req: NextRequest) {
  if (!hasApiKey()) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const { boards } = (await req.json()) as { boards: PortfolioBoard[] };
  if (!Array.isArray(boards) || boards.length < 2) {
    return NextResponse.json({ error: "Portfolio coaching needs at least two boards" }, { status: 400 });
  }

  const boardsText = boards
    .map(
      (b) =>
        `=== BOARD ${b.boardId} — ${b.boardState.productName ?? "Untitled"} ===\n${serializeBoardHierarchical(b.boardState)}`
    )
    .join("\n\n");

  try {
    const response = await getClient().beta.messages.parse({
      model: COACH_MODEL,
      max_tokens: 16000,
      output_config: { effort: EFFORT.portfolio, format: betaZodOutputFormat(PortfolioSchema) },
      betas: [...FALLBACK_BETAS],
      fallbacks: FALLBACKS,
      system: cachedSystem(SYSTEM),
      messages: [
        {
          role: "user",
          content: `${todayLine()}\n\nHere are ${boards.length} boards from one portfolio.\n\n${boardsText}`,
        },
      ],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return NextResponse.json({ error: "Portfolio coaching could not be produced" }, { status: 500 });
    }

    const u = response.usage;
    console.log(
      `[portfolio] ${response.model} boards=${boards.length} in=${u.input_tokens} cacheRead=${u.cache_read_input_tokens ?? 0} cacheWrite=${u.cache_creation_input_tokens ?? 0} out=${u.output_tokens}`
    );

    return NextResponse.json(response.parsed_output);
  } catch (error) {
    console.error("Portfolio API error:", error);
    return NextResponse.json({ error: "Failed to coach the portfolio" }, { status: 500 });
  }
}
