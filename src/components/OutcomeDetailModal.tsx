"use client";

import { useState } from "react";
import { X, Target } from "@phosphor-icons/react";
import { useBoard } from "@/hooks/useBoard";
import type { Outcome, Nudge } from "@/types/board";
import NudgeBadge from "./NudgeBadge";

interface OutcomeDetailModalProps {
  outcome: Outcome;
  nudges: Nudge[];
  goalName?: string;
  itemCount: number;
  onClose: () => void;
}

export default function OutcomeDetailModal({
  outcome,
  nudges,
  goalName,
  itemCount,
  onClose,
}: OutcomeDetailModalProps) {
  const { dispatch } = useBoard();
  const [statement, setStatement] = useState(outcome.statement);
  const [behaviorChange, setBehaviorChange] = useState(outcome.behaviorChange);
  const [measureOfSuccess, setMeasureOfSuccess] = useState(outcome.measureOfSuccess);

  const save = () => {
    dispatch({
      type: "UPDATE_OUTCOME",
      outcomeId: outcome.id,
      updates: { statement, behaviorChange, measureOfSuccess },
    });
  };

  const activeNudges = nudges.filter((n) => n.status === "active");

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
      <div
        className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-xl overflow-y-auto animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-5 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Target size={16} weight="duotone" className="text-teal-500 dark:text-teal-400" />
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              Outcome
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
              Outcome Statement
            </label>
            <input
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              onBlur={save}
              className="w-full text-lg font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-none outline-none focus:ring-0 p-0"
              placeholder="What changes in the world?"
            />
          </div>

          {/* Parent goal */}
          {goalName && (
            <div>
              <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">
                Business Goal
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                {goalName}
              </p>
            </div>
          )}

          {/* Behavior change */}
          <div>
            <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
              Desired Behavior Change
            </label>
            <textarea
              value={behaviorChange}
              onChange={(e) => setBehaviorChange(e.target.value)}
              onBlur={save}
              rows={3}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
              placeholder="What do people do differently?"
            />
          </div>

          {/* Measure of success */}
          <div>
            <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
              Measure of Success
            </label>
            <input
              value={measureOfSuccess}
              onChange={(e) => setMeasureOfSuccess(e.target.value)}
              onBlur={save}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/40"
              placeholder="Something observable and specific"
            />
          </div>

          {/* Work items count */}
          <div>
            <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">
              Work Items
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
              {itemCount} item{itemCount !== 1 ? "s" : ""}
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
                  <NudgeBadge key={nudge.id} nudge={{ ...nudge, tier: "visible" }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
