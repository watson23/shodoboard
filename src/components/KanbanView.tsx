"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import WorkItemCard from "./WorkItemCard";
import DraggableCard from "./DraggableCard";
import DroppableColumn from "./DroppableColumn";
import NudgeBadge from "./NudgeBadge";
import {
  CaretDown,
  CaretRight,
  CaretUp,
  Target,
  Flag,
  Lightbulb,
  LinkBreak,
  WarningCircle,
  Plus,
} from "@phosphor-icons/react";
import type { BoardState, Column, WorkItem } from "@/types/board";

const COLUMNS: { key: Column; label: string; phase: string; phaseColor: string }[] = [
  { key: "opportunities", label: "Opportunities", phase: "Discovery", phaseColor: "text-purple-500 dark:text-purple-400" },
  { key: "discovering", label: "Discovering", phase: "Discovery", phaseColor: "text-purple-500 dark:text-purple-400" },
  { key: "ready", label: "Ready for Building", phase: "Transition", phaseColor: "text-amber-500 dark:text-amber-400" },
  { key: "building", label: "Building", phase: "Delivery", phaseColor: "text-teal-500 dark:text-teal-400" },
  { key: "shipped", label: "Shipped", phase: "Delivery", phaseColor: "text-teal-500 dark:text-teal-400" },
  { key: "measuring", label: "Measuring", phase: "Closing the loop", phaseColor: "text-emerald-500 dark:text-emerald-400" },
];

interface KanbanViewProps {
  state: BoardState;
  onGoalClick: (goalId: string) => void;
  onOutcomeClick: (outcomeId: string) => void;
  onItemClick: (itemId: string) => void;
  onAddGoal?: () => void;
  onAddOutcome?: (goalId: string) => void;
  onAddItem?: (outcomeId: string | null) => void;
  onReorderGoal?: (goalId: string, direction: "up" | "down") => void;
  onReorderOutcome?: (outcomeId: string, direction: "up" | "down") => void;
  onToggleGoalCollapse?: (goalId: string) => void;
  onToggleOutcomeCollapse?: (outcomeId: string) => void;
  onMoveItem?: (itemId: string, toColumn: Column, toIndex: number, toOutcomeId?: string | null) => void;
  onSpar?: (nudgeId: string) => void;
}

export default function KanbanView({
  state,
  onGoalClick,
  onOutcomeClick,
  onItemClick,
  onAddGoal,
  onAddOutcome,
  onAddItem,
  onReorderGoal,
  onReorderOutcome,
  onToggleGoalCollapse,
  onToggleOutcomeCollapse,
  onMoveItem,
  onSpar,
}: KanbanViewProps) {
  const { goals, outcomes, items, nudges, discoveryPrompts, focusItems } = state;

  const [activeItem, setActiveItem] = useState<WorkItem | null>(null);
  const [unlinkedCollapsed, setUnlinkedCollapsed] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const item = items.find((i) => i.id === event.active.id);
    if (item) setActiveItem(item);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;
    const overId = over.id as string;
    const parts = overId.split(":");
    const column = (parts.length > 1 ? parts[1] : overId) as Column;
    const dropOutcomeId = parts.length > 1 ? (parts[0] === "null" || parts[0] === "unlinked" ? null : parts[0]) : undefined;
    const draggedItem = items.find((i) => i.id === active.id);
    if (!draggedItem) return;

    const outcomeChanged = dropOutcomeId !== undefined && dropOutcomeId !== draggedItem.outcomeId;

    onMoveItem?.(
      active.id as string,
      column,
      0,
      outcomeChanged ? dropOutcomeId : undefined,
    );
  };

  const getNudgesForItem = (itemId: string) =>
    nudges.filter((n) => n.targetType === "item" && n.targetId === itemId);

  const getDiscoveryPrompts = (itemId: string) =>
    discoveryPrompts.filter((dp) => dp.itemId === itemId);

  const getFocusItemForTarget = (targetId: string) =>
    focusItems.find((fi) => fi.targetId === targetId && fi.status !== "done");

  const getNudgesForOutcome = (outcomeId: string) =>
    nudges.filter(
      (n) =>
        n.targetType === "outcome" &&
        n.targetId === outcomeId &&
        n.status === "active"
    );

  const getNudgesForGoal = (goalId: string) =>
    nudges.filter(
      (n) =>
        n.targetType === "goal" &&
        n.targetId === goalId &&
        n.status === "active"
    );

  const getItemsForOutcomeAndColumn = (
    outcomeId: string | null,
    column: Column
  ) =>
    items
      .filter((i) => i.outcomeId === outcomeId && i.column === column)
      .sort((a, b) => a.order - b.order);

  const getColumnItemCount = (column: Column) =>
    items.filter((i) => i.column === column).length;

  const unlinkedItems = items.filter((i) => i.outcomeId === null);
  const unlinkedOutcomes = outcomes.filter((o) => o.goalId === null);
  const sortedGoals = [...goals].sort((a, b) => a.order - b.order);

  const renderItemGrid = (outcomeId: string | null) => (
    <div className="grid grid-cols-6 gap-0 min-h-[36px] bg-gray-50/80 dark:bg-gray-950/50">
      {COLUMNS.map((col) => {
        const colItems = getItemsForOutcomeAndColumn(outcomeId, col.key);
        const droppableId = `${outcomeId ?? "unlinked"}:${col.key}`;
        return (
          <DroppableColumn
            key={col.key}
            id={droppableId}
            className="border-r border-gray-200/70 dark:border-gray-700/50 last:border-r-0 px-2 py-2 space-y-2"
          >
            {colItems.map((item) => (
              <div key={item.id} id={item.id}>
              <DraggableCard id={item.id}>
                <WorkItemCard
                  item={item}
                  nudges={getNudgesForItem(item.id)}
                  discoveryPrompts={getDiscoveryPrompts(item.id)}
                  focusItem={getFocusItemForTarget(item.id)}
                  onClick={() => onItemClick(item.id)}
                  onSpar={(nudgeId) => onSpar?.(nudgeId)}
                />
              </DraggableCard>
              </div>
            ))}
          </DroppableColumn>
        );
      })}
    </div>
  );

  return (
    <>
      <DndContext
        id="board-dnd"
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <div className="min-w-[1380px]">
            {/* Column headers */}
            <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-6 gap-0">
                {COLUMNS.map((col) => (
                  <div
                    key={col.key}
                    className="px-3 py-3 border-r border-gray-200 dark:border-gray-800 last:border-r-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                        {col.label}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                        {getColumnItemCount(col.key)}
                      </span>
                    </div>
                    <span className={`text-[10px] font-medium ${col.phaseColor}`}>
                      {col.phase}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Goal sections */}
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {sortedGoals.map((goal, goalIndex) => {
                  const goalOutcomes = outcomes
                    .filter((o) => o.goalId === goal.id)
                    .sort((a, b) => a.order - b.order);

                  return (
                    <div key={goal.id} id={goal.id}>
                      {/* Goal header */}
                      <div
                        className="w-full flex items-center gap-2 px-4 py-3.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors text-left group cursor-pointer border-l-4 border-l-indigo-500 dark:border-l-indigo-400"
                        onClick={() => onGoalClick(goal.id)}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleGoalCollapse?.(goal.id);
                          }}
                          className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 rounded transition-colors flex-shrink-0"
                        >
                          {goal.collapsed ? (
                            <CaretRight
                              size={14}
                              weight="bold"
                              className="text-indigo-400 dark:text-indigo-300"
                            />
                          ) : (
                            <CaretDown
                              size={14}
                              weight="bold"
                              className="text-indigo-400 dark:text-indigo-300"
                            />
                          )}
                        </button>
                        <Flag
                          size={16}
                          weight="duotone"
                          className="text-indigo-500 dark:text-indigo-400 flex-shrink-0"
                        />
                        <span className="font-bold text-sm text-indigo-900 dark:text-indigo-100">
                          {goal.statement}
                        </span>
                        {goal.timeframe && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                            {goal.timeframe}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                          {goalOutcomes.length} outcome
                          {goalOutcomes.length !== 1 ? "s" : ""}
                        </span>
                        {getNudgesForGoal(goal.id).length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                            <Lightbulb size={11} weight="fill" />
                            {getNudgesForGoal(goal.id).length} AI
                          </span>
                        )}
                        {sortedGoals.length > 1 && (
                          <div className="flex items-center gap-0.5 flex-shrink-0 ml-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onReorderGoal?.(goal.id, "up")}
                              disabled={goalIndex === 0}
                              className="p-0.5 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-20 disabled:cursor-default text-indigo-400 dark:text-indigo-300"
                              title="Move up"
                            >
                              <CaretUp size={12} weight="bold" />
                            </button>
                            <button
                              onClick={() => onReorderGoal?.(goal.id, "down")}
                              disabled={goalIndex === sortedGoals.length - 1}
                              className="p-0.5 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-20 disabled:cursor-default text-indigo-400 dark:text-indigo-300"
                              title="Move down"
                            >
                              <CaretDown size={12} weight="bold" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Outcomes within this goal */}
                      {!goal.collapsed && (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
                          {goalOutcomes.map((outcome, outcomeIndex) => (
                            <div key={outcome.id} id={outcome.id} className="mx-2 mb-2 rounded-lg border border-teal-200 dark:border-teal-800/40 overflow-hidden">
                              {/* Outcome header */}
                              <div
                                className="w-full flex items-center flex-wrap gap-x-2 gap-y-0.5 pl-10 pr-4 py-2 bg-teal-50 dark:bg-teal-950/30 hover:bg-teal-100/70 dark:hover:bg-teal-950/50 transition-colors text-left cursor-pointer border-l-[3px] border-l-teal-400 dark:border-l-teal-500"
                                onClick={() => onOutcomeClick(outcome.id)}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleOutcomeCollapse?.(outcome.id);
                                  }}
                                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                                >
                                  {outcome.collapsed ? (
                                    <CaretRight
                                      size={12}
                                      weight="bold"
                                      className="text-teal-400 dark:text-teal-300"
                                    />
                                  ) : (
                                    <CaretDown
                                      size={12}
                                      weight="bold"
                                      className="text-teal-400 dark:text-teal-300"
                                    />
                                  )}
                                </button>
                                <Target
                                  size={14}
                                  weight="duotone"
                                  className="text-teal-500 dark:text-teal-400 flex-shrink-0"
                                />
                                <span className="text-sm text-gray-800 dark:text-gray-200 font-semibold">
                                  {outcome.statement}
                                </span>
                                {outcome.measureOfSuccess && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-2" title={outcome.measureOfSuccess}>
                                    {outcome.measureOfSuccess}
                                  </span>
                                )}
                                {!outcome.measureOfSuccess && (
                                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium ml-2 flex items-center gap-1">
                                    <WarningCircle size={12} weight="fill" />
                                    Missing measure!
                                  </span>
                                )}
                                {getNudgesForOutcome(outcome.id).length > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 ml-auto flex-shrink-0">
                                    <Lightbulb size={11} weight="fill" />
                                    {getNudgesForOutcome(outcome.id).length} AI
                                  </span>
                                )}
                                {goalOutcomes.length > 1 && (
                                  <div className="flex items-center gap-0.5 flex-shrink-0 ml-1" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => onReorderOutcome?.(outcome.id, "up")}
                                      disabled={outcomeIndex === 0}
                                      className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-20 disabled:cursor-default text-gray-400 dark:text-gray-500"
                                      title="Move up"
                                    >
                                      <CaretUp size={12} weight="bold" />
                                    </button>
                                    <button
                                      onClick={() => onReorderOutcome?.(outcome.id, "down")}
                                      disabled={outcomeIndex === goalOutcomes.length - 1}
                                      className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-20 disabled:cursor-default text-gray-400 dark:text-gray-500"
                                      title="Move down"
                                    >
                                      <CaretDown size={12} weight="bold" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Outcome-level nudge -- show only the highest-priority one, collapsed */}
                              {(() => {
                                const outcomeNudges = getNudgesForOutcome(outcome.id);
                                if (outcomeNudges.length === 0) return null;
                                const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
                                const topNudge = [...outcomeNudges].sort(
                                  (a, b) => (priorityOrder[a.priority ?? "low"] ?? 3) - (priorityOrder[b.priority ?? "low"] ?? 3)
                                )[0];
                                return (
                                  <div className="pl-14 pr-4 py-1.5">
                                    <NudgeBadge
                                      key={topNudge.id}
                                      nudge={{ ...topNudge, tier: "visible" }}
                                      onSpar={() => onSpar?.(topNudge.id)}
                                    />
                                  </div>
                                );
                              })()}

                              {/* Column slots for this outcome */}
                              {!outcome.collapsed && (
                                <>
                                  {renderItemGrid(outcome.id)}
                                  <div className="px-2 py-1 bg-gray-50/80 dark:bg-gray-950/50 border-t border-gray-100 dark:border-gray-800/50">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onAddItem?.(outcome.id);
                                      }}
                                      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                      <Plus size={10} weight="bold" />
                                      Add item
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}

                          {/* Add outcome button */}
                          <div className="px-2 py-1.5 ml-8">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddOutcome?.(goal.id);
                              }}
                              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors px-2 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              <Plus size={12} weight="bold" />
                              Add outcome
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* Add goal button */}
              <div className="px-4 py-2">
                <button
                  onClick={() => onAddGoal?.()}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Plus size={14} weight="bold" />
                  Add goal
                </button>
              </div>

              {/* Unlinked section */}
              {(unlinkedItems.length > 0 || unlinkedOutcomes.length > 0) && (
                <div>
                  <div
                    className="flex items-center gap-2 px-4 py-3.5 bg-gray-100 dark:bg-gray-900 border-l-4 border-l-gray-300 dark:border-l-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => setUnlinkedCollapsed(!unlinkedCollapsed)}
                  >
                    {unlinkedCollapsed ? (
                      <CaretRight size={14} weight="bold" className="text-gray-400 dark:text-gray-500" />
                    ) : (
                      <CaretDown size={14} weight="bold" className="text-gray-400 dark:text-gray-500" />
                    )}
                    <LinkBreak
                      size={16}
                      weight="duotone"
                      className="text-gray-400 dark:text-gray-500 flex-shrink-0"
                    />
                    <span className="font-semibold text-sm text-gray-500 dark:text-gray-400">
                      Unlinked
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                      {unlinkedItems.length} item
                      {unlinkedItems.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {!unlinkedCollapsed && (
                    <>
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
                      {renderItemGrid(null)}
                      <div className="px-4 py-1">
                        <button
                          onClick={() => onAddItem?.(null)}
                          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-2 py-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
                        >
                          <Plus size={12} weight="bold" />
                          Add item
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeItem && (
            <div className="rotate-2 opacity-90">
              <WorkItemCard
                item={activeItem}
                nudges={getNudgesForItem(activeItem.id)}
                discoveryPrompts={getDiscoveryPrompts(activeItem.id)}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </>
  );
}
