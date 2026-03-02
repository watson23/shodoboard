# Batch 3 — UX Fixes & Polish

## Context

Pre-workshop fixes addressing real usage feedback: nudge dismiss confusion, export quality, item reassignment, sparring bug, and general AI robustness.

---

## 1. Nudge dismiss UX

**Problem:** X button permanently dismisses nudges, but users expect it to just close/hide them.

**Design:**
- **Expanded nudge:** Replace the bare X icon with a text button "Dismiss" (keeps the X icon but adds the word). Makes permanence explicit.
- **Collapsed visible banner:** The X button now only collapses the banner (`setExpanded(false)`) instead of dispatching `DISMISS_NUDGE`. Dismissal only happens from the expanded view where the user has read the full nudge.
- **Quiet tier (dot):** No change — clicking the dot expands the nudge, dismiss only available when expanded.

---

## 2. Export as printable HTML (browser print-to-PDF)

**Problem:** Current markdown export is hard to use. Users want a document they can share.

**Design:**
- Replace `downloadMarkdown()` with `openPrintableExport()` that opens a styled HTML document in a new tab via `window.open()`.
- Same content structure as current export (executive summary, key findings, focus areas, board overview, open questions, next steps).
- Styled with inline CSS + `@media print` rules for clean printing.
- Header: Shodoboard logo + product name + date.
- Clean typography, proper spacing, color-coded badges for priority levels.
- User clicks browser Print → Save as PDF. Zero dependencies.
- Update the export button in BoardHeader to call the new function instead.

---

## 3. Move items between outcomes

**Problem:** No way to reassign an item to a different outcome, especially for unlinked items.

**Design:**
- Add an "Outcome" dropdown to `CardDetailModal`, next to the existing "Column" dropdown.
- Options: all outcomes grouped by goal name, plus "Unlinked" at the top.
- Changing the dropdown dispatches `UPDATE_ITEM` with the new `outcomeId`.
- Read-only display of current outcome name replaced by the editable select.

---

## 4. Fix sparring creating unlinked items (Option A — fix it)

**Problem:** When AI sparring suggests `add_item`, the `onApply` handler in Board.tsx doesn't handle it. Items end up unlinked or the suggestion is silently dropped.

**Root cause:** `onApply` only handles `update_outcome`, `update_item`, `update_goal`. No case for `add_item` or `split_item`.

**Design:**
- Add `add_item` case to the `onApply` callback in Board.tsx.
- When `suggestion.action === "add_item"`:
  - Determine the correct `outcomeId` from the nudge context: if the nudge targets an outcome, use that outcomeId. If it targets an item, look up that item's outcomeId.
  - Create the new item with `dispatch({ type: "ADD_ITEM" })` using title/description/type from `suggestion.changes`.
  - Default to column `"opportunities"` unless specified.
- Also handle `split_item` by creating a new item (the split half) linked to the same outcome.
- Update `SPAR_SYSTEM_PROMPT` to include `outcomeId` in the changes object for `add_item` suggestions, and instruct Claude to always include the outcome connection.

---

## 5. AI robustness (no separate action)

The prompt fixes from batch 2 (using real names instead of IDs) + fixing the apply bug (#4) address the main pain points. No additional changes beyond what's already planned.

---

## Files affected

- `src/components/NudgeBadge.tsx` — #1
- `src/lib/export.ts` — #2
- `src/components/BoardHeader.tsx` — #2 (update export button)
- `src/components/CardDetailModal.tsx` — #3
- `src/components/Board.tsx` — #4 (onApply handler)
- `src/lib/prompts.ts` — #4 (SPAR_SYSTEM_PROMPT)
