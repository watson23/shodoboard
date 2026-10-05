/**
 * One coaching pass over a board: nudges + agenda in a single structured call.
 *
 * Shared by the /api/coach route and the eval runner so both exercise exactly
 * the same prompt, model and settings.
 */
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { getClient, cachedSystem, todayLine, COACH_MODEL, EFFORT, FALLBACKS, FALLBACK_BETAS } from "./ai";
import { getCoachSystemPrompt } from "./prompts";
import { serializeBoardHierarchical } from "./utils";
import { analyzeBoardSignals, formatSignalsForPrompt } from "./board-signals";
import { ALL_PLAYBOOKS_TEXT } from "./coaching-knowledge";
import { ADMIN_COACHING_INSTRUCTIONS } from "./coaching-instructions";
import type { BoardState, Nudge, FocusItem } from "@/types/board";

const TargetType = z.enum(["goal", "outcome", "item"]);
const Priority = z.enum(["high", "medium", "low"]);

export const CoachingSchema = z.object({
  boardStrengths: z.array(z.string()).describe("1-3 short sentences about what the PM is doing well"),
  nudges: z
    .array(
      z.object({
        targetType: TargetType,
        targetId: z.string().describe("Real entity ID from the board content"),
        tier: z.enum(["quiet", "visible"]),
        priority: Priority,
        antiPattern: z.string().describe('Playbook ID, "strength", or "other"'),
        message: z.string().describe("Headline observation, max 60 characters"),
        question: z.string().describe("One short coaching question, max 100 characters"),
        suggestedAction: z.string().describe("Gentle possibility, max 80 characters"),
      })
    )
    .describe("1-5 nudges attached to specific entities"),
  focusItems: z
    .array(
      z.object({
        priority: Priority,
        title: z.string(),
        whyItMatters: z.string(),
        antiPattern: z.string(),
        targetType: TargetType,
        targetId: z.string(),
        suggestedAction: z.string(),
      })
    )
    .describe("1-5 agenda items, most important first"),
});

export type CoachingOutput = z.infer<typeof CoachingSchema>;

export interface CoachingResult {
  nudges: Nudge[];
  focusItems: FocusItem[];
  boardStrengths: string[];
  usage: { input: number; output: number; cacheRead: number; cacheWrite: number };
  model: string;
}

/** The system prompt is built once per process; it must not vary per request. */
const SYSTEM = getCoachSystemPrompt(ALL_PLAYBOOKS_TEXT, ADMIN_COACHING_INSTRUCTIONS);

export function buildCoachUserMessage(boardState: BoardState): string {
  const signals = analyzeBoardSignals(boardState);
  return [
    todayLine(),
    "",
    "## STRUCTURAL FACTS (verified)",
    formatSignalsForPrompt(signals),
    "",
    "## BOARD CONTENT",
    serializeBoardHierarchical(boardState),
  ].join("\n");
}

export async function generateCoaching(boardState: BoardState): Promise<CoachingResult> {
  const client = getClient();
  const response = await client.beta.messages.parse({
    model: COACH_MODEL,
    max_tokens: 16000,
    output_config: { effort: EFFORT.coach, format: betaZodOutputFormat(CoachingSchema) },
    betas: [...FALLBACK_BETAS],
    fallbacks: FALLBACKS,
    system: cachedSystem(SYSTEM),
    messages: [{ role: "user", content: buildCoachUserMessage(boardState) }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`Coaching request was declined (${response.stop_details?.category ?? "unknown"})`);
  }
  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("Coaching response could not be parsed");
  }

  // Only keep references to entities that actually exist on the board.
  const ids = new Set<string>([
    ...boardState.goals.map((g) => g.id),
    ...boardState.outcomes.map((o) => o.id),
    ...boardState.items.map((i) => i.id),
  ]);
  const stamp = Date.now();

  const nudges: Nudge[] = parsed.nudges
    .filter((n) => ids.has(n.targetId))
    .map((n, i) => ({ id: `nudge-${stamp}-${i}`, status: "active", ...n }));

  const focusItems: FocusItem[] = parsed.focusItems
    .filter((f) => ids.has(f.targetId))
    .map((f, i) => ({ id: `focus-${stamp}-${i}`, status: "pending", ...f }));

  const u = response.usage;
  return {
    nudges,
    focusItems,
    boardStrengths: parsed.boardStrengths,
    usage: {
      input: u.input_tokens,
      output: u.output_tokens,
      cacheRead: u.cache_read_input_tokens ?? 0,
      cacheWrite: u.cache_creation_input_tokens ?? 0,
    },
    model: response.model,
  };
}
