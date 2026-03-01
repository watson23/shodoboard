"use client";

import { useState } from "react";
import { X, Flag } from "@phosphor-icons/react";
import { useBoard } from "@/hooks/useBoard";
import type { BusinessGoal } from "@/types/board";

interface GoalDetailModalProps {
  goal: BusinessGoal;
  outcomeCount: number;
  onClose: () => void;
}

export default function GoalDetailModal({
  goal,
  outcomeCount,
  onClose,
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
      <div
        className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-xl overflow-y-auto animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-5 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Flag size={16} weight="duotone" className="text-indigo-500 dark:text-indigo-400" />
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              Business Goal
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="p-5 space-y-5">
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
        </div>
      </div>
    </div>
  );
}
