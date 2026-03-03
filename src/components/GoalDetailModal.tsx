"use client";

import { useState } from "react";
import { Flag } from "@phosphor-icons/react";
import { useBoard } from "@/hooks/useBoard";
import type { BusinessGoal, Nudge } from "@/types/board";
import NudgeBadge from "./NudgeBadge";
import SlidePanel from "./SlidePanel";
import DeleteSection from "./DeleteSection";

interface GoalDetailModalProps {
  goal: BusinessGoal;
  nudges: Nudge[];
  outcomeCount: number;
  onClose: () => void;
  onSpar?: (nudgeId: string) => void;
}

export default function GoalDetailModal({
  goal,
  nudges,
  outcomeCount,
  onClose,
  onSpar,
}: GoalDetailModalProps) {
  const { dispatch } = useBoard();
  const [statement, setStatement] = useState(goal.statement);
  const [timeframe, setTimeframe] = useState(goal.timeframe || "");
  const [metrics, setMetrics] = useState(goal.metrics.join("\n"));

  const save = () => {
    dispatch({
      type: "UPDATE_GOAL",
      goalId: goal.id,
      updates: {
        statement,
        timeframe: timeframe || undefined,
        metrics: metrics.split("\n").filter((m) => m.trim()),
      },
    });
  };

  const activeNudges = nudges.filter((n) => n.status === "active");

  return (
    <SlidePanel
      onClose={onClose}
      title="Business Goal"
      icon={<Flag size={16} weight="duotone" className="text-indigo-500 dark:text-indigo-400" />}
    >
      {/* Statement */}
      <div>
        <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
          Goal Statement
        </label>
        <input
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          onBlur={save}
          className="w-full text-lg font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-none outline-none focus:ring-0 p-0"
          placeholder="What is the business trying to achieve?"
        />
      </div>

      {/* Timeframe */}
      <div>
        <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
          Timeframe
        </label>
        <input
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          onBlur={save}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/40"
          placeholder="e.g., This year, Q2 2026"
        />
      </div>

      {/* Key metrics */}
      <div>
        <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
          Key Metrics (one per line)
        </label>
        <textarea
          value={metrics}
          onChange={(e) => setMetrics(e.target.value)}
          onBlur={save}
          rows={4}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
          placeholder="How would you know you're getting there?"
        />
      </div>

      {/* Outcomes count */}
      <div>
        <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">
          Outcomes
        </label>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
          {outcomeCount} outcome{outcomeCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Nudges */}
      {activeNudges.length > 0 && (
        <div>
          <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
            AI Nudges
          </label>
          <div className="space-y-2">
            {activeNudges.map((nudge) => (
              <NudgeBadge
                key={nudge.id}
                nudge={{ ...nudge, tier: "visible" }}
                onSpar={onSpar ? () => onSpar(nudge.id) : undefined}
                initialExpanded
              />
            ))}
          </div>
        </div>
      )}

      {/* Delete */}
      <DeleteSection
        label="Delete this goal"
        childCount={outcomeCount}
        childLabel="outcomes"
        onConfirm={() => {
          dispatch({ type: "DELETE_GOAL", goalId: goal.id });
          onClose();
        }}
        onConfirmWithChildren={() => {
          dispatch({ type: "DELETE_GOAL", goalId: goal.id, deleteChildren: true });
          onClose();
        }}
      />
    </SlidePanel>
  );
}
