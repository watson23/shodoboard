"use client";

import { useState, useCallback, useRef } from "react";
import { useBoard } from "./useBoard";
import { coachingHash } from "@/lib/board-hash";
import type { DiscoveryPrompt, FocusItem, FocusItemStatus, Nudge } from "@/types/board";

export function useBoardActions() {
  const { state, dispatch } = useBoard();
  const { nudges } = state;
  const [nudgesLoading, setNudgesLoading] = useState(false);
  const [focusLoading, setFocusLoading] = useState(false);
  const [focusError, setFocusError] = useState(false);
  const [boardStrengths, setBoardStrengths] = useState<string[]>([]);
  const [discoveryLoading, setDiscoveryLoading] = useState<string | null>(null);
  const coachingInFlight = useRef(false);

  /**
   * One coaching pass: nudges + agenda from a single API call.
   *
   * Skipped when the board content has not changed since the last pass
   * (fingerprint match) unless `force` is set by a refresh button. Dismissed
   * and snoozed nudges keep their status when the same observation comes back.
   */
  const generateCoaching = useCallback(async (opts?: { force?: boolean }): Promise<boolean> => {
    const hash = coachingHash(state);
    const hasResults = state.nudges.length > 0 || state.focusItems.length > 0;
    if (!opts?.force && hasResults && state.coachedHash === hash) {
      return false;
    }
    if (coachingInFlight.current) return false;
    coachingInFlight.current = true;

    setNudgesLoading(true);
    setFocusLoading(true);
    setFocusError(false);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardState: state }),
      });
      if (!res.ok) {
        console.error("[coach] API error:", res.status, res.statusText);
        setFocusError(true);
        return false;
      }
      const data = (await res.json()) as {
        nudges?: Nudge[];
        focusItems?: FocusItem[];
        boardStrengths?: string[];
        coachedHash?: string;
      };

      const previous = state.nudges;
      const nudgesWithStatus: Nudge[] = (data.nudges ?? []).map((n) => {
        const match = previous.find(
          (p) => p.targetId === n.targetId && p.antiPattern === n.antiPattern && p.status !== "active"
        );
        return match ? { ...n, status: match.status } : n;
      });

      setBoardStrengths(data.boardStrengths ?? []);
      dispatch({
        type: "SET_COACHING",
        nudges: nudgesWithStatus,
        focusItems: data.focusItems ?? [],
        coachedHash: data.coachedHash ?? hash,
      });
      return (data.focusItems?.length ?? 0) > 0;
    } catch (err) {
      console.error("[coach] Failed:", err);
      setFocusError(true);
      return false;
    } finally {
      coachingInFlight.current = false;
      setNudgesLoading(false);
      setFocusLoading(false);
    }
  }, [state, dispatch]);

  /** Both refresh buttons re-run the same coaching pass. */
  const generateNudges = useCallback(() => generateCoaching({ force: true }), [generateCoaching]);
  const generateFocusItems = useCallback(() => generateCoaching({ force: true }), [generateCoaching]);

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

  const generateDiscoveryPrompts = useCallback(async (itemId: string) => {
    const item = state.items.find((i) => i.id === itemId);
    if (!item) return;

    const outcome = item.outcomeId
      ? state.outcomes.find((o) => o.id === item.outcomeId) ?? null
      : null;
    const goal = outcome?.goalId
      ? state.goals.find((g) => g.id === outcome.goalId) ?? null
      : null;

    setDiscoveryLoading(itemId);
    try {
      const res = await fetch("/api/discovery-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item, outcome, goal }),
      });
      const data = await res.json();
      if (data.prompts && data.prompts.length > 0) {
        dispatch({ type: "SET_DISCOVERY_PROMPTS", itemId, prompts: data.prompts as DiscoveryPrompt[] });
      }
    } catch (err) {
      console.error("Failed to generate discovery prompts:", err);
    }
    setDiscoveryLoading(null);
  }, [state, dispatch]);

  return {
    nudgesLoading,
    focusLoading,
    focusError,
    boardStrengths,
    discoveryLoading,
    generateCoaching,
    generateNudges,
    generateFocusItems,
    generateDiscoveryPrompts,
    handleFocusItemClick,
    handleStartSparringFromFocus,
    handleFocusStatusChange,
  };
}
