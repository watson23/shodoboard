import type { BoardState } from "@/types/board";

/**
 * A stable fingerprint of the coaching-relevant board content.
 *
 * Nudges and the coaching agenda are derived from goals, outcomes and work
 * items. If none of those changed since the last coaching run, re-running
 * the coach would produce the same advice at full cost. The board stores the
 * hash it was last coached against so opening a board is free until something
 * on it actually changes.
 */
export function coachingHash(state: BoardState): string {
  const canonical = JSON.stringify({
    productName: state.productName ?? "",
    goals: [...state.goals]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((g) => [g.id, g.statement, g.timeframe ?? "", [...g.metrics]]),
    outcomes: [...state.outcomes]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((o) => [o.id, o.goalId, o.statement, o.behaviorChange, o.measureOfSuccess]),
    items: [...state.items]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((i) => [i.id, i.outcomeId, i.title, i.description, i.type, i.column]),
  });
  return fnv1a(canonical);
}

/** 32-bit FNV-1a, rendered as 8 hex chars. Good enough for change detection. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
