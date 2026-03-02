"use client";

import { useState } from "react";
import { useBoard } from "@/hooks/useBoard";
import type { WorkItem, Nudge, DiscoveryPrompt, Column } from "@/types/board";
import NudgeBadge from "./NudgeBadge";
import DiscoveryPrompts from "./DiscoveryPrompts";
import SlidePanel from "./SlidePanel";

const COLUMN_OPTIONS: { value: Column; label: string }[] = [
  { value: "opportunities", label: "Opportunities" },
  { value: "discovering", label: "Discovering" },
  { value: "ready", label: "Ready for Building" },
  { value: "building", label: "Building" },
  { value: "shipped", label: "Shipped" },
  { value: "measuring", label: "Measuring" },
];

interface CardDetailModalProps {
  item: WorkItem;
  nudges: Nudge[];
  discoveryPrompts: DiscoveryPrompt[];
  onClose: () => void;
  onSpar?: (nudgeId: string) => void;
}

export default function CardDetailModal({
  item,
  nudges,
  discoveryPrompts,
  onClose,
  onSpar,
}: CardDetailModalProps) {
  const { dispatch, state: boardState } = useBoard();
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [assignee, setAssignee] = useState(item.assignee || "");
  const [column, setColumn] = useState<Column>(item.column);
  const [type, setType] = useState(item.type);
  const [outcomeId, setOutcomeId] = useState<string | null>(item.outcomeId);

  const save = () => {
    dispatch({
      type: "UPDATE_ITEM",
      itemId: item.id,
      updates: { title, description, assignee: assignee || undefined, column, type, outcomeId },
    });
  };

  const outcomeOptions = (() => {
    const options: { value: string | null; label: string; group?: string }[] = [
      { value: null, label: "— Unlinked —" },
    ];
    const sortedGoals = [...boardState.goals].sort((a, b) => a.order - b.order);
    for (const goal of sortedGoals) {
      const goalOutcomes = boardState.outcomes
        .filter((o) => o.goalId === goal.id)
        .sort((a, b) => a.order - b.order);
      for (const o of goalOutcomes) {
        options.push({ value: o.id, label: o.statement, group: goal.statement });
      }
    }
    return options;
  })();

  const activeNudges = nudges.filter((n) => n.status === "active");

  return (
    <SlidePanel onClose={onClose} title="Work Item">
      {/* Title */}
      <div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={save}
          className="w-full text-lg font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-none outline-none focus:ring-0 p-0"
          placeholder="Item title"
        />
      </div>

      {/* Parent outcome */}
      <div>
        <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
          Outcome
        </label>
        <select
          value={outcomeId ?? ""}
          onChange={(e) => {
            const val = e.target.value === "" ? null : e.target.value;
            setOutcomeId(val);
            dispatch({ type: "UPDATE_ITEM", itemId: item.id, updates: { outcomeId: val } });
          }}
          className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-lg text-xs text-gray-700 dark:text-gray-300 py-1.5 px-2 outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          {outcomeOptions.map((opt) => (
            <option key={opt.value ?? "unlinked"} value={opt.value ?? ""}>
              {opt.group ? `${opt.group} → ` : ""}{opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Type toggle + Column */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
            Type
          </label>
          <div className="flex gap-1">
            <button
              onClick={() => {
                setType("discovery");
                dispatch({ type: "UPDATE_ITEM", itemId: item.id, updates: { type: "discovery" } });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                type === "discovery"
                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              }`}
            >
              Discovery
            </button>
            <button
              onClick={() => {
                setType("delivery");
                dispatch({ type: "UPDATE_ITEM", itemId: item.id, updates: { type: "delivery" } });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                type === "delivery"
                  ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              }`}
            >
              Delivery
            </button>
          </div>
        </div>

        <div className="flex-1">
          <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
            Column
          </label>
          <select
            value={column}
            onChange={(e) => {
              const val = e.target.value as Column;
              setColumn(val);
              dispatch({ type: "UPDATE_ITEM", itemId: item.id, updates: { column: val } });
            }}
            className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-lg text-xs text-gray-700 dark:text-gray-300 py-1.5 px-2 outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            {COLUMN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={save}
          rows={4}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
          placeholder="Add a description..."
        />
      </div>

      {/* Assignee */}
      <div>
        <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
          Assignee
        </label>
        <input
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          onBlur={save}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/40"
          placeholder="Name"
        />
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

      {/* Discovery prompts */}
      {discoveryPrompts.length > 0 && (
        <div>
          <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
            Discovery Checklist
          </label>
          <DiscoveryPrompts prompts={discoveryPrompts} />
        </div>
      )}
    </SlidePanel>
  );
}
