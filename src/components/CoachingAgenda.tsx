"use client";

import {
  X,
  ArrowRight,
  ArrowsClockwise,
  ChatCircleDots,
  CheckCircle,
  Circle,
  Target,
  ListChecks,
  Star,
  WarningCircle,
} from "@phosphor-icons/react";
import type { FocusItem, FocusItemStatus } from "@/types/board";

interface CoachingAgendaProps {
  focusItems: FocusItem[];
  boardStrengths?: string[];
  isLoading: boolean;
  hasError?: boolean;
  onItemClick: (focusItem: FocusItem) => void;
  onStatusChange: (focusItemId: string, status: FocusItemStatus) => void;
  onStartSparring: (focusItem: FocusItem) => void;
  onRefresh?: () => void;
  onClose: () => void;
}

const PRIORITY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function sortByPriority(items: FocusItem[]): FocusItem[] {
  return [...items].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)
  );
}

function getNextStatus(current: FocusItemStatus): FocusItemStatus {
  if (current === "pending") return "in_progress";
  if (current === "in_progress") return "done";
  return "pending";
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  const config = {
    high: {
      label: "Tarke\u00e4",
      classes:
        "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    },
    medium: {
      label: "Huomionarvoinen",
      classes:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    },
    low: {
      label: "Hyv\u00e4 tiet\u00e4\u00e4",
      classes:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    },
  };

  const { label, classes } = config[priority];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${classes}`}
    >
      {label}
    </span>
  );
}

function StatusButton({
  status,
  onClick,
}: {
  status: FocusItemStatus;
  onClick: () => void;
}) {
  if (status === "done") {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
      >
        <CheckCircle size={14} weight="fill" />
        Valmis
      </button>
    );
  }

  if (status === "in_progress") {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
      >
        <Circle size={14} weight="fill" className="text-amber-500 dark:text-amber-400" />
        Kesken
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      <Circle size={14} weight="regular" />
      Aloita
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
      <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded" />
        <div className="h-3 w-5/6 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
      <div className="h-8 w-full bg-gray-100 dark:bg-gray-800 rounded" />
      <div className="flex gap-2">
        <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded-md" />
        <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded-md" />
      </div>
    </div>
  );
}

function FocusItemCard({
  item,
  onItemClick,
  onStatusChange,
  onStartSparring,
}: {
  item: FocusItem;
  onItemClick: (focusItem: FocusItem) => void;
  onStatusChange: (focusItemId: string, status: FocusItemStatus) => void;
  onStartSparring: (focusItem: FocusItem) => void;
}) {
  const isDone = item.status === "done";

  return (
    <div
      className={`p-4 space-y-3 transition-opacity ${isDone ? "opacity-60" : "opacity-100"}`}
    >
      {/* Priority badge */}
      <PriorityBadge priority={item.priority} />

      {/* Title */}
      <button
        onClick={() => onItemClick(item)}
        className="block text-left w-full"
      >
        <h4
          className={`text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug ${isDone ? "line-through" : ""}`}
        >
          {item.title}
        </h4>
      </button>

      {/* Why it matters */}
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
        {item.whyItMatters}
      </p>

      {/* Suggested action callout */}
      {item.suggestedAction && (
        <div className="flex items-start gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/30 border-l-2 border-indigo-400 dark:border-indigo-500 rounded-r-md">
          <ArrowRight
            size={14}
            weight="bold"
            className="text-indigo-500 dark:text-indigo-400 mt-0.5 flex-shrink-0"
          />
          <span className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
            {item.suggestedAction}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onStartSparring(item)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
        >
          <ChatCircleDots size={14} weight="fill" />
          Pohdi t&auml;t&auml;
        </button>
        <StatusButton
          status={item.status}
          onClick={() => onStatusChange(item.id, getNextStatus(item.status))}
        />
      </div>
    </div>
  );
}

export default function CoachingAgenda({
  focusItems,
  boardStrengths = [],
  isLoading,
  hasError = false,
  onItemClick,
  onStatusChange,
  onStartSparring,
  onRefresh,
  onClose,
}: CoachingAgendaProps) {
  const sorted = sortByPriority(focusItems);
  const completedCount = focusItems.filter((i) => i.status === "done").length;
  const totalCount = focusItems.length;

  return (
    <div className="fixed inset-0 z-50 flex justify-start">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-[420px] max-w-full bg-white dark:bg-gray-900 shadow-2xl animate-slide-in-left flex flex-col border-r border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
            <Target
              size={18}
              weight="duotone"
              className="text-indigo-500 dark:text-indigo-400"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Coaching Agenda
            </h3>
            {totalCount > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {completedCount}/{totalCount} done
              </p>
            )}
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Refresh agenda"
            >
              <ArrowsClockwise size={18} weight="bold" className={isLoading ? "animate-spin" : ""} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading state */}
          {isLoading && (
            <div>
              <div className="px-5 py-3 text-xs text-gray-400 dark:text-gray-500 text-center">
                AI is analyzing your board — this may take up to 30 seconds.
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </div>
          )}

          {/* Error state */}
          {!isLoading && hasError && focusItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-4">
                <WarningCircle
                  size={24}
                  weight="duotone"
                  className="text-rose-500 dark:text-rose-400"
                />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Agendan lataus epäonnistui
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[240px] mb-4">
                AI-analyysi ei vastannut ajoissa. Kokeile uudelleen.
              </p>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
                >
                  <ArrowsClockwise size={14} weight="bold" />
                  Yritä uudelleen
                </button>
              )}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !hasError && focusItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <ListChecks
                  size={24}
                  weight="duotone"
                  className="text-gray-400 dark:text-gray-500"
                />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Ei fokuskohteita
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[240px]">
                Lisää tavoitteita ja tuloksia taulullesi, niin valmennus tunnistaa tärkeimmät kehityskohteet.
              </p>
            </div>
          )}

          {/* Board strengths */}
          {!isLoading && boardStrengths.length > 0 && (
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-2.5">
                <Star size={14} weight="fill" className="text-amber-500 dark:text-amber-400" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Vahvuudet
                </span>
              </div>
              <ul className="space-y-1.5">
                {boardStrengths.map((strength, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    <span className="text-emerald-500 dark:text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Focus items list */}
          {!isLoading && focusItems.length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {sorted.map((item) => (
                <FocusItemCard
                  key={item.id}
                  item={item}
                  onItemClick={onItemClick}
                  onStatusChange={onStatusChange}
                  onStartSparring={onStartSparring}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
