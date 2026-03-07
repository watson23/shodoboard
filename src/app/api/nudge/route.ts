export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";
import { getNudgeSystemPrompt } from "@/lib/prompts";
import { serializeBoardHierarchical, extractTextFromResponse, extractJsonBlock } from "@/lib/utils";
import { analyzeBoardSignals, formatSignalsForPrompt } from "@/lib/board-signals";
import { getPlaybooksForSignals, formatPlaybooksForPrompt } from "@/lib/coaching-knowledge";
import { ADMIN_COACHING_INSTRUCTIONS } from "@/lib/coaching-instructions";
import { NextRequest, NextResponse } from "next/server";
import type { BoardState } from "@/types/board";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { boardState } = (await req.json()) as { boardState: BoardState };

  // Layer 1: Pre-compute structural signals
  const signals = analyzeBoardSignals(boardState);
  const structuralFacts = formatSignalsForPrompt(signals);

  // Get relevant playbooks for detected signals + always include content-quality playbooks
  const structuralPatternIds = signals.map((s) => s.antiPattern);
  const contentPlaybookIds = [
    "output-not-outcome", "weak-measure", "measure-mismatch",
    "assumption-risk", "goal-framing", "solution-as-problem",
    "missing-who", "vague-goal", "duplicate-intent",
    "timeframe-mismatch", "discovery-quality", "goal-outcome-alignment",
  ];
  const allPlaybookIds = [...structuralPatternIds, ...contentPlaybookIds];
  const playbooks = getPlaybooksForSignals(allPlaybookIds);
  const playbookText = formatPlaybooksForPrompt(playbooks);

  const boardDescription = serializeBoardHierarchical(boardState);

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: getNudgeSystemPrompt(structuralFacts, playbookText, ADMIN_COACHING_INSTRUCTIONS),
      messages: [
        {
          role: "user",
          content: `Here is the full board content for your analysis:\n\n${boardDescription}`,
        },
      ],
    });

    const text = extractTextFromResponse(response);
    const result = extractJsonBlock(text);

    if (!result) {
      console.error("Nudge API: failed to parse AI response", text.slice(0, 200));
      return NextResponse.json({ nudges: [], parseError: true });
    }

    const parsed = result.parsed as Array<{
      targetType: string;
      targetId: string;
      tier: string;
      priority: string;
      antiPattern: string;
      message: string;
      question: string;
      suggestedAction: string;
    }>;

    const nudges = parsed.map((n, i) => ({
      id: `nudge-${Date.now()}-${i}`,
      targetType: n.targetType,
      targetId: n.targetId,
      tier: n.tier,
      priority: n.priority,
      antiPattern: n.antiPattern,
      message: n.message,
      question: n.question,
      suggestedAction: n.suggestedAction,
      status: "active",
    }));

    return NextResponse.json({ nudges });
  } catch (error) {
    console.error("Nudge API error:", error);
    return NextResponse.json({ nudges: [] }, { status: 500 });
  }
}
