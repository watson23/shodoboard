"use client";

import { useBoard } from "@/hooks/useBoard";
import BoardHeader from "./BoardHeader";
import {
  CaretDown,
  CaretRight,
  Target,
  Flag,
  LinkBreak,
} from "@phosphor-icons/react";
import type { Column } from "@/types/board";

const COLUMNS: { key: Column; label: string; phase: string }[] = [
  { key: "opportunities", label: "Opportunities", phase: "Discovery" },
  { key: "discovering", label: "Discovering", phase: "Discovery" },
  { key: "ready", label: "Ready", phase: "Transition" },
  { key: "building", label: "Building", phase: "Delivery" },
  { key: "shipped", label: "Shipped", phase: "Delivery" },
  { key: "measuring", label: "Measuring", phase: "Closing the loop" },
];

export default function Board() {
  const { state, dispatch } = useBoard();
  const { goals, outcomes, items } = state;

  const getItemsForOutcomeAndColumn = (outcomeId: string | null, column: Column) =>
    items
      .filter((i) => i.outcomeId === outcomeId && i.column === column)
      .sort((a, b) => a.order - b.order);

  const getColumnItemCount = (column: Column) =>
    items.filter((i) => i.column === column).length;

  // Unlinked items: items with no outcomeId
  const unlinkedItems = items.filter((i) => i.outcomeId === null);
  // Unlinked outcomes: outcomes with no goalId
  const unlinkedOutcomes = outcomes.filter((o) => o.goalId === null);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <BoardHeader />

      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="min-w-[1380px]">
          {/* Column headers */}
          <div className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
            <div className="grid grid-cols-6 gap-0">
              {COLUMNS.map((col) => (
                <div
                  key={col.key}
                  className="px-3 py-2.5 border-r border-gray-200 dark:border-gray-800 last:border-r-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      {col.label}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                      {getColumnItemCount(col.key)}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-600">
                    {col.phase}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Goal sections */}
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {goals
              .sort((a, b) => a.order - b.order)
              .map((goal) => {
                const goalOutcomes = outcomes
                  .filter((o) => o.goalId === goal.id)
                  .sort((a, b) => a.order - b.order);

                return (
                  <div key={goal.id}>
                    {/* Goal header */}
                    <button
                      onClick={() =>
                        dispatch({
                          type: "TOGGLE_GOAL_COLLAPSE",
                          goalId: goal.id,
                        })
                      }
                      className="w-full flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-850 transition-colors text-left group"
                    >
                      {goal.collapsed ? (
                        <CaretRight
                          size={14}
                          weight="bold"
                          className="text-gray-400 flex-shrink-0"
                        />
                      ) : (
                        <CaretDown
                          size={14}
                          weight="bold"
                          className="text-gray-400 flex-shrink-0"
                        />
                      )}
                      <Flag
                        size={16}
                        weight="duotone"
                        className="text-indigo-500 dark:text-indigo-400 flex-shrink-0"
                      />
                      <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        {goal.statement}
                      </span>
                      {goal.timeframe && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                          {goal.timeframe}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                        {goalOutcomes.length} outcome{goalOutcomes.length !== 1 ? "s" : ""}
                      </span>
                    </button>

                    {/* Outcomes within this goal */}
                    {!goal.collapsed && (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
                        {goalOutcomes.map((outcome) => (
                          <div key={outcome.id}>
                            {/* Outcome header */}
                            <button
                              onClick={() =>
                                dispatch({
                                  type: "TOGGLE_OUTCOME_COLLAPSE",
                                  outcomeId: outcome.id,
                                })
                              }
                              className="w-full flex items-center gap-2 pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-950 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors text-left"
                            >
                              {outcome.collapsed ? (
                                <CaretRight
                                  size={12}
                                  weight="bold"
                                  className="text-gray-400 flex-shrink-0"
                                />
                              ) : (
                                <CaretDown
                                  size={12}
                                  weight="bold"
                                  className="text-gray-400 flex-shrink-0"
                                />
                              )}
                              <Target
                                size={14}
                                weight="duotone"
                                className="text-teal-500 dark:text-teal-400 flex-shrink-0"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                {outcome.statement}
                              </span>
                              {outcome.measureOfSuccess && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 truncate max-w-xs">
                                  {outcome.measureOfSuccess}
                                </span>
                              )}
                              {!outcome.measureOfSuccess && (
                                <span className="text-xs text-amber-500 dark:text-amber-400 ml-2">
                                  No measure
                                </span>
                              )}
                            </button>

                            {/* Column slots for this outcome */}
                            {!outcome.collapsed && (
                              <div className="grid grid-cols-6 gap-0 min-h-[60px]">
                                {COLUMNS.map((col) => {
                                  const colItems = getItemsForOutcomeAndColumn(
                                    outcome.id,
                                    col.key
                                  );
                                  return (
                                    <div
                                      key={col.key}
                                      className="border-r border-gray-100 dark:border-gray-800/50 last:border-r-0 px-2 py-2 space-y-2"
                                    >
                                      {colItems.map((item) => (
                                        <div
                                          key={item.id}
                                          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow px-3 py-2 text-xs cursor-pointer border border-gray-100 dark:border-gray-700"
                                        >
                                          <span className="text-gray-900 dark:text-gray-100 font-medium leading-snug line-clamp-2">
                                            {item.title}
                                          </span>
                                          <div className="mt-1.5">
                                            <span
                                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                item.type === "discovery"
                                                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                                                  : "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                                              }`}
                                            >
                                              {item.type === "discovery"
                                                ? "Discovery"
                                                : "Delivery"}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Unlinked section */}
            {(unlinkedItems.length > 0 || unlinkedOutcomes.length > 0) && (
              <div>
                <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900">
                  <LinkBreak
                    size={16}
                    weight="duotone"
                    className="text-gray-400 dark:text-gray-500 flex-shrink-0"
                  />
                  <span className="font-semibold text-sm text-gray-500 dark:text-gray-400">
                    Unlinked
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                    {unlinkedItems.length} item{unlinkedItems.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Unlinked outcomes */}
                {unlinkedOutcomes.map((outcome) => (
                  <div key={outcome.id}>
                    <div className="flex items-center gap-2 pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-950">
                      <Target
                        size={14}
                        weight="duotone"
                        className="text-gray-400 flex-shrink-0"
                      />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {outcome.statement}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Unlinked items in columns */}
                <div className="grid grid-cols-6 gap-0 min-h-[60px]">
                  {COLUMNS.map((col) => {
                    const colItems = getItemsForOutcomeAndColumn(null, col.key);
                    return (
                      <div
                        key={col.key}
                        className="border-r border-gray-100 dark:border-gray-800/50 last:border-r-0 px-2 py-2 space-y-2"
                      >
                        {colItems.map((item) => (
                          <div
                            key={item.id}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow px-3 py-2 text-xs cursor-pointer border border-gray-100 dark:border-gray-700"
                          >
                            <span className="text-gray-900 dark:text-gray-100 font-medium leading-snug line-clamp-2">
                              {item.title}
                            </span>
                            <div className="mt-1.5">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  item.type === "discovery"
                                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                                    : "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                                }`}
                              >
                                {item.type === "discovery"
                                  ? "Discovery"
                                  : "Delivery"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
