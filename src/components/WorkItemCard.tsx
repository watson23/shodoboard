"use client";

import { Check } from "@phosphor-icons/react";
import type { WorkItem, Nudge, DiscoveryPrompt } from "@/types/board";
import NudgeBadge from "./NudgeBadge";
import TypeBadge from "./TypeBadge";
import DiscoveryPrompts from "./DiscoveryPrompts";

interface WorkItemCardProps {
  item: WorkItem;
  nudges: Nudge[];
  discoveryPrompts?: DiscoveryPrompt[];
  onClick?: () => void;
  onSpar?: (nudgeId: string) => void;
}

export default function WorkItemCard({
  item,
  nudges,
  discoveryPrompts = [],
  onClick,
  onSpar,
}: WorkItemCardProps) {
  const activeNudges = nudges.filter((n) => n.status === "active");
  const visibleNudge = activeNudges.find((n) => n.tier === "visible");
  const quietNudge = activeNudges.find((n) => n.tier === "quiet");
  const hasVisibleNudge = !!visibleNudge;
  const hasQuietNudge = !!quietNudge && !hasVisibleNudge;

  return (
    <div
      onClick={onClick}
      className="relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow text-xs cursor-pointer border border-gray-100 dark:border-gray-700 group animate-slide-in overflow-hidden"
    >
      {/* Visible nudge banner */}
      {visibleNudge && (
        <NudgeBadge
          nudge={visibleNudge}
          onSpar={onSpar ? () => onSpar(visibleNudge.id) : undefined}
        />
      )}

      {/* Quiet nudge dot */}
      {hasQuietNudge && quietNudge && (
        <NudgeBadge
          nudge={quietNudge}
          onSpar={onSpar ? () => onSpar(quietNudge.id) : undefined}
        />
      )}

      <div className="pl-7 pr-3 py-2">
        {/* Title */}
        <span className="text-gray-900 dark:text-gray-100 font-medium leading-snug line-clamp-2 block">
          {item.title}
        </span>

        {/* Type badge + assignee */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <TypeBadge type={item.type} />
          {item.assignee && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-[9px] font-bold text-gray-600 dark:text-gray-300 uppercase">
              {item.assignee
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </span>
          )}
        </div>

        {/* Checklist progress */}
        {item.checklist && item.checklist.length > 0 && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
            <Check size={10} weight="bold" />
            <span>{item.checklist.filter(ci => ci.done).length}/{item.checklist.length}</span>
          </div>
        )}

        {/* Discovery prompts */}
        {discoveryPrompts.length > 0 && (
          <DiscoveryPrompts prompts={discoveryPrompts} />
        )}
      </div>
    </div>
  );
}
