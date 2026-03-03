# Batch 4: Tree View Polish + UX Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the tree view with proper SVG connectors, improve nudge visibility with orange colors, add typed sub-task checklists, simplify type badges, improve drag handles, add copy-link for board return, and show coaching focus banners inline on boards.

**Architecture:** 7 independent visual/UX changes. Bottom-up: data model changes first (checklist type), then component changes, then layout changes (SVG connectors last). Each task is independently buildable. No test framework — verify with `npx next build`.

**Tech Stack:** React 19, Next.js 16, TypeScript, Tailwind CSS v4, Phosphor Icons

---

### Task 1: Simplify TypeBadge — single label instead of split pill

**Files:**
- Modify: `src/components/TypeBadge.tsx`

**Step 1: Rewrite TypeBadge to show single label**

Replace the entire content of `src/components/TypeBadge.tsx` with:

```tsx
import type { ItemType } from "@/types/board";

interface TypeBadgeProps {
  type: ItemType;
  compact?: boolean;
}

export default function TypeBadge({ type, compact = false }: TypeBadgeProps) {
  if (compact) {
    return (
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          type === "discovery"
            ? "bg-purple-500 dark:bg-purple-400"
            : "bg-teal-500 dark:bg-teal-400"
        }`}
        title={type === "discovery" ? "Discovery" : "Delivery"}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
        type === "discovery"
          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
          : "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          type === "discovery"
            ? "bg-purple-500 dark:bg-purple-400"
            : "bg-teal-500 dark:bg-teal-400"
        }`}
      />
      {type === "discovery" ? "Discovery" : "Delivery"}
    </span>
  );
}
```

**Step 2: Update HierarchyView ItemRow to use compact mode**

In `src/components/HierarchyView.tsx`, change the ItemRow's TypeBadge usage from:
```tsx
<TypeBadge type={item.type} />
```
To:
```tsx
<TypeBadge type={item.type} compact />
```

Also update the unlinked items section (around line 239) the same way:
```tsx
<TypeBadge type={item.type} compact />
```

**Step 3: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 4: Commit**

```bash
git add src/components/TypeBadge.tsx src/components/HierarchyView.tsx
git commit -m "refactor: simplify TypeBadge — single label with compact dot mode for tree view"
```

---

### Task 2: Nudge color migration — indigo to orange + tree view indicators

**Files:**
- Modify: `src/components/NudgeBadge.tsx`
- Modify: `src/components/HierarchyView.tsx`

**Step 1: Change NudgeBadge colors from indigo to orange**

In `src/components/NudgeBadge.tsx`, make these replacements throughout the file:

- `bg-indigo-400 dark:bg-indigo-500` → `bg-orange-400 dark:bg-orange-500` (quiet dot)
- `bg-indigo-50/60 dark:bg-indigo-950/20` → `bg-orange-50/60 dark:bg-orange-950/20` (banner bg + expanded bg)
- `border-indigo-100 dark:border-indigo-800/30` → `border-orange-200 dark:border-orange-800/30` (borders)
- `text-indigo-600 dark:text-indigo-400` → `text-orange-600 dark:text-orange-400` (banner text)
- `text-indigo-700 dark:text-indigo-300` → `text-orange-700 dark:text-orange-300` (expanded text)
- `hover:text-indigo-800 dark:hover:text-indigo-200` → `hover:text-orange-800 dark:hover:text-orange-200` (hover)
- `text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300` → `text-orange-400 hover:text-orange-600 dark:hover:text-orange-300` (X close)
- `bg-indigo-100 dark:bg-indigo-900/40` → `bg-orange-100 dark:bg-orange-900/40` (spar button bg)
- `text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300` → `text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300` (spar button text)

Essentially: replace all `indigo` with `orange` in the NudgeBadge file. But be careful to keep the structural class names unchanged.

**Step 2: Add nudge indicators to tree view**

In `src/components/HierarchyView.tsx`:

Add a new prop to the component interface and update the component signature:
```typescript
interface HierarchyViewProps {
  state: BoardState;
  onGoalClick: (goalId: string) => void;
  onOutcomeClick: (outcomeId: string) => void;
  onItemClick: (itemId: string) => void;
  onAddGoal?: () => void;
  onAddOutcome?: (goalId: string) => void;
  onAddItem?: (outcomeId: string | null) => void;
}
```

Add `import type { Nudge } from "@/types/board";` to the existing type imports (the Nudge type is in the board import, so change to):
```typescript
import type { BoardState, BusinessGoal, Outcome, WorkItem, Nudge } from "@/types/board";
```

In the `OutcomeCard` sub-component, add a `nudgeCount` prop:

```typescript
function OutcomeCard({
  outcome,
  items,
  nudgeCount,
  onOutcomeClick,
  onItemClick,
  onAddItem,
}: {
  outcome: Outcome;
  items: WorkItem[];
  nudgeCount: number;
  onOutcomeClick: () => void;
  onItemClick: (itemId: string) => void;
  onAddItem?: () => void;
}) {
```

Inside OutcomeCard's header section, after the outcome statement `<p>` tag, add:
```tsx
{nudgeCount > 0 && (
  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600 dark:text-orange-400 mt-1">
    <span className="w-2 h-2 rounded-full bg-orange-400 dark:bg-orange-500" />
    {nudgeCount} nudge{nudgeCount !== 1 ? "s" : ""}
  </span>
)}
```

In the `ItemRow` sub-component, add a `hasNudge` prop:

```typescript
function ItemRow({ item, hasNudge, onClick }: { item: WorkItem; hasNudge: boolean; onClick: () => void }) {
```

Inside ItemRow, after the column status dot, add:
```tsx
{hasNudge && (
  <span className="w-2 h-2 rounded-full bg-orange-400 dark:bg-orange-500 flex-shrink-0" title="AI nudge" />
)}
```

In the main `HierarchyView` component, add a helper:
```typescript
const { goals, outcomes, items, nudges } = state;

const getActiveNudgeCount = (targetId: string) =>
  (nudges || []).filter((n) => n.targetId === targetId && n.status === "active").length;
```

Update the `OutcomeCard` usage to pass `nudgeCount`:
```tsx
<OutcomeCard
  outcome={outcome}
  items={getItemsForOutcome(outcome.id)}
  nudgeCount={getActiveNudgeCount(outcome.id)}
  onOutcomeClick={() => onOutcomeClick(outcome.id)}
  onItemClick={onItemClick}
  onAddItem={onAddItem ? () => onAddItem(outcome.id) : undefined}
/>
```

Update `ItemRow` usage to pass `hasNudge`:
```tsx
<ItemRow key={item.id} item={item} hasNudge={getActiveNudgeCount(item.id) > 0} onClick={() => onItemClick(item.id)} />
```

**Step 3: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 4: Commit**

```bash
git add src/components/NudgeBadge.tsx src/components/HierarchyView.tsx
git commit -m "feat: nudge color migration to orange + tree view nudge indicators"
```

---

### Task 3: Improve drag handle visibility

**Files:**
- Modify: `src/components/DraggableCard.tsx`

**Step 1: Update drag handle styling**

In `src/components/DraggableCard.tsx`, change the drag handle `<div>` from:
```tsx
className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center opacity-20 group-hover/drag:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
```
To:
```tsx
className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center opacity-40 group-hover/drag:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
```

Change the icon size from `size={14}` to `size={18}`.

**Step 2: Add left padding to WorkItemCard content**

In `src/components/WorkItemCard.tsx`, change the main content div from:
```tsx
<div className="px-3 py-2">
```
To:
```tsx
<div className="pl-7 pr-3 py-2">
```

**Step 3: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 4: Commit**

```bash
git add src/components/DraggableCard.tsx src/components/WorkItemCard.tsx
git commit -m "fix: improve drag handle visibility — wider hit area, higher base opacity"
```

---

### Task 4: Add typed sub-task checklists

**Files:**
- Modify: `src/types/board.ts`
- Modify: `src/hooks/useBoard.ts`
- Modify: `src/components/CardDetailModal.tsx`
- Modify: `src/components/WorkItemCard.tsx`
- Modify: `src/components/HierarchyView.tsx`

**Step 1: Add ChecklistItem type and extend WorkItem**

In `src/types/board.ts`, add after the `WorkItem` interface:

```typescript
export interface ChecklistItem {
  id: string;
  text: string;
  type: ItemType;
  done: boolean;
}
```

Add `checklist?: ChecklistItem[];` to the `WorkItem` interface (after the `order` field).

**Step 2: Add checklist reducer actions**

In `src/hooks/useBoard.ts`, add three new actions to the `BoardAction` union type:

```typescript
| { type: "ADD_CHECKLIST_ITEM"; itemId: string; checklistItem: ChecklistItem }
| { type: "UPDATE_CHECKLIST_ITEM"; itemId: string; checklistItemId: string; updates: Partial<ChecklistItem> }
| { type: "REMOVE_CHECKLIST_ITEM"; itemId: string; checklistItemId: string }
```

Add the `ChecklistItem` to the import from `@/types/board`.

Add these three cases to the `boardReducer` switch, before the `default` case:

```typescript
case "ADD_CHECKLIST_ITEM": {
  const items = state.items.map((item) =>
    item.id === action.itemId
      ? { ...item, checklist: [...(item.checklist || []), action.checklistItem] }
      : item
  );
  return { ...state, items };
}

case "UPDATE_CHECKLIST_ITEM": {
  const items = state.items.map((item) =>
    item.id === action.itemId
      ? {
          ...item,
          checklist: (item.checklist || []).map((ci) =>
            ci.id === action.checklistItemId ? { ...ci, ...action.updates } : ci
          ),
        }
      : item
  );
  return { ...state, items };
}

case "REMOVE_CHECKLIST_ITEM": {
  const items = state.items.map((item) =>
    item.id === action.itemId
      ? { ...item, checklist: (item.checklist || []).filter((ci) => ci.id !== action.checklistItemId) }
      : item
  );
  return { ...state, items };
}
```

**Step 3: Add checklist UI to CardDetailModal**

In `src/components/CardDetailModal.tsx`:

Add imports at top:
```typescript
import { Plus, X as XIcon, Check } from "@phosphor-icons/react";
import { generateId } from "@/lib/utils";
import type { WorkItem, Nudge, DiscoveryPrompt, Column, ChecklistItem } from "@/types/board";
```

After the `{/* Assignee */}` section and before the `{/* Nudges */}` section, add:

```tsx
{/* Checklist */}
<div>
  <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
    Checklist
  </label>
  <div className="space-y-1">
    {(item.checklist || []).map((ci) => (
      <div key={ci.id} className="flex items-center gap-2 group/ci">
        <button
          onClick={() =>
            dispatch({
              type: "UPDATE_CHECKLIST_ITEM",
              itemId: item.id,
              checklistItemId: ci.id,
              updates: { done: !ci.done },
            })
          }
          className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
            ci.done
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
          }`}
        >
          {ci.done && <Check size={10} weight="bold" />}
        </button>
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            ci.type === "discovery"
              ? "bg-purple-500 dark:bg-purple-400"
              : "bg-teal-500 dark:bg-teal-400"
          }`}
          title={ci.type === "discovery" ? "Discovery" : "Delivery"}
        />
        <button
          onClick={() =>
            dispatch({
              type: "UPDATE_CHECKLIST_ITEM",
              itemId: item.id,
              checklistItemId: ci.id,
              updates: { type: ci.type === "discovery" ? "delivery" : "discovery" },
            })
          }
          className="text-[9px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 w-3"
          title="Toggle type"
        >
          ⇄
        </button>
        <input
          defaultValue={ci.text}
          onBlur={(e) =>
            dispatch({
              type: "UPDATE_CHECKLIST_ITEM",
              itemId: item.id,
              checklistItemId: ci.id,
              updates: { text: e.target.value },
            })
          }
          className={`flex-1 text-xs bg-transparent outline-none text-gray-700 dark:text-gray-300 ${
            ci.done ? "line-through text-gray-400 dark:text-gray-500" : ""
          }`}
          placeholder="Sub-task..."
        />
        <button
          onClick={() =>
            dispatch({
              type: "REMOVE_CHECKLIST_ITEM",
              itemId: item.id,
              checklistItemId: ci.id,
            })
          }
          className="opacity-0 group-hover/ci:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5"
        >
          <XIcon size={10} weight="bold" />
        </button>
      </div>
    ))}
  </div>
  <button
    onClick={() =>
      dispatch({
        type: "ADD_CHECKLIST_ITEM",
        itemId: item.id,
        checklistItem: {
          id: generateId("cl"),
          text: "",
          type: item.type,
          done: false,
        },
      })
    }
    className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors mt-2 px-1 py-0.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
  >
    <Plus size={10} weight="bold" />
    Add checklist item
  </button>
</div>
```

**Step 4: Show checklist progress in WorkItemCard**

In `src/components/WorkItemCard.tsx`, after the TypeBadge + assignee `<div>` (line ~68 area), add:

```tsx
{/* Checklist progress */}
{item.checklist && item.checklist.length > 0 && (
  <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
    <Check size={10} weight="bold" />
    <span>{item.checklist.filter(ci => ci.done).length}/{item.checklist.length}</span>
  </div>
)}
```

Add `Check` to the phosphor-icons import. Since WorkItemCard doesn't import phosphor icons yet, add:
```typescript
import { Check } from "@phosphor-icons/react";
```

**Step 5: Show checklist fraction in tree view ItemRow**

In `src/components/HierarchyView.tsx`, update ItemRow to show checklist progress:

After the column status dot span and the hasNudge indicator, add:
```tsx
{item.checklist && item.checklist.length > 0 && (
  <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums flex-shrink-0">
    {item.checklist.filter(ci => ci.done).length}/{item.checklist.length}
  </span>
)}
```

**Step 6: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 7: Commit**

```bash
git add src/types/board.ts src/hooks/useBoard.ts src/components/CardDetailModal.tsx src/components/WorkItemCard.tsx src/components/HierarchyView.tsx
git commit -m "feat: add typed sub-task checklists — discovery/delivery checklist items on work items"
```

---

### Task 5: Copy board link + bookmark reminder toast

**Files:**
- Modify: `src/components/BoardHeader.tsx`
- Create: `src/components/BookmarkToast.tsx`
- Modify: `src/components/Board.tsx`

**Step 1: Add copy link button to BoardHeader**

In `src/components/BoardHeader.tsx`:

Add `Link` to the phosphor imports:
```typescript
import { Sun, Moon, Monitor, Check, Lightning, Export, ListChecks, TreeStructure, Kanban, Link } from "@phosphor-icons/react";
```

Add `useState` to the React import:
```typescript
import { useState } from "react";
```

Inside the `BoardHeader` function body (after `const handleExport`), add:
```typescript
const [copied, setCopied] = useState(false);

const handleCopyLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch {
    // Fallback: select+copy
    const input = document.createElement("input");
    input.value = window.location.href;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
};
```

In the JSX, after the save status section and before the `<div className="flex items-center gap-2">` toolbar, add:
```tsx
{boardId && (
  <button
    onClick={handleCopyLink}
    className="flex items-center gap-1.5 text-xs text-indigo-200 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-indigo-500"
    title="Copy board link"
  >
    <Link size={14} weight="bold" />
    {copied ? "Copied!" : "Copy link"}
  </button>
)}
```

**Step 2: Create BookmarkToast component**

Create `src/components/BookmarkToast.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { X, BookmarkSimple } from "@phosphor-icons/react";

interface BookmarkToastProps {
  boardId: string;
}

export default function BookmarkToast({ boardId }: BookmarkToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const key = `bookmark-toast-${boardId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "shown");

    // Delay appearance slightly so it doesn't feel jarring
    const showTimer = setTimeout(() => setVisible(true), 2000);
    const hideTimer = setTimeout(() => setVisible(false), 10000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [boardId]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-in">
      <div className="flex items-center gap-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl px-5 py-3 shadow-2xl text-sm">
        <BookmarkSimple size={18} weight="duotone" className="text-indigo-300 dark:text-indigo-600 flex-shrink-0" />
        <span>Bookmark this page to return to your board later</span>
        <button
          onClick={() => setVisible(false)}
          className="p-1 text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-900 transition-colors flex-shrink-0"
        >
          <X size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}
```

**Step 3: Add BookmarkToast to Board**

In `src/components/Board.tsx`, add import:
```typescript
import BookmarkToast from "./BookmarkToast";
```

At the very end of the Board JSX, just before the closing `</div>`, add:
```tsx
{boardId && <BookmarkToast boardId={boardId} />}
```

**Step 4: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 5: Commit**

```bash
git add src/components/BoardHeader.tsx src/components/BookmarkToast.tsx src/components/Board.tsx
git commit -m "feat: add copy board link + bookmark reminder toast for pilot users"
```

---

### Task 6: Show coaching focus banners inline on targets

**Files:**
- Modify: `src/components/WorkItemCard.tsx`
- Modify: `src/components/HierarchyView.tsx`
- Modify: `src/components/Board.tsx`

**Step 1: Add focusItem prop to WorkItemCard**

In `src/components/WorkItemCard.tsx`, add `FocusItem` to the type import:
```typescript
import type { WorkItem, Nudge, DiscoveryPrompt, FocusItem } from "@/types/board";
```

Add `Target` to the phosphor import:
```typescript
import { Check, Target } from "@phosphor-icons/react";
```

Add to props interface:
```typescript
interface WorkItemCardProps {
  item: WorkItem;
  nudges: Nudge[];
  discoveryPrompts?: DiscoveryPrompt[];
  focusItem?: FocusItem;
  onClick?: () => void;
  onSpar?: (nudgeId: string) => void;
}
```

Add `focusItem` to destructuring:
```typescript
export default function WorkItemCard({
  item,
  nudges,
  discoveryPrompts = [],
  focusItem,
  onClick,
  onSpar,
}: WorkItemCardProps) {
```

After the checklist progress section and before the closing `</div>` of the card content, add:
```tsx
{/* Focus item banner */}
{focusItem && (
  <div className="mt-1.5 flex items-start gap-1.5 px-2 py-1.5 -mx-1 bg-orange-50 dark:bg-orange-950/20 border-l-2 border-orange-400 dark:border-orange-500 rounded-r text-[10px] text-orange-700 dark:text-orange-300 leading-relaxed">
    <Target size={11} weight="bold" className="flex-shrink-0 mt-0.5" />
    <span className="line-clamp-2">{focusItem.suggestedAction}</span>
  </div>
)}
```

**Step 2: Pass focusItems through Board.tsx to WorkItemCard**

In `src/components/Board.tsx`, add a helper after the existing helper functions:
```typescript
const getFocusItemForTarget = (targetId: string) =>
  focusItems.find((fi) => fi.targetId === targetId && fi.status !== "done");
```

In the `renderItemGrid` function, update the WorkItemCard usage to pass `focusItem`:
```tsx
<WorkItemCard
  item={item}
  nudges={getNudgesForItem(item.id)}
  discoveryPrompts={getDiscoveryPrompts(item.id)}
  focusItem={getFocusItemForTarget(item.id)}
  onClick={() => setModal({ type: "card", itemId: item.id })}
  onSpar={(nudgeId) => setSparringNudgeId(nudgeId)}
/>
```

**Step 3: Add focus banners to tree view**

In `src/components/HierarchyView.tsx`:

Add `FocusItem` to the type import:
```typescript
import type { BoardState, BusinessGoal, Outcome, WorkItem, Nudge, FocusItem } from "@/types/board";
```

Add `Target` to phosphor imports (it's already imported, so no change needed).

Add a helper in the main component:
```typescript
const getFocusItem = (targetId: string) =>
  (state.focusItems || []).find((fi) => fi.targetId === targetId && fi.status !== "done");
```

Update `OutcomeCard` to accept and show a focus item. Add `focusItem?: FocusItem` to its props:
```typescript
function OutcomeCard({
  outcome,
  items,
  nudgeCount,
  focusItem,
  onOutcomeClick,
  onItemClick,
  onAddItem,
}: {
  outcome: Outcome;
  items: WorkItem[];
  nudgeCount: number;
  focusItem?: FocusItem;
  onOutcomeClick: () => void;
  onItemClick: (itemId: string) => void;
  onAddItem?: () => void;
}) {
```

Inside OutcomeCard, after the nudge count span and before the closing `</div>` of the header content, add:
```tsx
{focusItem && (
  <div className="flex items-start gap-1.5 mt-1.5 px-2 py-1 bg-orange-50 dark:bg-orange-950/20 border-l-2 border-orange-400 dark:border-orange-500 rounded-r">
    <Target size={11} weight="bold" className="text-orange-500 flex-shrink-0 mt-0.5" />
    <span className="text-[10px] text-orange-700 dark:text-orange-300 line-clamp-2">{focusItem.suggestedAction}</span>
  </div>
)}
```

Pass `focusItem` when rendering OutcomeCard:
```tsx
<OutcomeCard
  outcome={outcome}
  items={getItemsForOutcome(outcome.id)}
  nudgeCount={getActiveNudgeCount(outcome.id)}
  focusItem={getFocusItem(outcome.id)}
  onOutcomeClick={() => onOutcomeClick(outcome.id)}
  onItemClick={onItemClick}
  onAddItem={onAddItem ? () => onAddItem(outcome.id) : undefined}
/>
```

Update ItemRow to accept `focusAction?: string`:
```typescript
function ItemRow({ item, hasNudge, focusAction, onClick }: { item: WorkItem; hasNudge: boolean; focusAction?: string; onClick: () => void }) {
```

Below the existing ItemRow content (after the nudge dot), add:
```tsx
{focusAction && (
  <span className="text-[9px] text-orange-600 dark:text-orange-400 truncate max-w-[120px]" title={focusAction}>
    🎯 {focusAction}
  </span>
)}
```

Pass `focusAction` when rendering ItemRow:
```tsx
<ItemRow
  key={item.id}
  item={item}
  hasNudge={getActiveNudgeCount(item.id) > 0}
  focusAction={getFocusItem(item.id)?.suggestedAction}
  onClick={() => onItemClick(item.id)}
/>
```

**Step 4: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 5: Commit**

```bash
git add src/components/WorkItemCard.tsx src/components/HierarchyView.tsx src/components/Board.tsx
git commit -m "feat: show coaching focus banners inline on targeted items and outcomes"
```

---

### Task 7: SVG tree connectors for hierarchy view

**Files:**
- Create: `src/components/TreeConnectors.tsx`
- Modify: `src/components/HierarchyView.tsx`
- Modify: `src/app/globals.css`

**Step 1: Create TreeConnectors component**

Create `src/components/TreeConnectors.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface ConnectorPath {
  id: string;
  d: string;
}

interface TreeConnectorsProps {
  goalId: string;
  outcomeIds: string[];
}

export default function TreeConnectors({ goalId, outcomeIds }: TreeConnectorsProps) {
  const [paths, setPaths] = useState<ConnectorPath[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const computePaths = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const goalEl = document.getElementById(goalId);
    if (!goalEl) return;

    const containerRect = container.getBoundingClientRect();
    const goalRect = goalEl.getBoundingClientRect();

    // Start point: bottom-center of goal card
    const startX = goalRect.left + goalRect.width / 2 - containerRect.left;
    const startY = goalRect.bottom - containerRect.top;

    const newPaths: ConnectorPath[] = [];

    for (const outcomeId of outcomeIds) {
      const outcomeEl = document.getElementById(outcomeId);
      if (!outcomeEl) continue;

      const outcomeRect = outcomeEl.getBoundingClientRect();
      // End point: left-center of outcome card
      const endX = outcomeRect.left - containerRect.left;
      const endY = outcomeRect.top + 20 - containerRect.top; // ~center of header

      // Midpoint Y for the horizontal rail
      const midY = startY + 16;

      // Path: vertical down from goal, then horizontal, then vertical to outcome
      const d = `M ${startX} ${startY} L ${startX} ${midY} L ${endX - 8} ${midY} Q ${endX} ${midY} ${endX} ${midY + 8} L ${endX} ${endY}`;

      newPaths.push({ id: outcomeId, d });
    }

    setPaths(newPaths);
  }, [goalId, outcomeIds]);

  useEffect(() => {
    computePaths();

    // Recompute on resize
    const observer = new ResizeObserver(() => computePaths());
    const container = containerRef.current;
    if (container) observer.observe(container);

    return () => observer.disconnect();
  }, [computePaths]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-0">
      <svg className="w-full h-full overflow-visible">
        {paths.map((p) => (
          <path
            key={p.id}
            d={p.d}
            fill="none"
            className="stroke-indigo-300 dark:stroke-indigo-500"
            strokeWidth={2}
            strokeLinecap="round"
          />
        ))}
      </svg>
    </div>
  );
}
```

**Step 2: Remove old CSS connectors**

In `src/app/globals.css`, delete the entire "Hierarchy tree connectors" section (lines 60-99):

```css
/* Hierarchy tree connectors */
.hierarchy-tree {
  position: relative;
}

.hierarchy-branch {
  position: relative;
  margin-left: 2rem;
}

.hierarchy-connector {
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 1.5rem;
  background-color: #a5b4fc;
}

:where(.dark) .hierarchy-connector {
  background-color: #6366f1;
}

.hierarchy-leaf {
  position: relative;
}

.hierarchy-leaf::before {
  content: "";
  position: absolute;
  top: 1rem;
  left: -1.5rem;
  width: 1.5rem;
  height: 2px;
  background-color: #a5b4fc;
}

:where(.dark) .hierarchy-leaf::before {
  background-color: #6366f1;
}
```

**Step 3: Update HierarchyView to use TreeConnectors**

In `src/components/HierarchyView.tsx`:

Add import:
```typescript
import TreeConnectors from "./TreeConnectors";
```

Replace the goal section markup. Change the current structure:
```tsx
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
```

To:
```tsx
<div key={goal.id} className="relative">
  {/* SVG connectors */}
  {goalOutcomes.length > 0 && (
    <TreeConnectors
      goalId={goal.id}
      outcomeIds={goalOutcomes.map((o) => o.id)}
    />
  )}

  {/* Goal card */}
  <GoalCard goal={goal} onClick={() => onGoalClick(goal.id)} />

  {/* Outcomes */}
  {goalOutcomes.length > 0 && (
    <div className="relative ml-8 pt-8">
      <div className="flex flex-wrap gap-4">
        {goalOutcomes.map((outcome) => (
          <div key={outcome.id} className="w-72">
```

Also update the closing tags to match (remove `hierarchy-branch`, `hierarchy-leaf` class names, remove `<div className="hierarchy-connector" />`).

The "Add outcome" button wrapper changes from `className="hierarchy-leaf flex items-center"` to just `className="flex items-center"`.

**Step 4: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 5: Commit**

```bash
git add src/components/TreeConnectors.tsx src/components/HierarchyView.tsx src/app/globals.css
git commit -m "feat: SVG tree connectors — proper goal-to-outcome lines that handle wrapping"
```

---

## Execution Order

Tasks can be parallelized in these batches (files mostly don't conflict):

**Batch A** (independent, different primary files):
- Task 1: TypeBadge simplification
- Task 2: Nudge orange color
- Task 3: Drag handle

**Batch B** (independent):
- Task 4: Typed sub-task checklists
- Task 5: Copy link + toast

**Batch C** (depends on Tasks 1-4 touching same files):
- Task 6: Focus banners
- Task 7: SVG tree connectors

## Final Verification

After all 7 tasks:
1. `npx next build` — clean build
2. Tree view: SVG connectors render from goal to outcomes, including wrapped rows
3. Type badges show single labels (full in kanban, dot in tree)
4. Nudges appear in orange, visible in both views
5. Checklist items with discovery/delivery type in card detail modal
6. Copy link button in header works
7. Focus banners appear inline on targeted items
8. Drag handles are visible and easy to grab
