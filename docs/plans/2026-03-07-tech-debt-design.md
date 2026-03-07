# Tech Debt: Board.tsx Decomposition + Firestore Error Handling

## Context

Board.tsx is a 797-line monolith that owns drag-and-drop, both view modes, 7+ modal states, helper filter functions, and all panel rendering. firestore.ts has zero error handling across 13 async functions — failures propagate silently with no context.

## Part 1 — Extract KanbanView from Board.tsx

### New file: `src/components/KanbanView.tsx`

Mirrors the existing HierarchyView pattern. Board.tsx becomes a thin shell that picks kanban vs hierarchy and renders modals/panels.

**KanbanView receives via props:**
- `state` (BoardState)
- Click handlers: `onGoalClick`, `onOutcomeClick`, `onItemClick`
- Add handlers: `onAddGoal`, `onAddOutcome(goalId)`, `onAddItem(outcomeId)`
- Reorder handlers: `onReorderGoal(goalId, direction)`, `onReorderOutcome(outcomeId, direction)`
- Collapse handlers: `onToggleGoalCollapse(goalId)`, `onToggleOutcomeCollapse(outcomeId)`
- `onSpar(nudgeId)` for nudge sparring

**KanbanView owns internally:**
- DndContext setup, sensors, handleDragStart, handleDragEnd
- `activeItem` state (for drag overlay)
- `unlinkedCollapsed` state
- Column headers grid
- Goal sections with collapse toggles
- Outcome rows with nudge badges
- Unlinked section
- `renderItemGrid()` helper
- DragOverlay
- All helper filter functions (getNudgesForItem, getItemsForOutcomeAndColumn, etc.)

**Board.tsx keeps:**
- Hook wiring (useBoard, useActivityLog, useAutoSave, useBoardActions)
- viewMode state + toggle
- modal state + setModal (with activity logging)
- sparringNudgeId state
- showAgenda, showBoardSpar states
- BoardHeader rendering
- `viewMode === "kanban" ? <KanbanView /> : <HierarchyView />` switch
- All modal/panel rendering (CardDetailModal, OutcomeDetailModal, GoalDetailModal, SparringPanel, BoardSparringModal, CoachingAgenda, BookmarkToast)

**Result:** Board.tsx ~797 -> ~310 lines. KanbanView ~490 lines.

## Part 2 — Firestore Error Handling

### Pattern

Each async function gets a try/catch that:
1. Logs to console with boardId for debugging
2. Rethrows a new Error with descriptive message + original error message

```typescript
export async function claimBoard(boardId: string, ...): Promise<void> {
  try {
    // existing logic
  } catch (err) {
    console.error(`Failed to claim board ${boardId}:`, err);
    throw new Error(`Failed to claim board: ${err instanceof Error ? err.message : String(err)}`);
  }
}
```

### Functions (all 13)

| Function | Error message |
|----------|--------------|
| createBoard | "Failed to create board" |
| getBoard | "Failed to load board" |
| updateBoardState | "Failed to save board" |
| claimBoard | "Failed to claim board" |
| unclaimBoard | "Failed to unclaim board" |
| updateBoardAccessMode | "Failed to update access mode" |
| addBoardMember | "Failed to add member" |
| removeBoardMember | "Failed to remove member" |
| recordBoardVisitor | "Failed to record visitor" |
| flushActivityEvents | "Failed to flush activity" |
| getAppConfig | "Failed to load config" |
| updateAppConfig | "Failed to update config" |
| getAllBoardsActivity | "Failed to load board activity" |

No caller changes needed. Existing try/catch blocks and fire-and-forget .catch() calls continue working with better messages.

## Verification

1. `npx next build` passes
2. Board loads and displays in kanban mode (drag-drop works)
3. Board loads and displays in hierarchy mode
4. Switching between views works
5. All modals open/close correctly
6. Goal/outcome collapse toggles work
7. Add goal/outcome/item works from both views
