# Admin Dashboard & Cross-Outcome Drag-and-Drop

Date: 2026-03-04

## Context

Post-pilot session. PMs validated the tool and want to continue using it. Need admin visibility into usage (who's creating boards, are they coming back) and a quick UX fix for moving items between outcomes (feedback from pilot).

## Feature A: Firebase Auth + Admin Dashboard

### Auth Foundation

- Add `firebase/auth` to `src/lib/firebase.ts`, export `auth` alongside `db`
- Enable Google Sign-In provider (manual step in Firebase Console)
- New env var: `ADMIN_EMAILS` — comma-separated Google emails with admin access
- New `src/hooks/useAuth.ts` — React context providing `user`, `isAdmin`, `signIn()`, `signOut()`
- `AuthProvider` wraps the app in root layout
- New `src/lib/firebase-admin.ts` — Firebase Admin SDK init for server-side token verification
- New `src/lib/auth-server.ts` — helper to verify ID tokens and check admin status

### Admin Dashboard Page

Route: `/admin` (replaces existing `/admin/activity` export page)

**Layout:**
- Sign-in gate: Google login button if unauthenticated, 403 if not admin
- Header: "Shodoboard Admin" + email + sign out
- Summary cards: Total boards | Active last 7 days | Total sessions | Total events
- Board table: one row per board, sortable

**Table columns:**
| Product Name | Cohort | Created | Last Active | Sessions | Events | Goals | Outcomes | Items |

- Last Active from latest activity event or session timestamp
- Row click opens board in new tab
- Keep JSON export button

**API:** `GET /api/admin/boards`
- Verifies Firebase ID token from Authorization header
- Checks email against ADMIN_EMAILS
- Returns aggregated stats per board

### New dependencies

- `firebase-admin` (server-side token verification)

## Feature B: Cross-Outcome Drag & Drop (Kanban View)

### Current State

Items drag between columns within same outcome. Droppable IDs: `{outcomeId}:{column}`. `MOVE_ITEM` updates `column` and `order`.

### Change

Extend `MOVE_ITEM` to also accept optional `toOutcomeId`. In `handleDragEnd`, compare parsed outcomeId from droppable ID with item's current outcomeId. If different, include it.

**Reducer change:**
```
MOVE_ITEM: { itemId, toColumn, toIndex, toOutcomeId? }
```
When `toOutcomeId` present, update `outcomeId` alongside `column` and `order`.

**Visual feedback:** Outcome header gets subtle teal highlight when dragging over a different outcome section.

**Unlinked:** Droppables use `null:{column}` format. Items can move in/out of unlinked section.

### Files changed

- `src/hooks/useBoard.ts` — extend MOVE_ITEM action type and reducer
- `src/components/Board.tsx` — update handleDragEnd to extract and pass outcomeId

## Files Summary

| Feature | Modified | New |
|---|---|---|
| Auth setup | `firebase.ts`, `layout.tsx`, `package.json` | `useAuth.ts`, `firebase-admin.ts`, `auth-server.ts` |
| Admin dashboard | `admin/activity/page.tsx` (replace) | `api/admin/boards/route.ts` |
| Cross-outcome DnD | `useBoard.ts`, `Board.tsx` | none |

## Execution Order

1. Cross-outcome DnD (quick, independent, immediate user value)
2. Firebase Auth foundation (prerequisite for admin)
3. Admin dashboard page + API
