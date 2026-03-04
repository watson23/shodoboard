"use client";

import { useState, useCallback } from "react";
import { useBoard } from "./useBoard";
import type { FocusItem, FocusItemStatus, Nudge } from "@/types/board";

export function useBoardActions() {
  const { state, dispatch } = useBoard();
  const { nudges } = state;
  const [nudgesLoading, setNudgesLoading] = useState(false);
  const [focusLoading, setFocusLoading] = useState(false);
  const [focusError, setFocusError] = useState(false);
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
    console.log("[Focus] Starting generation. Board has:", state.goals?.length, "goals,", state.outcomes?.length, "outcomes,", state.items?.length, "items");
    setFocusLoading(true);
    setFocusError(false);
    try {
      const res = await fetch("/api/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardState: state }),
      });
      console.log("[Focus] API responded:", res.status, res.statusText);
      if (!res.ok) {
        console.error("[Focus] API error:", res.status, res.statusText);
        setFocusError(true);
        setFocusLoading(false);
        return false;
      }
      const data = await res.json();
      console.log("[Focus] Parsed response — focusItems:", data.focusItems?.length, "strengths:", data.boardStrengths?.length);
      if (data.boardStrengths) {
        setBoardStrengths(data.boardStrengths);
      }
      if (data.focusItems && data.focusItems.length > 0) {
        console.log("[Focus] Dispatching SET_FOCUS_ITEMS with", data.focusItems.length, "items");
        dispatch({ type: "SET_FOCUS_ITEMS", focusItems: data.focusItems });
        setFocusLoading(false);
        return true;
      }
      console.warn("[Focus] API returned no focus items", JSON.stringify(data).slice(0, 300));
    } catch (err) {
      console.error("[Focus] Failed to generate focus items:", err);
      setFocusError(true);
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
    focusError,
    boardStrengths,
    generateNudges,
    generateFocusItems,
    handleFocusItemClick,
    handleStartSparringFromFocus,
    handleFocusStatusChange,
  };
}
