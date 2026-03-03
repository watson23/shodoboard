# Batch 4: Tree View Polish + UX Improvements — Design

**Date:** 2026-03-03
**Scope:** 7 changes across tree view, nudge visibility, coaching focus, persistence UX, checklist sub-tasks, and drag handling.

---

## 1. Tree View Connectors — SVG-based

Replace broken CSS pseudo-element connectors with a `TreeConnectors` component that renders SVG paths.

- Uses `useLayoutEffect` + `ResizeObserver` to read bounding rects of goal and outcome cards
- Draws SVG paths from goal's bottom-center → vertical trunk → horizontal rail → each outcome's left edge
- Paths use quadratic bezier curves for rounded corners
- Light: `#a5b4fc` (indigo-300), Dark: `#6366f1` (indigo-500), stroke width 2px
- SVG absolutely positioned behind cards, `pointer-events: none`
- Vertical trunk extends to reach wrapped outcomes on second row

**Files:** New `TreeConnectors.tsx`, modify `HierarchyView.tsx`, modify `globals.css` (remove old connector CSS)

## 2. Type Badge → Simple Label

Replace dual "Dis | Del" split pill with a single-word indicator.

- **Tree view ItemRow:** Tiny colored dot (purple=discovery, teal=delivery), 6px circle
- **Kanban WorkItemCard:** Single pill label — "Discovery" (purple bg) or "Delivery" (teal bg)
- **Unlinked items (tree view):** Same colored dot treatment

**Files:** Rewrite `TypeBadge.tsx`, update `HierarchyView.tsx` ItemRow

## 3. AI Nudge Visibility — Orange Color + Tree View Support

**Color migration:** All nudge UI moves from indigo to **orange**.
- Banner bg: `orange-50` / `orange-950/20` (dark)
- Text: `orange-700` / `orange-300` (dark)
- Quiet dot: `orange-400` / `orange-500` (dark)
- Spar button: `orange-100` bg, `orange-600` text

**Tree view nudge indicators:**
- OutcomeCard: Orange dot badge with count next to outcome title
- ItemRow: Small orange dot if item has active nudges
- Clicking opens detail modal where full nudges are visible

**Files:** Modify `NudgeBadge.tsx`, `HierarchyView.tsx`, `WorkItemCard.tsx` (color only)

## 4. Coaching Focus Banners — Inline on Targets

Show compact inline banners on items/outcomes targeted by coaching agenda focus items.

**Kanban (WorkItemCard):** Small orange banner below title showing suggested action (1 line, truncated).
**Tree view (ItemRow/OutcomeCard):** Orange left-border accent with suggested action text.

Focus items matched by `targetId` from `state.focusItems`. Both views need focusItems passed through.

**Files:** Modify `WorkItemCard.tsx`, `HierarchyView.tsx`, `Board.tsx` (pass focusItems)

## 5. Copy Board Link + Bookmark Reminder Toast

- **BoardHeader:** "Copy link" button (Link icon). Copies `window.location.href`, shows "Copied!" confirmation.
- **One-time toast:** On first board load (sessionStorage key), show bottom toast: "Bookmark this page to return to your board later." Auto-dismiss 8s.

**Files:** Modify `BoardHeader.tsx`, new `BookmarkToast.tsx`, modify `Board.tsx`

## 6. Typed Sub-Tasks (Checklist)

**Data model:**
```typescript
interface ChecklistItem {
  id: string;
  text: string;
  type: ItemType; // "discovery" | "delivery"
  done: boolean;
}

interface WorkItem {
  // ...existing...
  checklist?: ChecklistItem[];
}
```

**CardDetailModal:** New "Checklist" section below description. Each item: checkbox, colored dot, editable text, type toggle, delete on hover. "+ Add checklist item" button.

**WorkItemCard (kanban):** Progress indicator "3/5 ✓" if checklist exists.

**Tree view ItemRow:** Fraction "2/4" in muted text if checklist exists.

**Files:** Modify `types/board.ts`, `CardDetailModal.tsx`, `WorkItemCard.tsx`, `HierarchyView.tsx`, `useBoard.ts` (new actions)

## 7. Drag Handle Improvement

- Wider hit area: `w-6` → `w-8` (32px)
- Always-visible hint: `opacity-20` → `opacity-40` at rest
- Larger icon: 14px → 18px
- Card content left padding: add `pl-7` to avoid overlap

**Files:** Modify `DraggableCard.tsx`, `WorkItemCard.tsx`
