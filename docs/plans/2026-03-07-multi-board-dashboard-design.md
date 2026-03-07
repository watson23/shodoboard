# Multi-Board Dashboard & Board Management

**Date:** 2026-03-07
**Goal:** Enable returning users to find and switch between boards. Add a dashboard for signed-in users, a board switcher in the header, and the data model to support multi-board usage.

**Architecture:** Hybrid approach — lightweight Firestore `users/{uid}` document as a convenience index for fast dashboard loading, with board documents remaining the authority for access control.

**Tech Stack:** React 19, Next.js 16, TypeScript 5, Firebase Firestore, Firebase Auth (Google OAuth)

---

## Data Model

### New Firestore Collection: `users/{uid}`

```typescript
interface UserDocument {
  email: string;
  displayName?: string;
  boards: UserBoardEntry[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface UserBoardEntry {
  boardId: string;
  productName: string;          // cached for dashboard display
  role: "owner" | "member";
  lastVisitedAt: string;        // ISO string, updated on each visit
  addedAt: string;              // ISO string
}
```

**When entries are added/updated:**

| Event | Action on user doc |
|---|---|
| User claims a board | Upsert entry with `role: "owner"` |
| User unclaims a board | Remove entry |
| User visits a board they're owner/member of | Update `lastVisitedAt` |
| User visits a board via link (no ownership/membership) | No entry added |
| Owner adds someone as member | No immediate update (lazy sync) |
| Product name changes | Fire-and-forget update on current user's entry |

**Lazy sync for members:** When a signed-in user visits `/board/{id}` and the board has them in `members[]`, ensure their user doc has an entry for that board. No proactive scan of all boards.

---

## Landing Page / Dashboard

### Behavior by user state

| State | Display |
|---|---|
| Not signed in | Current landing page + "Sign in" link top-right |
| Signed in, no boards | Landing page with "signed in as X" indicator |
| Signed in, has boards | Dashboard replaces landing page |

### Landing page changes (not signed in)

- Add "Sign in" link in top-right corner (subtle, non-competing)
- After sign-in: re-render as dashboard if boards exist, otherwise stay on landing

### Dashboard layout (signed in, has boards)

**Header:** Shodoboard logo + title left, user avatar/email + sign out right

**Board list:**
- Card grid (2-3 columns desktop, 1 mobile)
- Each card: product name, role badge ("Owner" / "Member"), last visited
- Sorted by `lastVisitedAt` descending
- Click card -> `/board/{id}`

**Actions below list:**
- "Start with your backlog" button (-> `/intake`)
- "Start with empty board" button

**No demo link on dashboard.**

---

## Board Switcher in Header

### Two navigation paths from within a board:

**1. Logo click -> Dashboard**
- `ShodoLogoSmall` in `BoardHeader` becomes a link to `/`
- Only when signed in

**2. Product name dropdown -> Quick-switch**
- Product name gets `CaretDown` icon
- Single click opens dropdown of user's other boards
- Each entry: product name + role badge, current board highlighted
- Bottom: "View all boards" link -> `/`
- Inline name editing: triggered by double-click or edit icon (not single click)

**Not signed in:** No dropdown, no logo link. Product name stays as current editable inline field.

**Data source:** Fetch user document once on board load, cache in state.

---

## Sign-in Prompting & Board Association

### Evolve BookmarkToast into sign-in prompt

| User state | Toast behavior |
|---|---|
| Anonymous user | "Sign in to save this board to your account" with Google button |
| Signed-in, hasn't claimed | "Claim this board to add it to your dashboard" |
| Signed-in, owns/is member | No toast |

- Non-blocking toast (not modal), appears after ~5 seconds
- Dismissible, doesn't repeat in same session
- Sign-in automatically claims the board + creates/updates user doc

### Board association on claim

When user claims: create/update their user doc entry with `role: "owner"`, `productName`, `lastVisitedAt`.

---

## Edge Cases

**Stale entries (board deleted/inaccessible):** Filter out on dashboard load, clean stale entry from user doc.

**Sign out:** Dashboard disappears, landing page shows. User doc persists in Firestore.

**Multiple Google accounts:** Each UID gets its own user doc. `prompt: "select_account"` handles picker.

**Product name sync:** Fire-and-forget update on current user's entry when `SET_PRODUCT_NAME` dispatches. Other users' caches self-heal on next visit.

---

## Permissions Model

- Access = edit access. No viewer/editor roles.
- Board document is the authority for access control (via `ownerId`, `members[]`, `accessMode`).
- User document is a convenience index only.

---

## Scope Exclusions

- No real-time board list updates (no Firestore subscriptions on user doc)
- No board archiving or deletion from dashboard
- No board duplication or templates
- No team/organization concept
- No role-based permissions (viewer vs editor)
