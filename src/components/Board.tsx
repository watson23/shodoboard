"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useBoard } from "@/hooks/useBoard";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useBoardActions } from "@/hooks/useBoardActions";
import { handleSparringApply } from "@/lib/sparring";
import { createGoal, createOutcome, createItem } from "@/lib/entities";
import BoardHeader from "./BoardHeader";
import KanbanView from "./KanbanView";
import CardDetailModal from "./CardDetailModal";
import OutcomeDetailModal from "./OutcomeDetailModal";
import GoalDetailModal from "./GoalDetailModal";
import SparringPanel from "./SparringPanel";
import BoardSparringModal from "./BoardSparringModal";
import CoachingAgenda from "./CoachingAgenda";
import BookmarkToast from "./BookmarkToast";
import HierarchyView from "./HierarchyView";
import type { WorkItem, BusinessGoal, Outcome } from "@/types/board";

type ModalState =
  | { type: "card"; itemId: string }
  | { type: "outcome"; outcomeId: string }
  | { type: "goal"; goalId: string }
  | null;

interface BoardProps {
  boardId?: string;
  ownerId?: string;
  ownerEmail?: string;
  accessMode?: "link" | "invite_only";
  members?: import("@/lib/firestore").BoardMember[];
  recentVisitors?: import("@/lib/firestore").BoardVisitor[];
  onOwnershipChange?: (ownerId: string | undefined, ownerEmail: string | undefined) => void;
  onAccessChange?: (accessMode: "link" | "invite_only", members: import("@/lib/firestore").BoardMember[]) => void;
}

export default function Board({ boardId, ownerId, ownerEmail, accessMode, members, recentVisitors, onOwnershipChange, onAccessChange }: BoardProps) {
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
  const [showAgenda, setShowAgenda] = useState(false);
  const [showBoardSpar, setShowBoardSpar] = useState(false);
  const [viewMode, setViewMode] = useState<"hierarchy" | "kanban">("hierarchy");

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

  // Generate nudges and focus items on first load
  useEffect(() => {
    if (state.nudges.length === 0) {
      generateNudges();
    }
    if (state.focusItems.length === 0) {
      console.log("[Board] Auto-generating focus items...");
      generateFocusItems().then((loaded) => {
        console.log("[Board] Focus items loaded:", loaded);
        if (loaded) setShowAgenda(true);
      }).catch((err) => {
        console.error("[Board] Focus generation failed:", err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const getNudgesForGoal = (goalId: string) =>
    nudges.filter(
      (n) =>
        n.targetType === "goal" &&
        n.targetId === goalId &&
        n.status === "active"
    );

  // Shared callbacks for KanbanView and HierarchyView
  const onGoalClick = (goalId: string) => setModal({ type: "goal", goalId });

  const onOutcomeClick = (outcomeId: string) =>
    setModal({ type: "outcome", outcomeId });

  const onItemClick = (itemId: string) =>
    setModal({ type: "card", itemId });

  const onAddGoal = () => {
    const newGoal = createGoal({ order: goals.length });
    dispatch({ type: "ADD_GOAL", goal: newGoal });
    setModal({ type: "goal", goalId: newGoal.id });
  };

  const onAddOutcome = (goalId: string) => {
    const newOutcome = createOutcome(goalId, {
      order: outcomes.filter(o => o.goalId === goalId).length,
    });
    dispatch({ type: "ADD_OUTCOME", outcome: newOutcome });
    setModal({ type: "outcome", outcomeId: newOutcome.id });
  };

  const onAddItem = (outcomeId: string | null) => {
    const newItem = createItem(outcomeId, {
      order: items.filter(i => i.outcomeId === outcomeId).length,
    });
    dispatch({ type: "ADD_ITEM", item: newItem });
    setModal({ type: "card", itemId: newItem.id });
  };

  const onReorderGoal = (goalId: string, direction: "up" | "down") => {
    dispatch({ type: "REORDER_GOAL", goalId, direction });
  };

  const onReorderOutcome = (outcomeId: string, direction: "up" | "down") => {
    dispatch({ type: "REORDER_OUTCOME", outcomeId, direction });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <BoardHeader
        saveStatus={saveStatus}
        boardId={boardId}
        productName={state.productName}
        ownerId={ownerId}
        ownerEmail={ownerEmail}
        accessMode={accessMode}
        members={members}
        recentVisitors={recentVisitors}
        onOwnershipChange={onOwnershipChange}
        onAccessChange={onAccessChange}
        onRefreshNudges={generateNudges}
        nudgesLoading={nudgesLoading}
        onToggleAgenda={() => {
          logEvent(showAgenda ? "close_agenda" : "open_agenda");
          if (!showAgenda && focusItems.length === 0 && !focusLoading) {
            generateFocusItems();
          }
          setShowAgenda(!showAgenda);
        }}
        agendaOpen={showAgenda}
        viewMode={viewMode}
        onViewModeChange={(mode: "hierarchy" | "kanban") => {
          logEvent("switch_view", {
            details: { from: viewMode, to: mode },
          });
          setViewMode(mode);
        }}
        onBoardSpar={() => {
          logEvent("open_board_spar");
          setShowBoardSpar(true);
        }}
      />

      {viewMode === "kanban" ? (
        <KanbanView
          state={state}
          onGoalClick={onGoalClick}
          onOutcomeClick={onOutcomeClick}
          onItemClick={onItemClick}
          onAddGoal={onAddGoal}
          onAddOutcome={onAddOutcome}
          onAddItem={onAddItem}
          onReorderGoal={onReorderGoal}
          onReorderOutcome={onReorderOutcome}
          onToggleGoalCollapse={(goalId) => {
            dispatch({ type: "TOGGLE_GOAL_COLLAPSE", goalId });
          }}
          onToggleOutcomeCollapse={(outcomeId) => {
            dispatch({ type: "TOGGLE_OUTCOME_COLLAPSE", outcomeId });
          }}
          onMoveItem={(itemId, toColumn, toIndex, toOutcomeId) => {
            dispatch({
              type: "MOVE_ITEM",
              itemId,
              toColumn,
              toIndex,
              ...(toOutcomeId !== undefined ? { toOutcomeId } : {}),
            });
          }}
          onSpar={setSparringNudgeId}
        />
      ) : (
        <HierarchyView
          state={state}
          onGoalClick={onGoalClick}
          onOutcomeClick={onOutcomeClick}
          onItemClick={onItemClick}
          onAddGoal={onAddGoal}
          onAddOutcome={onAddOutcome}
          onAddItem={onAddItem}
          onReorderGoal={onReorderGoal}
          onReorderOutcome={onReorderOutcome}
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
            boardState={state}
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
