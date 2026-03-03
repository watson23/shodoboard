"use client";

import { useRef, useEffect, useCallback } from "react";
import { generateId } from "@/lib/utils";
import { flushActivityEvents } from "@/lib/firestore";
import type { ActivityEvent, SessionSummary } from "@/types/activity";
import type { BoardAction } from "@/hooks/useBoard";
import type { BoardState } from "@/types/board";

const FLUSH_INTERVAL_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 60000;

function getSessionId(boardId: string): string {
  const key = `activity-session-${boardId}`;
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = generateId("ses");
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

/**
 * Infer targetType and targetId from a BoardAction.
 */
function extractTarget(action: BoardAction): {
  targetType?: ActivityEvent["targetType"];
  targetId?: string;
} {
  switch (action.type) {
    case "ADD_GOAL":
    case "UPDATE_GOAL":
    case "TOGGLE_GOAL_COLLAPSE":
      return {
        targetType: "goal",
        targetId: "goalId" in action ? action.goalId : "goal" in action ? action.goal.id : undefined,
      };
    case "ADD_OUTCOME":
    case "UPDATE_OUTCOME":
    case "TOGGLE_OUTCOME_COLLAPSE":
      return {
        targetType: "outcome",
        targetId: "outcomeId" in action ? action.outcomeId : "outcome" in action ? action.outcome.id : undefined,
      };
    case "ADD_ITEM":
    case "UPDATE_ITEM":
    case "MOVE_ITEM":
      return {
        targetType: "item",
        targetId: "itemId" in action ? action.itemId : "item" in action ? action.item.id : undefined,
      };
    case "DISMISS_NUDGE":
    case "SNOOZE_NUDGE":
    case "ADD_NUDGE":
      return {
        targetType: "nudge",
        targetId: "nudgeId" in action ? action.nudgeId : "nudge" in action ? action.nudge.id : undefined,
      };
    case "UPDATE_FOCUS_ITEM":
      return { targetType: "focusItem", targetId: action.focusItemId };
    case "ADD_CHECKLIST_ITEM":
    case "UPDATE_CHECKLIST_ITEM":
    case "REMOVE_CHECKLIST_ITEM":
      return { targetType: "checklist", targetId: action.itemId };
    default:
      return {};
  }
}

/**
 * Extract action-specific details for richer logging.
 */
function extractDetails(
  action: BoardAction,
  state: BoardState
): Record<string, unknown> | undefined {
  switch (action.type) {
    case "MOVE_ITEM": {
      const item = state.items.find((i) => i.id === action.itemId);
      return {
        fromColumn: item?.column,
        toColumn: action.toColumn,
        toIndex: action.toIndex,
      };
    }
    case "UPDATE_ITEM":
      return { fields: Object.keys(action.updates) };
    case "UPDATE_OUTCOME":
      return { fields: Object.keys(action.updates) };
    case "UPDATE_GOAL":
      return { fields: Object.keys(action.updates) };
    case "UPDATE_FOCUS_ITEM":
      return { fields: Object.keys(action.updates) };
    case "ADD_CHECKLIST_ITEM":
      return { checklistItemType: action.checklistItem.type };
    case "UPDATE_CHECKLIST_ITEM":
      return {
        checklistItemId: action.checklistItemId,
        fields: Object.keys(action.updates),
      };
    case "REMOVE_CHECKLIST_ITEM":
      return { checklistItemId: action.checklistItemId };
    default:
      return undefined;
  }
}

// Actions that are bulk-set operations (not user-initiated) — skip logging these
const SKIP_ACTIONS = new Set([
  "SET_STATE",
  "RESET_BOARD",
  "SET_NUDGES",
  "SET_FOCUS_ITEMS",
]);

export function useActivityLog(boardId: string | undefined) {
  const bufferRef = useRef<ActivityEvent[]>([]);
  const sessionRef = useRef<SessionSummary | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<string>("");

  const sessionId = boardId ? getSessionId(boardId) : "";

  // Create an event and push to buffer
  const pushEvent = useCallback(
    (
      category: ActivityEvent["category"],
      action: string,
      opts?: {
        targetType?: ActivityEvent["targetType"];
        targetId?: string;
        details?: Record<string, unknown>;
        durationMs?: number;
      }
    ) => {
      if (!boardId) return;
      const event: ActivityEvent = {
        id: generateId("evt"),
        boardId,
        sessionId,
        timestamp: new Date().toISOString(),
        category,
        action,
        ...opts,
      };
      bufferRef.current.push(event);
    },
    [boardId, sessionId]
  );

  // Flush buffer to Firestore
  const flush = useCallback(async () => {
    if (!boardId || bufferRef.current.length === 0) return;
    const events = [...bufferRef.current];
    bufferRef.current = [];
    try {
      await flushActivityEvents(boardId, events, sessionRef.current ?? undefined);
    } catch (err) {
      // Re-add events to buffer on failure
      console.error("Activity log flush failed:", err);
      bufferRef.current = [...events, ...bufferRef.current];
    }
  }, [boardId]);

  // logEvent: for manual UI interaction logging
  const logEvent = useCallback(
    (
      action: string,
      opts?: {
        targetType?: ActivityEvent["targetType"];
        targetId?: string;
        details?: Record<string, unknown>;
        durationMs?: number;
      }
    ) => {
      pushEvent("ui_interaction", action, opts);
    },
    [pushEvent]
  );

  // wrapDispatch: creates a logging dispatch wrapper
  const wrapDispatch = useCallback(
    (
      originalDispatch: React.Dispatch<BoardAction>,
      getState: () => BoardState
    ): React.Dispatch<BoardAction> => {
      return (action: BoardAction) => {
        // Log before dispatching (so we can capture "before" state)
        if (!SKIP_ACTIONS.has(action.type)) {
          const { targetType, targetId } = extractTarget(action);
          const details = extractDetails(action, getState());
          pushEvent("state_change", action.type, {
            targetType,
            targetId,
            details,
          });
        }
        originalDispatch(action);
      };
    },
    [pushEvent]
  );

  // Session start + timers
  useEffect(() => {
    if (!boardId) return;

    startTimeRef.current = new Date().toISOString();

    sessionRef.current = {
      sessionId,
      boardId,
      startedAt: startTimeRef.current,
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };

    // Log session start
    pushEvent("session", "session_start", {
      details: {
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      },
    });

    // Periodic flush
    flushTimerRef.current = setInterval(flush, FLUSH_INTERVAL_MS);

    // Heartbeat
    heartbeatTimerRef.current = setInterval(() => {
      pushEvent("session", "session_heartbeat");
    }, HEARTBEAT_INTERVAL_MS);

    // Session end on unload
    const handleUnload = () => {
      pushEvent("session", "session_end", {
        durationMs: Date.now() - new Date(startTimeRef.current).getTime(),
      });

      if (sessionRef.current) {
        sessionRef.current.endedAt = new Date().toISOString();
      }

      // Best-effort flush via sendBeacon
      if (bufferRef.current.length > 0) {
        const payload = JSON.stringify({
          boardId,
          events: bufferRef.current,
          session: sessionRef.current,
        });
        navigator.sendBeacon(
          `/api/activity/flush`,
          new Blob([payload], { type: "application/json" })
        );
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      // Final flush on unmount
      flush();
    };
  }, [boardId, sessionId, pushEvent, flush]);

  return { logEvent, wrapDispatch };
}
