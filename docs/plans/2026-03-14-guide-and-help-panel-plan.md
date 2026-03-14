# Guide Page & Help Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a shareable `/guide` page and an in-board "?" help panel so team members can understand what they're looking at.

**Architecture:** Shared guide content module renders into two surfaces — a standalone page and a slide-out panel. The panel mirrors the Coaching Agenda pattern (slide from right instead of left).

**Tech Stack:** Next.js App Router, React, Tailwind CSS, Phosphor Icons

---

### Task 1: Create shared guide content module

**Files:**
- Create: `src/lib/guide-content.ts`

**Step 1: Create the content data structure**

```ts
import type { IconProps } from "@phosphor-icons/react";
import type { ComponentType } from "react";

export interface GuideSection {
  id: string;
  title: string;
  iconName: string; // We'll map to actual icons in the component layer
  content: string[];
}

export const guideSections: GuideSection[] = [
  {
    id: "what-is",
    title: "What is Shodoboard?",
    iconName: "Notebook",
    content: [
      "Shodoboard helps product teams focus on outcomes, not just shipping features. It combines a familiar kanban board with goal-setting, AI coaching, and discovery tracking.",
    ],
  },
  {
    id: "reading-the-board",
    title: "Reading the board",
    iconName: "Kanban",
    content: [
      "The board has two views you can toggle between: Tree View (shows the hierarchy of goals, outcomes, and work items) and Board View (a kanban with six columns).",
      "The six columns represent a flow from left to right: Opportunities → Discovering → Ready for Building → Building → Shipped → Measuring.",
      "The left side is about discovery — understanding what to build and why. The right side is delivery. \"Measuring\" closes the loop by checking if the work achieved what you expected.",
    ],
  },
  {
    id: "goals-outcomes",
    title: "Goals, outcomes, and work items",
    iconName: "TreeStructure",
    content: [
      "The board is organized in a hierarchy: Goals contain Outcomes, and Outcomes contain Work Items.",
      "Goals describe what the team is trying to achieve. Outcomes describe specific, measurable behavior changes or results — not just deliverables. Work items are the actual tasks and features.",
      "This structure helps connect day-to-day work back to why it matters. It's what makes Shodoboard different from a regular task board.",
    ],
  },
  {
    id: "ai-coaching",
    title: "AI coaching features",
    iconName: "Brain",
    content: [
      "Nudges are yellow indicators on cards. The AI reviews your board and suggests improvements — like clarifying an outcome or questioning whether a feature is connected to a goal.",
      "Sparring lets you have a conversation with the AI coach about a specific item or your entire board. It asks probing questions to help you think more clearly.",
      "The Coaching Agenda is a prioritized list of focus areas the AI identifies across your board. It highlights what deserves attention first.",
      "All coaching features are optional — the board works perfectly fine without them.",
    ],
  },
  {
    id: "working-with-board",
    title: "Working with the board",
    iconName: "CursorClick",
    content: [
      "Drag cards between columns to update their status. Click any card to see and edit its details.",
      "Use the toggle in the header to switch between Tree View and Board View — whichever helps you think better.",
      "The board saves automatically. If you're signed in, you can access your boards from the dashboard.",
    ],
  },
];
```

**Step 2: Commit**

```bash
git add src/lib/guide-content.ts
git commit -m "feat: add shared guide content module"
```

---

### Task 2: Create the `/guide` page

**Files:**
- Create: `src/app/guide/page.tsx`

**Step 1: Build the standalone guide page**

This is a public, unauthenticated page. Clean scrollable layout matching the landing page style. Uses Phosphor icons with duotone weight, indigo palette, dark mode support.

Structure:
- Shodoboard logo + "Guide" heading at top
- Each `GuideSection` rendered as a section with icon, title, and content paragraphs
- Link back to landing page at bottom
- Same max-width as landing page (`max-w-xl`)

Map `iconName` strings to actual Phosphor icon components in this file. Import only the icons needed: `Notebook`, `Kanban`, `TreeStructure`, `Brain`, `CursorClick`, `ArrowLeft`.

Each section: icon in a small indigo circle, bold title, then content paragraphs in gray text. Subtle dividers between sections.

**Step 2: Verify the page renders**

Run: dev server, navigate to `/guide`
Expected: Clean guide page with all 5 sections, readable, no errors

**Step 3: Commit**

```bash
git add src/app/guide/page.tsx
git commit -m "feat: add /guide page for shareable board guide"
```

---

### Task 3: Create the HelpPanel component

**Files:**
- Create: `src/components/HelpPanel.tsx`

**Step 1: Build the help panel slide-out**

Mirror the `CoachingAgenda.tsx` pattern but:
- Slides from the **right** (not left) — use `justify-end` instead of `justify-start` on the fixed container, border-l instead of border-r
- Uses accordion/collapsible sections (click title to expand/collapse) — all expanded by default on first open
- Same backdrop overlay pattern (click backdrop to close)
- Header: "?" icon in indigo circle + "Guide" title + close button
- Footer: small "Open full guide" link to `/guide`
- Width: `w-[380px]`

Map `iconName` strings to Phosphor icons in this file (same as guide page).

Each section: clickable header with icon + title + chevron. When expanded, shows content paragraphs. Use `ChevronDown`/`ChevronUp` (or rotate) for the toggle indicator.

Props interface:
```ts
interface HelpPanelProps {
  onClose: () => void;
}
```

Use local state for which sections are expanded (all expanded by default).

**Step 2: Verify component renders**

Will be wired in next task. For now, ensure no TypeScript errors.

**Step 3: Commit**

```bash
git add src/components/HelpPanel.tsx
git commit -m "feat: add HelpPanel slide-out component"
```

---

### Task 4: Wire "?" button into BoardHeader and Board

**Files:**
- Modify: `src/components/BoardHeader.tsx`
- Modify: `src/components/Board.tsx`

**Step 1: Add help panel state and props to BoardHeader**

In `BoardHeader.tsx`:
- Add `Question` to the Phosphor icons import
- Add props: `onToggleHelp?: () => void` and `helpOpen?: boolean`
- Add a "?" button in the primary actions area (after the Feedback megaphone button, before the overflow menu). Use the same style as the Agenda button toggle pattern.

```tsx
{onToggleHelp && (
  <button
    onClick={onToggleHelp}
    className={`p-2 rounded-lg transition-colors ${
      helpOpen
        ? "bg-indigo-600 text-white"
        : "text-indigo-200 hover:text-white hover:bg-indigo-500"
    }`}
    title="Guide"
  >
    <Question size={16} weight="duotone" />
  </button>
)}
```

Also add `helpOpen` and `onToggleHelp` to the `BoardHeaderProps` interface.

**Step 2: Wire help panel in Board.tsx**

In `Board.tsx`:
- Import `HelpPanel` (dynamic or direct)
- Add state: `const [showHelp, setShowHelp] = useState(false);`
- Pass `onToggleHelp` and `helpOpen` to `BoardHeader`
- Render `HelpPanel` conditionally (same pattern as `CoachingAgenda`)

```tsx
{showHelp && (
  <HelpPanel onClose={() => setShowHelp(false)} />
)}
```

Pass to BoardHeader:
```tsx
onToggleHelp={() => {
  setShowHelp(!showHelp);
}}
helpOpen={showHelp}
```

**Step 3: Verify everything works**

- Navigate to a board
- Click "?" button — help panel slides in from right
- Click backdrop or X to close
- Sections expand/collapse
- "Open full guide" link navigates to `/guide`

**Step 4: Commit**

```bash
git add src/components/BoardHeader.tsx src/components/Board.tsx
git commit -m "feat: wire help panel into board header"
```

---

### Task 5: Visual polish and final verification

**Files:**
- Possibly adjust: `src/components/HelpPanel.tsx`, `src/app/guide/page.tsx`

**Step 1: Check dark mode on both surfaces**

Navigate to `/guide` and the board help panel in dark mode. Ensure text contrast and backgrounds look correct.

**Step 2: Check mobile/responsive**

Resize to mobile width. The `/guide` page should be readable. The help panel should take full width on small screens (use `max-w-full` already in place).

**Step 3: Build check**

Run: `npm run build`
Expected: Clean build, no TypeScript errors

**Step 4: Commit if any adjustments were made**

```bash
git add -A
git commit -m "fix: polish guide page and help panel styles"
```
