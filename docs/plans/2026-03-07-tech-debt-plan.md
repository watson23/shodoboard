# Tech Debt: Board.tsx Decomposition + Firestore Error Handling

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Break up the 797-line Board.tsx monolith into Board + KanbanView, and add wrap-and-rethrow error handling to all 13 Firestore functions.

**Architecture:** Extract the kanban view (DndContext, column headers, goal/outcome sections, unlinked section, drag overlay) into a standalone KanbanView component that mirrors HierarchyView's prop interface. Wrap every async function in firestore.ts with try/catch that logs and rethrows with context.

**Tech Stack:** React 19, Next.js 16, TypeScript 5, @dnd-kit, Firebase/Firestore

---

### Task 1: Create KanbanView component

**Files:**
- Create: `src/components/KanbanView.tsx`

**Step 1: Create KanbanView.tsx with the full kanban implementation**

Extract from Board.tsx (lines 1-244, 282-651) into a new component. The component:

1. Defines its own props interface mirroring HierarchyView:

```typescript
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
  onSpar?: (nudgeId: string) => void;
}
```

2. Moves these imports from Board.tsx:
   - `DndContext`, `PointerSensor`, `useSensor`, `useSensors`, `DragOverlay`, `DragStartEvent`, `DragEndEvent` from `@dnd-kit/core`
   - `WorkItemCard`, `DraggableCard`, `DroppableColumn`, `NudgeBadge`
   - `CaretDown`, `CaretRight`, `CaretUp`, `Target`, `Flag`, `Lightbulb`, `LinkBreak`, `WarningCircle`, `Plus` from `@phosphor-icons/react`
   - Type imports: `Column`, `WorkItem` from `@/types/board`

3. Moves the `COLUMNS` constant from Board.tsx.

4. Moves these internal pieces from Board.tsx:
   - `activeItem` state (useState)
   - `unlinkedCollapsed` state (useState)
   - `sensors` setup (useSensors/useSensor)
   - `handleDragStart` function
   - `handleDragEnd` function — note: currently calls `dispatch()` directly. Change to call a new `onMoveItem` prop callback, OR compute the move and dispatch via a callback. Simplest: add `onMoveItem?: (itemId: string, toColumn: Column, toOutcomeId?: string | null) => void` to props.
   - Helper functions: `getNudgesForItem`, `getDiscoveryPrompts`, `getFocusItemForTarget`, `getNudgesForOutcome`, `getNudgesForGoal`, `getItemsForOutcomeAndColumn`, `getColumnItemCount`
   - `unlinkedItems` and `unlinkedOutcomes` derived values
   - `renderItemGrid` function

5. The JSX from Board.tsx lines 283-651 (the `<DndContext>` block) becomes the return value.

6. Replace all inline `dispatch()` calls in the JSX with callback props:
   - `dispatch({ type: "TOGGLE_GOAL_COLLAPSE", goalId })` -> `onToggleGoalCollapse?.(goalId)`
   - `dispatch({ type: "TOGGLE_OUTCOME_COLLAPSE", outcomeId })` -> `onToggleOutcomeCollapse?.(outcomeId)`
   - `dispatch({ type: "REORDER_GOAL", goalId, direction })` -> `onReorderGoal?.(goalId, direction)`
   - `dispatch({ type: "REORDER_OUTCOME", outcomeId, direction })` -> `onReorderOutcome?.(outcomeId, direction)`
   - `setModal({ type: "goal", goalId })` -> `onGoalClick(goalId)`
   - `setModal({ type: "outcome", outcomeId })` -> `onOutcomeClick(outcomeId)`
   - `setModal({ type: "card", itemId })` -> `onItemClick(itemId)`
   - `setSparringNudgeId(nudgeId)` -> `onSpar?.(nudgeId)`
   - Add items: use `onAddGoal?.()`, `onAddOutcome?.(goalId)`, `onAddItem?.(outcomeId)`

7. For drag-end move: the `handleDragEnd` currently dispatches `MOVE_ITEM`. Add a prop:
   ```typescript
   onMoveItem?: (itemId: string, toColumn: Column, toIndex: number, toOutcomeId?: string | null) => void;
   ```
   And call it instead of `dispatch`.

8. For add-item-then-open-modal pattern (e.g., create item + open detail modal), the add callbacks already create the entity in Board.tsx and then call `setModal`. So KanbanView just calls `onAddItem?.(outcomeId)` and Board.tsx handles both creating and opening the modal (same as HierarchyView does today).

**Step 2: Verify the file compiles**

Run: `npx next build`
Expected: Build succeeds (KanbanView is created but not yet imported anywhere)

**Step 3: Commit**

```bash
git add src/components/KanbanView.tsx
git commit -m "feat: create KanbanView component extracted from Board.tsx"
```

---

### Task 2: Slim down Board.tsx to use KanbanView

**Files:**
- Modify: `src/components/Board.tsx`

**Step 1: Update Board.tsx imports**

Remove imports that moved to KanbanView:
- Remove: `DndContext`, `PointerSensor`, `useSensor`, `useSensors`, `DragOverlay`, `DragStartEvent`, `DragEndEvent`
- Remove: `DraggableCard`, `DroppableColumn`, `NudgeBadge`
- Remove: `CaretDown`, `CaretRight`, `CaretUp`, `Target`, `Flag`, `Lightbulb`, `LinkBreak`, `WarningCircle`, `Plus`
- Remove: `WorkItemCard`
- Add: `import KanbanView from "./KanbanView";`
- Keep: `WorkItem` type import (still needed for SparringPanel target lookup)

**Step 2: Remove moved code from Board.tsx**

Remove from the component body:
- `activeItem` state
- `unlinkedCollapsed` state
- `sensors` setup
- `handleDragStart` and `handleDragEnd`
- All helper functions: `getNudgesForItem`, `getDiscoveryPrompts`, `getFocusItemForTarget`, `getNudgesForOutcome`, `getNudgesForGoal`, `getItemsForOutcomeAndColumn`, `getColumnItemCount`
- `unlinkedItems` and `unlinkedOutcomes` derived values
- `renderItemGrid` function
- The `COLUMNS` constant (now in KanbanView)
- The `ModalState` type stays (still used by Board)

**Step 3: Replace kanban JSX with KanbanView**

Replace the entire `viewMode === "kanban" ? ( <>...<DndContext>...</DndContext></> )` block (lines 282-652) with:

```tsx
viewMode === "kanban" ? (
  <KanbanView
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
    onReorderGoal={(goalId, direction) => {
      dispatch({ type: "REORDER_GOAL", goalId, direction });
    }}
    onReorderOutcome={(outcomeId, direction) => {
      dispatch({ type: "REORDER_OUTCOME", outcomeId, direction });
    }}
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
    onSpar={(nudgeId) => setSparringNudgeId(nudgeId)}
  />
) : (
  // HierarchyView stays exactly as-is
```

**Note:** Board.tsx still needs `getNudgesForItem`, `getDiscoveryPrompts`, `getNudgesForOutcome`, `getNudgesForGoal` for rendering modals (CardDetailModal, OutcomeDetailModal, GoalDetailModal) and the SparringPanel target lookup. Keep these helper functions in Board.tsx — they're small (1-2 lines each) and used by the modal rendering code. KanbanView will have its own copies internally (derived from `state` prop). This is acceptable duplication — both are pure filter functions over the state.

Actually, to avoid duplication: move these helpers into a small utility, OR just keep them in both places since they are trivial one-liners. Keeping them in both is simpler and avoids an extra file.

**Step 4: Verify build passes**

Run: `npx next build`
Expected: Build succeeds with no TypeScript errors

**Step 5: Commit**

```bash
git add src/components/Board.tsx
git commit -m "refactor: slim Board.tsx by delegating kanban view to KanbanView component"
```

---

### Task 3: Add error handling to firestore.ts

**Files:**
- Modify: `src/lib/firestore.ts`

**Step 1: Wrap all 13 functions with try/catch**

Apply this pattern to every async function:

```typescript
export async function functionName(boardId: string, ...args): Promise<ReturnType> {
  try {
    // existing function body (unchanged)
  } catch (err) {
    console.error(`Failed to <action> ${boardId}:`, err);
    throw new Error(`Failed to <action>: ${err instanceof Error ? err.message : String(err)}`);
  }
}
```

Specific error messages per function:

1. **createBoard** — no boardId available, use "Failed to create board" in both console and throw
2. **getBoard** — `Failed to load board ${boardId}`
3. **updateBoardState** — `Failed to save board ${boardId}`
4. **claimBoard** — `Failed to claim board ${boardId}`
5. **unclaimBoard** — `Failed to unclaim board ${boardId}`
6. **updateBoardAccessMode** — `Failed to update access mode for board ${boardId}`
7. **addBoardMember** — `Failed to add member to board ${boardId}`
8. **removeBoardMember** — `Failed to remove member from board ${boardId}`
9. **recordBoardVisitor** — `Failed to record visitor for board ${boardId}`
10. **flushActivityEvents** — `Failed to flush activity for board ${boardId}`
11. **getAppConfig** — no boardId, use "Failed to load app config"
12. **updateAppConfig** — no boardId, use "Failed to update app config"
13. **getAllBoardsActivity** — no boardId, use "Failed to load board activity"

**Important:** For `createBoard`, the existing inner try/catch for `getAppConfig()` stays as-is (it has its own fallback). The outer try/catch wraps the entire function including the `setDoc` call.

**Step 2: Verify build passes**

Run: `npx next build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/firestore.ts
git commit -m "fix: add error handling with context to all Firestore operations"
```

---

### Task 4: Final verification

**Step 1: Run full build**

Run: `npx next build`
Expected: Build succeeds with no warnings related to our changes

**Step 2: Verify no regressions visually (if dev server available)**

Check:
- Board loads in kanban mode, drag-drop works
- Board loads in hierarchy mode
- Switching between views works
- Goal/outcome collapse toggles work
- Add goal/outcome/item works from both views
- All modals open/close correctly
- Sparring panel opens from nudge badges

**Step 3: Final commit if any fixups needed, then push**

```bash
git push
```
