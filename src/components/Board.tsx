"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useBoard } from "@/hooks/useBoard";
import { useAutoSave } from "@/hooks/useAutoSave";
import BoardHeader from "./BoardHeader";
import WorkItemCard from "./WorkItemCard";
import DraggableCard from "./DraggableCard";
import DroppableColumn from "./DroppableColumn";
import NudgeBadge from "./NudgeBadge";
import CardDetailModal from "./CardDetailModal";
import OutcomeDetailModal from "./OutcomeDetailModal";
import GoalDetailModal from "./GoalDetailModal";
import SparringPanel from "./SparringPanel";
import CoachingAgenda from "./CoachingAgenda";
import {
  CaretDown,
  CaretRight,
  Target,
  Flag,
  LinkBreak,
} from "@phosphor-icons/react";
import type { Column, WorkItem, BusinessGoal, Outcome, FocusItem, FocusItemStatus } from "@/types/board";

type ModalState =
  | { type: "card"; itemId: string }
  | { type: "outcome"; outcomeId: string }
  | { type: "goal"; goalId: string }
  | null;

const COLUMNS: { key: Column; label: string; phase: string }[] = [
  { key: "opportunities", label: "Opportunities", phase: "Discovery" },
  { key: "discovering", label: "Discovering", phase: "Discovery" },
  { key: "ready", label: "Ready", phase: "Transition" },
  { key: "building", label: "Building", phase: "Delivery" },
  { key: "shipped", label: "Shipped", phase: "Delivery" },
  { key: "measuring", label: "Measuring", phase: "Closing the loop" },
];

interface BoardProps {
  boardId?: string;
}

export default function Board({ boardId }: BoardProps) {
  const { state, dispatch } = useBoard();
  const saveStatus = useAutoSave(boardId ?? null, state);
  const { goals, outcomes, items, nudges, discoveryPrompts, focusItems } = state;
  const [modal, setModal] = useState<ModalState>(null);
  const [sparringNudgeId, setSparringNudgeId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<WorkItem | null>(null);
  const [nudgesLoading, setNudgesLoading] = useState(false);
  const [showAgenda, setShowAgenda] = useState(false);
  const [focusLoading, setFocusLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"hierarchy" | "kanban">(
    boardId ? "hierarchy" : "kanban"
  );

  const generateNudges = useCallback(async () => {
    setNudgesLoading(true);
    try {
      const res = await fetch("/api/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardState: state }),
      });
      const data = await res.json();
      if (data.nudges && data.nudges.length > 0) {
        dispatch({ type: "SET_NUDGES", nudges: data.nudges });
      }
    } catch (err) {
      console.error("Failed to generate nudges:", err);
    }
    setNudgesLoading(false);
  }, [state, dispatch]);

  const generateFocusItems = useCallback(async () => {
    setFocusLoading(true);
    try {
      const res = await fetch("/api/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardState: state }),
      });
      const data = await res.json();
      if (data.focusItems && data.focusItems.length > 0) {
        dispatch({ type: "SET_FOCUS_ITEMS", focusItems: data.focusItems });
        setShowAgenda(true); // auto-open on first load
      }
    } catch (err) {
      console.error("Failed to generate focus items:", err);
    }
    setFocusLoading(false);
  }, [state, dispatch]);

  // Generate nudges and focus items on first load for non-demo boards
  useEffect(() => {
    if (boardId && state.nudges.length === 0) {
      generateNudges();
    }
    if (boardId && state.focusItems.length === 0) {
      generateFocusItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

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
    const column = (overId.includes(":") ? overId.split(":")[1] : overId) as Column;
    if (active.id !== overId) {
      dispatch({ type: "MOVE_ITEM", itemId: active.id as string, toColumn: column, toIndex: 0 });
    }
  };

  const getNudgesForItem = (itemId: string) =>
    nudges.filter((n) => n.targetType === "item" && n.targetId === itemId);

  const getDiscoveryPrompts = (itemId: string) =>
    discoveryPrompts.filter((dp) => dp.itemId === itemId);

  const getNudgesForOutcome = (outcomeId: string) =>
    nudges.filter(
      (n) =>
        n.targetType === "outcome" &&
        n.targetId === outcomeId &&
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

  const handleFocusItemClick = useCallback((focusItem: FocusItem) => {
    const el = document.getElementById(focusItem.targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Brief highlight flash
      el.classList.add("ring-2", "ring-indigo-400", "ring-offset-2");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-indigo-400", "ring-offset-2");
      }, 2000);
    }
  }, []);

  const handleStartSparringFromFocus = useCallback((focusItem: FocusItem) => {
    // Check if there's already a nudge targeting the same element
    const existingNudge = nudges.find(n => n.targetId === focusItem.targetId && n.status === "active");
    if (existingNudge) {
      setSparringNudgeId(existingNudge.id);
    } else {
      // Create a synthetic nudge and add it to state
      const syntheticNudge = {
        id: `synth-${focusItem.id}`,
        targetType: focusItem.targetType,
        targetId: focusItem.targetId,
        tier: "visible" as const,
        message: focusItem.whyItMatters,
        question: focusItem.suggestedAction,
        status: "active" as const,
      };
      dispatch({ type: "SET_NUDGES", nudges: [...nudges, syntheticNudge] });
      setSparringNudgeId(syntheticNudge.id);
    }
    setShowAgenda(false); // close agenda when opening sparring
  }, [nudges, dispatch]);

  const handleFocusStatusChange = useCallback((focusItemId: string, status: FocusItemStatus) => {
    dispatch({ type: "UPDATE_FOCUS_ITEM", focusItemId, updates: { status } });
  }, [dispatch]);

  const unlinkedItems = items.filter((i) => i.outcomeId === null);
  const unlinkedOutcomes = outcomes.filter((o) => o.goalId === null);

  const renderItemGrid = (outcomeId: string | null) => (
    <div className="grid grid-cols-6 gap-0 min-h-[60px]">
      {COLUMNS.map((col) => {
        const colItems = getItemsForOutcomeAndColumn(outcomeId, col.key);
        const droppableId = `${outcomeId ?? "unlinked"}:${col.key}`;
        return (
          <DroppableColumn
            key={col.key}
            id={droppableId}
            className="border-r border-gray-100 dark:border-gray-800/50 last:border-r-0 px-2 py-2 space-y-2"
          >
            {colItems.map((item) => (
              <div key={item.id} id={item.id}>
              <DraggableCard id={item.id}>
                <WorkItemCard
                  item={item}
                  nudges={getNudgesForItem(item.id)}
                  discoveryPrompts={getDiscoveryPrompts(item.id)}
                  onClick={() => setModal({ type: "card", itemId: item.id })}
                  onSpar={(nudgeId) => setSparringNudgeId(nudgeId)}
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
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <BoardHeader
        saveStatus={saveStatus}
        boardId={boardId}
        onRefreshNudges={generateNudges}
        nudgesLoading={nudgesLoading}
        onToggleAgenda={boardId ? () => setShowAgenda(!showAgenda) : undefined}
        agendaOpen={showAgenda}
        viewMode={viewMode}
        onViewModeChange={boardId ? setViewMode : undefined}
      />

      {viewMode === "kanban" ? (
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
                        <div key={goal.id} id={goal.id}>
                          {/* Goal header */}
                          <div
                            className="w-full flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-850 transition-colors text-left group cursor-pointer"
                            onClick={() =>
                              setModal({ type: "goal", goalId: goal.id })
                            }
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                dispatch({
                                  type: "TOGGLE_GOAL_COLLAPSE",
                                  goalId: goal.id,
                                });
                              }}
                              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                            >
                              {goal.collapsed ? (
                                <CaretRight
                                  size={14}
                                  weight="bold"
                                  className="text-gray-400"
                                />
                              ) : (
                                <CaretDown
                                  size={14}
                                  weight="bold"
                                  className="text-gray-400"
                                />
                              )}
                            </button>
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
                              {goalOutcomes.length} outcome
                              {goalOutcomes.length !== 1 ? "s" : ""}
                            </span>
                          </div>

                          {/* Outcomes within this goal */}
                          {!goal.collapsed && (
                            <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
                              {goalOutcomes.map((outcome) => (
                                <div key={outcome.id} id={outcome.id}>
                                  {/* Outcome header */}
                                  <div
                                    className="w-full flex items-center gap-2 pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-950 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors text-left cursor-pointer"
                                    onClick={() =>
                                      setModal({
                                        type: "outcome",
                                        outcomeId: outcome.id,
                                      })
                                    }
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch({
                                          type: "TOGGLE_OUTCOME_COLLAPSE",
                                          outcomeId: outcome.id,
                                        });
                                      }}
                                      className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                                    >
                                      {outcome.collapsed ? (
                                        <CaretRight
                                          size={12}
                                          weight="bold"
                                          className="text-gray-400"
                                        />
                                      ) : (
                                        <CaretDown
                                          size={12}
                                          weight="bold"
                                          className="text-gray-400"
                                        />
                                      )}
                                    </button>
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
                                      <span className="text-xs text-gray-400 dark:text-gray-500 italic ml-2">
                                        No measure
                                      </span>
                                    )}
                                  </div>

                                  {/* Outcome-level nudges */}
                                  {getNudgesForOutcome(outcome.id).length > 0 && (
                                    <div className="pl-14 pr-4 pb-2">
                                      {getNudgesForOutcome(outcome.id).map(
                                        (nudge) => (
                                          <NudgeBadge
                                            key={nudge.id}
                                            nudge={nudge}
                                            onSpar={() =>
                                              setSparringNudgeId(nudge.id)
                                            }
                                          />
                                        )
                                      )}
                                    </div>
                                  )}

                                  {/* Column slots for this outcome */}
                                  {!outcome.collapsed && renderItemGrid(outcome.id)}
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
                          {unlinkedItems.length} item
                          {unlinkedItems.length !== 1 ? "s" : ""}
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
                      {renderItemGrid(null)}
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
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-gray-400 text-sm">Hierarchy view coming soon...</p>
        </div>
      )}

      {/* Detail modals */}
      {modal?.type === "card" &&
        (() => {
          const item = items.find((i) => i.id === modal.itemId);
          if (!item) return null;
          const outcome = outcomes.find((o) => o.id === item.outcomeId);
          return (
            <CardDetailModal
              item={item}
              nudges={getNudgesForItem(item.id)}
              discoveryPrompts={getDiscoveryPrompts(item.id)}
              outcomeName={outcome?.statement}
              onClose={() => setModal(null)}
              onSpar={(nudgeId) => setSparringNudgeId(nudgeId)}
            />
          );
        })()}

      {modal?.type === "outcome" &&
        (() => {
          const outcome = outcomes.find((o) => o.id === modal.outcomeId);
          if (!outcome) return null;
          const goal = goals.find((g) => g.id === outcome.goalId);
          const itemCount = items.filter(
            (i) => i.outcomeId === outcome.id
          ).length;
          return (
            <OutcomeDetailModal
              outcome={outcome}
              nudges={getNudgesForOutcome(outcome.id)}
              goalName={goal?.statement}
              itemCount={itemCount}
              onClose={() => setModal(null)}
              onSpar={(nudgeId) => setSparringNudgeId(nudgeId)}
            />
          );
        })()}

      {modal?.type === "goal" &&
        (() => {
          const goal = goals.find((g) => g.id === modal.goalId);
          if (!goal) return null;
          const outcomeCount = outcomes.filter(
            (o) => o.goalId === goal.id
          ).length;
          return (
            <GoalDetailModal
              goal={goal}
              outcomeCount={outcomeCount}
              onClose={() => setModal(null)}
            />
          );
        })()}

      {/* Coaching agenda */}
      {showAgenda && (
        <CoachingAgenda
          focusItems={focusItems}
          isLoading={focusLoading}
          onItemClick={handleFocusItemClick}
          onStatusChange={handleFocusStatusChange}
          onStartSparring={handleStartSparringFromFocus}
          onClose={() => setShowAgenda(false)}
        />
      )}

      {/* Sparring panel */}
      {sparringNudgeId && (() => {
        const nudge = nudges.find((n) => n.id === sparringNudgeId);
        if (!nudge) return null;

        // Look up the target (goal, outcome, or item)
        let target: BusinessGoal | Outcome | WorkItem | undefined;
        if (nudge.targetType === "goal") {
          target = goals.find((g) => g.id === nudge.targetId);
        } else if (nudge.targetType === "outcome") {
          target = outcomes.find((o) => o.id === nudge.targetId);
        } else {
          target = items.find((i) => i.id === nudge.targetId);
        }
        if (!target) return null;

        return (
          <SparringPanel
            nudge={nudge}
            target={target}
            onClose={() => setSparringNudgeId(null)}
            onApply={(suggestion) => {
              if (suggestion.action === "update_outcome" && suggestion.targetId) {
                dispatch({ type: "UPDATE_OUTCOME", outcomeId: suggestion.targetId, updates: suggestion.changes as Partial<Outcome> });
              } else if (suggestion.action === "update_item" && suggestion.targetId) {
                dispatch({ type: "UPDATE_ITEM", itemId: suggestion.targetId, updates: suggestion.changes as Partial<WorkItem> });
              } else if (suggestion.action === "update_goal" && suggestion.targetId) {
                dispatch({ type: "UPDATE_GOAL", goalId: suggestion.targetId, updates: suggestion.changes as Partial<BusinessGoal> });
              }
              setSparringNudgeId(null);
            }}
          />
        );
      })()}
    </div>
  );
}
