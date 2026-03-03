"use client";

import { useState } from "react";
import { Target } from "@phosphor-icons/react";
import { useBoard } from "@/hooks/useBoard";
import type { Outcome, Nudge } from "@/types/board";
import NudgeBadge from "./NudgeBadge";
import SlidePanel from "./SlidePanel";
import DeleteSection from "./DeleteSection";

interface OutcomeDetailModalProps {
  outcome: Outcome;
  nudges: Nudge[];
  goalName?: string;
  itemCount: number;
  onClose: () => void;
  onSpar?: (nudgeId: string) => void;
}

export default function OutcomeDetailModal({
  outcome,
  nudges,
  goalName,
  itemCount,
  onClose,
  onSpar,
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
    <SlidePanel
      onClose={onClose}
      title="Outcome"
      icon={<Target size={16} weight="duotone" className="text-teal-500 dark:text-teal-400" />}
    >
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
        label="Delete this outcome"
        childCount={itemCount}
        childLabel="work items"
        onConfirm={() => {
          dispatch({ type: "DELETE_OUTCOME", outcomeId: outcome.id });
          onClose();
        }}
        onConfirmWithChildren={() => {
          dispatch({ type: "DELETE_OUTCOME", outcomeId: outcome.id, deleteChildren: true });
          onClose();
        }}
      />
    </SlidePanel>
  );
}
