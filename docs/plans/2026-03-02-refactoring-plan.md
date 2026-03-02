# Refactoring & Maintenance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 4 critical bugs, extract shared utilities, split the 777-line Board.tsx god component, add error boundary, and eliminate all major DRY violations.

**Architecture:** Bottom-up approach — shared utilities first (other tasks depend on them), then bug fixes, then component extraction, then Board.tsx restructuring. Each task is independently buildable.

**Tech Stack:** React 19, Next.js 16, TypeScript, Tailwind CSS v4, Anthropic SDK

---

### Task 1: Create shared utilities (`src/lib/utils.ts`)

**Files:**
- Create: `src/lib/utils.ts`

**Step 1: Create utils.ts with all shared functions**

```typescript
import type Anthropic from "@anthropic-ai/sdk";
import type { BoardState } from "@/types/board";

/**
 * Generate a unique ID with a prefix.
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Escape HTML special characters to prevent XSS.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Serialize board state for AI consumption (strips UI-only fields).
 */
export function serializeBoardForAI(boardState: BoardState): string {
  return JSON.stringify(
    {
      goals: boardState.goals.map((g) => ({
        id: g.id,
        statement: g.statement,
        timeframe: g.timeframe,
        metrics: g.metrics,
      })),
      outcomes: boardState.outcomes.map((o) => ({
        id: o.id,
        goalId: o.goalId,
        statement: o.statement,
        behaviorChange: o.behaviorChange,
        measureOfSuccess: o.measureOfSuccess,
      })),
      items: boardState.items.map((i) => ({
        id: i.id,
        outcomeId: i.outcomeId,
        title: i.title,
        description: i.description,
        type: i.type,
        column: i.column,
      })),
    },
    null,
    2
  );
}

/**
 * Extract plain text from an Anthropic API response.
 */
export function extractTextFromResponse(response: Anthropic.Message): string {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

/**
 * Extract a JSON block from markdown-formatted text (```json ... ```).
 * Returns the parsed object and the text with the JSON block removed, or null if no valid JSON block found.
 */
export function extractJsonBlock(text: string): { parsed: unknown; displayText: string } | null {
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    const displayText = text.replace(/```json\n[\s\S]*?\n```/, "").trim();
    return { parsed, displayText };
  } catch {
    return null;
  }
}
```

**Step 2: Verify build**

Run: `npx next build`
Expected: Compiles successfully (file is created but not yet imported)

**Step 3: Commit**

```bash
git add src/lib/utils.ts
git commit -m "refactor: add shared utilities — generateId, escapeHtml, AI response helpers"
```

---

### Task 2: Create entity factory functions (`src/lib/entities.ts`)

**Files:**
- Create: `src/lib/entities.ts`

**Step 1: Create entities.ts with factory functions**

```typescript
import { generateId } from "./utils";
import type { BusinessGoal, Outcome, WorkItem } from "@/types/board";

export function createGoal(overrides?: Partial<BusinessGoal>): BusinessGoal {
  return {
    id: generateId("goal"),
    statement: "Uusi tavoite",
    timeframe: "",
    metrics: [],
    order: 0,
    collapsed: false,
    ...overrides,
  };
}

export function createOutcome(goalId: string, overrides?: Partial<Outcome>): Outcome {
  return {
    id: generateId("outcome"),
    goalId,
    statement: "Uusi tulos",
    behaviorChange: "",
    measureOfSuccess: "",
    order: 0,
    collapsed: false,
    ...overrides,
  };
}

export function createItem(outcomeId: string | null, overrides?: Partial<WorkItem>): WorkItem {
  return {
    id: generateId("item"),
    outcomeId,
    title: "Uusi työ",
    description: "",
    type: "delivery",
    column: "opportunities",
    order: 0,
    ...overrides,
  };
}
```

**Step 2: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 3: Commit**

```bash
git add src/lib/entities.ts
git commit -m "refactor: add entity factory functions — createGoal, createOutcome, createItem"
```

---

### Task 3: Fix critical bugs (C1–C4)

**Files:**
- Modify: `src/hooks/useBoard.ts` (ADD_NUDGE action)
- Modify: `src/hooks/useAutoSave.ts` (ref fix)
- Modify: `src/components/CardDetailModal.tsx` (dual-write fix)
- Modify: `src/components/Board.tsx` (use ADD_NUDGE)

**Step 1: Add ADD_NUDGE to useBoard reducer**

In `src/hooks/useBoard.ts`, add to the `BoardAction` union type (after the existing `SET_NUDGES` line):

```typescript
  | { type: "ADD_NUDGE"; nudge: Nudge }
```

Add the reducer case (after the `SET_NUDGES` case):

```typescript
    case "ADD_NUDGE":
      return { ...state, nudges: [...state.nudges, action.nudge] };
```

**Step 2: Fix useAutoSave stale closure**

Replace the entire content of `src/hooks/useAutoSave.ts` with:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { updateBoardState } from "@/lib/firestore";
import type { BoardState } from "@/types/board";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutoSave(boardId: string | null, state: BoardState) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isFirstRender = useRef(true);
  const latestState = useRef(state);

  // Always keep ref in sync with latest state
  latestState.current = state;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!boardId) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setSaveStatus("saving");
    timeoutRef.current = setTimeout(async () => {
      try {
        await updateBoardState(boardId, latestState.current);
        setSaveStatus("saved");
      } catch (err) {
        console.error("Auto-save failed:", err);
        setSaveStatus("error");
      }
    }, 1000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [boardId, state]);

  return saveStatus;
}
```

**Step 3: Fix CardDetailModal dual-write — include outcomeId in save()**

In `src/components/CardDetailModal.tsx`, find the `save` function:

```typescript
  const save = () => {
    dispatch({
      type: "UPDATE_ITEM",
      itemId: item.id,
      updates: { title, description, assignee: assignee || undefined, column, type },
    });
  };
```

Replace with:

```typescript
  const save = () => {
    dispatch({
      type: "UPDATE_ITEM",
      itemId: item.id,
      updates: { title, description, assignee: assignee || undefined, column, type, outcomeId },
    });
  };
```

**Step 4: Fix Board.tsx — use ADD_NUDGE in handleStartSparringFromFocus**

In `src/components/Board.tsx`, find `handleStartSparringFromFocus` (around line 179). Change:

```typescript
      dispatch({ type: "SET_NUDGES", nudges: [...nudges, syntheticNudge] });
```

To:

```typescript
      dispatch({ type: "ADD_NUDGE", nudge: syntheticNudge });
```

Also remove `nudges` from the dependency array of this callback:

```typescript
  }, [nudges, dispatch]);
```

Change to:

```typescript
  }, [dispatch]);
```

Wait — we still need `nudges` for the `nudges.find(...)` at the top of the callback. But the `find` is a read-only check, and using `state.nudges` directly from context would be more correct. Actually, keep `nudges` in the dependency array for the `find` — the race condition is only in the `SET_NUDGES` dispatch which we've now fixed with `ADD_NUDGE`.

So the dependency array stays `[nudges, dispatch]`.

**Step 5: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 6: Commit**

```bash
git add src/hooks/useBoard.ts src/hooks/useAutoSave.ts src/components/CardDetailModal.tsx src/components/Board.tsx
git commit -m "fix: critical bugs — ADD_NUDGE race condition, auto-save stale closure, modal dual-write"
```

---

### Task 4: Harden API routes + convert prompts to functions

**Files:**
- Modify: `src/lib/prompts.ts`
- Modify: `src/app/api/nudge/route.ts`
- Modify: `src/app/api/focus/route.ts`
- Modify: `src/app/api/spar/route.ts`
- Modify: `src/app/api/intake/route.ts`

**Step 1: Convert prompts from constants to functions**

In `src/lib/prompts.ts`, wrap each prompt in a function so dates are evaluated at call time:

Change `export const INTAKE_SYSTEM_PROMPT = \`...\`` to:

```typescript
export function getIntakeSystemPrompt(): string {
  return `You are a product management coach...
Today's date: ${new Date().toISOString().split("T")[0]}
...
The current year is ${new Date().getFullYear()}.
...`;
}
```

Do the same for all 4 prompts:
- `INTAKE_SYSTEM_PROMPT` → `getIntakeSystemPrompt()`
- `NUDGE_SYSTEM_PROMPT` → `getNudgeSystemPrompt()`
- `SPAR_SYSTEM_PROMPT` → `getSparSystemPrompt()`
- `FOCUS_SYSTEM_PROMPT` → `getFocusSystemPrompt()`

Note: `SPAR_SYSTEM_PROMPT` has no date interpolation, but convert it to a function anyway for consistency.

**Step 2: Refactor nudge API route**

Replace `src/app/api/nudge/route.ts` with:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { getNudgeSystemPrompt } from "@/lib/prompts";
import { serializeBoardForAI, extractTextFromResponse, extractJsonBlock } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import type { BoardState } from "@/types/board";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { boardState } = (await req.json()) as { boardState: BoardState };
  const boardDescription = serializeBoardForAI(boardState);

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: getNudgeSystemPrompt(),
      messages: [
        {
          role: "user",
          content: `Here is the current board state:\n\n${boardDescription}\n\nGenerate 5 coaching nudges.`,
        },
      ],
    });

    const text = extractTextFromResponse(response);
    const result = extractJsonBlock(text);

    if (!result) {
      console.error("Nudge API: failed to parse AI response", text.slice(0, 200));
      return NextResponse.json({ nudges: [], parseError: true });
    }

    const parsed = result.parsed as Array<{
      targetType: string;
      targetId: string;
      tier: string;
      message: string;
      question: string;
    }>;

    const nudges = parsed.map((n, i) => ({
      id: `nudge-${Date.now()}-${i}`,
      targetType: n.targetType,
      targetId: n.targetId,
      tier: n.tier,
      message: n.message,
      question: n.question,
      status: "active",
    }));

    return NextResponse.json({ nudges });
  } catch (error) {
    console.error("Nudge API error:", error);
    return NextResponse.json({ nudges: [] }, { status: 500 });
  }
}
```

**Step 3: Refactor focus API route**

Replace `src/app/api/focus/route.ts` with:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { getFocusSystemPrompt } from "@/lib/prompts";
import { serializeBoardForAI, extractTextFromResponse, extractJsonBlock } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import type { BoardState, FocusItem } from "@/types/board";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { boardState } = (await req.json()) as { boardState: BoardState };
  const boardDescription = serializeBoardForAI(boardState);

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: getFocusSystemPrompt(),
      messages: [
        {
          role: "user",
          content: `Here is the current board state:\n\n${boardDescription}\n\nAnalyze the board and generate 3-5 prioritized coaching focus areas.`,
        },
      ],
    });

    const text = extractTextFromResponse(response);
    const result = extractJsonBlock(text);

    if (!result) {
      console.error("Focus API: failed to parse AI response", text.slice(0, 200));
      return NextResponse.json({ focusItems: [], parseError: true });
    }

    const parsed = result.parsed as { focusItems: Array<{
      priority: "high" | "medium" | "low";
      title: string;
      whyItMatters: string;
      antiPattern: string;
      targetType: "goal" | "outcome" | "item";
      targetId: string;
      suggestedAction: string;
    }> };

    const focusItems: FocusItem[] = parsed.focusItems.map((f, i) => ({
      id: `focus-${Date.now()}-${i}`,
      priority: f.priority,
      status: "pending",
      title: f.title,
      whyItMatters: f.whyItMatters,
      antiPattern: f.antiPattern,
      targetType: f.targetType,
      targetId: f.targetId,
      suggestedAction: f.suggestedAction,
    }));

    return NextResponse.json({ focusItems });
  } catch (error) {
    console.error("Focus API error:", error);
    return NextResponse.json({ focusItems: [] }, { status: 500 });
  }
}
```

**Step 4: Refactor spar API route**

Replace `src/app/api/spar/route.ts` with:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { getSparSystemPrompt } from "@/lib/prompts";
import { extractTextFromResponse, extractJsonBlock } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { messages, nudgeContext } = await req.json();

  const contextMessage = `I'm looking at this coaching nudge on my board:

Nudge: "${nudgeContext.nudge.message} ${nudgeContext.nudge.question}"

About this ${nudgeContext.nudge.targetType}:
${JSON.stringify(nudgeContext.target, null, 2)}

Help me think through this.`;

  const claudeMessages: { role: "user" | "assistant"; content: string }[] = [];
  claudeMessages.push({ role: "user", content: contextMessage });

  if (messages && messages.length > 0) {
    for (const msg of messages) {
      claudeMessages.push({
        role: msg.role === "ai" ? "assistant" : "user",
        content: msg.text,
      });
    }
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: getSparSystemPrompt(),
      messages: claudeMessages,
    });

    const text = extractTextFromResponse(response);
    const result = extractJsonBlock(text);
    let suggestion = null;
    let displayText = text;

    if (result) {
      const parsed = result.parsed as { type?: string };
      if (parsed.type === "suggestion") {
        suggestion = parsed;
        displayText = result.displayText;
      }
    }

    return NextResponse.json({ text: displayText, suggestion });
  } catch (error) {
    console.error("Spar API error:", error);
    return NextResponse.json(
      { error: "Failed to get coaching response" },
      { status: 500 }
    );
  }
}
```

**Step 5: Refactor intake API route**

Replace `src/app/api/intake/route.ts` with:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { getIntakeSystemPrompt } from "@/lib/prompts";
import { extractTextFromResponse, extractJsonBlock } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { messages, backlog, goals, images } = await req.json();

  const claudeMessages: Anthropic.MessageParam[] = [];

  if (!messages || messages.length === 0) {
    const content: Anthropic.ContentBlockParam[] = [];

    if (images && images.length > 0) {
      for (const img of images) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: img.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: img.base64,
          },
        });
      }
    }

    let textContent = "";
    if (backlog && backlog.trim()) {
      textContent += `Here is my team's backlog:\n\n${backlog}`;
    }
    if (images && images.length > 0) {
      textContent += textContent
        ? "\n\nI also attached photos/screenshots of our task board. Please read all visible items from the images and include them in your analysis."
        : "I attached photos/screenshots of our task board. Please read all visible items from the images and analyze them.";
    }
    if (goals && goals.trim()) {
      textContent += `\n\nOur current business goals/OKRs:\n\n${goals}`;
    }
    if (!textContent) {
      textContent = "Please analyze my backlog.";
    }

    content.push({ type: "text", text: textContent });
    claudeMessages.push({ role: "user", content });
  } else {
    for (const msg of messages) {
      claudeMessages.push({
        role: msg.role === "ai" ? "assistant" : "user",
        content: msg.text,
      });
    }
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: getIntakeSystemPrompt(),
      messages: claudeMessages,
    });

    const text = extractTextFromResponse(response);
    const result = extractJsonBlock(text);
    let boardData = null;
    let displayText = text;

    if (result) {
      const parsed = result.parsed as { type?: string };
      if (parsed.type === "board_ready") {
        boardData = parsed;
        displayText = result.displayText;
      }
    }

    return NextResponse.json({ text: displayText, boardData });
  } catch (error) {
    console.error("Intake API error:", error);
    return NextResponse.json(
      { error: "Failed to analyze backlog" },
      { status: 500 }
    );
  }
}
```

**Step 6: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 7: Commit**

```bash
git add src/lib/prompts.ts src/app/api/nudge/route.ts src/app/api/focus/route.ts src/app/api/spar/route.ts src/app/api/intake/route.ts
git commit -m "refactor: harden API routes — shared utils, API key check, prompts as functions"
```

---

### Task 5: Extract TypeBadge component

**Files:**
- Create: `src/components/TypeBadge.tsx`
- Modify: `src/components/WorkItemCard.tsx`
- Modify: `src/components/HierarchyView.tsx`

**Step 1: Create TypeBadge.tsx**

```tsx
import type { ItemType } from "@/types/board";

interface TypeBadgeProps {
  type: ItemType;
}

export default function TypeBadge({ type }: TypeBadgeProps) {
  return (
    <span className="inline-flex rounded overflow-hidden text-[10px] font-medium">
      <span
        className={`px-1.5 py-0.5 ${
          type === "discovery"
            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
            : "bg-purple-50 dark:bg-purple-900/10 text-purple-300 dark:text-purple-600"
        }`}
      >
        Dis
      </span>
      <span
        className={`px-1.5 py-0.5 ${
          type === "delivery"
            ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
            : "bg-teal-50 dark:bg-teal-900/10 text-teal-300 dark:text-teal-600"
        }`}
      >
        Del
      </span>
    </span>
  );
}
```

**Step 2: Update WorkItemCard.tsx**

Add import: `import TypeBadge from "./TypeBadge";`

Replace lines 57-68 (the inline badge) with:

```tsx
          <TypeBadge type={item.type} />
```

**Step 3: Update HierarchyView.tsx**

Add import: `import TypeBadge from "./TypeBadge";`

In `ItemRow` (lines 48-58), replace the inline badge with: `<TypeBadge type={item.type} />`

In the unlinked items section (lines 249-259), replace the inline badge with: `<TypeBadge type={item.type} />`

Also remove the unused `nudges` destructuring on line 162 — change:
```typescript
  const { goals, outcomes, items, nudges } = state;
```
To:
```typescript
  const { goals, outcomes, items } = state;
```

**Step 4: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 5: Commit**

```bash
git add src/components/TypeBadge.tsx src/components/WorkItemCard.tsx src/components/HierarchyView.tsx
git commit -m "refactor: extract TypeBadge component — eliminates 3x duplicated badge markup"
```

---

### Task 6: Extract SlidePanel component + add Escape key handling

**Files:**
- Create: `src/components/SlidePanel.tsx`
- Modify: `src/components/CardDetailModal.tsx`
- Modify: `src/components/GoalDetailModal.tsx`
- Modify: `src/components/OutcomeDetailModal.tsx`

**Step 1: Create SlidePanel.tsx**

```tsx
"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";

interface SlidePanelProps {
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}

export default function SlidePanel({ onClose, title, icon, children }: SlidePanelProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
      <div
        className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-xl overflow-y-auto animate-slide-in"
        onClick={(e) => e.stopPropagation()}
        style={{ animationName: "slide-in-right" }}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-5 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              {title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {children}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Refactor CardDetailModal.tsx to use SlidePanel**

Replace the modal shell (the outer `<div>` with fixed inset, backdrop, slide-in panel, and sticky header) with `<SlidePanel>`. Remove the `X` import from phosphor (it's now in SlidePanel). The body content stays as `children`.

The component becomes:

```tsx
"use client";

import { useState } from "react";
import { useBoard } from "@/hooks/useBoard";
import type { WorkItem, Nudge, DiscoveryPrompt, Column } from "@/types/board";
import NudgeBadge from "./NudgeBadge";
import DiscoveryPrompts from "./DiscoveryPrompts";
import SlidePanel from "./SlidePanel";

const COLUMN_OPTIONS: { value: Column; label: string }[] = [
  { value: "opportunities", label: "Opportunities" },
  { value: "discovering", label: "Discovering" },
  { value: "ready", label: "Ready for Building" },
  { value: "building", label: "Building" },
  { value: "shipped", label: "Shipped" },
  { value: "measuring", label: "Measuring" },
];

interface CardDetailModalProps {
  item: WorkItem;
  nudges: Nudge[];
  discoveryPrompts: DiscoveryPrompt[];
  onClose: () => void;
  onSpar?: (nudgeId: string) => void;
}

export default function CardDetailModal({
  item,
  nudges,
  discoveryPrompts,
  onClose,
  onSpar,
}: CardDetailModalProps) {
  const { dispatch, state: boardState } = useBoard();
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [assignee, setAssignee] = useState(item.assignee || "");
  const [column, setColumn] = useState<Column>(item.column);
  const [type, setType] = useState(item.type);
  const [outcomeId, setOutcomeId] = useState<string | null>(item.outcomeId);

  const save = () => {
    dispatch({
      type: "UPDATE_ITEM",
      itemId: item.id,
      updates: { title, description, assignee: assignee || undefined, column, type, outcomeId },
    });
  };

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
    return options;
  })();

  const activeNudges = nudges.filter((n) => n.status === "active");

  return (
    <SlidePanel onClose={onClose} title="Work Item">
      {/* Title */}
      <div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={save}
          className="w-full text-lg font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-none outline-none focus:ring-0 p-0"
          placeholder="Item title"
        />
      </div>

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
          {outcomeOptions.map((opt) => (
            <option key={opt.value ?? "unlinked"} value={opt.value ?? ""}>
              {opt.group ? `${opt.group} → ` : ""}{opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Type toggle + Column */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
            Type
          </label>
          <div className="flex gap-1">
            <button
              onClick={() => {
                setType("discovery");
                dispatch({ type: "UPDATE_ITEM", itemId: item.id, updates: { type: "discovery" } });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                type === "discovery"
                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              }`}
            >
              Discovery
            </button>
            <button
              onClick={() => {
                setType("delivery");
                dispatch({ type: "UPDATE_ITEM", itemId: item.id, updates: { type: "delivery" } });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                type === "delivery"
                  ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              }`}
            >
              Delivery
            </button>
          </div>
        </div>

        <div className="flex-1">
          <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
            Column
          </label>
          <select
            value={column}
            onChange={(e) => {
              const val = e.target.value as Column;
              setColumn(val);
              dispatch({ type: "UPDATE_ITEM", itemId: item.id, updates: { column: val } });
            }}
            className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-lg text-xs text-gray-700 dark:text-gray-300 py-1.5 px-2 outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            {COLUMN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={save}
          rows={4}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
          placeholder="Add a description..."
        />
      </div>

      {/* Assignee */}
      <div>
        <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
          Assignee
        </label>
        <input
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          onBlur={save}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/40"
          placeholder="Name"
        />
      </div>

      {/* Nudges */}
      {activeNudges.length > 0 && (
        <div>
          <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
            AI Nudges
          </label>
          <div className="space-y-2">
            {activeNudges.map((nudge) => (
              <NudgeBadge
                key={nudge.id}
                nudge={{ ...nudge, tier: "visible" }}
                onSpar={onSpar ? () => onSpar(nudge.id) : undefined}
                initialExpanded
              />
            ))}
          </div>
        </div>
      )}

      {/* Discovery prompts */}
      {discoveryPrompts.length > 0 && (
        <div>
          <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
            Discovery Checklist
          </label>
          <DiscoveryPrompts prompts={discoveryPrompts} />
        </div>
      )}
    </SlidePanel>
  );
}
```

**Step 3: Refactor GoalDetailModal.tsx to use SlidePanel**

```tsx
"use client";

import { useState } from "react";
import { Flag } from "@phosphor-icons/react";
import { useBoard } from "@/hooks/useBoard";
import type { BusinessGoal } from "@/types/board";
import SlidePanel from "./SlidePanel";

interface GoalDetailModalProps {
  goal: BusinessGoal;
  outcomeCount: number;
  onClose: () => void;
}

export default function GoalDetailModal({
  goal,
  outcomeCount,
  onClose,
}: GoalDetailModalProps) {
  const { dispatch } = useBoard();
  const [statement, setStatement] = useState(goal.statement);
  const [timeframe, setTimeframe] = useState(goal.timeframe || "");
  const [metrics, setMetrics] = useState(goal.metrics.join("\n"));

  const save = () => {
    dispatch({
      type: "UPDATE_GOAL",
      goalId: goal.id,
      updates: {
        statement,
        timeframe: timeframe || undefined,
        metrics: metrics.split("\n").filter((m) => m.trim()),
      },
    });
  };

  return (
    <SlidePanel
      onClose={onClose}
      title="Business Goal"
      icon={<Flag size={16} weight="duotone" className="text-indigo-500 dark:text-indigo-400" />}
    >
      {/* Statement */}
      <div>
        <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
          Goal Statement
        </label>
        <input
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          onBlur={save}
          className="w-full text-lg font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-none outline-none focus:ring-0 p-0"
          placeholder="What is the business trying to achieve?"
        />
      </div>

      {/* Timeframe */}
      <div>
        <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
          Timeframe
        </label>
        <input
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          onBlur={save}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/40"
          placeholder="e.g., This year, Q2 2026"
        />
      </div>

      {/* Key metrics */}
      <div>
        <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
          Key Metrics (one per line)
        </label>
        <textarea
          value={metrics}
          onChange={(e) => setMetrics(e.target.value)}
          onBlur={save}
          rows={4}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
          placeholder="How would you know you're getting there?"
        />
      </div>

      {/* Outcomes count */}
      <div>
        <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">
          Outcomes
        </label>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
          {outcomeCount} outcome{outcomeCount !== 1 ? "s" : ""}
        </p>
      </div>
    </SlidePanel>
  );
}
```

**Step 4: Refactor OutcomeDetailModal.tsx to use SlidePanel**

```tsx
"use client";

import { useState } from "react";
import { Target } from "@phosphor-icons/react";
import { useBoard } from "@/hooks/useBoard";
import type { Outcome, Nudge } from "@/types/board";
import NudgeBadge from "./NudgeBadge";
import SlidePanel from "./SlidePanel";

interface OutcomeDetailModalProps {
  outcome: Outcome;
  nudges: Nudge[];
  goalName?: string;
  itemCount: number;
  onClose: () => void;
  onSpar?: (nudgeId: string) => void;
}

export default function OutcomeDetailModal({
  outcome,
  nudges,
  goalName,
  itemCount,
  onClose,
  onSpar,
}: OutcomeDetailModalProps) {
  const { dispatch } = useBoard();
  const [statement, setStatement] = useState(outcome.statement);
  const [behaviorChange, setBehaviorChange] = useState(outcome.behaviorChange);
  const [measureOfSuccess, setMeasureOfSuccess] = useState(outcome.measureOfSuccess);

  const save = () => {
    dispatch({
      type: "UPDATE_OUTCOME",
      outcomeId: outcome.id,
      updates: { statement, behaviorChange, measureOfSuccess },
    });
  };

  const activeNudges = nudges.filter((n) => n.status === "active");

  return (
    <SlidePanel
      onClose={onClose}
      title="Outcome"
      icon={<Target size={16} weight="duotone" className="text-teal-500 dark:text-teal-400" />}
    >
      {/* Statement */}
      <div>
        <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
          Outcome Statement
        </label>
        <input
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          onBlur={save}
          className="w-full text-lg font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-none outline-none focus:ring-0 p-0"
          placeholder="What changes in the world?"
        />
      </div>

      {/* Parent goal */}
      {goalName && (
        <div>
          <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">
            Business Goal
          </label>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
            {goalName}
          </p>
        </div>
      )}

      {/* Behavior change */}
      <div>
        <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
          Desired Behavior Change
        </label>
        <textarea
          value={behaviorChange}
          onChange={(e) => setBehaviorChange(e.target.value)}
          onBlur={save}
          rows={3}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
          placeholder="What do people do differently?"
        />
      </div>

      {/* Measure of success */}
      <div>
        <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
          Measure of Success
        </label>
        <input
          value={measureOfSuccess}
          onChange={(e) => setMeasureOfSuccess(e.target.value)}
          onBlur={save}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/40"
          placeholder="Something observable and specific"
        />
      </div>

      {/* Work items count */}
      <div>
        <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">
          Work Items
        </label>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Nudges */}
      {activeNudges.length > 0 && (
        <div>
          <label className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium block mb-1.5">
            AI Nudges
          </label>
          <div className="space-y-2">
            {activeNudges.map((nudge) => (
              <NudgeBadge
                key={nudge.id}
                nudge={{ ...nudge, tier: "visible" }}
                onSpar={onSpar ? () => onSpar(nudge.id) : undefined}
                initialExpanded
              />
            ))}
          </div>
        </div>
      )}
    </SlidePanel>
  );
}
```

**Step 5: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 6: Commit**

```bash
git add src/components/SlidePanel.tsx src/components/CardDetailModal.tsx src/components/GoalDetailModal.tsx src/components/OutcomeDetailModal.tsx
git commit -m "refactor: extract SlidePanel component — deduplicates modal shell, adds Escape key"
```

---

### Task 7: Extract useBoardActions hook + sparring apply handler

**Files:**
- Create: `src/hooks/useBoardActions.ts`
- Create: `src/lib/sparring.ts`
- Modify: `src/components/Board.tsx`

**Step 1: Create sparring apply handler**

Create `src/lib/sparring.ts`:

```typescript
import { createItem } from "./entities";
import type { WorkItem, Nudge, Outcome, BusinessGoal } from "@/types/board";
import type { BoardAction } from "@/hooks/useBoard";

interface SparringSuggestion {
  action: string;
  targetId?: string;
  changes: Record<string, unknown>;
}

export function handleSparringApply(
  suggestion: SparringSuggestion,
  nudge: Nudge,
  items: WorkItem[],
  dispatch: React.Dispatch<BoardAction>,
): void {
  if (suggestion.action === "update_outcome" && suggestion.targetId) {
    dispatch({ type: "UPDATE_OUTCOME", outcomeId: suggestion.targetId, updates: suggestion.changes as Partial<Outcome> });
  } else if (suggestion.action === "update_item" && suggestion.targetId) {
    dispatch({ type: "UPDATE_ITEM", itemId: suggestion.targetId, updates: suggestion.changes as Partial<WorkItem> });
  } else if (suggestion.action === "update_goal" && suggestion.targetId) {
    dispatch({ type: "UPDATE_GOAL", goalId: suggestion.targetId, updates: suggestion.changes as Partial<BusinessGoal> });
  } else if (suggestion.action === "add_item") {
    let outcomeId = suggestion.targetId || null;
    if (!outcomeId && nudge.targetType === "outcome") {
      outcomeId = nudge.targetId;
    } else if (!outcomeId && nudge.targetType === "item") {
      const sourceItem = items.find(i => i.id === nudge.targetId);
      outcomeId = sourceItem?.outcomeId || null;
    }
    const changes = suggestion.changes;
    const newItem = createItem(outcomeId, {
      title: (changes.title as string) || "Uusi työ",
      description: (changes.description as string) || "",
      type: (changes.type as "discovery" | "delivery") || "discovery",
      order: items.filter(i => i.outcomeId === outcomeId).length,
    });
    dispatch({ type: "ADD_ITEM", item: newItem });
  } else if (suggestion.action === "split_item" && suggestion.targetId) {
    const sourceItem = items.find(i => i.id === suggestion.targetId);
    if (sourceItem) {
      const changes = suggestion.changes;
      const newItem = createItem(sourceItem.outcomeId, {
        title: (changes.title as string) || "Split: " + sourceItem.title,
        description: (changes.description as string) || "",
        type: (changes.type as "discovery" | "delivery") || "discovery",
        order: items.filter(i => i.outcomeId === sourceItem.outcomeId).length,
      });
      dispatch({ type: "ADD_ITEM", item: newItem });
    }
  }
}
```

**Step 2: Create useBoardActions hook**

Create `src/hooks/useBoardActions.ts`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { useBoard } from "./useBoard";
import type { FocusItem, FocusItemStatus, Nudge } from "@/types/board";

export function useBoardActions() {
  const { state, dispatch } = useBoard();
  const { nudges } = state;
  const [nudgesLoading, setNudgesLoading] = useState(false);
  const [focusLoading, setFocusLoading] = useState(false);

  const generateNudges = useCallback(async () => {
    setNudgesLoading(true);
    try {
      const res = await fetch("/api/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardState: state }),
      });
      const data = await res.json();
      if (data.nudges && data.nudges.length > 0) {
        dispatch({ type: "SET_NUDGES", nudges: data.nudges });
      }
    } catch (err) {
      console.error("Failed to generate nudges:", err);
    }
    setNudgesLoading(false);
  }, [state, dispatch]);

  const generateFocusItems = useCallback(async () => {
    setFocusLoading(true);
    try {
      const res = await fetch("/api/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardState: state }),
      });
      const data = await res.json();
      if (data.focusItems && data.focusItems.length > 0) {
        dispatch({ type: "SET_FOCUS_ITEMS", focusItems: data.focusItems });
        return true; // signal that items were loaded (caller can open agenda)
      }
    } catch (err) {
      console.error("Failed to generate focus items:", err);
    }
    setFocusLoading(false);
    return false;
  }, [state, dispatch]);

  const handleFocusItemClick = useCallback((focusItem: FocusItem) => {
    const el = document.getElementById(focusItem.targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-indigo-400", "ring-offset-2");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-indigo-400", "ring-offset-2");
      }, 2000);
    }
  }, []);

  const handleStartSparringFromFocus = useCallback((focusItem: FocusItem): string => {
    const existingNudge = nudges.find(n => n.targetId === focusItem.targetId && n.status === "active");
    if (existingNudge) {
      return existingNudge.id;
    } else {
      const syntheticNudge: Nudge = {
        id: `synth-${focusItem.id}`,
        targetType: focusItem.targetType,
        targetId: focusItem.targetId,
        tier: "visible" as const,
        message: focusItem.whyItMatters,
        question: focusItem.suggestedAction,
        status: "active" as const,
      };
      dispatch({ type: "ADD_NUDGE", nudge: syntheticNudge });
      return syntheticNudge.id;
    }
  }, [nudges, dispatch]);

  const handleFocusStatusChange = useCallback((focusItemId: string, status: FocusItemStatus) => {
    dispatch({ type: "UPDATE_FOCUS_ITEM", focusItemId, updates: { status } });
  }, [dispatch]);

  return {
    nudgesLoading,
    focusLoading,
    generateNudges,
    generateFocusItems,
    handleFocusItemClick,
    handleStartSparringFromFocus,
    handleFocusStatusChange,
  };
}
```

**Step 3: Update Board.tsx to use the new hook and sparring handler**

In Board.tsx:

1. Add imports:
```typescript
import { useBoardActions } from "@/hooks/useBoardActions";
import { handleSparringApply } from "@/lib/sparring";
import { createGoal, createOutcome, createItem } from "@/lib/entities";
```

2. Replace the inline `generateId` function (line 71-72) — delete it entirely.

3. Replace the inline `generateNudges`, `generateFocusItems`, `handleFocusItemClick`, `handleStartSparringFromFocus`, `handleFocusStatusChange` functions and their state variables (`nudgesLoading`, `focusLoading`) with:

```typescript
  const {
    nudgesLoading,
    focusLoading,
    generateNudges,
    generateFocusItems,
    handleFocusItemClick,
    handleStartSparringFromFocus,
    handleFocusStatusChange,
  } = useBoardActions();
```

4. Update the `handleStartSparringFromFocus` usage in CoachingAgenda — it now returns a nudge ID instead of setting state directly. Change:
```tsx
onStartSparring={handleStartSparringFromFocus}
```
To:
```tsx
onStartSparring={(focusItem) => {
  const nudgeId = handleStartSparringFromFocus(focusItem);
  setSparringNudgeId(nudgeId);
  setShowAgenda(false);
}}
```

5. Replace all entity creation inline code with factory function calls. For example:

```typescript
// Before:
const newGoal: BusinessGoal = {
  id: generateId("goal"),
  statement: "Uusi tavoite",
  ...
};

// After:
const newGoal = createGoal({ order: goals.length });
```

Apply the same pattern for `createOutcome(goalId, { order: ... })` and `createItem(outcomeId, { order: ... })` everywhere.

6. Replace the inline sparring `onApply` handler with:
```tsx
onApply={(suggestion) => {
  handleSparringApply(suggestion, nudge, items, dispatch);
  setSparringNudgeId(null);
}}
```

**Step 4: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 5: Commit**

```bash
git add src/hooks/useBoardActions.ts src/lib/sparring.ts src/components/Board.tsx
git commit -m "refactor: extract useBoardActions hook + sparring handler — Board.tsx from 777 to ~450 lines"
```

---

### Task 8: Add ErrorBoundary + XSS fix + cleanup

**Files:**
- Create: `src/components/ErrorBoundary.tsx`
- Modify: `src/app/board/[id]/page.tsx`
- Modify: `src/lib/export.ts`
- Modify: `src/components/IntakeConversation.tsx`

**Step 1: Create ErrorBoundary component**

```tsx
"use client";

import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4 p-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Something went wrong
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="text-sm text-indigo-500 hover:text-indigo-600 underline"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Step 2: Wrap board page with ErrorBoundary**

In `src/app/board/[id]/page.tsx`, add import:

```typescript
import ErrorBoundary from "@/components/ErrorBoundary";
```

Add `.catch()` to the `getBoard` call and wrap the board:

```typescript
  useEffect(() => {
    getBoard(id)
      .then((doc) => {
        if (doc) {
          const boardState = doc.boardState;
          boardState.focusItems = boardState.focusItems ?? [];
          setBoardState(boardState);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load board:", err);
        setNotFound(true);
        setLoading(false);
      });
  }, [id]);
```

Change the return JSX to wrap Board in ErrorBoundary:

```tsx
  return (
    <BoardProvider initialState={boardState}>
      <ErrorBoundary>
        <Board boardId={id} />
      </ErrorBoundary>
    </BoardProvider>
  );
```

**Step 3: Fix XSS in HTML export**

In `src/lib/export.ts`, add import at top:

```typescript
import { escapeHtml } from "./utils";
```

Then wrap all user/AI-generated content in `escapeHtml()` calls in the `openPrintableExport` function. Specifically, wrap:
- `goal.statement`
- `goal.timeframe`
- `outcome.statement`
- `outcome.measureOfSuccess`
- `item.title`
- `fi.title`
- `fi.suggestedAction`
- `productName`

For example, change:
```typescript
boardOverview += `<h3 style="...">${goal.statement}</h3>`;
```
To:
```typescript
boardOverview += `<h3 style="...">${escapeHtml(goal.statement)}</h3>`;
```

Apply escapeHtml to every place where board entity text is interpolated into the HTML string.

**Step 4: Fix missing images dependency in IntakeConversation**

In `src/components/IntakeConversation.tsx`, find the `callIntakeApi` useCallback dependency array (line 222):

```typescript
    [backlog, goals]
```

Change to:

```typescript
    [backlog, goals, images]
```

**Step 5: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 6: Commit**

```bash
git add src/components/ErrorBoundary.tsx src/app/board/[id]/page.tsx src/lib/export.ts src/components/IntakeConversation.tsx
git commit -m "refactor: add ErrorBoundary, fix XSS in export, fix images dep in IntakeConversation"
```

---

## Execution Order

Tasks must be executed in this order due to dependencies:

1. **Task 1** — shared utils (everything else depends on this)
2. **Task 2** — entity factories (depends on utils)
3. **Task 3** — critical bug fixes (depends on ADD_NUDGE in useBoard)
4. **Task 4** — API route hardening (depends on utils + prompt functions)
5. **Task 5** — TypeBadge extraction (independent, but cleaner to do after utils)
6. **Task 6** — SlidePanel extraction (independent)
7. **Task 7** — Board.tsx restructuring (depends on tasks 1-3 for entities, hooks, sparring)
8. **Task 8** — ErrorBoundary + XSS + cleanup (depends on utils for escapeHtml)

## Final Verification

After all 8 tasks:
1. `npx next build` — clean build
2. Demo board at `/board` loads and functions normally
3. Drag-and-drop still works
4. Modals open and close (including Escape key)
5. Quick-add buttons still work
6. Export opens styled HTML in new tab with escaped content
7. AI nudges and coaching agenda still function
