"use client";

import type { WorkItem, Nudge } from "@/types/board";

interface WorkItemCardProps {
  item: WorkItem;
  nudges: Nudge[];
  onClick?: () => void;
}

export default function WorkItemCard({ item, nudges, onClick }: WorkItemCardProps) {
  const activeNudges = nudges.filter((n) => n.status === "active");
  const hasVisibleNudge = activeNudges.some((n) => n.tier === "visible");
  const hasQuietNudge = activeNudges.some((n) => n.tier === "quiet");

  return (
    <div
      onClick={onClick}
      className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow px-3 py-2 text-xs cursor-pointer border border-gray-100 dark:border-gray-700 group animate-slide-in ${
        hasVisibleNudge ? "border-t-2 border-t-amber-400 dark:border-t-amber-500" : ""
      }`}
    >
      {/* Quiet nudge dot */}
      {hasQuietNudge && !hasVisibleNudge && (
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-300 dark:bg-amber-500 rounded-full ring-2 ring-white dark:ring-gray-800" />
      )}

      {/* Title */}
      <span className="text-gray-900 dark:text-gray-100 font-medium leading-snug line-clamp-2 block">
        {item.title}
      </span>

      {/* Type badge + assignee */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <span
          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
            item.type === "discovery"
              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
              : "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
          }`}
        >
          {item.type === "discovery" ? "Discovery" : "Delivery"}
        </span>
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
    </div>
  );
}
