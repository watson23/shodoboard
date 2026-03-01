"use client";

import { useState } from "react";
import { X, ChatCircleDots } from "@phosphor-icons/react";
import { useBoard } from "@/hooks/useBoard";
import type { Nudge } from "@/types/board";

interface NudgeBadgeProps {
  nudge: Nudge;
  onSpar?: () => void;
}

export default function NudgeBadge({ nudge, onSpar }: NudgeBadgeProps) {
  const { dispatch } = useBoard();
  const [expanded, setExpanded] = useState(false);

  if (nudge.status !== "active") return null;

  if (!expanded) {
    if (nudge.tier === "quiet") {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-300 dark:bg-amber-500 rounded-full ring-2 ring-white dark:ring-gray-800 hover:scale-125 transition-transform"
          title="AI nudge"
        />
      );
    }
    // visible tier — shown as banner, click to expand
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(true);
        }}
        className="w-full text-left px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/50 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors rounded-t-lg"
      >
        {nudge.message}
      </button>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 space-y-2 animate-slide-in"
    >
      <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
        {nudge.message} <span className="font-medium">{nudge.question}</span>
      </p>
      <div className="flex items-center gap-2">
        {onSpar && (
          <button
            onClick={onSpar}
            className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            <ChatCircleDots size={12} weight="duotone" />
            Think about this
          </button>
        )}
        <button
          onClick={() => dispatch({ type: "DISMISS_NUDGE", nudgeId: nudge.id })}
          className="ml-auto p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Dismiss"
        >
          <X size={12} weight="bold" />
        </button>
      </div>
    </div>
  );
}
