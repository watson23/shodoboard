# Batch 3 Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 4 UX/bug issues: nudge dismiss clarity, printable export, item outcome reassignment, sparring apply bug.

**Architecture:** Direct component edits. No new components. Export becomes HTML-in-new-tab instead of markdown download. Sparring `onApply` handler gets `add_item`/`split_item` cases.

**Tech Stack:** React 19, Next.js 16, Tailwind CSS v4, Phosphor Icons

---

### Task 1: Nudge dismiss UX — make dismissal explicit

**Files:**
- Modify: `src/components/NudgeBadge.tsx`

**Step 1: Change collapsed banner X to collapse instead of dismiss**

In the visible-tier collapsed banner (lines 47-56), change the X button from dispatching `DISMISS_NUDGE` to just collapsing:

Replace lines 47-56:
```tsx
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
```

With:
```tsx
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          className="p-0.5 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors flex-shrink-0"
          title="Close"
        >
          <X size={11} weight="bold" />
        </button>
```

**Step 2: Replace bare X dismiss button in expanded view with labeled "Dismiss" button**

In the expanded view (lines 85-91), replace the X-only dismiss button:

Replace:
```tsx
        <button
          onClick={() => dispatch({ type: "DISMISS_NUDGE", nudgeId: nudge.id })}
          className="ml-auto p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Dismiss"
        >
          <X size={12} weight="bold" />
        </button>
```

With:
```tsx
        <button
          onClick={() => dispatch({ type: "DISMISS_NUDGE", nudgeId: nudge.id })}
          className="ml-auto flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20"
        >
          <X size={10} weight="bold" />
          Dismiss
        </button>
```

**Step 3: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 4: Commit**

```bash
git add src/components/NudgeBadge.tsx
git commit -m "fix: make nudge dismiss explicit — X only collapses, 'Dismiss' label for permanent removal"
```

---

### Task 2: Printable HTML export (browser print-to-PDF)

**Files:**
- Modify: `src/lib/export.ts`
- Modify: `src/components/BoardHeader.tsx`

**Step 1: Replace `downloadMarkdown` with `openPrintableExport` in export.ts**

Keep `generateMarkdownExport` and `computeBoardAnalysis` as-is (they're still used internally). Replace the `downloadMarkdown` function (lines 268-276) with a new `openPrintableExport` function that:

1. Computes the board analysis
2. Builds an HTML string with inline CSS
3. Opens it in a new tab via `window.open()`

Replace lines 268-276 (`downloadMarkdown` function) with:

```typescript
export function openPrintableExport(state: BoardState) {
  const analysis = computeBoardAnalysis(state);
  const productName = state.productName || "Board Export";
  const date = new Date().toLocaleDateString("fi-FI");
  const sortedGoals = [...state.goals].sort((a, b) => a.order - b.order);
  const sortedFocusItems = [...state.focusItems].sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 };
    return p[a.priority] - p[b.priority];
  });
  const unlinkedItems = state.items.filter((i) => i.outcomeId === null);

  const discoveryRatio =
    analysis.totalItems > 0 ? Math.round((analysis.discoveryCount / analysis.totalItems) * 100) : 0;

  // Build findings
  const findings: string[] = [];
  if (discoveryRatio < 20 && analysis.totalItems > 0) {
    findings.push(`<li><strong>Output-painotteinen backlog:</strong> Discovery-itemejä on vain ${discoveryRatio} % — viittaa feature factory -malliin.</li>`);
  }
  if (analysis.outcomesWithoutMeasure > 0) {
    findings.push(`<li><strong>Mittaamattomia outcomeja:</strong> ${analysis.outcomesWithoutMeasure} outcomelta puuttuu onnistumismittari.</li>`);
  }
  if (analysis.unlinkedCount > 0) {
    findings.push(`<li><strong>Orpoja itemejiä:</strong> ${analysis.unlinkedCount} itemiä ei ole yhdistetty outcomeen.</li>`);
  }

  // Build board overview
  let boardOverview = "";
  for (const goal of sortedGoals) {
    boardOverview += `<h3 style="color:#3730a3;margin:24px 0 8px 0;font-size:16px;">${goal.statement}</h3>`;
    if (goal.timeframe) boardOverview += `<p style="color:#6b7280;font-size:13px;margin:0 0 12px 0;">Aikajänne: ${goal.timeframe}</p>`;

    const goalOutcomes = state.outcomes.filter((o) => o.goalId === goal.id).sort((a, b) => a.order - b.order);
    for (const outcome of goalOutcomes) {
      const measureText = outcome.measureOfSuccess?.trim()
        ? outcome.measureOfSuccess
        : '<span style="color:#d97706;">⚠️ Mittari puuttuu</span>';
      boardOverview += `<div style="margin:0 0 16px 16px;padding:12px 16px;border-left:3px solid #6366f1;background:#f8fafc;border-radius:0 8px 8px 0;">`;
      boardOverview += `<p style="font-weight:600;margin:0 0 4px 0;font-size:14px;">${outcome.statement}</p>`;
      boardOverview += `<p style="font-size:12px;color:#6b7280;margin:0 0 8px 0;">Mittari: ${measureText}</p>`;

      const outcomeItems = state.items.filter((i) => i.outcomeId === outcome.id).sort((a, b) => a.order - b.order);
      if (outcomeItems.length > 0) {
        boardOverview += `<ul style="margin:0;padding:0 0 0 16px;font-size:13px;">`;
        for (const item of outcomeItems) {
          const typeColor = item.type === "discovery" ? "#7c3aed" : "#0d9488";
          const typeLabel = item.type === "discovery" ? "Dis" : "Del";
          const col = item.column.charAt(0).toUpperCase() + item.column.slice(1);
          boardOverview += `<li style="margin:2px 0;"><span style="color:${typeColor};font-weight:600;font-size:11px;">[${typeLabel}]</span> ${item.title} <span style="color:#9ca3af;font-size:11px;">(${col})</span></li>`;
        }
        boardOverview += `</ul>`;
      }
      boardOverview += `</div>`;
    }
  }

  // Unlinked items
  let unlinkedSection = "";
  if (unlinkedItems.length > 0) {
    unlinkedSection = `<h3 style="color:#d97706;margin:24px 0 8px 0;font-size:16px;">⚠️ Orpot itemit (ei outcome-yhteyttä)</h3><ul style="font-size:13px;">`;
    for (const item of unlinkedItems) {
      const typeColor = item.type === "discovery" ? "#7c3aed" : "#0d9488";
      const typeLabel = item.type === "discovery" ? "Dis" : "Del";
      unlinkedSection += `<li><span style="color:${typeColor};font-weight:600;font-size:11px;">[${typeLabel}]</span> ${item.title}</li>`;
    }
    unlinkedSection += `</ul>`;
  }

  // Focus items
  let focusSection = "";
  if (sortedFocusItems.length > 0) {
    focusSection = `<h2 style="color:#1e1b4b;border-bottom:2px solid #e5e7eb;padding-bottom:8px;margin-top:32px;">Suositellut painopisteet</h2><ul style="font-size:14px;">`;
    for (const fi of sortedFocusItems) {
      const badge = fi.priority === "high" ? "🔴 Korkea" : fi.priority === "medium" ? "🟡 Keskitaso" : "🟢 Matala";
      focusSection += `<li style="margin:8px 0;"><strong>${badge}</strong> — ${fi.title}<br/><span style="color:#6b7280;font-size:12px;">${fi.suggestedAction}</span></li>`;
    }
    focusSection += `</ul>`;
  }

  const html = `<!DOCTYPE html>
<html lang="fi">
<head>
<meta charset="utf-8" />
<title>Shodoboard — ${productName}</title>
<style>
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 24px; color: #1f2937; line-height: 1.6; }
  h1 { color: #312e81; margin: 0; font-size: 28px; }
  h2 { color: #1e1b4b; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 32px; font-size: 20px; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14px; }
  th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  .header { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid #4f46e5; }
  .header-logo { width: 48px; height: 48px; background: #4f46e5; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; }
  .print-btn { background: #4f46e5; color: white; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; }
  .print-btn:hover { background: #3730a3; }
</style>
</head>
<body>
<div class="header">
  <div class="header-logo">S</div>
  <div>
    <h1>Shodoboard</h1>
    <p style="margin:4px 0 0 0;color:#6b7280;font-size:14px;">${productName} — ${date}</p>
  </div>
  <div style="margin-left:auto;" class="no-print">
    <button class="print-btn" onclick="window.print()">💾 Save as PDF</button>
  </div>
</div>

<h2>Yhteenveto</h2>
<table>
  <tr><th>Mittari</th><th>Arvo</th></tr>
  <tr><td>Tavoitteita</td><td>${analysis.totalGoals}</td></tr>
  <tr><td>Outcomeja</td><td>${analysis.totalOutcomes}</td></tr>
  <tr><td>Työ-itemejiä</td><td>${analysis.totalItems}</td></tr>
  <tr><td>Discovery-osuus</td><td>${discoveryRatio} %</td></tr>
  <tr><td>Mittaamattomat outcomet</td><td>${analysis.outcomesWithoutMeasure}</td></tr>
  <tr><td>Orpoja itemejiä</td><td>${analysis.unlinkedCount}</td></tr>
</table>

${findings.length > 0 ? `<h2>Keskeiset havainnot</h2><ul>${findings.join("")}</ul>` : ""}

${focusSection}

<h2>Taulun yleiskatsaus</h2>
${boardOverview}
${unlinkedSection}

<hr style="margin:32px 0;border:none;border-top:2px solid #e5e7eb;" />
<p style="text-align:center;color:#9ca3af;font-size:12px;">Luotu Shodoboardilla</p>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
```

**Step 2: Update BoardHeader to use new export function**

In `src/components/BoardHeader.tsx`:

Change the import (line 6):
```typescript
import { generateMarkdownExport, downloadMarkdown } from "@/lib/export";
```
To:
```typescript
import { openPrintableExport } from "@/lib/export";
```

Change `handleExport` (lines 50-53):
```typescript
  const handleExport = () => {
    const markdown = generateMarkdownExport(state);
    downloadMarkdown(markdown, `shodoboard-export-${new Date().toISOString().slice(0, 10)}.md`);
  };
```
To:
```typescript
  const handleExport = () => {
    openPrintableExport(state);
  };
```

Change the export button title (line 158):
```
title="Export board as Markdown"
```
To:
```
title="Export board as PDF"
```

**Step 3: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 4: Commit**

```bash
git add src/lib/export.ts src/components/BoardHeader.tsx
git commit -m "feat: replace markdown export with printable HTML — opens styled doc in new tab for print-to-PDF"
```

---

### Task 3: Move items between outcomes

**Files:**
- Modify: `src/components/CardDetailModal.tsx`

**Step 1: Add outcome dropdown to CardDetailModal**

Import `useBoard` is already available. Need to read outcomes and goals from state.

After line 36 (`const { dispatch } = useBoard();`), add:
```typescript
  const { state: boardState } = useBoard();
```

Wait — `useBoard()` is already called on line 36. Change line 36 to destructure both:
```typescript
  const { dispatch, state: boardState } = useBoard();
```

Add state for outcomeId after line 41:
```typescript
  const [outcomeId, setOutcomeId] = useState<string | null>(item.outcomeId);
```

**Step 2: Build outcome options grouped by goal**

After the `save` function (line 49), add a helper to build grouped outcome options:

```typescript
  const outcomeOptions = (() => {
    const options: { value: string | null; label: string; group?: string }[] = [
      { value: null, label: "— Unlinked —" },
    ];
    const sortedGoals = [...boardState.goals].sort((a, b) => a.order - b.order);
    for (const goal of sortedGoals) {
      const goalOutcomes = boardState.outcomes
        .filter((o) => o.goalId === goal.id)
        .sort((a, b) => a.order - b.order);
      for (const o of goalOutcomes) {
        options.push({ value: o.id, label: o.statement, group: goal.statement });
      }
    }
    // Unlinked outcomes
    const unlinkedOutcomes = boardState.outcomes.filter((o) => o.goalId === null);
    for (const o of unlinkedOutcomes) {
      options.push({ value: o.id, label: o.statement, group: "Unlinked" });
    }
    return options;
  })();
```

**Step 3: Replace the read-only outcome display with an editable dropdown**

Replace lines 85-95 (the "Parent outcome" section):
```tsx
          {/* Parent outcome */}
          {outcomeName && (
            <div>
              <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">
                Outcome
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                {outcomeName}
              </p>
            </div>
          )}
```

With:
```tsx
          {/* Parent outcome */}
          <div>
            <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
              Outcome
            </label>
            <select
              value={outcomeId ?? ""}
              onChange={(e) => {
                const val = e.target.value === "" ? null : e.target.value;
                setOutcomeId(val);
                dispatch({ type: "UPDATE_ITEM", itemId: item.id, updates: { outcomeId: val } });
              }}
              className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-lg text-xs text-gray-700 dark:text-gray-300 py-1.5 px-2 outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {outcomeOptions.map((opt, i) => (
                <option key={opt.value ?? "unlinked"} value={opt.value ?? ""}>
                  {opt.group ? `${opt.group} → ` : ""}{opt.label}
                </option>
              ))}
            </select>
          </div>
```

Also remove the `outcomeName` prop from CardDetailModalProps (line 23) since it's no longer needed:
```typescript
// Remove: outcomeName?: string;
```

And remove it from the destructured props (line 33):
```typescript
// Remove: outcomeName,
```

**Step 4: Update Board.tsx to stop passing outcomeName**

In `src/components/Board.tsx`, find where `CardDetailModal` is rendered (around line 680) and remove the `outcomeName` prop:

```tsx
// Remove this line:
              outcomeName={outcome?.statement}
```

Also remove the `outcome` lookup just above it since it's only used for `outcomeName`:
```tsx
// Remove: const outcome = outcomes.find((o) => o.id === item.outcomeId);
```

**Step 5: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 6: Commit**

```bash
git add src/components/CardDetailModal.tsx src/components/Board.tsx
git commit -m "feat: add outcome dropdown to card detail modal — items can be reassigned between outcomes"
```

---

### Task 4: Fix sparring creating unlinked items

**Files:**
- Modify: `src/components/Board.tsx` (onApply handler, lines 729-738)
- Modify: `src/lib/prompts.ts` (SPAR_SYSTEM_PROMPT)

**Step 1: Update SPAR_SYSTEM_PROMPT to include outcomeId in add_item suggestions**

In `src/lib/prompts.ts`, find the SPAR_SYSTEM_PROMPT JSON schema section (lines 132-140). Replace:

```
When you want to suggest a concrete board change, include a JSON block:
\`\`\`json
{
  "type": "suggestion",
  "action": "update_outcome|update_item|add_item|split_item",
  "targetId": "...",
  "changes": { ... }
}
\`\`\`

Keep conversations to 3-4 exchanges maximum. After that, push to action.
```

With:

```
When you want to suggest a concrete board change, include a JSON block:
\`\`\`json
{
  "type": "suggestion",
  "action": "update_outcome|update_item|add_item|split_item|update_goal",
  "targetId": "...",
  "changes": { ... }
}
\`\`\`

For add_item: targetId should be the outcomeId to link the new item to. changes should include { "title": "...", "type": "discovery|delivery", "description": "..." }.
For split_item: targetId should be the existing item ID. changes should include { "title": "..." } for the new split-off item.
For updates: targetId is the entity being updated, changes are the fields to modify.

Keep conversations to 3-4 exchanges maximum. After that, push to action.
```

**Step 2: Add add_item and split_item cases to onApply in Board.tsx**

In `src/components/Board.tsx`, find the `onApply` handler (lines 729-738). Replace:

```tsx
            onApply={(suggestion) => {
              if (suggestion.action === "update_outcome" && suggestion.targetId) {
                dispatch({ type: "UPDATE_OUTCOME", outcomeId: suggestion.targetId, updates: suggestion.changes as Partial<Outcome> });
              } else if (suggestion.action === "update_item" && suggestion.targetId) {
                dispatch({ type: "UPDATE_ITEM", itemId: suggestion.targetId, updates: suggestion.changes as Partial<WorkItem> });
              } else if (suggestion.action === "update_goal" && suggestion.targetId) {
                dispatch({ type: "UPDATE_GOAL", goalId: suggestion.targetId, updates: suggestion.changes as Partial<BusinessGoal> });
              }
              setSparringNudgeId(null);
            }}
```

With:

```tsx
            onApply={(suggestion) => {
              if (suggestion.action === "update_outcome" && suggestion.targetId) {
                dispatch({ type: "UPDATE_OUTCOME", outcomeId: suggestion.targetId, updates: suggestion.changes as Partial<Outcome> });
              } else if (suggestion.action === "update_item" && suggestion.targetId) {
                dispatch({ type: "UPDATE_ITEM", itemId: suggestion.targetId, updates: suggestion.changes as Partial<WorkItem> });
              } else if (suggestion.action === "update_goal" && suggestion.targetId) {
                dispatch({ type: "UPDATE_GOAL", goalId: suggestion.targetId, updates: suggestion.changes as Partial<BusinessGoal> });
              } else if (suggestion.action === "add_item") {
                // targetId = outcomeId to link to; fall back to nudge target's outcome
                let outcomeId = suggestion.targetId || null;
                if (!outcomeId && nudge.targetType === "outcome") {
                  outcomeId = nudge.targetId;
                } else if (!outcomeId && nudge.targetType === "item") {
                  const sourceItem = items.find(i => i.id === nudge.targetId);
                  outcomeId = sourceItem?.outcomeId || null;
                }
                const changes = suggestion.changes as Record<string, unknown>;
                const newItem: WorkItem = {
                  id: generateId("item"),
                  outcomeId,
                  title: (changes.title as string) || "Uusi työ",
                  description: (changes.description as string) || "",
                  type: (changes.type as "discovery" | "delivery") || "discovery",
                  column: "opportunities",
                  order: items.filter(i => i.outcomeId === outcomeId).length,
                };
                dispatch({ type: "ADD_ITEM", item: newItem });
              } else if (suggestion.action === "split_item" && suggestion.targetId) {
                const sourceItem = items.find(i => i.id === suggestion.targetId);
                if (sourceItem) {
                  const changes = suggestion.changes as Record<string, unknown>;
                  const newItem: WorkItem = {
                    id: generateId("item"),
                    outcomeId: sourceItem.outcomeId,
                    title: (changes.title as string) || "Split: " + sourceItem.title,
                    description: (changes.description as string) || "",
                    type: (changes.type as "discovery" | "delivery") || "discovery",
                    column: "opportunities",
                    order: items.filter(i => i.outcomeId === sourceItem.outcomeId).length,
                  };
                  dispatch({ type: "ADD_ITEM", item: newItem });
                }
              }
              setSparringNudgeId(null);
            }}
```

**Step 3: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 4: Commit**

```bash
git add src/components/Board.tsx src/lib/prompts.ts
git commit -m "fix: sparring apply now handles add_item and split_item — links new items to correct outcome"
```

---

## Execution Order

Tasks 1-4 are independent and can run in parallel:
- Task 1: NudgeBadge only
- Task 2: export.ts + BoardHeader only
- Task 3: CardDetailModal + Board.tsx (outcomeName removal)
- Task 4: Board.tsx (onApply) + prompts.ts

**Note:** Tasks 3 and 4 both modify Board.tsx but in different sections (task 3 removes outcomeName around line 680, task 4 modifies onApply around line 729). Run task 3 before task 4 to avoid line number drift.

## Final Verification

After all tasks:
1. `npx next build` — clean build
2. Push to Vercel
