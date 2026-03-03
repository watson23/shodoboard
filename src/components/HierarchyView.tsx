"use client";

import { Flag, Target, LinkBreak, WarningCircle, Plus, Lightbulb } from "@phosphor-icons/react";
import type { BoardState, BusinessGoal, Outcome, WorkItem, Nudge, FocusItem } from "@/types/board";
import TypeBadge from "./TypeBadge";
import TreeConnectors from "./TreeConnectors";

// --- Column status pill config ---
const COLUMN_PILLS: Record<string, { label: string; bg: string; text: string }> = {
  opportunities: { label: "Opp", bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-500 dark:text-gray-400" },
  discovering: { label: "Disc.", bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400" },
  ready: { label: "Ready", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
  building: { label: "Build", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
  shipped: { label: "Ship", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400" },
  measuring: { label: "Meas.", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
};

// --- Sub-components ---

function GoalCard({ goal, onClick, nudgeCount }: { goal: BusinessGoal; onClick: () => void; nudgeCount?: number }) {
  return (
    <div
      id={goal.id}
      onClick={onClick}
      className="bg-indigo-600 dark:bg-indigo-700 text-white rounded-xl px-5 py-4 cursor-pointer hover:bg-indigo-700 dark:hover:bg-indigo-800 transition-colors shadow-md"
    >
      <div className="flex items-center gap-2">
        <Flag size={20} weight="duotone" className="flex-shrink-0 text-indigo-200" />
        <h3 className="text-lg font-bold leading-tight">{goal.statement}</h3>
      </div>
      {goal.timeframe && (
        <p className="text-indigo-200 text-sm mt-1">{goal.timeframe}</p>
      )}
      {goal.metrics && goal.metrics.length > 0 && (
        <p className="text-indigo-300 text-xs mt-1.5">
          Mittarit: {goal.metrics.join(", ")}
        </p>
      )}
      {(nudgeCount ?? 0) > 0 && (
        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-200/60 dark:bg-orange-900/30 text-orange-100 dark:text-orange-400">
          <Lightbulb size={11} weight="fill" />
          {nudgeCount} AI
        </span>
      )}
    </div>
  );
}

function ItemRow({ item, onClick, hasNudge, focusAction }: { item: WorkItem; onClick: () => void; hasNudge?: boolean; focusAction?: string }) {
  return (
    <div
      id={item.id}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="flex items-center gap-2 px-4 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer text-xs transition-colors"
    >
      <TypeBadge type={item.type} compact />
      <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
        {item.title}
      </span>
      {(() => {
        const pill = COLUMN_PILLS[item.column];
        return pill ? (
          <span title={item.column.charAt(0).toUpperCase() + item.column.slice(1)} className={`px-1.5 rounded-full text-[9px] font-semibold flex-shrink-0 leading-tight ${pill.bg} ${pill.text}`}>
            {pill.label}
          </span>
        ) : null;
      })()}
      {hasNudge && (
        <span className="inline-flex items-center gap-0.5 px-1.5 rounded-full text-[9px] font-semibold flex-shrink-0 leading-tight bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" title="AI-generated coaching nudge">
          <Lightbulb size={10} weight="fill" />
          AI
        </span>
      )}
      {focusAction && (
        <span className="text-[9px] text-orange-600 dark:text-orange-400 truncate max-w-[120px]" title={focusAction}>
          🎯 {focusAction}
        </span>
      )}
      {item.checklist && item.checklist.length > 0 && (
        <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums flex-shrink-0">
          {item.checklist.filter(ci => ci.done).length}/{item.checklist.length}
        </span>
      )}
    </div>
  );
}

function OutcomeCard({
  outcome,
  items,
  onOutcomeClick,
  onItemClick,
  onAddItem,
  nudgeCount = 0,
  getActiveNudgeCount,
  focusItem,
  getFocusAction,
}: {
  outcome: Outcome;
  items: WorkItem[];
  onOutcomeClick: () => void;
  onItemClick: (itemId: string) => void;
  onAddItem?: () => void;
  nudgeCount?: number;
  getActiveNudgeCount?: (targetId: string) => number;
  focusItem?: FocusItem;
  getFocusAction?: (targetId: string) => string | undefined;
}) {
  const hasMeasure = !!outcome.measureOfSuccess;
  const borderColor = hasMeasure
    ? "border-l-indigo-500"
    : "border-l-amber-400";

  return (
    <div
      id={outcome.id}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 border-l-[3px] ${borderColor} shadow-sm overflow-hidden`}
    >
      {/* Outcome header */}
      <div
        onClick={onOutcomeClick}
        className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-start gap-2">
          <Target size={16} weight="duotone" className="text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">
              {outcome.statement}
            </p>
            {outcome.behaviorChange && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {outcome.behaviorChange}
              </p>
            )}
            {hasMeasure ? (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                📏 {outcome.measureOfSuccess}
              </p>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium flex items-center gap-1">
                <WarningCircle size={12} weight="fill" />
                Mittari puuttuu!
              </p>
            )}
            {nudgeCount > 0 && (
              <span className="inline-flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-0.5 px-1.5 rounded-full text-[9px] font-semibold leading-tight bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" title="AI-generated coaching nudges">
                  <Lightbulb size={10} weight="fill" />
                  {nudgeCount} AI
                </span>
              </span>
            )}
            {focusItem && (
              <div className="flex items-start gap-1.5 mt-1.5 px-2 py-1 bg-orange-50 dark:bg-orange-950/20 border-l-2 border-orange-400 dark:border-orange-500 rounded-r">
                <Target size={11} weight="bold" className="text-orange-500 flex-shrink-0 mt-0.5" />
                <span className="text-[10px] text-orange-700 dark:text-orange-300 line-clamp-2">{focusItem.suggestedAction}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} onClick={() => onItemClick(item.id)} hasNudge={getActiveNudgeCount ? getActiveNudgeCount(item.id) > 0 : false} focusAction={getFocusAction ? getFocusAction(item.id) : undefined} />
          ))}
        </div>
      )}

      {/* Add item button */}
      {onAddItem && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onAddItem(); }}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors px-1.5 py-0.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Plus size={10} weight="bold" />
            Add item
          </button>
        </div>
      )}
    </div>
  );
}

// --- Main Component ---

interface HierarchyViewProps {
  state: BoardState;
  onGoalClick: (goalId: string) => void;
  onOutcomeClick: (outcomeId: string) => void;
  onItemClick: (itemId: string) => void;
  onAddGoal?: () => void;
  onAddOutcome?: (goalId: string) => void;
  onAddItem?: (outcomeId: string | null) => void;
}

export default function HierarchyView({ state, onGoalClick, onOutcomeClick, onItemClick, onAddGoal, onAddOutcome, onAddItem }: HierarchyViewProps) {
  const { goals, outcomes, items, nudges } = state;

  const getFocusItem = (targetId: string) =>
    (state.focusItems || []).find((fi) => fi.targetId === targetId && fi.status !== "done");

  const getActiveNudgeCount = (targetId: string) =>
    (nudges || []).filter((n) => n.targetId === targetId && n.status === "active").length;

  const getOutcomesForGoal = (goalId: string) =>
    outcomes.filter((o) => o.goalId === goalId).sort((a, b) => a.order - b.order);

  const getItemsForOutcome = (outcomeId: string) =>
    items.filter((i) => i.outcomeId === outcomeId).sort((a, b) => a.order - b.order);

  const unlinkedItems = items.filter((i) => i.outcomeId === null);
  const sortedGoals = [...goals].sort((a, b) => a.order - b.order);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-10">
      {sortedGoals.map((goal) => {
        const goalOutcomes = getOutcomesForGoal(goal.id);

        return (
          <div key={goal.id} className="relative">
            {/* SVG tree connectors */}
            {goalOutcomes.length > 0 && (
              <TreeConnectors
                goalId={goal.id}
                outcomeIds={goalOutcomes.map((o) => o.id)}
              />
            )}

            {/* Goal card */}
            <GoalCard goal={goal} onClick={() => onGoalClick(goal.id)} nudgeCount={getActiveNudgeCount(goal.id)} />

            {/* Outcomes */}
            {goalOutcomes.length > 0 && (
              <div className="relative ml-8 pt-8">
                <div className="flex flex-wrap gap-4">
                  {goalOutcomes.map((outcome) => (
                    <div key={outcome.id} className="w-72">
                      <OutcomeCard
                        outcome={outcome}
                        items={getItemsForOutcome(outcome.id)}
                        onOutcomeClick={() => onOutcomeClick(outcome.id)}
                        onItemClick={onItemClick}
                        onAddItem={onAddItem ? () => onAddItem(outcome.id) : undefined}
                        nudgeCount={getActiveNudgeCount(outcome.id)}
                        getActiveNudgeCount={getActiveNudgeCount}
                        focusItem={getFocusItem(outcome.id)}
                        getFocusAction={(id) => getFocusItem(id)?.suggestedAction}
                      />
                    </div>
                  ))}

                  {/* Add outcome button */}
                  {onAddOutcome && (
                    <div className="flex items-center">
                      <button
                        onClick={() => onAddOutcome(goal.id)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 hover:border-teal-400 dark:hover:border-teal-500"
                      >
                        <Plus size={12} weight="bold" />
                        Add outcome
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add goal button */}
      {onAddGoal && (
        <div className="flex justify-center">
          <button
            onClick={onAddGoal}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors px-4 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500"
          >
            <Plus size={14} weight="bold" />
            Add goal
          </button>
        </div>
      )}

      {/* Unlinked items */}
      {unlinkedItems.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <LinkBreak size={18} weight="duotone" className="text-amber-500" />
            <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              ⚠️ Ilman yhteyttä ({unlinkedItems.length} itemiä)
            </h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {unlinkedItems.map((item) => (
              <div
                key={item.id}
                id={item.id}
                onClick={() => onItemClick(item.id)}
                className="bg-white dark:bg-gray-800 border border-dashed border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2 text-xs cursor-pointer hover:border-amber-400 transition-colors w-40"
              >
                <TypeBadge type={item.type} compact />
                <p className="text-gray-700 dark:text-gray-300 font-medium line-clamp-2">
                  {item.title}
                </p>
              </div>
            ))}

            {/* Add unlinked item */}
            {onAddItem && (
              <button
                onClick={() => onAddItem(null)}
                className="flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 hover:border-amber-400 w-40"
              >
                <Plus size={12} weight="bold" />
                Add item
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
