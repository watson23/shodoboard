# Refactoring & Maintenance — Full Cleanup

## Context

After 3 batches of rapid feature work (~5,800 lines across 35 files), a comprehensive code review identified 4 critical bugs, 12 important maintainability issues, and 11 minor improvements. This refactoring addresses all of them in a single coordinated pass.

---

## Group 1: Shared utilities (`src/lib/utils.ts`)

**Problem:** Duplicated logic across API routes and components.

**Design:**
- **`generateId(prefix: string): string`** — Currently inline in Board.tsx, recreated every render. Move to shared module.
- **`escapeHtml(str: string): string`** — Needed for XSS fix in HTML export. Replaces `& < > " '` with HTML entities.
- **`serializeBoardForAI(state: BoardState): string`** — Identical board-to-JSON serialization duplicated in nudge and focus API routes. Extract once.
- **`extractTextFromResponse(response: Anthropic.Message): string`** — The `response.content.filter(...).map(...).join("")` pattern duplicated across all 4 API routes.
- **`extractJsonBlock(text: string): { parsed: unknown; displayText: string } | null`** — The `text.match(/```json\n.../)` + `JSON.parse` pattern duplicated across all 4 API routes. Returns parsed JSON and the text with the JSON block removed, or null on failure.

---

## Group 2: Fix critical bugs

**C1 — SET_NUDGES race condition:**
- Add `{ type: "ADD_NUDGE"; nudge: Nudge }` to BoardAction union and reducer.
- Change `handleStartSparringFromFocus` to use `ADD_NUDGE` instead of `SET_NUDGES` with stale snapshot.

**C2 — Auto-save stale closure:**
- Use `useRef` to hold latest state in `useAutoSave`. The debounced write reads from `ref.current` instead of the closure-captured `state`.

**C3 — Silent parse failures:**
- API routes return `{ error: "parse_failed" }` when JSON extraction fails instead of returning empty arrays silently. Client can show feedback.

**C4 — CardDetailModal dual-write:**
- Include `outcomeId` in the `save()` function alongside title, description, assignee, column, type.

---

## Group 3: API route hardening

- Add API key validation at top of each route: return 503 if `ANTHROPIC_API_KEY` is missing.
- Use shared `serializeBoardForAI`, `extractTextFromResponse`, `extractJsonBlock` from Group 1.
- Convert prompts from module-level constants to functions (`getIntakeSystemPrompt()`, etc.) so date strings are always fresh.

---

## Group 4: Extract shared UI components

**`<TypeBadge type={item.type} />`** — The [Dis|Del] split pill duplicated in WorkItemCard, HierarchyView (ItemRow), HierarchyView (unlinked items). Extract to `src/components/TypeBadge.tsx`.

**`<SlidePanel onClose title icon>`** — The modal shell (overlay + backdrop + slide-in panel + sticky header + close button) duplicated in CardDetailModal, GoalDetailModal, OutcomeDetailModal. Extract to `src/components/SlidePanel.tsx`.

---

## Group 5: Entity factory functions (`src/lib/entities.ts`)

- `createGoal(): BusinessGoal` — with default values ("Uusi tavoite", empty metrics, etc.)
- `createOutcome(goalId: string, order: number): Outcome` — with default values
- `createItem(outcomeId: string | null, order: number): WorkItem` — with default values

Currently duplicated in Board.tsx kanban buttons, Board.tsx hierarchy callbacks, and Board.tsx sparring apply handler.

---

## Group 6: Split Board.tsx

**`useBoardActions` hook** (`src/hooks/useBoardActions.ts`):
- `generateNudges`, `generateFocusItems`
- `handleFocusItemClick`, `handleStartSparringFromFocus`, `handleFocusStatusChange`
- All loading states (`nudgesLoading`, `focusLoading`)
- Returns these as a bundle for Board.tsx to consume

**`handleSparringApply` function** (`src/lib/sparring.ts`):
- The complex `onApply` callback (~40 lines) extracted to a standalone function.
- Signature: `(suggestion, nudge, items, dispatch) => void`
- Board.tsx calls it inline: `onApply={(s) => { handleSparringApply(s, nudge, items, dispatch); setSparringNudgeId(null); }}`

Board.tsx goes from ~777 lines to ~450 lines.

---

## Group 7: Error boundary + keyboard accessibility

- **`<ErrorBoundary>`** component wrapping the board — catches render crashes and shows a fallback message instead of white screen.
- **Escape key handling** in `<SlidePanel>` — covers all 3 modals at once since they all use SlidePanel.

---

## Group 8: Cleanup

- Fix missing `images` dependency in `callIntakeApi` useCallback in IntakeConversation.tsx.
- Remove unused `nudges` destructuring in HierarchyView.tsx.
- Remove dead files: `src/data/mock-conversations.ts`, `src/data/intake-script.ts`.

---

## Files affected

### New files:
- `src/lib/utils.ts` — Groups 1
- `src/lib/entities.ts` — Group 5
- `src/lib/sparring.ts` — Group 6
- `src/hooks/useBoardActions.ts` — Group 6
- `src/components/TypeBadge.tsx` — Group 4
- `src/components/SlidePanel.tsx` — Group 4
- `src/components/ErrorBoundary.tsx` — Group 7

### Modified files:
- `src/hooks/useBoard.ts` — Group 2 (ADD_NUDGE)
- `src/hooks/useAutoSave.ts` — Group 2 (ref fix)
- `src/components/Board.tsx` — Groups 2, 5, 6 (major refactor)
- `src/components/CardDetailModal.tsx` — Groups 2, 4 (dual-write fix + SlidePanel)
- `src/components/GoalDetailModal.tsx` — Group 4 (SlidePanel)
- `src/components/OutcomeDetailModal.tsx` — Group 4 (SlidePanel)
- `src/components/WorkItemCard.tsx` — Group 4 (TypeBadge)
- `src/components/HierarchyView.tsx` — Groups 4, 8 (TypeBadge + cleanup)
- `src/lib/export.ts` — Group 1 (escapeHtml)
- `src/lib/prompts.ts` — Group 3 (constants → functions)
- `src/app/api/nudge/route.ts` — Groups 1, 3
- `src/app/api/focus/route.ts` — Groups 1, 3
- `src/app/api/spar/route.ts` — Groups 1, 3
- `src/app/api/intake/route.ts` — Groups 1, 3
- `src/components/IntakeConversation.tsx` — Group 8 (dep fix)
- `src/app/board/[id]/page.tsx` — Group 7 (ErrorBoundary wrapper)

### Deleted files:
- `src/data/mock-conversations.ts` — Group 8
- `src/data/intake-script.ts` — Group 8
