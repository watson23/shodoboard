"use client";

import { useState } from "react";
import { X, ChatCircleDots, ArrowRight } from "@phosphor-icons/react";
import { useBoard } from "@/hooks/useBoard";
import type { Nudge } from "@/types/board";

interface NudgeBadgeProps {
  nudge: Nudge;
  onSpar?: () => void;
  initialExpanded?: boolean;
}

export default function NudgeBadge({ nudge, onSpar, initialExpanded = false }: NudgeBadgeProps) {
  const { dispatch } = useBoard();
  const [expanded, setExpanded] = useState(initialExpanded);

  if (nudge.status !== "active") return null;

  if (!expanded) {
    if (nudge.tier === "quiet") {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-400 dark:bg-indigo-500 rounded-full ring-2 ring-white dark:ring-gray-800 hover:scale-125 transition-transform flex items-center justify-center"
          title="AI nudge"
        >
          <ChatCircleDots size={10} weight="bold" className="text-white" />
        </button>
      );
    }
    // visible tier — shown as banner, click to expand
    return (
      <div className="w-full flex items-center gap-1 px-3 py-1.5 bg-indigo-50/60 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-800/30 text-[11px] text-indigo-600 dark:text-indigo-400 rounded-t-lg">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="flex-1 text-left font-medium hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"
        >
          {nudge.message}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          className="p-0.5 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors flex-shrink-0"
          title="Close"
        >
          <X size={11} weight="bold" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800/30 rounded-lg p-2.5 space-y-1.5 animate-slide-in"
    >
      <p className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
        {nudge.message} <span className="font-medium">{nudge.question}</span>
      </p>
      {nudge.suggestedAction && (
        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1.5 flex items-start gap-1.5">
          <ArrowRight size={12} weight="bold" className="flex-shrink-0 mt-0.5" />
          {nudge.suggestedAction}
        </p>
      )}
      <div className="flex items-center gap-2">
        {onSpar && (
          <button
            onClick={onSpar}
            className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/40 px-2 py-1 rounded-md transition-colors"
          >
            <ChatCircleDots size={13} weight="duotone" />
            Think about this
          </button>
        )}
        <button
          onClick={() => dispatch({ type: "DISMISS_NUDGE", nudgeId: nudge.id })}
          className="ml-auto flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20"
        >
          <X size={10} weight="bold" />
          Dismiss
        </button>
      </div>
    </div>
  );
}
