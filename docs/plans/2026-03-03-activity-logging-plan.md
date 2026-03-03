# Activity Logging Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add activity logging to capture feature engagement, workflow patterns, and time-on-task data for a 10-15 user demo session, with a bulk JSON export for Claude analysis.

**Architecture:** Hybrid approach — reducer middleware auto-captures all 20+ state-changing dispatch actions, a `logEvent()` function manually captures ~6 UI-only interactions, and session tracking provides timing context. Events batch in memory and flush periodically to a Firestore `activityLog` field on each board document. An admin page at `/admin/activity` provides bulk JSON export across all boards.

**Tech Stack:** React 19, Next.js 16, TypeScript, Tailwind CSS v4, Firebase/Firestore, Phosphor Icons

---

### Task 1: Add ActivityEvent type and extend BoardDocument

**Files:**
- Create: `src/types/activity.ts`
- Modify: `src/lib/firestore.ts`

**Step 1: Create the ActivityEvent type**

Create `src/types/activity.ts` with:

```typescript
export interface ActivityEvent {
  id: string;
  boardId: string;
  sessionId: string;
  timestamp: string; // ISO 8601
  category: "state_change" | "ui_interaction" | "session";
  action: string;
  targetType?: "goal" | "outcome" | "item" | "nudge" | "focusItem" | "checklist";
  targetId?: string;
  details?: Record<string, unknown>;
  durationMs?: number;
}

export interface SessionSummary {
  sessionId: string;
  boardId: string;
  startedAt: string;
  endedAt?: string;
  userAgent: string;
  viewport: string;
}
```

**Step 2: Extend BoardDocument with activityLog field**

In `src/lib/firestore.ts`, add the import:
```typescript
import type { ActivityEvent, SessionSummary } from "@/types/activity";
```

Add two optional fields to the `BoardDocument` interface:
```typescript
export interface BoardDocument {
  boardState: BoardState;
  intakeHistory?: ConversationMessage[];
  consentGiven: boolean;
  createdAt: unknown;
  updatedAt: unknown;
  activityLog?: ActivityEvent[];
  activitySessions?: SessionSummary[];
}
```

**Step 3: Add flushActivityEvents function to firestore.ts**

Add this function after `updateBoardState`:

```typescript
export async function flushActivityEvents(
  boardId: string,
  events: ActivityEvent[],
  session?: SessionSummary
): Promise<void> {
  const boardRef = doc(db, BOARDS_COLLECTION, boardId);
  const snap = await getDoc(boardRef);
  if (!snap.exists()) return;

  const data = snap.data() as BoardDocument;
  const existingEvents = data.activityLog || [];
  const existingSessions = data.activitySessions || [];

  const updateData: Record<string, unknown> = {
    activityLog: [...existingEvents, ...events],
  };

  if (session) {
    // Update existing session or add new one
    const sessionIndex = existingSessions.findIndex(
      (s) => s.sessionId === session.sessionId
    );
    if (sessionIndex >= 0) {
      existingSessions[sessionIndex] = session;
    } else {
      existingSessions.push(session);
    }
    updateData.activitySessions = existingSessions;
  }

  await updateDoc(boardRef, updateData);
}
```

Also add `arrayUnion` is NOT needed since we're reading + merging manually. But we do need `getDoc` which is already imported.

**Step 4: Add getAllBoardsActivity function to firestore.ts**

Add this function for the admin export:

```typescript
import { getDocs } from "firebase/firestore";
```

Add to the existing `firebase/firestore` import line: `getDocs`.

```typescript
export async function getAllBoardsActivity(): Promise<
  {
    boardId: string;
    productName?: string;
    sessions: SessionSummary[];
    events: ActivityEvent[];
  }[]
> {
  const colRef = collection(db, BOARDS_COLLECTION);
  const snapshot = await getDocs(colRef);
  const results: {
    boardId: string;
    productName?: string;
    sessions: SessionSummary[];
    events: ActivityEvent[];
  }[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as BoardDocument;
    const events = data.activityLog || [];
    const sessions = data.activitySessions || [];
    if (events.length > 0 || sessions.length > 0) {
      results.push({
        boardId: docSnap.id,
        productName: data.boardState?.productName,
        sessions,
        events,
      });
    }
  });

  return results;
}
```

**Step 5: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 6: Commit**

```bash
git add src/types/activity.ts src/lib/firestore.ts
git commit -m "feat: add ActivityEvent type and Firestore persistence for activity logging"
```

---

### Task 2: Create useActivityLog hook — reducer middleware + session tracking + batch flush

**Files:**
- Create: `src/hooks/useActivityLog.ts`

**Step 1: Create the hook**

Create `src/hooks/useActivityLog.ts`:

```typescript
"use client";

import { useRef, useEffect, useCallback } from "react";
import { generateId } from "@/lib/utils";
import { flushActivityEvents } from "@/lib/firestore";
import type { ActivityEvent, SessionSummary } from "@/types/activity";
import type { BoardAction } from "@/hooks/useBoard";
import type { BoardState } from "@/types/board";

const FLUSH_INTERVAL_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 60000;

function getSessionId(boardId: string): string {
  const key = `activity-session-${boardId}`;
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = generateId("ses");
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

/**
 * Infer targetType and targetId from a BoardAction.
 */
function extractTarget(action: BoardAction): {
  targetType?: ActivityEvent["targetType"];
  targetId?: string;
} {
  switch (action.type) {
    case "ADD_GOAL":
    case "UPDATE_GOAL":
    case "TOGGLE_GOAL_COLLAPSE":
      return {
        targetType: "goal",
        targetId: "goalId" in action ? action.goalId : "goal" in action ? action.goal.id : undefined,
      };
    case "ADD_OUTCOME":
    case "UPDATE_OUTCOME":
    case "TOGGLE_OUTCOME_COLLAPSE":
      return {
        targetType: "outcome",
        targetId: "outcomeId" in action ? action.outcomeId : "outcome" in action ? action.outcome.id : undefined,
      };
    case "ADD_ITEM":
    case "UPDATE_ITEM":
    case "MOVE_ITEM":
      return {
        targetType: "item",
        targetId: "itemId" in action ? action.itemId : "item" in action ? action.item.id : undefined,
      };
    case "DISMISS_NUDGE":
    case "SNOOZE_NUDGE":
    case "ADD_NUDGE":
      return {
        targetType: "nudge",
        targetId: "nudgeId" in action ? action.nudgeId : "nudge" in action ? action.nudge.id : undefined,
      };
    case "UPDATE_FOCUS_ITEM":
      return { targetType: "focusItem", targetId: action.focusItemId };
    case "ADD_CHECKLIST_ITEM":
    case "UPDATE_CHECKLIST_ITEM":
    case "REMOVE_CHECKLIST_ITEM":
      return { targetType: "checklist", targetId: action.itemId };
    default:
      return {};
  }
}

/**
 * Extract action-specific details for richer logging.
 */
function extractDetails(
  action: BoardAction,
  state: BoardState
): Record<string, unknown> | undefined {
  switch (action.type) {
    case "MOVE_ITEM": {
      const item = state.items.find((i) => i.id === action.itemId);
      return {
        fromColumn: item?.column,
        toColumn: action.toColumn,
        toIndex: action.toIndex,
      };
    }
    case "UPDATE_ITEM":
      return { fields: Object.keys(action.updates) };
    case "UPDATE_OUTCOME":
      return { fields: Object.keys(action.updates) };
    case "UPDATE_GOAL":
      return { fields: Object.keys(action.updates) };
    case "UPDATE_FOCUS_ITEM":
      return { fields: Object.keys(action.updates) };
    case "ADD_CHECKLIST_ITEM":
      return { checklistItemType: action.checklistItem.type };
    case "UPDATE_CHECKLIST_ITEM":
      return {
        checklistItemId: action.checklistItemId,
        fields: Object.keys(action.updates),
      };
    case "REMOVE_CHECKLIST_ITEM":
      return { checklistItemId: action.checklistItemId };
    default:
      return undefined;
  }
}

// Actions that are bulk-set operations (not user-initiated) — skip logging these
const SKIP_ACTIONS = new Set([
  "SET_STATE",
  "RESET_BOARD",
  "SET_NUDGES",
  "SET_FOCUS_ITEMS",
]);

export function useActivityLog(boardId: string | undefined) {
  const bufferRef = useRef<ActivityEvent[]>([]);
  const sessionRef = useRef<SessionSummary | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<string>("");

  const sessionId = boardId ? getSessionId(boardId) : "";

  // Create an event and push to buffer
  const pushEvent = useCallback(
    (
      category: ActivityEvent["category"],
      action: string,
      opts?: {
        targetType?: ActivityEvent["targetType"];
        targetId?: string;
        details?: Record<string, unknown>;
        durationMs?: number;
      }
    ) => {
      if (!boardId) return;
      const event: ActivityEvent = {
        id: generateId("evt"),
        boardId,
        sessionId,
        timestamp: new Date().toISOString(),
        category,
        action,
        ...opts,
      };
      bufferRef.current.push(event);
    },
    [boardId, sessionId]
  );

  // Flush buffer to Firestore
  const flush = useCallback(async () => {
    if (!boardId || bufferRef.current.length === 0) return;
    const events = [...bufferRef.current];
    bufferRef.current = [];
    try {
      await flushActivityEvents(boardId, events, sessionRef.current ?? undefined);
    } catch (err) {
      // Re-add events to buffer on failure
      console.error("Activity log flush failed:", err);
      bufferRef.current = [...events, ...bufferRef.current];
    }
  }, [boardId]);

  // logEvent: for manual UI interaction logging
  const logEvent = useCallback(
    (
      action: string,
      opts?: {
        targetType?: ActivityEvent["targetType"];
        targetId?: string;
        details?: Record<string, unknown>;
        durationMs?: number;
      }
    ) => {
      pushEvent("ui_interaction", action, opts);
    },
    [pushEvent]
  );

  // wrapDispatch: creates a logging dispatch wrapper
  const wrapDispatch = useCallback(
    (
      originalDispatch: React.Dispatch<BoardAction>,
      getState: () => BoardState
    ): React.Dispatch<BoardAction> => {
      return (action: BoardAction) => {
        // Log before dispatching (so we can capture "before" state)
        if (!SKIP_ACTIONS.has(action.type)) {
          const { targetType, targetId } = extractTarget(action);
          const details = extractDetails(action, getState());
          pushEvent("state_change", action.type, {
            targetType,
            targetId,
            details,
          });
        }
        originalDispatch(action);
      };
    },
    [pushEvent]
  );

  // Session start + timers
  useEffect(() => {
    if (!boardId) return;

    startTimeRef.current = new Date().toISOString();

    sessionRef.current = {
      sessionId,
      boardId,
      startedAt: startTimeRef.current,
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };

    // Log session start
    pushEvent("session", "session_start", {
      details: {
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      },
    });

    // Periodic flush
    flushTimerRef.current = setInterval(flush, FLUSH_INTERVAL_MS);

    // Heartbeat
    heartbeatTimerRef.current = setInterval(() => {
      pushEvent("session", "session_heartbeat");
    }, HEARTBEAT_INTERVAL_MS);

    // Session end on unload
    const handleUnload = () => {
      pushEvent("session", "session_end", {
        durationMs: Date.now() - new Date(startTimeRef.current).getTime(),
      });

      if (sessionRef.current) {
        sessionRef.current.endedAt = new Date().toISOString();
      }

      // Best-effort flush via sendBeacon
      if (bufferRef.current.length > 0) {
        const payload = JSON.stringify({
          boardId,
          events: bufferRef.current,
          session: sessionRef.current,
        });
        navigator.sendBeacon(
          `/api/activity/flush`,
          new Blob([payload], { type: "application/json" })
        );
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      // Final flush on unmount
      flush();
    };
  }, [boardId, sessionId, pushEvent, flush]);

  return { logEvent, wrapDispatch };
}
```

**Step 2: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 3: Commit**

```bash
git add src/hooks/useActivityLog.ts
git commit -m "feat: create useActivityLog hook — reducer middleware, session tracking, batch flush"
```

---

### Task 3: Create sendBeacon flush API route

**Files:**
- Create: `src/app/api/activity/flush/route.ts`

**Step 1: Create the API route**

Create `src/app/api/activity/flush/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ActivityEvent, SessionSummary } from "@/types/activity";
import type { BoardDocument } from "@/lib/firestore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { boardId, events, session } = body as {
      boardId: string;
      events: ActivityEvent[];
      session?: SessionSummary;
    };

    if (!boardId || !events || events.length === 0) {
      return NextResponse.json({ ok: true }); // silently ignore empty
    }

    const boardRef = doc(db, "boards", boardId);
    const snap = await getDoc(boardRef);
    if (!snap.exists()) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const data = snap.data() as BoardDocument;
    const existingEvents = data.activityLog || [];
    const existingSessions = data.activitySessions || [];

    const updateData: Record<string, unknown> = {
      activityLog: [...existingEvents, ...events],
    };

    if (session) {
      const idx = existingSessions.findIndex(
        (s) => s.sessionId === session.sessionId
      );
      if (idx >= 0) {
        existingSessions[idx] = session;
      } else {
        existingSessions.push(session);
      }
      updateData.activitySessions = existingSessions;
    }

    await updateDoc(boardRef, updateData);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Activity flush error:", err);
    return NextResponse.json({ error: "Flush failed" }, { status: 500 });
  }
}
```

**Step 2: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 3: Commit**

```bash
git add src/app/api/activity/flush/route.ts
git commit -m "feat: add sendBeacon flush API route for session-end activity events"
```

---

### Task 4: Wire useActivityLog into Board.tsx

**Files:**
- Modify: `src/components/Board.tsx`

**Step 1: Import and initialize the hook**

Add import:
```typescript
import { useActivityLog } from "@/hooks/useActivityLog";
```

Inside the `Board` component, after the existing `useBoard()` call:
```typescript
const { state, dispatch: rawDispatch } = useBoard();
const { logEvent, wrapDispatch } = useActivityLog(boardId);
const stateRef = useRef(state);
stateRef.current = state;
const dispatch = wrapDispatch(rawDispatch, () => stateRef.current);
```

This replaces the existing:
```typescript
const { state, dispatch } = useBoard();
```

Add `useRef` to the React import.

**Step 2: Add logEvent calls for UI interactions**

Add these `logEvent` calls at the appropriate places in Board.tsx:

**2a. Modal open/close** — Update `setModal` usage. Replace the `setModal` state with a wrapper:

After the `const [modal, setModalRaw] = useState<ModalState>(null);` line (rename `setModal` to `setModalRaw`), add:
```typescript
const setModal = useCallback(
  (newModal: ModalState) => {
    if (newModal) {
      logEvent("open_modal", {
        targetType: newModal.type === "card" ? "item" : newModal.type === "outcome" ? "outcome" : "goal",
        targetId: newModal.type === "card" ? newModal.itemId : newModal.type === "outcome" ? newModal.outcomeId : newModal.goalId,
        details: { modalType: newModal.type },
      });
    } else if (modal) {
      logEvent("close_modal", {
        details: { modalType: modal.type },
      });
    }
    setModalRaw(newModal);
  },
  [logEvent, modal]
);
```

Add `useCallback` to the React import.

**2b. View mode switch** — In the JSX where `setViewMode` is used, the `onViewModeChange` prop is passed to BoardHeader. Update it:

Change from:
```tsx
onViewModeChange={boardId ? setViewMode : undefined}
```
To:
```tsx
onViewModeChange={
  boardId
    ? (mode: "hierarchy" | "kanban") => {
        logEvent("switch_view", {
          details: { from: viewMode, to: mode },
        });
        setViewMode(mode);
      }
    : undefined
}
```

**2c. Coaching agenda toggle** — Update the `onToggleAgenda` prop:

Change from:
```tsx
onToggleAgenda={boardId ? () => setShowAgenda(!showAgenda) : undefined}
```
To:
```tsx
onToggleAgenda={
  boardId
    ? () => {
        logEvent(showAgenda ? "close_agenda" : "open_agenda");
        setShowAgenda(!showAgenda);
      }
    : undefined
}
```

**2d. Start sparring** — Update the `setSparringNudgeId` call sites. Add a wrapper:

After `const [sparringNudgeId, setSparringNudgeIdRaw] = ...`:
```typescript
const startSparring = useCallback(
  (nudgeId: string | null) => {
    if (nudgeId) {
      logEvent("start_sparring", {
        targetType: "nudge",
        targetId: nudgeId,
      });
    }
    setSparringNudgeIdRaw(nudgeId);
  },
  [logEvent]
);
```

Then replace all `setSparringNudgeId(nudgeId)` calls with `startSparring(nudgeId)` where a nudge is being started. Keep `setSparringNudgeIdRaw(null)` for closing (or use `startSparring(null)` — the null check means it won't log).

Actually, simpler: just rename `setSparringNudgeId` → `setSparringNudgeIdRaw` in the useState, and create `setSparringNudgeId` as the wrapper:

```typescript
const [sparringNudgeId, setSparringNudgeIdRaw] = useState<string | null>(null);
const setSparringNudgeId = useCallback(
  (nudgeId: string | null) => {
    if (nudgeId) {
      logEvent("start_sparring", {
        targetType: "nudge",
        targetId: nudgeId,
      });
    }
    setSparringNudgeIdRaw(nudgeId);
  },
  [logEvent]
);
```

This way all existing call sites (`setSparringNudgeId(nudgeId)`) work without changes.

**Step 3: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 4: Commit**

```bash
git add src/components/Board.tsx
git commit -m "feat: wire useActivityLog into Board — auto-logs all dispatch + UI events"
```

---

### Task 5: Create admin activity export page

**Files:**
- Create: `src/app/admin/activity/page.tsx`

**Step 1: Create the admin page**

Create `src/app/admin/activity/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { getAllBoardsActivity } from "@/lib/firestore";
import { DownloadSimple, Spinner } from "@phosphor-icons/react";

export default function AdminActivityPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const boards = await getAllBoardsActivity();
      const totalEvents = boards.reduce((sum, b) => sum + b.events.length, 0);
      const totalSessions = boards.reduce(
        (sum, b) => sum + b.sessions.length,
        0
      );

      const exportData = {
        exportedAt: new Date().toISOString(),
        totalBoards: boards.length,
        totalSessions,
        totalEvents,
        boards,
      };

      // Trigger download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shodoboard-activity-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus(
        `Exported ${totalEvents} events across ${boards.length} boards (${totalSessions} sessions)`
      );
    } catch (err) {
      console.error("Export failed:", err);
      setStatus("Export failed — check console for details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-8">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Shodoboard Activity Export
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Download all activity logs across all boards as a single JSON file for
          analysis.
        </p>

        <button
          onClick={handleExport}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-xl transition-colors"
        >
          {loading ? (
            <Spinner size={20} className="animate-spin" />
          ) : (
            <DownloadSimple size={20} weight="bold" />
          )}
          {loading ? "Exporting..." : "Download All Activity"}
        </button>

        {status && (
          <p className="text-sm text-gray-600 dark:text-gray-300">{status}</p>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npx next build`
Expected: Compiles successfully

**Step 3: Commit**

```bash
git add src/app/admin/activity/page.tsx
git commit -m "feat: add admin activity export page at /admin/activity"
```

---

## Execution Order

Tasks are sequential — each builds on the previous:

1. **Task 1:** Types + Firestore persistence layer
2. **Task 2:** useActivityLog hook (depends on types from Task 1)
3. **Task 3:** sendBeacon API route (depends on types from Task 1)
4. **Task 4:** Wire into Board.tsx (depends on hook from Task 2)
5. **Task 5:** Admin export page (depends on Firestore functions from Task 1)

## Final Verification

After all 5 tasks:
1. `npx next build` — clean build
2. Open a board — session_start event should appear in Firestore activityLog field
3. Perform actions (move item, open modal, switch view) — events accumulate
4. Wait 5s — events flush to Firestore
5. Navigate to `/admin/activity` — download button works, JSON contains all boards' events
