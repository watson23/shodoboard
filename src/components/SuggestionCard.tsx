"use client";

import { CheckCircle, Check } from "@phosphor-icons/react";
import type { BoardChangeSuggestion } from "@/lib/ai";

const ACTION_LABEL: Record<BoardChangeSuggestion["action"], string> = {
  update_goal: "Update goal",
  update_outcome: "Update outcome",
  update_item: "Update item",
  add_item: "Add item",
  split_item: "Split item",
};

function describeChanges(changes: Record<string, unknown>): string[] {
  return Object.entries(changes).map(([key, value]) => {
    const label = key.replace(/([A-Z])/g, " $1").toLowerCase();
    const text = Array.isArray(value) ? value.join(", ") : String(value);
    return `${label}: ${text}`;
  });
}

/**
 * A board change the coach proposed. The PM reviews the exact wording and
 * applies it with one click; nothing changes on the board until they do.
 */
export default function SuggestionCard({
  suggestion,
  applied,
  onApply,
}: {
  suggestion: BoardChangeSuggestion;
  applied: boolean;
  onApply?: () => void;
}) {
  return (
    <div className="mt-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          {ACTION_LABEL[suggestion.action]}
        </span>
        {applied ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <Check size={12} weight="bold" />
            Applied
          </span>
        ) : (
          onApply && (
            <button
              onClick={onApply}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-white dark:bg-emerald-950/40 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors border border-emerald-200 dark:border-emerald-800"
            >
              <CheckCircle size={12} weight="duotone" />
              Apply
            </button>
          )
        )}
      </div>
      {suggestion.summary && (
        <p className="text-xs text-gray-700 dark:text-gray-300 mb-1">{suggestion.summary}</p>
      )}
      <ul className="space-y-0.5">
        {describeChanges(suggestion.changes).map((line, i) => (
          <li key={i} className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
