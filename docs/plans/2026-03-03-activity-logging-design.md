# Activity Logging for Demo Learning — Design

**Date:** 2026-03-03
**Status:** Approved
**Context:** Tomorrow's user demo with 10-15 pilot users. Goal is to collect activity data for post-demo AI analysis (export JSON → Claude chat).

---

## Learning Goals

- **Feature engagement:** Which features do users actually use vs ignore?
- **Workflow patterns:** How do users move through intake → goals → outcomes → items?
- **Time-on-task:** Where do users spend the most time? Which views/modals get dwell time?

## Approach: Hybrid (Reducer Middleware + UI Hooks)

Reducer middleware auto-captures all 20+ state-changing actions. A lightweight `logEvent()` hook covers ~6 UI-only events the reducer can't see. Session tracking provides timing context.

---

## Data Model

```typescript
interface ActivityEvent {
  id: string;
  boardId: string;
  sessionId: string;        // unique per browser tab session
  timestamp: string;         // ISO 8601
  category: "state_change" | "ui_interaction" | "session";
  action: string;            // e.g. "MOVE_ITEM", "open_modal", "session_start"
  targetType?: "goal" | "outcome" | "item" | "nudge" | "focusItem" | "checklist";
  targetId?: string;
  details?: Record<string, unknown>;  // action-specific payload
  durationMs?: number;       // for dwell-time events
}
```

### Event Categories

| Category | Source | Examples |
|----------|--------|---------|
| `state_change` | Reducer middleware (auto) | MOVE_ITEM, UPDATE_ITEM, ADD_GOAL, DISMISS_NUDGE, ADD_CHECKLIST_ITEM — all 20+ actions |
| `ui_interaction` | logEvent() calls (manual) | open_modal, close_modal, switch_view, open_agenda, start_sparring, copy_link |
| `session` | useActivityLog hook (auto) | session_start, session_heartbeat (60s), session_end |

### Details Field Examples

- `MOVE_ITEM`: `{ fromColumn: "opportunities", toColumn: "discovering" }`
- `UPDATE_ITEM`: `{ field: "title", targetId: "item_123" }`
- `open_modal`: `{ modalType: "card", targetId: "item_123" }`
- `switch_view`: `{ from: "kanban", to: "hierarchy" }`
- `session_start`: `{ userAgent: "...", viewport: "1440x900" }`

---

## Architecture

### Layer 1: Reducer Middleware

Wraps the existing `dispatch` from `useBoard`. Intercepts every action, timestamps it, enriches with board/session IDs. For MOVE_ITEM and UPDATE_ITEM, captures before/after values from current state.

### Layer 2: UI Event Logger

Exported `logEvent()` function from the same hook. Called manually from ~6 places in Board.tsx: modal open/close, view switch, agenda open, sparring start, copy link.

### Layer 3: Session Tracking

- Generates `sessionId` on mount (stored in sessionStorage)
- Logs `session_start` with user agent + viewport size
- Logs `session_heartbeat` every 60s
- Logs `session_end` on `beforeunload` via `navigator.sendBeacon`

### Performance

- Events batched in memory, flushed to Firestore every 5 seconds
- Activity data in separate Firestore subcollection — zero impact on board auto-save
- `session_end` uses `sendBeacon` for reliability on tab close

---

## Storage

Firestore subcollection: `boards/{boardId}/activityLog`

Each event is a separate document. Activity data is co-located with the board but isolated from board state.

---

## Export

### Admin Page: `/admin/activity`

Simple page (not linked from main UI) with a "Download All Activity" button.

### API Route: `GET /api/admin/activity`

Reads all boards' activityLog subcollections, returns bundled JSON:

```json
{
  "exportedAt": "2026-03-04T15:30:00Z",
  "totalEvents": 2847,
  "boards": [
    {
      "boardId": "abc123",
      "productName": "Team Alpha's Board",
      "sessions": [
        { "sessionId": "s1", "startedAt": "...", "duration": "12m 34s", "viewport": "1440x900" }
      ],
      "events": [
        { "timestamp": "...", "action": "MOVE_ITEM", "details": { "fromColumn": "opportunities", "toColumn": "discovering" } }
      ]
    }
  ]
}
```

---

## Files

**New:**
- `src/hooks/useActivityLog.ts` — core hook (middleware + logEvent + session + batch flush)
- `src/app/admin/activity/page.tsx` — admin export page
- `src/app/api/admin/activity/route.ts` — bulk export API route

**Modified:**
- `src/components/Board.tsx` — wrap dispatch with activity logger, add logEvent() calls for ~6 UI events
- `src/lib/firestore.ts` — add writeActivityBatch() and getAllActivity() functions
