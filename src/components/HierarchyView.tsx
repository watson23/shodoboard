"use client";

import { Flag, Target, LinkBreak, WarningCircle } from "@phosphor-icons/react";
import type { BoardState, BusinessGoal, Outcome, WorkItem, Nudge } from "@/types/board";

// --- Column status dot colors ---
const COLUMN_COLORS: Record<string, string> = {
  opportunities: "bg-gray-300 dark:bg-gray-600",
  discovering: "bg-purple-400",
  ready: "bg-yellow-400",
  building: "bg-blue-400",
  shipped: "bg-green-400",
  measuring: "bg-emerald-500",
};

// --- Sub-components ---

function GoalCard({ goal, onClick }: { goal: BusinessGoal; onClick: () => void }) {
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
    </div>
  );
}

function ItemRow({ item, onClick }: { item: WorkItem; onClick: () => void }) {
  return (
    <div
      id={item.id}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="flex items-center gap-2 px-4 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer text-xs transition-colors"
    >
      <span
        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${
          item.type === "discovery"
            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
            : "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
        }`}
      >
        {item.type === "discovery" ? "Dis" : "Del"}
      </span>
      <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
        {item.title}
      </span>
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${COLUMN_COLORS[item.column] || "bg-gray-300"}`}
        title={item.column}
      />
    </div>
  );
}

function OutcomeCard({
  outcome,
  items,
  onOutcomeClick,
  onItemClick,
}: {
  outcome: Outcome;
  items: WorkItem[];
  onOutcomeClick: () => void;
  onItemClick: (itemId: string) => void;
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
          </div>
        </div>
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} onClick={() => onItemClick(item.id)} />
          ))}
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
}

export default function HierarchyView({ state, onGoalClick, onOutcomeClick, onItemClick }: HierarchyViewProps) {
  const { goals, outcomes, items, nudges } = state;

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
          <div key={goal.id} className="hierarchy-tree">
            {/* Goal card */}
            <GoalCard goal={goal} onClick={() => onGoalClick(goal.id)} />

            {/* Connector + outcomes */}
            {goalOutcomes.length > 0 && (
              <div className="hierarchy-branch">
                <div className="hierarchy-connector" />
                <div className="flex flex-wrap gap-4 pt-4 pl-8">
                  {goalOutcomes.map((outcome) => (
                    <div key={outcome.id} className="hierarchy-leaf w-72">
                      <OutcomeCard
                        outcome={outcome}
                        items={getItemsForOutcome(outcome.id)}
                        onOutcomeClick={() => onOutcomeClick(outcome.id)}
                        onItemClick={onItemClick}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

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
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mb-1 ${
                    item.type === "discovery"
                      ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                      : "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                  }`}
                >
                  {item.type === "discovery" ? "Discovery" : "Delivery"}
                </span>
                <p className="text-gray-700 dark:text-gray-300 font-medium line-clamp-2">
                  {item.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
