import type Anthropic from "@anthropic-ai/sdk";
import type { BoardState } from "@/types/board";

/**
 * Generate a unique ID with a prefix.
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Escape HTML special characters to prevent XSS.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Serialize board state for AI consumption (strips UI-only fields).
 */
export function serializeBoardForAI(boardState: BoardState): string {
  return JSON.stringify(
    {
      goals: boardState.goals.map((g) => ({
        id: g.id,
        statement: g.statement,
        timeframe: g.timeframe,
        metrics: g.metrics,
      })),
      outcomes: boardState.outcomes.map((o) => ({
        id: o.id,
        goalId: o.goalId,
        statement: o.statement,
        behaviorChange: o.behaviorChange,
        measureOfSuccess: o.measureOfSuccess,
      })),
      items: boardState.items.map((i) => ({
        id: i.id,
        outcomeId: i.outcomeId,
        title: i.title,
        description: i.description,
        type: i.type,
        column: i.column,
      })),
    },
    null,
    2
  );
}

/**
 * Extract plain text from an Anthropic API response.
 */
export function extractTextFromResponse(response: Anthropic.Message): string {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

/**
 * Extract a JSON block from markdown-formatted text.
 * Returns the parsed object and the text with the JSON block removed, or null if no valid JSON block found.
 */
export function extractJsonBlock(text: string): { parsed: unknown; displayText: string } | null {
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    const displayText = text.replace(/```json\n[\s\S]*?\n```/, "").trim();
    return { parsed, displayText };
  } catch {
    return null;
  }
}
