"use client";

import {
  createContext,
  useContext,
  useReducer,
  createElement,
  type ReactNode,
} from "react";
import { SEED_DATA } from "@/data/seed";
import type {
  BoardState,
  Column,
  WorkItem,
  Outcome,
  BusinessGoal,
  Nudge,
  FocusItem,
  ChecklistItem,
} from "@/types/board";

export type BoardAction =
  | { type: "SET_PRODUCT_NAME"; name: string }
  | { type: "MOVE_ITEM"; itemId: string; toColumn: Column; toIndex: number; toOutcomeId?: string | null }
  | { type: "TOGGLE_GOAL_COLLAPSE"; goalId: string }
  | { type: "TOGGLE_OUTCOME_COLLAPSE"; outcomeId: string }
  | { type: "DISMISS_NUDGE"; nudgeId: string }
  | { type: "SNOOZE_NUDGE"; nudgeId: string }
  | { type: "TOGGLE_DISCOVERY_PROMPT"; promptId: string }
  | { type: "UPDATE_ITEM"; itemId: string; updates: Partial<WorkItem> }
  | { type: "UPDATE_OUTCOME"; outcomeId: string; updates: Partial<Outcome> }
  | { type: "UPDATE_GOAL"; goalId: string; updates: Partial<BusinessGoal> }
  | { type: "RESET_BOARD" }
  | { type: "SET_STATE"; state: BoardState }
  | { type: "SET_NUDGES"; nudges: Nudge[] }
  | { type: "ADD_NUDGE"; nudge: Nudge }
  | { type: "SET_FOCUS_ITEMS"; focusItems: FocusItem[] }
  | { type: "UPDATE_FOCUS_ITEM"; focusItemId: string; updates: Partial<FocusItem> }
  | { type: "ADD_GOAL"; goal: BusinessGoal }
  | { type: "ADD_OUTCOME"; outcome: Outcome }
  | { type: "ADD_ITEM"; item: WorkItem }
  | { type: "ADD_CHECKLIST_ITEM"; itemId: string; checklistItem: ChecklistItem }
  | { type: "UPDATE_CHECKLIST_ITEM"; itemId: string; checklistItemId: string; updates: Partial<ChecklistItem> }
  | { type: "REMOVE_CHECKLIST_ITEM"; itemId: string; checklistItemId: string }
  | { type: "DELETE_ITEM"; itemId: string }
  | { type: "DELETE_OUTCOME"; outcomeId: string; deleteChildren?: boolean }
  | { type: "DELETE_GOAL"; goalId: string; deleteChildren?: boolean }
  | { type: "REORDER_GOAL"; goalId: string; direction: "up" | "down" }
  | { type: "REORDER_OUTCOME"; outcomeId: string; direction: "up" | "down" };

function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "SET_PRODUCT_NAME":
      return { ...state, productName: action.name };
    case "MOVE_ITEM": {
      const items = state.items.map((item) =>
        item.id === action.itemId
          ? {
              ...item,
              column: action.toColumn,
              order: action.toIndex,
              ...(action.toOutcomeId !== undefined ? { outcomeId: action.toOutcomeId } : {}),
            }
          : item
      );
      return { ...state, items };
    }

    case "TOGGLE_GOAL_COLLAPSE": {
      const goals = state.goals.map((g) =>
        g.id === action.goalId ? { ...g, collapsed: !g.collapsed } : g
      );
      return { ...state, goals };
    }

    case "TOGGLE_OUTCOME_COLLAPSE": {
      const outcomes = state.outcomes.map((o) =>
        o.id === action.outcomeId ? { ...o, collapsed: !o.collapsed } : o
      );
      return { ...state, outcomes };
    }

    case "DISMISS_NUDGE": {
      const nudges = state.nudges.map((n) =>
        n.id === action.nudgeId ? { ...n, status: "dismissed" as const } : n
      );
      return { ...state, nudges };
    }

    case "SNOOZE_NUDGE": {
      const nudges = state.nudges.map((n) =>
        n.id === action.nudgeId ? { ...n, status: "snoozed" as const } : n
      );
      return { ...state, nudges };
    }

    case "TOGGLE_DISCOVERY_PROMPT": {
      const discoveryPrompts = state.discoveryPrompts.map((dp) =>
        dp.id === action.promptId ? { ...dp, checked: !dp.checked } : dp
      );
      return { ...state, discoveryPrompts };
    }

    case "UPDATE_ITEM": {
      const items = state.items.map((item) =>
        item.id === action.itemId ? { ...item, ...action.updates } : item
      );
      return { ...state, items };
    }

    case "UPDATE_OUTCOME": {
      const outcomes = state.outcomes.map((o) =>
        o.id === action.outcomeId ? { ...o, ...action.updates } : o
      );
      return { ...state, outcomes };
    }

    case "UPDATE_GOAL": {
      const goals = state.goals.map((g) =>
        g.id === action.goalId ? { ...g, ...action.updates } : g
      );
      return { ...state, goals };
    }

    case "RESET_BOARD":
      return SEED_DATA;

    case "SET_STATE":
      return action.state;

    case "SET_NUDGES":
      return { ...state, nudges: action.nudges };

    case "ADD_NUDGE":
      return { ...state, nudges: [...state.nudges, action.nudge] };

    case "SET_FOCUS_ITEMS":
      return { ...state, focusItems: action.focusItems };

    case "UPDATE_FOCUS_ITEM": {
      const focusItems = state.focusItems.map((fi) =>
        fi.id === action.focusItemId ? { ...fi, ...action.updates } : fi
      );
      return { ...state, focusItems };
    }

    case "ADD_GOAL":
      return { ...state, goals: [...state.goals, action.goal] };

    case "ADD_OUTCOME":
      return { ...state, outcomes: [...state.outcomes, action.outcome] };

    case "ADD_ITEM":
      return { ...state, items: [...state.items, action.item] };

    case "ADD_CHECKLIST_ITEM": {
      const items = state.items.map((item) =>
        item.id === action.itemId
          ? { ...item, checklist: [...(item.checklist || []), action.checklistItem] }
          : item
      );
      return { ...state, items };
    }

    case "UPDATE_CHECKLIST_ITEM": {
      const items = state.items.map((item) =>
        item.id === action.itemId
          ? {
              ...item,
              checklist: (item.checklist || []).map((ci) =>
                ci.id === action.checklistItemId ? { ...ci, ...action.updates } : ci
              ),
            }
          : item
      );
      return { ...state, items };
    }

    case "REMOVE_CHECKLIST_ITEM": {
      const items = state.items.map((item) =>
        item.id === action.itemId
          ? { ...item, checklist: (item.checklist || []).filter((ci) => ci.id !== action.checklistItemId) }
          : item
      );
      return { ...state, items };
    }

    case "DELETE_ITEM":
      return { ...state, items: state.items.filter((i) => i.id !== action.itemId) };

    case "DELETE_OUTCOME":
      return {
        ...state,
        outcomes: state.outcomes.filter((o) => o.id !== action.outcomeId),
        items: action.deleteChildren
          ? state.items.filter((i) => i.outcomeId !== action.outcomeId)
          : state.items.map((i) =>
              i.outcomeId === action.outcomeId ? { ...i, outcomeId: null } : i
            ),
      };

    case "DELETE_GOAL": {
      const childOutcomeIds = new Set(
        state.outcomes.filter((o) => o.goalId === action.goalId).map((o) => o.id)
      );
      return {
        ...state,
        goals: state.goals.filter((g) => g.id !== action.goalId),
        outcomes: action.deleteChildren
          ? state.outcomes.filter((o) => o.goalId !== action.goalId)
          : state.outcomes.map((o) =>
              o.goalId === action.goalId ? { ...o, goalId: null } : o
            ),
        items: action.deleteChildren
          ? state.items.filter((i) => !childOutcomeIds.has(i.outcomeId ?? ""))
          : state.items,
      };
    }

    case "REORDER_GOAL": {
      const sorted = [...state.goals].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((g) => g.id === action.goalId);
      if (idx < 0) return state;
      const swapIdx = action.direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return state;
      const goals = state.goals.map((g) => {
        if (g.id === sorted[idx].id) return { ...g, order: sorted[swapIdx].order };
        if (g.id === sorted[swapIdx].id) return { ...g, order: sorted[idx].order };
        return g;
      });
      return { ...state, goals };
    }

    case "REORDER_OUTCOME": {
      const outcome = state.outcomes.find((o) => o.id === action.outcomeId);
      if (!outcome) return state;
      const siblings = [...state.outcomes]
        .filter((o) => o.goalId === outcome.goalId)
        .sort((a, b) => a.order - b.order);
      const idx = siblings.findIndex((o) => o.id === action.outcomeId);
      const swapIdx = action.direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= siblings.length) return state;
      const outcomes = state.outcomes.map((o) => {
        if (o.id === siblings[idx].id) return { ...o, order: siblings[swapIdx].order };
        if (o.id === siblings[swapIdx].id) return { ...o, order: siblings[idx].order };
        return o;
      });
      return { ...state, outcomes };
    }

    default:
      return state;
  }
}

interface BoardContextValue {
  state: BoardState;
  dispatch: React.Dispatch<BoardAction>;
}

const BoardCtx = createContext<BoardContextValue>({
  state: SEED_DATA,
  dispatch: () => {},
});

export function BoardProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: BoardState;
}) {
  const [state, dispatch] = useReducer(boardReducer, initialState ?? SEED_DATA);

  return createElement(
    BoardCtx.Provider,
    { value: { state, dispatch } },
    children
  );
}

export function useBoard() {
  return useContext(BoardCtx);
}
