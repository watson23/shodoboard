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
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(true);
        }}
        className="w-full text-left px-3 py-2 bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-200 dark:border-indigo-800/50 text-xs text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors rounded-t-lg font-medium"
      >
        {nudge.message}
      </button>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 rounded-lg p-3 space-y-2 animate-slide-in"
    >
      <p className="text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed">
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
          onClick={() => setExpanded(false)}
          className="ml-auto p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Close"
        >
          <X size={12} weight="bold" />
        </button>
      </div>
    </div>
  );
}
