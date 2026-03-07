import type Anthropic from "@anthropic-ai/sdk";
import type { BoardState } from "@/types/board";

/**
 * Generate a unique ID with a prefix.
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Get or create a persistent anonymous user ID stored in localStorage.
 * Used to track distinct users per board without requiring authentication.
 */
export function getAnonymousUserId(): string {
  const STORAGE_KEY = "shodo-anon-uid";
  if (typeof window === "undefined") return "server";
  try {
    let uid = localStorage.getItem(STORAGE_KEY);
    if (!uid) {
      uid = `u-${crypto.randomUUID()}`;
      localStorage.setItem(STORAGE_KEY, uid);
    }
    return uid;
  } catch {
    // Fallback if localStorage is unavailable (e.g. private browsing)
    return `u-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
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
 * Serialize board state as hierarchical text for AI coaching prompts.
 * Shows Goal → Outcome → Item tree with indentation.
 */
export function serializeBoardHierarchical(state: BoardState): string {
  const { goals, outcomes, items } = state;
  const lines: string[] = [];

  lines.push(`Product: ${state.productName || "Unknown"}`);
  lines.push(`${goals.length} goals, ${outcomes.length} outcomes, ${items.length} work items`);
  lines.push("");

  for (const goal of goals) {
    lines.push(`GOAL [${goal.id}]: ${goal.statement}`);
    if (goal.timeframe) lines.push(`  Timeframe: ${goal.timeframe}`);
    if (goal.metrics && goal.metrics.length > 0) {
      lines.push(`  Metrics: ${goal.metrics.join(", ")}`);
    }

    const goalOutcomes = outcomes.filter((o) => o.goalId === goal.id);
    for (const outcome of goalOutcomes) {
      lines.push(`  OUTCOME [${outcome.id}]: ${outcome.statement}`);
      if (outcome.behaviorChange) lines.push(`    Behavior change: ${outcome.behaviorChange}`);
      if (outcome.measureOfSuccess) lines.push(`    Measure: ${outcome.measureOfSuccess}`);

      const outcomeItems = items.filter((i) => i.outcomeId === outcome.id);
      for (const item of outcomeItems) {
        lines.push(`    ITEM [${item.id}] (${item.type}, ${item.column}): ${item.title}`);
        if (item.description) lines.push(`      Description: ${item.description}`);
      }
    }
    lines.push("");
  }

  // Unlinked outcomes (with their items)
  const unlinkedOutcomes = outcomes.filter((o) => !o.goalId);
  if (unlinkedOutcomes.length > 0) {
    lines.push("UNLINKED OUTCOMES:");
    for (const outcome of unlinkedOutcomes) {
      lines.push(`  OUTCOME [${outcome.id}]: ${outcome.statement}`);
      if (outcome.behaviorChange) lines.push(`    Behavior change: ${outcome.behaviorChange}`);
      if (outcome.measureOfSuccess) lines.push(`    Measure: ${outcome.measureOfSuccess}`);
      const outcomeItems = items.filter((i) => i.outcomeId === outcome.id);
      for (const item of outcomeItems) {
        lines.push(`    ITEM [${item.id}] (${item.type}, ${item.column}): ${item.title}`);
        if (item.description) lines.push(`      Description: ${item.description}`);
      }
    }
    lines.push("");
  }

  // Unlinked items
  const unlinkedItems = items.filter((i) => !i.outcomeId);
  if (unlinkedItems.length > 0) {
    lines.push("UNLINKED ITEMS:");
    for (const item of unlinkedItems) {
      lines.push(`  ITEM [${item.id}] (${item.type}, ${item.column}): ${item.title}`);
      if (item.description) lines.push(`    Description: ${item.description}`);
    }
  }

  return lines.join("\n");
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
  // Try markdown-fenced JSON first (```json ... ```)
  const fencedMatch = text.match(/```(?:json|JSON)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fencedMatch) {
    try {
      const parsed = JSON.parse(fencedMatch[1].trim());
      const displayText = text.replace(/```(?:json|JSON)?\s*\n?[\s\S]*?\n?\s*```/, "").trim();
      return { parsed, displayText };
    } catch { /* fall through to raw JSON attempt */ }
  }

  // Fallback: try to find raw JSON (array or object) in the text
  const rawMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (rawMatch) {
    try {
      const parsed = JSON.parse(rawMatch[1].trim());
      const displayText = text.replace(rawMatch[0], "").trim();
      return { parsed, displayText };
    } catch { /* give up */ }
  }

  return null;
}
