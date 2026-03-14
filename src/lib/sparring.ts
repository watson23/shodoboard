import { createItem } from "./entities";
import type { WorkItem, Nudge, Outcome, BusinessGoal } from "@/types/board";
import type { BoardAction } from "@/hooks/useBoard";

interface SparringSuggestion {
  action: string;
  targetId?: string;
  changes: Record<string, unknown>;
}

export function handleSparringApply(
  suggestion: SparringSuggestion,
  nudge: Nudge,
  items: WorkItem[],
  dispatch: React.Dispatch<BoardAction>,
): void {
  if (suggestion.action === "update_outcome" && suggestion.targetId) {
    dispatch({ type: "UPDATE_OUTCOME", outcomeId: suggestion.targetId, updates: suggestion.changes as Partial<Outcome> });
  } else if (suggestion.action === "update_item" && suggestion.targetId) {
    dispatch({ type: "UPDATE_ITEM", itemId: suggestion.targetId, updates: suggestion.changes as Partial<WorkItem> });
  } else if (suggestion.action === "update_goal" && suggestion.targetId) {
    dispatch({ type: "UPDATE_GOAL", goalId: suggestion.targetId, updates: suggestion.changes as Partial<BusinessGoal> });
  } else if (suggestion.action === "add_item") {
    let outcomeId = suggestion.targetId || null;
    if (!outcomeId && nudge.targetType === "outcome") {
      outcomeId = nudge.targetId;
    } else if (!outcomeId && nudge.targetType === "item") {
      const sourceItem = items.find(i => i.id === nudge.targetId);
      outcomeId = sourceItem?.outcomeId || null;
    }
    const changes = suggestion.changes;
    const newItem = createItem(outcomeId, {
      title: (changes.title as string) || "New work",
      description: (changes.description as string) || "",
      type: (changes.type as "discovery" | "delivery") || "discovery",
      order: items.filter(i => i.outcomeId === outcomeId).length,
    });
    dispatch({ type: "ADD_ITEM", item: newItem });
  } else if (suggestion.action === "split_item" && suggestion.targetId) {
    const sourceItem = items.find(i => i.id === suggestion.targetId);
    if (sourceItem) {
      const changes = suggestion.changes;
      const newItem = createItem(sourceItem.outcomeId, {
        title: (changes.title as string) || "Split: " + sourceItem.title,
        description: (changes.description as string) || "",
        type: (changes.type as "discovery" | "delivery") || "discovery",
        order: items.filter(i => i.outcomeId === sourceItem.outcomeId).length,
      });
      dispatch({ type: "ADD_ITEM", item: newItem });
    }
  }
}
