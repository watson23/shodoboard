"use client";

import { useState, useCallback } from "react";
import { useBoard } from "./useBoard";
import type { FocusItem, FocusItemStatus, Nudge } from "@/types/board";

export function useBoardActions() {
  const { state, dispatch } = useBoard();
  const { nudges } = state;
  const [nudgesLoading, setNudgesLoading] = useState(false);
  const [focusLoading, setFocusLoading] = useState(false);
  const [boardStrengths, setBoardStrengths] = useState<string[]>([]);

  const generateNudges = useCallback(async () => {
    setNudgesLoading(true);
    try {
      const res = await fetch("/api/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardState: state }),
      });
      const data = await res.json();
      if (data.nudges && data.nudges.length > 0) {
        dispatch({ type: "SET_NUDGES", nudges: data.nudges });
      }
    } catch (err) {
      console.error("Failed to generate nudges:", err);
    }
    setNudgesLoading(false);
  }, [state, dispatch]);

  const generateFocusItems = useCallback(async () => {
    setFocusLoading(true);
    try {
      const res = await fetch("/api/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardState: state }),
      });
      const data = await res.json();
      if (data.boardStrengths) {
        setBoardStrengths(data.boardStrengths);
      }
      if (data.focusItems && data.focusItems.length > 0) {
        dispatch({ type: "SET_FOCUS_ITEMS", focusItems: data.focusItems });
        setFocusLoading(false);
        return true; // signal that items were loaded (caller can open agenda)
      }
    } catch (err) {
      console.error("Failed to generate focus items:", err);
    }
    setFocusLoading(false);
    return false;
  }, [state, dispatch]);

  const handleFocusItemClick = useCallback((focusItem: FocusItem) => {
    const el = document.getElementById(focusItem.targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-indigo-400", "ring-offset-2");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-indigo-400", "ring-offset-2");
      }, 2000);
    }
  }, []);

  const handleStartSparringFromFocus = useCallback((focusItem: FocusItem): string => {
    const existingNudge = nudges.find(n => n.targetId === focusItem.targetId && n.status === "active");
    if (existingNudge) {
      return existingNudge.id;
    } else {
      const syntheticNudge: Nudge = {
        id: `synth-${focusItem.id}`,
        targetType: focusItem.targetType,
        targetId: focusItem.targetId,
        tier: "visible" as const,
        message: focusItem.whyItMatters,
        question: focusItem.suggestedAction,
        status: "active" as const,
      };
      dispatch({ type: "ADD_NUDGE", nudge: syntheticNudge });
      return syntheticNudge.id;
    }
  }, [nudges, dispatch]);

  const handleFocusStatusChange = useCallback((focusItemId: string, status: FocusItemStatus) => {
    dispatch({ type: "UPDATE_FOCUS_ITEM", focusItemId, updates: { status } });
  }, [dispatch]);

  return {
    nudgesLoading,
    focusLoading,
    boardStrengths,
    generateNudges,
    generateFocusItems,
    handleFocusItemClick,
    handleStartSparringFromFocus,
    handleFocusStatusChange,
  };
}
