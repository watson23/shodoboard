/**
 * Shared Anthropic client configuration for all coaching routes.
 *
 * Model choice, effort, caching and refusal fallbacks are decided here so
 * individual routes stay small and the settings can be tuned in one place.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageParam, BetaTextBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";

/** Opus 5.5: the coaching model. Quality matters more than per-token price here. */
export const COACH_MODEL = "claude-opus-5-5";

/** Sonnet 5.5: short, cheap generations (discovery questions). */
export const FAST_MODEL = "claude-sonnet-5-5";

/**
 * Effort per route. Opus 5.5 thinks adaptively and effort is the only dial;
 * "low" already matches the previous generation at high effort and keeps
 * chat replies snappy. Raise a route here if an eval shows headroom.
 */
export const EFFORT = {
  intake: "medium",
  spar: "low",
  boardSpar: "low",
  coach: "low",
  discovery: "low",
  portfolio: "medium",
} as const;

/**
 * Server-side refusal fallback. If a safety classifier declines a benign
 * coaching request, the API re-runs it on Anthropic's recommended substitute
 * instead of returning an empty response. Opt-in, per route.
 */
export const FALLBACK_BETAS = ["server-side-fallback-2026-07-01"] as const;
export const FALLBACKS = "default" as const;

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let cached: Anthropic | null = null;
export function getClient(): Anthropic {
  if (!cached) {
    cached = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cached;
}

/**
 * A system prompt as a single cached block. The text must be byte-identical
 * across requests for the cache to hit, so keep anything volatile (dates,
 * board content, structural facts) out of it and put it in `messages`.
 */
export function cachedSystem(text: string): BetaTextBlockParam[] {
  return [{ type: "text", text, cache_control: { type: "ephemeral" } }];
}

/** Today's date in ISO form, for the user turn (never the system prompt). */
export function todayLine(): string {
  return `Today's date: ${new Date().toISOString().split("T")[0]}`;
}

/** Convert the client-side chat history into API messages. */
export interface ChatTurn {
  role: "ai" | "user";
  text: string;
  /** Board changes the coach proposed in this turn (assistant turns only). */
  suggestions?: BoardChangeSuggestion[];
  /** Whether the PM applied the proposed changes (set on the following user turn). */
  appliedSuggestions?: boolean;
}

export interface BoardChangeSuggestion {
  action: "update_goal" | "update_outcome" | "update_item" | "add_item" | "split_item";
  targetId?: string;
  changes: Record<string, unknown>;
  /** One-line rationale shown next to the Apply button. */
  summary?: string;
}

/**
 * Rebuild the conversation for the API from client-held turns. Tool calls
 * from earlier turns are represented as text so the model remembers what it
 * proposed without us having to replay tool_use/tool_result blocks.
 */
export function historyToMessages(turns: ChatTurn[]): BetaMessageParam[] {
  const out: BetaMessageParam[] = [];
  for (const turn of turns) {
    if (turn.role === "ai") {
      let text = turn.text;
      if (turn.suggestions && turn.suggestions.length > 0) {
        text += `\n\n[I proposed these board changes: ${JSON.stringify(turn.suggestions)}]`;
      }
      out.push({ role: "assistant", content: text });
    } else {
      let text = turn.text;
      if (turn.appliedSuggestions === true) {
        text = `[The PM applied your proposed board change.]\n\n${text}`;
      } else if (turn.appliedSuggestions === false) {
        text = `[The PM did not apply your proposed board change.]\n\n${text}`;
      }
      out.push({ role: "user", content: text });
    }
  }
  return out;
}

/**
 * Server-sent events helper. Each event is one JSON object per `data:` line.
 * Used by the conversational routes so the browser can render text as it
 * is generated instead of waiting for the whole reply.
 */
export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "done"; text: string; [key: string]: unknown }
  | { type: "error"; message: string };

export function sseResponse(
  producer: (emit: (event: StreamEvent) => void) => Promise<void>
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        await producer(emit);
      } catch (err) {
        console.error("Stream producer failed:", err);
        emit({ type: "error", message: "The coach could not respond. Please try again." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
