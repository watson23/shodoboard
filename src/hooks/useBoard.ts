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
} from "@/types/board";

export type BoardAction =
  | { type: "MOVE_ITEM"; itemId: string; toColumn: Column; toIndex: number }
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
  | { type: "SET_NUDGES"; nudges: Nudge[] };

function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "MOVE_ITEM": {
      const items = state.items.map((item) =>
        item.id === action.itemId
          ? { ...item, column: action.toColumn, order: action.toIndex }
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
