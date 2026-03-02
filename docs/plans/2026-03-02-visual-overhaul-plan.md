# Visual Overhaul + Quick Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a tab-based view system with a hierarchy tree view, and apply quick polish fixes (bilingual consent, logo icon, dismissable nudges).

**Architecture:** A `viewMode` state (`"hierarchy" | "kanban"`) in Board.tsx toggles between the existing kanban and a new HierarchyView component. The hierarchy view is a CSS flexbox card tree with pseudo-element connectors. Quick polish fixes touch the consent screen, icon usage, and nudge dismiss action.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Phosphor Icons, existing BoardState/useBoard hooks.

---

### Task 1: Add View Toggle to BoardHeader

**Files:**
- Modify: `src/components/BoardHeader.tsx`

**Context:** BoardHeader already has an Agenda toggle button, theme switcher, export, etc. We need to add two tab buttons ("Hierarkia" and "Board") that control which view is shown. The viewMode and setViewMode will be passed as props from Board.tsx.

**Step 1: Add viewMode props to BoardHeader**

Add to the interface and destructure in the component:

```typescript
interface BoardHeaderProps {
  saveStatus?: SaveStatus;
  boardId?: string;
  onRefreshNudges?: () => void;
  nudgesLoading?: boolean;
  onToggleAgenda?: () => void;
  agendaOpen?: boolean;
  viewMode?: "hierarchy" | "kanban";
  onViewModeChange?: (mode: "hierarchy" | "kanban") => void;
}
```

**Step 2: Add tab buttons in the header**

Insert view toggle tabs between the logo/title area and the save status area. Import `TreeStructure` from `@phosphor-icons/react` for the hierarchy icon and `Kanban` for the board icon. Only render tabs when `onViewModeChange` is provided (real boards only):

```tsx
{onViewModeChange && (
  <div className="flex items-center bg-indigo-500/30 rounded-lg p-0.5">
    <button
      onClick={() => onViewModeChange("hierarchy")}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
        viewMode === "hierarchy"
          ? "bg-white/20 text-white font-semibold"
          : "text-indigo-200 hover:text-white"
      }`}
    >
      <TreeStructure size={14} weight="duotone" />
      Hierarkia
    </button>
    <button
      onClick={() => onViewModeChange("kanban")}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
        viewMode === "kanban"
          ? "bg-white/20 text-white font-semibold"
          : "text-indigo-200 hover:text-white"
      }`}
    >
      <Kanban size={14} weight="duotone" />
      Board
    </button>
  </div>
)}
```

Place this after the title `<div>` and before the `ml-auto` save status div.

**Step 3: Add imports**

Add `TreeStructure, Kanban` to the Phosphor imports at top of file.

**Step 4: Verify build**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build 2>&1 | tail -20`
Expected: Build succeeds (tabs render but no functionality yet — Board.tsx not yet passing the props).

**Step 5: Commit**

```bash
git add src/components/BoardHeader.tsx
git commit -m "feat: add Hierarkia/Board view toggle tabs to BoardHeader"
```

---

### Task 2: Wire viewMode State in Board.tsx

**Files:**
- Modify: `src/components/Board.tsx`

**Context:** Board.tsx is the main board component. We need a `viewMode` state that defaults to `"hierarchy"` for real boards (when `boardId` is present) and `"kanban"` for the demo board (no `boardId`). The kanban content (DndContext, columns, etc.) should only render when `viewMode === "kanban"`. We'll add a placeholder for hierarchy view and wire up the toggle.

**Step 1: Add viewMode state**

After the existing state declarations:

```typescript
const [viewMode, setViewMode] = useState<"hierarchy" | "kanban">(
  boardId ? "hierarchy" : "kanban"
);
```

**Step 2: Pass viewMode props to BoardHeader**

Update the `<BoardHeader>` JSX to include the new props:

```tsx
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
```

**Step 3: Conditionally render kanban vs placeholder**

Wrap the existing `<DndContext>` block in a condition. After `</BoardHeader>`, add:

```tsx
{viewMode === "kanban" ? (
  <DndContext ...>
    {/* existing kanban content */}
  </DndContext>
) : (
  <div className="flex-1 overflow-y-auto p-6">
    <p className="text-gray-400 text-sm">Hierarchy view coming soon...</p>
  </div>
)}
```

Keep DragOverlay inside the kanban condition (it's part of DndContext).

**Step 4: Verify build**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build 2>&1 | tail -20`
Expected: Build succeeds. Real boards default to hierarchy placeholder, demo board shows kanban.

**Step 5: Commit**

```bash
git add src/components/Board.tsx
git commit -m "feat: wire viewMode state with hierarchy/kanban toggle"
```

---

### Task 3: Create HierarchyView Component

**Files:**
- Create: `src/components/HierarchyView.tsx`
- Modify: `src/app/globals.css`

**Context:** This is the main new component — a CSS card tree showing Goal → Outcome → Item hierarchy. Uses the existing BoardState types. The design calls for:
- Goal cards: deep indigo background, white text, full width, Flag icon
- Outcome cards: white with 3px indigo left border, Target icon, shows measure or amber warning
- Items: compact rows inside outcome cards with type badge and column status dot
- CSS pseudo-element connectors between levels
- Unlinked items section at bottom
- Click handlers for opening modals

**Step 1: Create the component file**

Create `src/components/HierarchyView.tsx` with these sub-sections:

```typescript
"use client";

import { Flag, Target, LinkBreak, WarningCircle } from "@phosphor-icons/react";
import type { BoardState, BusinessGoal, Outcome, WorkItem, Nudge } from "@/types/board";

interface HierarchyViewProps {
  state: BoardState;
  onGoalClick: (goalId: string) => void;
  onOutcomeClick: (outcomeId: string) => void;
  onItemClick: (itemId: string) => void;
}
```

**Goal Card sub-component:**
```tsx
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
```

**Outcome Card sub-component:**
Items listed inside as compact rows. Each outcome card gets indigo left border, or amber if missing measure.

```tsx
function OutcomeCard({
  outcome,
  items,
  nudges,
  onOutcomeClick,
  onItemClick,
}: {
  outcome: Outcome;
  items: WorkItem[];
  nudges: Nudge[];
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
      {/* Outcome header — clickable */}
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
```

**ItemRow sub-component:**
Compact row inside outcome card with type badge, title, column status dot.

```tsx
const COLUMN_COLORS: Record<string, string> = {
  opportunities: "bg-gray-300 dark:bg-gray-600",
  discovering: "bg-purple-400",
  ready: "bg-yellow-400",
  building: "bg-blue-400",
  shipped: "bg-green-400",
  measuring: "bg-emerald-500",
};

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
```

**Main HierarchyView component:**

```tsx
export default function HierarchyView({ state, onGoalClick, onOutcomeClick, onItemClick }: HierarchyViewProps) {
  const { goals, outcomes, items, nudges } = state;

  const getOutcomesForGoal = (goalId: string) =>
    outcomes.filter((o) => o.goalId === goalId).sort((a, b) => a.order - b.order);

  const getItemsForOutcome = (outcomeId: string) =>
    items.filter((i) => i.outcomeId === outcomeId).sort((a, b) => a.order - b.order);

  const getNudgesForOutcome = (outcomeId: string) =>
    nudges.filter((n) => n.targetType === "outcome" && n.targetId === outcomeId && n.status === "active");

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
                  {goalOutcomes.map((outcome, idx) => (
                    <div key={outcome.id} className="hierarchy-leaf w-72">
                      <OutcomeCard
                        outcome={outcome}
                        items={getItemsForOutcome(outcome.id)}
                        nudges={getNudgesForOutcome(outcome.id)}
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
```

**Step 2: Add tree connector CSS to globals.css**

Append these styles to `src/app/globals.css`:

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
  background-color: #a5b4fc; /* indigo-300 */
}

:where(.dark) .hierarchy-connector {
  background-color: #6366f1; /* indigo-500 */
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

**Step 3: Verify build**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build 2>&1 | tail -20`
Expected: Build succeeds (component exists but isn't imported yet).

**Step 4: Commit**

```bash
git add src/components/HierarchyView.tsx src/app/globals.css
git commit -m "feat: create HierarchyView component with CSS tree connectors"
```

---

### Task 4: Integrate HierarchyView into Board.tsx

**Files:**
- Modify: `src/components/Board.tsx`

**Context:** Replace the hierarchy placeholder from Task 2 with the actual HierarchyView component. Wire up click handlers to open the existing modals.

**Step 1: Import HierarchyView**

Add at top of Board.tsx:
```typescript
import HierarchyView from "./HierarchyView";
```

**Step 2: Replace the placeholder with HierarchyView**

Replace the hierarchy placeholder div with:

```tsx
{viewMode === "kanban" ? (
  <DndContext ...>
    {/* existing kanban content */}
  </DndContext>
) : (
  <HierarchyView
    state={state}
    onGoalClick={(goalId) => setModal({ type: "goal", goalId })}
    onOutcomeClick={(outcomeId) => setModal({ type: "outcome", outcomeId })}
    onItemClick={(itemId) => setModal({ type: "card", itemId })}
  />
)}
```

**Step 3: Verify build**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build 2>&1 | tail -20`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/components/Board.tsx
git commit -m "feat: integrate HierarchyView into Board with modal handlers"
```

---

### Task 5: Bilingual Consent Screen

**Files:**
- Modify: `src/app/intake/page.tsx`

**Context:** The consent screen in `ConsentScreen` component is currently Finnish only. We need to add English translations below each Finnish paragraph. Use a subtle separator and smaller font for English. Single screen, no language toggle.

**Step 1: Update the consent screen content**

In the `ConsentScreen` function, update the content section to include English below Finnish. Each section gets the Finnish text followed by a slightly dimmer English translation:

```tsx
<div className="space-y-4 text-sm leading-relaxed">
  <div className="space-y-1">
    <p className="text-gray-600 dark:text-gray-300">
      Shodoboard käyttää Anthropicin Claude-tekoälyä backlogisi analysoitiin.
    </p>
    <p className="text-gray-400 dark:text-gray-500 text-xs">
      Shodoboard uses Anthropic's Claude AI to analyze your backlog.
    </p>
  </div>

  <div>
    <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">
      Tietojesi käsittely:
    </p>
    <ul className="space-y-1.5 list-disc list-inside text-gray-600 dark:text-gray-300">
      <li>Backlog-tekstisi lähetetään Anthropicin Claude API:lle analysoitavaksi</li>
      <li>Anthropic ei käytä dataasi malliensa kouluttamiseen</li>
      <li>Data poistetaan 30 päivän kuluessa</li>
      <li>Taulusi data tallennetaan Firebase-tietokantaan (EU-palvelin)</li>
    </ul>
    <p className="font-medium text-gray-500 dark:text-gray-400 mt-3 mb-1.5 text-xs">
      How your data is handled:
    </p>
    <ul className="space-y-1 list-disc list-inside text-gray-400 dark:text-gray-500 text-xs">
      <li>Your backlog text is sent to Anthropic's Claude API for analysis</li>
      <li>Anthropic does not use your data to train its models</li>
      <li>Data is deleted within 30 days</li>
      <li>Your board data is stored in Firebase (EU server)</li>
    </ul>
  </div>

  <div className="space-y-1">
    <p className="text-amber-600 dark:text-amber-400 font-medium">
      Suositus: Älä liitä henkilötietoja, asiakkaiden nimiä tai liikesalaisuuksia.
    </p>
    <p className="text-amber-500/70 dark:text-amber-400/60 text-xs">
      Recommendation: Don't include personal data, customer names, or trade secrets.
    </p>
  </div>
</div>
```

Also update the button text to show both languages:
- Accept button: "Ymmärrän ja jatkan" (keep as is — Finnish primary action)
- Decline button: "Jatka ilman tekoälyä" (keep as is)

**Step 2: Verify build**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build 2>&1 | tail -20`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/intake/page.tsx
git commit -m "feat: add bilingual (FI/EN) consent screen"
```

---

### Task 6: Replace Kanban Icon with Shodoboard Logo

**Files:**
- Modify: `src/components/IntakeConversation.tsx`

**Context:** The "Create your board" button currently uses `<Kanban>` from Phosphor. We need to replace it with the inline Shodoboard SVG logo. The `BoardHeader.tsx` already has a `ShodoLogoSmall` component we can reference for the SVG, but since it's not exported, we'll create a small inline SVG directly in IntakeConversation.tsx (or extract to a shared component).

**Step 1: Replace Kanban icon in the "Create your board" button**

In `IntakeConversation.tsx`, remove `Kanban` from the Phosphor import. Add a small inline Shodoboard logo SVG. Replace the two places where `<Kanban>` is used:

1. The "Create your board" button (line ~296)
2. The "Creating your board..." spinner (line ~306)

Create a small `ShodoLogo` inline component at top of file (or import from shared):

```tsx
function ShodoLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="128" height="128" rx="28" fill="currentColor" opacity="0.2" />
      <rect x="16" y="16" width="96" height="96" rx="8" fill="currentColor" opacity="0.3" />
      <rect x="22" y="28" width="24" height="16" rx="3" fill="currentColor" opacity="0.4" />
      <rect x="22" y="48" width="24" height="16" rx="3" fill="currentColor" opacity="0.5" />
      <rect x="22" y="68" width="24" height="16" rx="3" fill="currentColor" opacity="0.6" />
      <rect x="50" y="28" width="24" height="16" rx="3" fill="currentColor" opacity="0.4" />
      <rect x="50" y="48" width="24" height="16" rx="3" fill="currentColor" opacity="0.5" />
      <rect x="50" y="68" width="24" height="16" rx="3" fill="currentColor" opacity="0.6" />
      <rect x="78" y="28" width="24" height="16" rx="3" fill="currentColor" opacity="0.4" />
      <rect x="78" y="48" width="24" height="16" rx="3" fill="currentColor" opacity="0.5" />
      <rect x="78" y="68" width="24" height="16" rx="3" fill="currentColor" opacity="0.6" />
      <circle cx="100" cy="100" r="18" fill="currentColor" />
      <polyline points="90,100 97,107 110,93" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

Replace `<Kanban size={22} weight="duotone" />` with `<ShodoLogo className="w-5 h-5" />` in both places.

**Step 2: Remove unused Kanban import**

Remove `Kanban` from the `@phosphor-icons/react` import in IntakeConversation.tsx. Keep `PaperPlaneRight`.

**Step 3: Verify build**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build 2>&1 | tail -20`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/components/IntakeConversation.tsx
git commit -m "feat: replace Kanban icon with Shodoboard logo on create button"
```

---

### Task 7: Dismissable Nudges

**Files:**
- Modify: `src/components/NudgeBadge.tsx`

**Context:** NudgeBadge currently has an X button in the expanded view that collapses the nudge (sets `expanded` to false), but does NOT dismiss it. We need to add a proper dismiss button that dispatches `DISMISS_NUDGE` so the nudge doesn't reappear. The `DISMISS_NUDGE` action already exists in the reducer.

The design calls for: an X icon button in the expanded view that dismisses (not just collapses). The existing X collapses — we should change it to dismiss instead, since collapsing happens automatically when you click outside.

**Step 1: Change the X button to dispatch DISMISS_NUDGE**

In NudgeBadge.tsx, the expanded view's X button currently does `onClick={() => setExpanded(false)}`. Change it to dispatch the dismiss action:

```tsx
<button
  onClick={() => dispatch({ type: "DISMISS_NUDGE", nudgeId: nudge.id })}
  className="ml-auto p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
  title="Dismiss"
>
  <X size={12} weight="bold" />
</button>
```

This component already imports `useBoard` and destructures `dispatch`.

**Step 2: Add dismiss to the visible tier banner (collapsed view)**

The visible-tier banner (collapsed) doesn't have a dismiss button. Add a small X button to it:

```tsx
// visible tier — shown as banner
return (
  <div className="w-full flex items-center gap-1 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-200 dark:border-indigo-800/50 text-xs text-indigo-700 dark:text-indigo-300 rounded-t-lg">
    <button
      onClick={(e) => {
        e.stopPropagation();
        setExpanded(true);
      }}
      className="flex-1 text-left font-medium hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"
    >
      {nudge.message}
    </button>
    <button
      onClick={(e) => {
        e.stopPropagation();
        dispatch({ type: "DISMISS_NUDGE", nudgeId: nudge.id });
      }}
      className="p-0.5 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors flex-shrink-0"
      title="Dismiss"
    >
      <X size={11} weight="bold" />
    </button>
  </div>
);
```

**Step 3: Verify build**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build 2>&1 | tail -20`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/components/NudgeBadge.tsx
git commit -m "feat: add dismiss button to nudges (dispatches DISMISS_NUDGE)"
```

---

## Execution Plan

Tasks 1-2 are sequential (Tab UI depends on props, Board depends on tab buttons).
Tasks 3-4 are sequential (HierarchyView must exist before Board imports it).
Tasks 5, 6, 7 are independent of each other and of Tasks 1-4.

**Optimal order:**
1. Task 1 (BoardHeader tabs) + Task 5 (bilingual consent) + Task 6 (logo icon) + Task 7 (dismiss nudges) — in parallel
2. Task 2 (Board viewMode) — after Task 1
3. Task 3 (HierarchyView component) — can start after Task 2 OR in parallel
4. Task 4 (integrate into Board) — after Tasks 2 and 3

## Verification

1. Navigate to `/board` (demo) → default is kanban, no view tabs shown
2. Navigate to `/board/[id]` (real board) → default is "Hierarkia" tree view
3. Tree shows goals → outcomes → items with visual connectors
4. Missing measures show amber "Mittari puuttuu!" warning
5. Click items/outcomes/goals → modals open correctly
6. Switch to "Board" tab → existing kanban works as before
7. Consent screen at `/intake` shows both Finnish and English
8. "Create your board" button uses Shodoboard logo
9. Nudges have dismiss X button, dismissed nudges don't reappear
10. `npx next build` passes
