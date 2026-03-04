# Admin Dashboard & Cross-Outcome DnD Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add admin dashboard with Firebase Auth (Google Sign-In) for monitoring board usage, and enable drag-and-drop of items between outcomes in the kanban view.

**Architecture:** Three layers: (1) cross-outcome DnD via extending existing MOVE_ITEM reducer, (2) Firebase Auth with Google provider + admin email whitelist, (3) admin dashboard page with server-side API route for board stats.

**Tech Stack:** Firebase Auth (client), firebase-admin (server), @dnd-kit (existing), Next.js API routes, Tailwind CSS

---

### Task 1: Cross-Outcome Drag & Drop — Extend Reducer

**Files:**
- Modify: `src/hooks/useBoard.ts:23,52-58`

**Step 1: Update MOVE_ITEM action type to accept optional outcomeId**

In `src/hooks/useBoard.ts`, change line 23 from:
```ts
| { type: "MOVE_ITEM"; itemId: string; toColumn: Column; toIndex: number }
```
to:
```ts
| { type: "MOVE_ITEM"; itemId: string; toColumn: Column; toIndex: number; toOutcomeId?: string | null }
```

**Step 2: Update MOVE_ITEM reducer case to apply outcomeId**

Change lines 52-58 from:
```ts
case "MOVE_ITEM": {
  const items = state.items.map((item) =>
    item.id === action.itemId
      ? { ...item, column: action.toColumn, order: action.toIndex }
      : item
  );
  return { ...state, items };
}
```
to:
```ts
case "MOVE_ITEM": {
  const items = state.items.map((item) =>
    item.id === action.itemId
      ? {
          ...item,
          column: action.toColumn,
          order: action.toIndex,
          ...(action.toOutcomeId !== undefined ? { outcomeId: action.toOutcomeId } : {}),
        }
      : item
  );
  return { ...state, items };
}
```

**Step 3: Build to verify no type errors**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build`
Expected: Build passes (optional field is backward compatible)

---

### Task 2: Cross-Outcome DnD — Update Board.tsx handleDragEnd

**Files:**
- Modify: `src/components/Board.tsx:147-156`

**Step 1: Update handleDragEnd to extract and pass outcomeId**

Change `handleDragEnd` (lines 147-156) from:
```ts
const handleDragEnd = (event: DragEndEvent) => {
  setActiveItem(null);
  const { active, over } = event;
  if (!over) return;
  const overId = over.id as string;
  const column = (overId.includes(":") ? overId.split(":")[1] : overId) as Column;
  if (active.id !== overId) {
    dispatch({ type: "MOVE_ITEM", itemId: active.id as string, toColumn: column, toIndex: 0 });
  }
};
```
to:
```ts
const handleDragEnd = (event: DragEndEvent) => {
  setActiveItem(null);
  const { active, over } = event;
  if (!over) return;
  const overId = over.id as string;
  const parts = overId.split(":");
  const column = (parts.length > 1 ? parts[1] : overId) as Column;
  const dropOutcomeId = parts.length > 1 ? (parts[0] === "null" ? null : parts[0]) : undefined;
  const draggedItem = items.find((i) => i.id === active.id);
  if (!draggedItem) return;

  // Determine if outcome changed
  const outcomeChanged = dropOutcomeId !== undefined && dropOutcomeId !== draggedItem.outcomeId;

  dispatch({
    type: "MOVE_ITEM",
    itemId: active.id as string,
    toColumn: column,
    toIndex: 0,
    ...(outcomeChanged ? { toOutcomeId: dropOutcomeId } : {}),
  });
};
```

**Step 2: Build to verify**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build`
Expected: Build passes

**Step 3: Commit**

```bash
git add src/hooks/useBoard.ts src/components/Board.tsx
git commit -m "feat: enable drag-and-drop items between outcomes in kanban view"
```

---

### Task 3: Firebase Auth — Install firebase-admin & Update firebase.ts

**Files:**
- Modify: `package.json` (install dependency)
- Modify: `src/lib/firebase.ts`
- Create: `src/lib/firebase-admin.ts`

**Step 1: Install firebase-admin**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npm install firebase-admin`

**Step 2: Add auth export to firebase.ts**

Add `getAuth` import and export to `src/lib/firebase.ts`. The file becomes:
```ts
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);
```

**Step 3: Create firebase-admin.ts for server-side token verification**

Create `src/lib/firebase-admin.ts`:
```ts
import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  // Use GOOGLE_APPLICATION_CREDENTIALS env var or service account JSON
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccount) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccount) as ServiceAccount),
    });
  }

  // Fallback: auto-detect in GCP/Vercel environments
  return initializeApp();
}

const adminApp = getAdminApp();
export const adminAuth = getAuth(adminApp);
```

**Step 4: Build to verify**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build`
Expected: Build passes

---

### Task 4: Firebase Auth — Create useAuth hook

**Files:**
- Create: `src/hooks/useAuth.tsx`

**Step 1: Create auth context and provider**

Create `src/hooks/useAuth.tsx`:
```tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
```

**Step 2: Wrap app in AuthProvider**

In `src/app/layout.tsx`, add the AuthProvider wrapping ThemeProvider. Change:
```tsx
import { ThemeProvider } from "@/hooks/useTheme";
```
to:
```tsx
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/useAuth";
```

And change the body content from:
```tsx
<ThemeProvider>
  {children}
</ThemeProvider>
```
to:
```tsx
<AuthProvider>
  <ThemeProvider>
    {children}
  </ThemeProvider>
</AuthProvider>
```

**Step 3: Build to verify**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build`
Expected: Build passes

**Step 4: Commit**

```bash
git add src/lib/firebase.ts src/lib/firebase-admin.ts src/hooks/useAuth.tsx src/app/layout.tsx package.json package-lock.json
git commit -m "feat: add Firebase Auth with Google Sign-In provider"
```

---

### Task 5: Auth Server Helper

**Files:**
- Create: `src/lib/auth-server.ts`

**Step 1: Create server-side auth verification helper**

Create `src/lib/auth-server.ts`:
```ts
import { adminAuth } from "./firebase-admin";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export interface AuthResult {
  uid: string;
  email: string;
  isAdmin: boolean;
}

export async function verifyAdmin(
  authHeader: string | null
): Promise<AuthResult> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7);
  const decoded = await adminAuth.verifyIdToken(token);

  if (!decoded.email) {
    throw new Error("No email in token");
  }

  const isAdmin = ADMIN_EMAILS.includes(decoded.email.toLowerCase());

  if (!isAdmin) {
    throw new Error("Not authorized as admin");
  }

  return {
    uid: decoded.uid,
    email: decoded.email,
    isAdmin,
  };
}
```

**Step 2: Build to verify**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build`
Expected: Build passes

---

### Task 6: Admin API Route

**Files:**
- Create: `src/app/api/admin/boards/route.ts`

**Step 1: Create admin boards API route**

Create directory and file `src/app/api/admin/boards/route.ts`:
```ts
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth-server";
import { getAllBoardsActivity } from "@/lib/firestore";

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    await verifyAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const boards = await getAllBoardsActivity();

    // Compute summary stats
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const boardStats = boards.map((b) => {
      const lastEvent = b.events.length > 0
        ? b.events[b.events.length - 1]
        : null;
      const lastSession = b.sessions.length > 0
        ? b.sessions[b.sessions.length - 1]
        : null;

      // Determine last active time
      let lastActiveMs = 0;
      if (lastEvent?.timestamp) {
        const ts = typeof lastEvent.timestamp === "string"
          ? new Date(lastEvent.timestamp).getTime()
          : lastEvent.timestamp;
        if (ts > lastActiveMs) lastActiveMs = ts;
      }
      if (lastSession?.endedAt) {
        const ts = typeof lastSession.endedAt === "string"
          ? new Date(lastSession.endedAt).getTime()
          : lastSession.endedAt;
        if (ts > lastActiveMs) lastActiveMs = ts;
      }

      return {
        boardId: b.boardId,
        productName: b.productName || "Untitled",
        cohort: b.cohort || "default",
        createdAt: b.createdAt,
        lastActive: lastActiveMs > 0 ? new Date(lastActiveMs).toISOString() : null,
        sessionCount: b.sessions.length,
        eventCount: b.events.length,
      };
    });

    const activeLastWeek = boardStats.filter(
      (b) => b.lastActive && new Date(b.lastActive).getTime() > sevenDaysAgo
    ).length;

    return NextResponse.json({
      summary: {
        totalBoards: boardStats.length,
        activeLastWeek,
        totalSessions: boardStats.reduce((s, b) => s + b.sessionCount, 0),
        totalEvents: boardStats.reduce((s, b) => s + b.eventCount, 0),
      },
      boards: boardStats.sort((a, b) => {
        const aTime = a.lastActive ? new Date(a.lastActive).getTime() : 0;
        const bTime = b.lastActive ? new Date(b.lastActive).getTime() : 0;
        return bTime - aTime;
      }),
    });
  } catch (err) {
    console.error("Admin boards API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch boards" },
      { status: 500 }
    );
  }
}
```

**Step 2: Build to verify**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build`
Expected: Build passes

**Step 3: Commit**

```bash
git add src/lib/auth-server.ts src/app/api/admin/boards/route.ts
git commit -m "feat: add admin API route with auth verification"
```

---

### Task 7: Admin Dashboard Page

**Files:**
- Replace: `src/app/admin/activity/page.tsx` (keep export functionality, add dashboard)
- Create: `src/app/admin/page.tsx` (new main admin page)

**Step 1: Create admin dashboard page**

Create `src/app/admin/page.tsx`:
```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  SignIn,
  SignOut,
  Spinner,
  ArrowSquareOut,
  DownloadSimple,
  ChartBar,
  Users,
  CalendarDots,
  Lightning,
} from "@phosphor-icons/react";

interface BoardStat {
  boardId: string;
  productName: string;
  cohort: string;
  createdAt: string | null;
  lastActive: string | null;
  sessionCount: number;
  eventCount: number;
}

interface DashboardData {
  summary: {
    totalBoards: number;
    activeLastWeek: number;
    totalSessions: number;
    totalEvents: number;
  };
  boards: BoardStat[];
}

export default function AdminPage() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/boards", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setError("Not authorized. Your email may not be on the admin list.");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatCreatedDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Spinner size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Shodoboard Admin
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sign in with your Google account to access the admin dashboard.
          </p>
          <button
            onClick={signIn}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
          >
            <SignIn size={20} weight="bold" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Shodoboard Admin
            </h1>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {user.email}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <SignOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center py-20">
            <Spinner size={32} className="animate-spin text-indigo-500" />
          </div>
        )}

        {data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard
                icon={<ChartBar size={20} weight="fill" />}
                label="Total Boards"
                value={data.summary.totalBoards}
                color="indigo"
              />
              <SummaryCard
                icon={<Lightning size={20} weight="fill" />}
                label="Active (7d)"
                value={data.summary.activeLastWeek}
                color="green"
              />
              <SummaryCard
                icon={<Users size={20} weight="fill" />}
                label="Sessions"
                value={data.summary.totalSessions}
                color="blue"
              />
              <SummaryCard
                icon={<CalendarDots size={20} weight="fill" />}
                label="Events"
                value={data.summary.totalEvents}
                color="amber"
              />
            </div>

            {/* Board table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  All Boards ({data.boards.length})
                </h2>
                <a
                  href="/admin/activity"
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <DownloadSimple size={14} />
                  Export JSON
                </a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-2 font-medium">Product</th>
                      <th className="px-4 py-2 font-medium">Cohort</th>
                      <th className="px-4 py-2 font-medium">Created</th>
                      <th className="px-4 py-2 font-medium">Last Active</th>
                      <th className="px-4 py-2 font-medium text-right">Sessions</th>
                      <th className="px-4 py-2 font-medium text-right">Events</th>
                      <th className="px-4 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data.boards.map((board) => (
                      <tr
                        key={board.boardId}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                          {board.productName}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                            {board.cohort}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          {formatCreatedDate(board.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          {formatDate(board.lastActive)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 tabular-nums">
                          {board.sessionCount}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 tabular-nums">
                          {board.eventCount}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={`/board/${board.boardId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300"
                            title="Open board"
                          >
                            <ArrowSquareOut size={16} />
                          </a>
                        </td>
                      </tr>
                    ))}
                    {data.boards.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                          No boards found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20",
    green: "text-green-500 bg-green-50 dark:bg-green-900/20",
    blue: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
    amber: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${colorMap[color]}`}>{icon}</div>
        <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
```

**Step 2: Build to verify**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build`
Expected: Build passes

**Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: add admin dashboard with board stats and Google auth"
```

---

### Task 8: Firebase Console Setup & Environment Variables

**This is a manual task for the user.**

**Step 1: Enable Google Auth in Firebase Console**
- Go to Firebase Console → Authentication → Sign-in method
- Enable Google provider
- Add authorized domain if needed (your Vercel domain)

**Step 2: Create a service account key**
- Go to Firebase Console → Project Settings → Service Accounts
- Click "Generate new private key"
- Download the JSON file

**Step 3: Set environment variables**

In `.env.local` (local development):
```
ADMIN_EMAILS=your-email@gmail.com
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
```

In Vercel dashboard (production):
```
ADMIN_EMAILS=your-email@gmail.com
FIREBASE_SERVICE_ACCOUNT_KEY=<paste entire JSON key as single line>
```

**Step 4: Test locally**
- Run `npm run dev`
- Navigate to `/admin`
- Sign in with Google
- Verify dashboard loads with board stats

---

### Task 9: Final Build & Push

**Step 1: Full build verification**

Run: `cd /Users/kailanto/Claude_Projects/shodoboard && npx next build`
Expected: Build passes with no errors

**Step 2: Push all commits**

Run: `git push`
