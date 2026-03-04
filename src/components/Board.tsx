"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { useActivityLog } from "@/hooks/useActivityLog";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useBoardActions } from "@/hooks/useBoardActions";
import { handleSparringApply } from "@/lib/sparring";
import { createGoal, createOutcome, createItem } from "@/lib/entities";
import BoardHeader from "./BoardHeader";
import WorkItemCard from "./WorkItemCard";
import DraggableCard from "./DraggableCard";
import DroppableColumn from "./DroppableColumn";
import NudgeBadge from "./NudgeBadge";
import CardDetailModal from "./CardDetailModal";
import OutcomeDetailModal from "./OutcomeDetailModal";
import GoalDetailModal from "./GoalDetailModal";
import SparringPanel from "./SparringPanel";
import BoardSparringModal from "./BoardSparringModal";
import CoachingAgenda from "./CoachingAgenda";
import BookmarkToast from "./BookmarkToast";
import HierarchyView from "./HierarchyView";
import {
  CaretDown,
  CaretRight,
  Target,
  Flag,
  Lightbulb,
  LinkBreak,
  WarningCircle,
  Plus,
} from "@phosphor-icons/react";
import type { Column, WorkItem, BusinessGoal, Outcome } from "@/types/board";

type ModalState =
  | { type: "card"; itemId: string }
  | { type: "outcome"; outcomeId: string }
  | { type: "goal"; goalId: string }
  | null;

const COLUMNS: { key: Column; label: string; phase: string; phaseColor: string }[] = [
  { key: "opportunities", label: "Opportunities", phase: "Discovery", phaseColor: "text-purple-500 dark:text-purple-400" },
  { key: "discovering", label: "Discovering", phase: "Discovery", phaseColor: "text-purple-500 dark:text-purple-400" },
  { key: "ready", label: "Ready for Building", phase: "Transition", phaseColor: "text-amber-500 dark:text-amber-400" },
  { key: "building", label: "Building", phase: "Delivery", phaseColor: "text-teal-500 dark:text-teal-400" },
  { key: "shipped", label: "Shipped", phase: "Delivery", phaseColor: "text-teal-500 dark:text-teal-400" },
  { key: "measuring", label: "Measuring", phase: "Closing the loop", phaseColor: "text-emerald-500 dark:text-emerald-400" },
];

interface BoardProps {
  boardId?: string;
}

export default function Board({ boardId }: BoardProps) {
  const { state, dispatch: rawDispatch } = useBoard();
  const { logEvent, wrapDispatch } = useActivityLog(boardId);
  const stateRef = useRef(state);
  stateRef.current = state;
  const dispatch = wrapDispatch(rawDispatch, () => stateRef.current);
  const saveStatus = useAutoSave(boardId ?? null, state);
  const { goals, outcomes, items, nudges, discoveryPrompts, focusItems } = state;
  const [modal, setModalRaw] = useState<ModalState>(null);
  const setModal = useCallback(
    (newModal: ModalState) => {
      if (newModal) {
        logEvent("open_modal", {
          targetType: newModal.type === "card" ? "item" : newModal.type === "outcome" ? "outcome" : "goal",
          targetId: newModal.type === "card" ? newModal.itemId : newModal.type === "outcome" ? newModal.outcomeId : newModal.goalId,
          details: { modalType: newModal.type },
        });
      } else if (modal) {
        logEvent("close_modal", {
          details: { modalType: modal.type },
        });
      }
      setModalRaw(newModal);
    },
    [logEvent, modal]
  );
  const [sparringNudgeId, setSparringNudgeIdRaw] = useState<string | null>(null);
  const setSparringNudgeId = useCallback(
    (nudgeId: string | null) => {
      if (nudgeId) {
        logEvent("start_sparring", {
          targetType: "nudge",
          targetId: nudgeId,
        });
      }
      setSparringNudgeIdRaw(nudgeId);
    },
    [logEvent]
  );
  const [activeItem, setActiveItem] = useState<WorkItem | null>(null);
  const [showAgenda, setShowAgenda] = useState(false);
  const [showBoardSpar, setShowBoardSpar] = useState(false);
  const [viewMode, setViewMode] = useState<"hierarchy" | "kanban">(
    boardId ? "hierarchy" : "kanban"
  );
  const [unlinkedCollapsed, setUnlinkedCollapsed] = useState(false);

  const {
    nudgesLoading,
    focusLoading,
    focusError,
    boardStrengths,
    generateNudges,
    generateFocusItems,
    handleFocusItemClick,
    handleStartSparringFromFocus,
    handleFocusStatusChange,
  } = useBoardActions();

  // Generate nudges and focus items on first load for non-demo boards
  useEffect(() => {
    if (!boardId) return;

    if (state.nudges.length === 0) {
      generateNudges();
    }
    if (state.focusItems.length === 0) {
      console.log("[Board] Auto-generating focus items for new board...");
      generateFocusItems().then((loaded) => {
        console.log("[Board] Focus items loaded:", loaded);
        if (loaded) setShowAgenda(true);
      }).catch((err) => {
        console.error("[Board] Focus generation failed:", err);
      });
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
        productName={state.productName}
        onRefreshNudges={generateNudges}
        nudgesLoading={nudgesLoading}
        onToggleAgenda={
          boardId
            ? () => {
                logEvent(showAgenda ? "close_agenda" : "open_agenda");
                if (!showAgenda && focusItems.length === 0 && !focusLoading) {
                  // Auto-generate focus items when opening empty agenda
                  generateFocusItems();
                }
                setShowAgenda(!showAgenda);
              }
            : undefined
        }
        agendaOpen={showAgenda}
        viewMode={viewMode}
        onViewModeChange={
          boardId
            ? (mode: "hierarchy" | "kanban") => {
                logEvent("switch_view", {
                  details: { from: viewMode, to: mode },
                });
                setViewMode(mode);
              }
            : undefined
        }
        onBoardSpar={
          boardId
            ? () => {
                logEvent("open_board_spar");
                setShowBoardSpar(true);
              }
            : undefined
        }
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
                            className="w-full flex items-center gap-2 px-4 py-3.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors text-left group cursor-pointer border-l-4 border-l-indigo-500 dark:border-l-indigo-400"
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
                          </div>

                          {/* Outcomes within this goal */}
                          {!goal.collapsed && (
                            <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
                              {goalOutcomes.map((outcome) => (
                                <div key={outcome.id} id={outcome.id} className="mx-2 mb-2 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
                                  {/* Outcome header */}
                                  <div
                                    className="w-full flex items-center gap-2 pl-10 pr-4 py-2 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-850 transition-colors text-left cursor-pointer border-l-[3px] border-l-teal-400 dark:border-l-teal-500"
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
                                    <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                                      {outcome.statement}
                                    </span>
                                    {outcome.measureOfSuccess && (
                                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 truncate max-w-xs">
                                        {outcome.measureOfSuccess}
                                      </span>
                                    )}
                                    {!outcome.measureOfSuccess && (
                                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium ml-2 flex items-center gap-1">
                                        <WarningCircle size={12} weight="fill" />
                                        Mittari puuttuu!
                                      </span>
                                    )}
                                    {getNudgesForOutcome(outcome.id).length > 0 && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 ml-auto flex-shrink-0">
                                        <Lightbulb size={11} weight="fill" />
                                        {getNudgesForOutcome(outcome.id).length} AI
                                      </span>
                                    )}
                                  </div>

                                  {/* Outcome-level nudge — show only the highest-priority one, collapsed */}
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
                                          onSpar={() =>
                                            setSparringNudgeId(topNudge.id)
                                          }
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
                                            const newItem = createItem(outcome.id, {
                                              order: items.filter(i => i.outcomeId === outcome.id).length,
                                            });
                                            dispatch({ type: "ADD_ITEM", item: newItem });
                                            setModal({ type: "card", itemId: newItem.id });
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
                                    const newOutcome = createOutcome(goal.id, { order: goalOutcomes.length });
                                    dispatch({ type: "ADD_OUTCOME", outcome: newOutcome });
                                    setModal({ type: "outcome", outcomeId: newOutcome.id });
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
                      onClick={() => {
                        const newGoal = createGoal({ order: goals.length });
                        dispatch({ type: "ADD_GOAL", goal: newGoal });
                        setModal({ type: "goal", goalId: newGoal.id });
                      }}
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
                              onClick={() => {
                                const newItem = createItem(null, { order: unlinkedItems.length });
                                dispatch({ type: "ADD_ITEM", item: newItem });
                                setModal({ type: "card", itemId: newItem.id });
                              }}
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
      ) : (
        <HierarchyView
          state={state}
          onGoalClick={(goalId) => setModal({ type: "goal", goalId })}
          onOutcomeClick={(outcomeId) => setModal({ type: "outcome", outcomeId })}
          onItemClick={(itemId) => setModal({ type: "card", itemId })}
          onAddGoal={() => {
            const newGoal = createGoal({ order: goals.length });
            dispatch({ type: "ADD_GOAL", goal: newGoal });
            setModal({ type: "goal", goalId: newGoal.id });
          }}
          onAddOutcome={(goalId) => {
            const newOutcome = createOutcome(goalId, {
              order: outcomes.filter(o => o.goalId === goalId).length,
            });
            dispatch({ type: "ADD_OUTCOME", outcome: newOutcome });
            setModal({ type: "outcome", outcomeId: newOutcome.id });
          }}
          onAddItem={(outcomeId) => {
            const newItem = createItem(outcomeId, {
              order: items.filter(i => i.outcomeId === outcomeId).length,
            });
            dispatch({ type: "ADD_ITEM", item: newItem });
            setModal({ type: "card", itemId: newItem.id });
          }}
        />
      )}

      {/* Detail modals */}
      {modal?.type === "card" &&
        (() => {
          const item = items.find((i) => i.id === modal.itemId);
          if (!item) return null;
          return (
            <CardDetailModal
              item={item}
              nudges={getNudgesForItem(item.id)}
              discoveryPrompts={getDiscoveryPrompts(item.id)}
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
              nudges={getNudgesForGoal(goal.id)}
              outcomeCount={outcomeCount}
              onClose={() => setModal(null)}
              onSpar={(nudgeId) => setSparringNudgeId(nudgeId)}
            />
          );
        })()}

      {/* Coaching agenda */}
      {showAgenda && (
        <CoachingAgenda
          focusItems={focusItems}
          boardStrengths={boardStrengths}
          isLoading={focusLoading}
          hasError={focusError}
          onItemClick={handleFocusItemClick}
          onStatusChange={handleFocusStatusChange}
          onStartSparring={(focusItem) => {
            const nudgeId = handleStartSparringFromFocus(focusItem);
            setSparringNudgeId(nudgeId);
            setShowAgenda(false);
          }}
          onRefresh={generateFocusItems}
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
              handleSparringApply(suggestion, nudge, items, dispatch);
              setSparringNudgeId(null);
            }}
          />
        );
      })()}

      {/* Board-level sparring modal */}
      {showBoardSpar && (
        <BoardSparringModal onClose={() => setShowBoardSpar(false)} />
      )}

      {boardId && <BookmarkToast boardId={boardId} />}
    </div>
  );
}
