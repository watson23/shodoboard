# Multi-Board Dashboard & Board Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable returning users to find and switch between boards via a dashboard, board switcher, and user document data model.

**Architecture:** Hybrid user-doc approach — lightweight Firestore `users/{uid}` document indexes boards for fast dashboard loading. Board documents remain the authority for access control. Landing page conditionally renders dashboard for signed-in users with boards.

**Tech Stack:** React 19, Next.js 16, TypeScript 5, Firebase Firestore, Firebase Auth (Google OAuth), Tailwind CSS v4

---

### Task 1: User document types and Firestore CRUD

**Files:**
- Modify: `src/lib/firestore.ts`

**Step 1: Add types and constants**

Add after the existing `BoardVisitor` interface (line 25):

```typescript
export interface UserBoardEntry {
  boardId: string;
  productName: string;
  role: "owner" | "member";
  lastVisitedAt: string;    // ISO 8601
  addedAt: string;          // ISO 8601
}

export interface UserDocument {
  email: string;
  displayName?: string;
  boards: UserBoardEntry[];
  createdAt: unknown;       // Firestore serverTimestamp
  updatedAt: unknown;
}
```

Add constant after `BOARDS_COLLECTION` (line 43):

```typescript
const USERS_COLLECTION = "users";
```

**Step 2: Add `getUserDoc` function**

Add after `getAllBoardsActivity` (end of file). Fetches a user document by UID, returns null if not found:

```typescript
export async function getUserDoc(uid: string): Promise<UserDocument | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;
    return snap.data() as UserDocument;
  } catch (err) {
    console.error(`Failed to load user doc ${uid}:`, err);
    return null;
  }
}
```

**Step 3: Add `upsertUserBoardEntry` function**

Upserts a single board entry in the user document. Creates the user doc if it doesn't exist:

```typescript
export async function upsertUserBoardEntry(
  uid: string,
  email: string,
  displayName: string | undefined,
  entry: UserBoardEntry
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        email,
        displayName: displayName || undefined,
        boards: [entry],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return;
    }

    const data = snap.data() as UserDocument;
    const boards = data.boards || [];
    const idx = boards.findIndex((b) => b.boardId === entry.boardId);
    if (idx >= 0) {
      boards[idx] = { ...boards[idx], ...entry };
    } else {
      boards.push(entry);
    }

    await updateDoc(userRef, { boards, updatedAt: serverTimestamp() });
  } catch (err) {
    console.error(`Failed to upsert board entry for user ${uid}:`, err);
  }
}
```

**Step 4: Add `removeUserBoardEntry` function**

Removes a board entry from the user document:

```typescript
export async function removeUserBoardEntry(
  uid: string,
  boardId: string
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data() as UserDocument;
    const boards = (data.boards || []).filter((b) => b.boardId !== boardId);
    await updateDoc(userRef, { boards, updatedAt: serverTimestamp() });
  } catch (err) {
    console.error(`Failed to remove board entry for user ${uid}:`, err);
  }
}
```

**Step 5: Add `updateUserBoardProductName` function**

Fire-and-forget update of cached product name for a specific board:

```typescript
export async function updateUserBoardProductName(
  uid: string,
  boardId: string,
  productName: string
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data() as UserDocument;
    const boards = data.boards || [];
    const idx = boards.findIndex((b) => b.boardId === boardId);
    if (idx < 0) return;

    boards[idx].productName = productName;
    await updateDoc(userRef, { boards, updatedAt: serverTimestamp() });
  } catch (err) {
    console.error(`Failed to update product name for user ${uid}:`, err);
  }
}
```

**Step 6: Verify & commit**

Run: `npx next build`
Commit: `feat: add user document types and Firestore CRUD for multi-board`

---

### Task 2: Wire user doc updates into existing board operations

**Files:**
- Modify: `src/app/board/[id]/page.tsx`
- Modify: `src/components/BoardHeader.tsx`

**Step 1: Update board visit to sync user doc**

In `src/app/board/[id]/page.tsx`, the existing visitor recording effect (around lines 55-60) fires after board loads and user is signed in. Extend this to also ensure the user doc has an entry for this board.

Import `upsertUserBoardEntry` and `getBoard` types. After `recordBoardVisitor`, add user doc sync:

```typescript
// Inside the existing useEffect that calls recordBoardVisitor:
// After recordBoardVisitor call, add:
const isOwner = user.uid === ownerId;
const isMember = (members ?? []).some(
  (m) => m.email === user.email?.toLowerCase()
);
if (isOwner || isMember) {
  upsertUserBoardEntry(
    user.uid,
    user.email || "",
    user.displayName || undefined,
    {
      boardId: id,
      productName: boardState?.productName || "Untitled",
      role: isOwner ? "owner" : "member",
      lastVisitedAt: new Date().toISOString(),
      addedAt: new Date().toISOString(),
    }
  );
}
```

**Step 2: Update claim flow to sync user doc**

In `src/components/BoardHeader.tsx`, the `handleClaim` function (lines 145-162) calls `claimBoard`. After the successful claim, also upsert the user doc entry.

Import `upsertUserBoardEntry` from firestore. After `claimBoard` succeeds and `onOwnershipChange` is called, add:

```typescript
upsertUserBoardEntry(
  claimUser.uid,
  claimUser.email || "",
  claimUser.displayName || undefined,
  {
    boardId: boardId!,
    productName: state.productName || "Untitled",
    role: "owner",
    lastVisitedAt: new Date().toISOString(),
    addedAt: new Date().toISOString(),
  }
);
```

**Step 3: Update product name change to sync user doc**

In `src/components/BoardHeader.tsx`, the `handleNameSubmit` function (lines 104-112) dispatches `SET_PRODUCT_NAME`. After the dispatch, fire-and-forget update the user doc.

Import `updateUserBoardProductName`. After the dispatch call, add:

```typescript
if (user && boardId) {
  updateUserBoardProductName(user.uid, boardId, trimmed);
}
```

**Step 4: Verify & commit**

Run: `npx next build`
Commit: `feat: wire user doc updates into board visit, claim, and rename`

---

### Task 3: Landing page — sign-in button and conditional dashboard

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/Dashboard.tsx`

**Step 1: Create Dashboard component**

Create `src/components/Dashboard.tsx` — the board list view for signed-in users with boards.

Props: `boards: UserBoardEntry[]`, `email: string`, `onSignOut: () => void`, `onCreateEmpty: () => void`

Layout:
- **Top bar**: Shodoboard logo + "Shodoboard" title left, user email + "Sign out" button right
- **Board grid**: responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`), each card is a `<Link href={/board/${b.boardId}}>` with:
  - Product name (bold, truncated)
  - Role badge: "Owner" in indigo pill, "Member" in gray pill
  - Last visited: relative time (e.g., "2 hours ago", "3 days ago") — use a simple inline helper, no library
  - Card styling: white bg, rounded-xl, border, hover shadow, dark mode support
- Cards sorted by `lastVisitedAt` descending (sort before render)
- **Actions section** below grid:
  - `<Link href="/intake">` "Start with your backlog" — indigo button, same style as current landing
  - "Start with empty board" — outline button, same style as current landing
- Match the existing design language (indigo-500 primary, rounded-xl, Nunito Sans)

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, SignOut, Crown, Users } from "@phosphor-icons/react";
import { createBoard } from "@/lib/firestore";
import type { UserBoardEntry } from "@/lib/firestore";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ... component implementation
```

**Step 2: Update landing page to conditionally render Dashboard**

In `src/app/page.tsx`:
- Import `useAuth` and `getUserDoc`
- Import `Dashboard` component
- Import `UserBoardEntry` type
- Add state: `boards: UserBoardEntry[] | null` (null = loading), `loadingUser: boolean`
- Add effect: when `user` changes (from useAuth), fetch `getUserDoc(user.uid)` and set `boards`
- Add "Sign in" button in top-right for anonymous users (absolute positioned, small text + SignIn icon)
- Conditional render:
  - If `user && boards && boards.length > 0` → render `<Dashboard>`
  - Otherwise → render existing landing page content (with sign-in button when not signed in, and "Signed in as X" when signed in but no boards)

The existing `ShodoLogo`, `Feature`, `handleStartEmpty` all stay — they're used by both the landing page view and (the buttons) by the Dashboard.

**Step 3: Verify & commit**

Run: `npx next build`
Commit: `feat: add dashboard for signed-in users, sign-in button on landing page`

---

### Task 4: Board switcher dropdown in header

**Files:**
- Modify: `src/components/BoardHeader.tsx`

**Step 1: Add user boards state and fetching**

Import `getUserDoc`, `UserBoardEntry` from firestore. Add state:

```typescript
const [userBoards, setUserBoards] = useState<UserBoardEntry[]>([]);
const [switcherOpen, setSwitcherOpen] = useState(false);
const switcherRef = useRef<HTMLDivElement>(null);
```

Add effect to fetch user boards when user is available:

```typescript
useEffect(() => {
  if (!user) {
    setUserBoards([]);
    return;
  }
  getUserDoc(user.uid).then((doc) => {
    if (doc?.boards) setUserBoards(doc.boards);
  });
}, [user]);
```

Add outside-click and Escape handlers for `switcherRef` (same pattern as the existing `menuRef` handlers).

**Step 2: Make logo a link to dashboard**

Wrap `ShodoLogoSmall` in a `<Link href="/">` when user is signed in. When not signed in, keep it as a plain element. The link needs no special styling — just makes the logo clickable.

**Step 3: Change product name interaction**

Currently: single click opens inline name edit.

New behavior when user is signed in and has `userBoards.length > 0`:
- **Single click** → opens board switcher dropdown
- **Double-click** or **edit icon click** → opens inline name edit (existing behavior)

When not signed in (or no boards in user doc): keep existing single-click-to-edit behavior.

The product name area becomes:

```tsx
<div className="relative" ref={switcherRef}>
  <button
    onClick={() => {
      if (user && userBoards.length > 0) {
        setSwitcherOpen(!switcherOpen);
      } else {
        setNameValue(productName || "");
        setEditingName(true);
      }
    }}
    onDoubleClick={() => {
      setSwitcherOpen(false);
      setNameValue(productName || "");
      setEditingName(true);
    }}
    className="group flex items-center gap-1 text-sm text-indigo-200 hover:text-white transition-colors whitespace-nowrap"
  >
    {productName || "Untitled"}
    {user && userBoards.length > 0 ? (
      <CaretDown size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />
    ) : (
      <PencilSimple size={12} className="opacity-0 group-hover:opacity-70 transition-opacity" />
    )}
  </button>

  {/* Switcher dropdown */}
  {switcherOpen && (
    <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[220px] z-50 animate-[slide-in_0.1s_ease-out]">
      {userBoards
        .sort((a, b) => b.lastVisitedAt.localeCompare(a.lastVisitedAt))
        .map((board) => (
          <Link
            key={board.boardId}
            href={`/board/${board.boardId}`}
            onClick={() => setSwitcherOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
              board.boardId === boardId
                ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <span className="truncate flex-1">{board.productName || "Untitled"}</span>
            {board.role === "owner" ? (
              <Crown size={12} className="text-indigo-400 flex-shrink-0" />
            ) : (
              <Users size={12} className="text-gray-400 flex-shrink-0" />
            )}
          </Link>
        ))}
      <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
      <Link
        href="/"
        onClick={() => setSwitcherOpen(false)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        View all boards
      </Link>
      <button
        onClick={() => {
          setSwitcherOpen(false);
          setNameValue(productName || "");
          setEditingName(true);
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <PencilSimple size={12} />
        Rename board
      </button>
    </div>
  )}
</div>
```

Import `CaretDown`, `Crown`, `Users` from Phosphor icons. Import `Link` from `next/link`.

**Step 4: Verify & commit**

Run: `npx next build`
Commit: `feat: add board switcher dropdown and logo-as-home-link in header`

---

### Task 5: Evolve BookmarkToast into sign-in/claim prompt

**Files:**
- Modify: `src/components/BookmarkToast.tsx`
- Modify: `src/components/Board.tsx`

**Step 1: Rewrite BookmarkToast**

The current BookmarkToast shows a generic "bookmark this page" reminder. Replace it with context-aware prompting:

New props:

```typescript
interface BoardToastProps {
  boardId: string;
  ownerId?: string;
  members?: BoardMember[];
  onClaimed?: () => void;    // callback when user claims via toast
}
```

Behavior:
- **Anonymous user**: "Sign in to save this board to your account" with a Google sign-in button. On sign-in: auto-claim the board, call `onClaimed`, upsert user doc entry, dismiss toast.
- **Signed-in user, board not claimed**: "Claim this board to add it to your dashboard" with a Claim button. On click: claim the board, call `onClaimed`, upsert user doc entry, dismiss toast.
- **Signed-in user who is owner or member**: Don't show toast at all.

Keep existing timing: 5 second delay, sessionStorage-based "already shown" check (key: `board-toast-${boardId}`).

Use `useAuth` hook. Import `claimBoard`, `upsertUserBoardEntry` from firestore. Import `useBoard` for product name.

**Step 2: Update Board.tsx to pass new props**

In `src/components/Board.tsx`, the `BookmarkToast` is rendered at line 358:
```tsx
{boardId && <BookmarkToast boardId={boardId} />}
```

Update to pass `ownerId`, `members`, and an `onClaimed` callback that updates the local ownership state:

```tsx
{boardId && (
  <BookmarkToast
    boardId={boardId}
    ownerId={ownerId}
    members={members}
    onClaimed={() => {
      // Trigger ownership state refresh — but Board doesn't own this state,
      // it comes from props. We need onOwnershipChange from the page.
    }}
  />
)}
```

Since `Board` already has `onOwnershipChange` prop, pass it through. The toast's `onClaimed` callback should call `onOwnershipChange` with the new owner's UID and email. Thread `onOwnershipChange` to BookmarkToast.

**Step 3: Verify & commit**

Run: `npx next build`
Commit: `feat: evolve BookmarkToast into context-aware sign-in/claim prompt`

---

### Task 6: Handle unclaim — remove user doc entry

**Files:**
- Modify: `src/components/ManageBoardModal.tsx`

**Step 1: Add user doc cleanup on unclaim**

The ManageBoardModal has an unclaim flow that calls `unclaimBoard(boardId)` then `onUnclaim()`. After the `unclaimBoard` call, also remove the user doc entry.

Import `removeUserBoardEntry` from firestore. Import `useAuth` hook.

After `unclaimBoard(boardId)` succeeds, add:

```typescript
if (user) {
  removeUserBoardEntry(user.uid, boardId);
}
```

**Step 2: Verify & commit**

Run: `npx next build`
Commit: `feat: remove user doc entry on board unclaim`

---

### Task 7: Handle stale board entries on dashboard

**Files:**
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/lib/firestore.ts`

**Step 1: Add board existence check to Dashboard**

When the dashboard loads board entries, some boards may have been deleted. The dashboard should validate entries and clean up stale ones.

In the Dashboard component, after receiving `boards` from parent:
- Fetch each board via `getBoard(boardId)` in parallel
- Filter out entries where `getBoard` returns null
- If any entries were removed, call a new `cleanStaleUserBoardEntries` function to update the user doc

Add to `firestore.ts`:

```typescript
export async function cleanStaleUserBoardEntries(
  uid: string,
  validBoardIds: string[]
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data() as UserDocument;
    const cleaned = (data.boards || []).filter((b) =>
      validBoardIds.includes(b.boardId)
    );
    if (cleaned.length !== (data.boards || []).length) {
      await updateDoc(userRef, { boards: cleaned, updatedAt: serverTimestamp() });
    }
  } catch (err) {
    console.error(`Failed to clean stale entries for user ${uid}:`, err);
  }
}
```

In Dashboard, the validation happens on mount. Move the board fetching + validation into the Dashboard component itself (or the parent page.tsx). The flow:
1. Parent passes `boards: UserBoardEntry[]` from user doc
2. Dashboard uses `useEffect` to validate by calling `getBoard` for each entry
3. Entries where board exists → show card
4. Entries where board is null → exclude, fire-and-forget `cleanStaleUserBoardEntries`

To avoid N+1 reads for dashboard loading, batch the checks. Since Firestore doesn't support batch reads by ID natively, use `Promise.all` with individual `getDoc` calls (acceptable for small board counts < 20).

**Step 2: Verify & commit**

Run: `npx next build`
Commit: `feat: validate and clean stale board entries on dashboard load`

---

### Task 8: Member lazy sync on board visit

**Files:**
- Modify: `src/app/board/[id]/page.tsx`

**Step 1: Extend visitor recording to handle lazy member sync**

The existing visitor effect in `board/[id]/page.tsx` (lines 55-60) already checks `user` and calls `recordBoardVisitor`. Extend the user doc sync (added in Task 2) to also handle the case where the user is a member but doesn't have an entry in their user doc yet.

This was partially done in Task 2 — the upsert already handles both owner and member roles. But we need to make sure it covers the case where a user was added as a member by the board owner (via ManageBoardModal) and is visiting for the first time after being added.

The existing code from Task 2 already handles this correctly:
```typescript
const isMember = (members ?? []).some(
  (m) => m.email === user.email?.toLowerCase()
);
if (isOwner || isMember) {
  upsertUserBoardEntry(...);
}
```

This naturally lazy-syncs: when a member visits, their user doc gets the entry. No additional code needed — this task is already covered by Task 2's implementation. Verify it works correctly.

**Step 2: Verify & commit**

This is a verification-only task. Run `npx next build`, confirm no issues.

---

### Task 9: Final integration testing & cleanup

**Files:**
- Various files for manual testing

**Step 1: Build verification**

Run: `npx next build`

**Step 2: Manual test scenarios**

Verify these flows work:
1. Anonymous user sees landing page with sign-in button
2. Clicking sign-in opens Google OAuth popup
3. Signed-in user with no boards sees landing page with "signed in as X"
4. Creating a board (intake or empty) then claiming it adds it to user doc
5. Returning to `/` shows dashboard with the board card
6. Board card links to correct board
7. Board header logo links back to dashboard
8. Product name dropdown shows other boards
9. Renaming a product syncs to user doc
10. Unclaiming removes from user doc
11. BookmarkToast shows appropriate prompt based on auth/ownership state

**Step 3: Commit any final fixes**

Commit: `fix: integration fixes for multi-board dashboard`

---

### Verification

After all tasks:
1. `npx next build` passes
2. Landing page shows sign-in button for anonymous users
3. Dashboard renders for signed-in users with boards
4. Board cards link correctly and show product name, role, last visited
5. Creating new boards works from dashboard
6. Board header logo navigates to dashboard
7. Product name dropdown switches between boards
8. Claiming/unclaiming updates user doc correctly
9. BookmarkToast prompts sign-in/claim appropriately
10. Stale board entries are cleaned from dashboard
