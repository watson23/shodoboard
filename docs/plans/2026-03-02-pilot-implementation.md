# Shodoboard Pilot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the scripted Shodoboard prototype into a working pilot where workshop participants can paste their own backlogs, get AI-assisted outcome mapping, receive contextual coaching, and export their boards.

**Architecture:** Next.js frontend on Vercel, Firebase/Firestore for board persistence, Anthropic Claude API (via server-side API routes) for intake analysis, nudge generation, and sparring. Each board is a Firestore document containing the full BoardState JSON.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Firebase/Firestore, Anthropic Claude API (`@anthropic-ai/sdk`), Vercel hosting.

**Timeline note:** This is a workshop pilot for Wednesday March 4. No test framework exists in the project. We include manual verification steps but skip formal test setup — speed over ceremony.

---

## Task 1: Foundation — Dependencies & Firebase Setup

**Files:**
- Modify: `package.json`
- Create: `src/lib/firebase.ts`
- Create: `src/lib/firestore.ts`
- Create: `.env.local` (template)
- Create: `.env.example`

**Step 1: Install dependencies**

Run:
```bash
cd /Users/kailanto/Claude_Projects/shodoboard
npm install firebase @anthropic-ai/sdk
```

**Step 2: Create environment variable template**

Create `.env.example`:
```
# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Firebase (get these from Firebase Console → Project Settings → Your apps)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Create `.env.local` with the same content (user fills in real values).

Add `.env.local` to `.gitignore` if not already there.

**Step 3: Create Firebase initialization**

Create `src/lib/firebase.ts`:
```typescript
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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
```

**Step 4: Create Firestore CRUD helpers**

Create `src/lib/firestore.ts`:
```typescript
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { BoardState } from "@/types/board";
import type { ConversationMessage } from "@/types/intake";

export interface BoardDocument {
  boardState: BoardState;
  intakeHistory?: ConversationMessage[];
  consentGiven: boolean;
  createdAt: unknown; // Firestore Timestamp
  updatedAt: unknown;
}

const BOARDS_COLLECTION = "boards";

export async function createBoard(
  boardState: BoardState,
  intakeHistory?: ConversationMessage[]
): Promise<string> {
  const boardRef = doc(collection(db, BOARDS_COLLECTION));
  await setDoc(boardRef, {
    boardState,
    intakeHistory: intakeHistory ?? [],
    consentGiven: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return boardRef.id;
}

export async function getBoard(boardId: string): Promise<BoardDocument | null> {
  const boardRef = doc(db, BOARDS_COLLECTION, boardId);
  const snap = await getDoc(boardRef);
  if (!snap.exists()) return null;
  return snap.data() as BoardDocument;
}

export async function updateBoardState(
  boardId: string,
  boardState: BoardState
): Promise<void> {
  const boardRef = doc(db, BOARDS_COLLECTION, boardId);
  await updateDoc(boardRef, {
    boardState,
    updatedAt: serverTimestamp(),
  });
}
```

**Step 5: Verify Firebase initializes**

Run:
```bash
npm run build
```

Expected: Build succeeds (Firebase config will be empty but no runtime errors at build time).

**Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/ .env.example .gitignore
git commit -m "feat: add Firebase and Anthropic SDK, Firestore board CRUD helpers"
```

---

## Task 2: Board Persistence Layer — Modify useBoard

**Files:**
- Modify: `src/hooks/useBoard.ts`
- Create: `src/hooks/useAutoSave.ts`

**Step 1: Add SET_STATE and SET_NUDGES actions to useBoard**

Modify `src/hooks/useBoard.ts`:
- Add a `SET_STATE` action that replaces the entire BoardState (used when loading from Firestore)
- Add a `SET_NUDGES` action that replaces just the nudges array (used when AI generates nudges)
- Make BoardProvider accept an optional `initialState` prop (defaults to SEED_DATA)
- Export `BoardAction` type

New action types to add:
```typescript
| { type: "SET_STATE"; state: BoardState }
| { type: "SET_NUDGES"; nudges: Nudge[] }
```

New reducer cases:
```typescript
case "SET_STATE":
  return action.state;
case "SET_NUDGES":
  return { ...state, nudges: action.nudges };
```

Change `BoardProvider` signature:
```typescript
export function BoardProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: BoardState;
}) {
  const [state, dispatch] = useReducer(boardReducer, initialState ?? SEED_DATA);
  // ...
}
```

**Step 2: Create auto-save hook**

Create `src/hooks/useAutoSave.ts`:
```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { updateBoardState } from "@/lib/firestore";
import type { BoardState } from "@/types/board";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutoSave(boardId: string | null, state: BoardState) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip saving on initial mount (board just loaded from Firestore)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!boardId) return;

    // Debounce: save 1 second after last change
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setSaveStatus("saving");
    timeoutRef.current = setTimeout(async () => {
      try {
        await updateBoardState(boardId, state);
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

**Step 3: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds. Existing `/board` page still works (BoardProvider defaults to SEED_DATA).

**Step 4: Commit**

```bash
git add src/hooks/useBoard.ts src/hooks/useAutoSave.ts
git commit -m "feat: board persistence layer - SET_STATE action, initialState prop, auto-save hook"
```

---

## Task 3: Dynamic Board Route `/board/[id]`

**Files:**
- Create: `src/app/board/[id]/page.tsx`
- Modify: `src/components/Board.tsx` (accept boardId prop)
- Modify: `src/components/BoardHeader.tsx` (save status + export button)
- Modify: `src/app/layout.tsx` (make BoardProvider conditional)

**Step 1: Create the dynamic board page**

Create `src/app/board/[id]/page.tsx`:

This is a **client component** that:
1. Reads `id` from params
2. Fetches the board from Firestore on mount
3. Passes the loaded BoardState to a BoardProvider with initialState
4. Renders the Board component with the boardId prop
5. Shows a loading state while fetching
6. Shows "Board not found" if the ID doesn't exist

```typescript
"use client";

import { use, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { getBoard } from "@/lib/firestore";
import { BoardProvider } from "@/hooks/useBoard";
import type { BoardState } from "@/types/board";

const Board = dynamic(() => import("@/components/Board"), { ssr: false });

export default function DynamicBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [boardState, setBoardState] = useState<BoardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getBoard(id).then((doc) => {
      if (doc) {
        setBoardState(doc.boardState);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading board...</p>
      </div>
    );
  }

  if (notFound || !boardState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Board not found</p>
      </div>
    );
  }

  return (
    <BoardProvider initialState={boardState}>
      <Board boardId={id} />
    </BoardProvider>
  );
}
```

**Step 2: Update Board component to accept boardId**

Modify `src/components/Board.tsx`:
- Add `boardId` optional prop to Board
- Pass `boardId` to `BoardHeader`
- Use `useAutoSave(boardId, state)` when boardId is present

Add to Board component:
```typescript
interface BoardProps {
  boardId?: string;
}

export default function Board({ boardId }: BoardProps) {
  const { state, dispatch } = useBoard();
  const saveStatus = useAutoSave(boardId ?? null, state);
  // ... rest unchanged, but pass saveStatus and boardId to BoardHeader
```

**Step 3: Update BoardHeader with save status and export**

Modify `src/components/BoardHeader.tsx`:
- Accept `saveStatus` and `boardId` props
- Show save indicator (small text like "Saved ✓" / "Saving..." / "Error")
- Add Export button (implementation in Task 9)
- When in demo mode (no boardId), show "Demo" label instead of save status

**Step 4: Update layout.tsx**

Modify `src/app/layout.tsx`:
- Remove the global `BoardProvider` wrapper — it should only wrap specific pages
- The dynamic board page creates its own BoardProvider with initialState
- The demo `/board` page creates its own BoardProvider with SEED_DATA

Change layout to NOT wrap with BoardProvider globally. Instead, each page that needs it wraps itself.

This means:
- `src/app/board/page.tsx` wraps with `<BoardProvider>` (uses SEED_DATA default)
- `src/app/board/[id]/page.tsx` wraps with `<BoardProvider initialState={...}>`
- `src/app/page.tsx` (landing) and `src/app/intake/page.tsx` don't need BoardProvider

**Step 5: Update existing /board/page.tsx for demo mode**

Modify `src/app/board/page.tsx`:
```typescript
"use client";

import dynamic from "next/dynamic";
import { BoardProvider } from "@/hooks/useBoard";

const Board = dynamic(() => import("@/components/Board"), { ssr: false });

export default function DemoBoardPage() {
  return (
    <BoardProvider>
      <Board />
    </BoardProvider>
  );
}
```

**Step 6: Verify**

Run:
```bash
npm run dev
```

- Visit `/board` — should still show the demo board with seed data
- Visit `/board/nonexistent` — should show "Board not found"
- Once Firebase is configured with real credentials, test creating and loading a board

**Step 7: Commit**

```bash
git add src/app/board/ src/components/Board.tsx src/components/BoardHeader.tsx src/app/layout.tsx
git commit -m "feat: dynamic board route /board/[id] with Firestore loading and auto-save"
```

---

## Task 4: Landing Page & Consent Screen

**Files:**
- Modify: `src/app/page.tsx` (add "Try demo" button)
- Modify: `src/app/intake/page.tsx` (add consent step before backlog input)

**Step 1: Update landing page**

Modify `src/app/page.tsx`:
- Keep "Start with your backlog" → links to `/intake`
- Change "See example board" link text to "Try the demo" and make it more visible (styled as secondary button)
- Keep existing design and branding

**Step 2: Add consent screen to intake**

Modify `src/app/intake/page.tsx`:
- Add a `consent` state (initially `null`: not yet decided)
- When consent is null, show a consent screen in Finnish
- Consent screen content (Finnish):
  - Title: "Tietosuoja ja datan käsittely"
  - Body explains: backlog text sent to Anthropic Claude API, not used for training, deleted within 30 days, board stored in Firebase, recommendation to not paste personal data
  - Two buttons: "Ymmärrän ja jatkan" (accept) / "Jatka ilman tekoälyä" (decline)
- If accepted: show the backlog input + AI intake flow
- If declined: show a manual board builder (simplified — just the backlog input with a "Build board manually" flow that creates empty goals/outcomes structure)

For the pilot, the manual fallback can be minimal — just create a board with all items in "opportunities" column, no goals/outcomes. The value proposition is the AI path.

**Step 3: Add optional goals/OKRs textarea**

In the backlog input screen (after consent), add a second textarea below the backlog one:
- Label: "Business goals or OKRs (optional)"
- Placeholder: "If you have existing business goals, OKRs, or outcomes, paste them here..."
- Store as `goalsInput` state alongside `backlog`

**Step 4: Verify**

Run:
```bash
npm run dev
```

- Visit `/` — see both "Start" and "Try demo" buttons
- Click "Start" → see Finnish consent screen
- Accept → see backlog input with optional goals field
- Decline → see simplified manual input

**Step 5: Commit**

```bash
git add src/app/page.tsx src/app/intake/page.tsx
git commit -m "feat: consent screen in Finnish, optional goals input, demo button on landing"
```

---

## Task 5: Intake API Route — Claude Integration

**Files:**
- Create: `src/app/api/intake/route.ts`
- Create: `src/lib/prompts.ts` (system prompts for all AI features)

**Step 1: Create system prompts file**

Create `src/lib/prompts.ts` with the intake system prompt:

```typescript
export const INTAKE_SYSTEM_PROMPT = `You are a product management coach helping a PM organize their backlog into an outcome-driven board.

Your job:
1. Analyze the backlog items and optional business goals/OKRs provided
2. Identify 2-4 business goals (or validate/refine the ones provided)
3. For each goal, define 1-3 outcomes (behavior changes, not outputs)
4. Categorize each backlog item as "discovery" (research/validation) or "delivery" (building)
5. Map items to outcomes, or flag them as unlinked
6. Suggest measures of success for each outcome

The user's content may be in Finnish. Understand Finnish content but respond in English.

Be conversational and coaching-oriented. Ask the user to validate your suggestions. Keep it to 2-4 exchanges total — this is a workshop, not therapy.

When you are ready to present the final board structure, respond with a JSON block in this exact format:

\`\`\`json
{
  "type": "board_ready",
  "goals": [
    {
      "statement": "...",
      "timeframe": "...",
      "metrics": ["..."]
    }
  ],
  "outcomes": [
    {
      "goalIndex": 0,
      "statement": "...",
      "behaviorChange": "...",
      "measureOfSuccess": "..."
    }
  ],
  "items": [
    {
      "outcomeIndex": 0,
      "title": "...",
      "description": "...",
      "type": "discovery|delivery",
      "column": "opportunities|discovering|ready|building|shipped|measuring"
    }
  ]
}
\`\`\`

Rules for the JSON:
- goalIndex in outcomes refers to the index in the goals array
- outcomeIndex in items refers to the index in the outcomes array (use null for unlinked items)
- column should default to "opportunities" unless the user indicated the item is in progress or done
- Most items should start in "opportunities" — discovery items that are clearly about validating can go to "discovering"
- Only output the JSON block when you have the user's confirmation to finalize`;

export const NUDGE_SYSTEM_PROMPT = `You are a product management coach analyzing a product board. Generate exactly 5 coaching nudges based on the board state.

Focus on:
1. Outcomes without measures of success
2. Goals with only delivery work and no discovery
3. Items in "ready" or "building" without prior discovery work
4. Unlinked items (no outcome connection)
5. Outcomes where everything is shipped but nothing is being measured
6. Discovery items that have been sitting in "opportunities" too long
7. Goals with too many items (scope creep signal)

For each nudge, provide:
- targetType: "goal" | "outcome" | "item"
- targetId: the ID of the target
- tier: "quiet" (subtle dot) for minor issues, "visible" (banner) for important ones
- message: A short observation (1 sentence)
- question: A coaching question to prompt reflection (1 sentence)

Respond with a JSON array:
\`\`\`json
[
  {
    "targetType": "...",
    "targetId": "...",
    "tier": "quiet|visible",
    "message": "...",
    "question": "..."
  }
]
\`\`\``;

export const SPAR_SYSTEM_PROMPT = `You are a product management sparring partner. You help PMs think through specific issues with their product work.

Your coaching style:
- Ask questions more than give answers
- Steer toward concrete action the PM can take RIGHT NOW on their board
- After 2-3 exchanges, propose a specific change (updated outcome statement, splitting an item, adding discovery work, defining a measure)
- Keep it short — 2-3 sentences per response
- When you propose a change, format it as an "apply" suggestion the PM can accept

The user's board content may be in Finnish. Understand it but respond in English.

You know about:
- Outcome-driven development (Teresa Torres)
- Discovery vs delivery
- Measuring behavior change, not output
- OKR framing
- Assumption mapping and risk assessment

When you want to suggest a concrete board change, include a JSON block:
\`\`\`json
{
  "type": "suggestion",
  "action": "update_outcome|update_item|add_item|split_item",
  "targetId": "...",
  "changes": { ... }
}
\`\`\`

Keep conversations to 3-4 exchanges maximum. After that, push to action.`;
```

**Step 2: Create the intake API route**

Create `src/app/api/intake/route.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { INTAKE_SYSTEM_PROMPT } from "@/lib/prompts";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const { messages, backlog, goals } = await req.json();

  // Build the conversation for Claude
  const claudeMessages = [];

  // First message always includes the backlog context
  if (messages.length === 0) {
    let userContent = `Here is my team's backlog:\n\n${backlog}`;
    if (goals) {
      userContent += `\n\nOur current business goals/OKRs:\n\n${goals}`;
    }
    claudeMessages.push({ role: "user" as const, content: userContent });
  } else {
    // Reconstruct conversation from message history
    for (const msg of messages) {
      claudeMessages.push({
        role: msg.role === "ai" ? ("assistant" as const) : ("user" as const),
        content: msg.text,
      });
    }
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: INTAKE_SYSTEM_PROMPT,
    messages: claudeMessages,
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  // Check if the response contains a board_ready JSON block
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
  let boardData = null;
  let displayText = text;

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.type === "board_ready") {
        boardData = parsed;
        // Remove the JSON block from display text
        displayText = text.replace(/```json\n[\s\S]*?\n```/, "").trim();
      }
    } catch {
      // JSON parse failed, treat as regular text
    }
  }

  return NextResponse.json({
    text: displayText,
    boardData,
  });
}
```

**Step 3: Verify API route**

Run:
```bash
npm run dev
```

Test with curl (once ANTHROPIC_API_KEY is set in .env.local):
```bash
curl -X POST http://localhost:3000/api/intake \
  -H "Content-Type: application/json" \
  -d '{"messages":[],"backlog":"- Build login page\n- User research on checkout\n- Fix payment bug","goals":""}'
```

Expected: JSON response with `text` field containing Claude's analysis.

**Step 4: Commit**

```bash
git add src/app/api/intake/ src/lib/prompts.ts
git commit -m "feat: intake API route with Claude integration and PM coaching prompts"
```

---

## Task 6: Rewrite Intake Conversation for Real AI

**Files:**
- Modify: `src/app/intake/page.tsx`
- Rewrite: `src/components/IntakeConversation.tsx`

**Step 1: Rewrite IntakeConversation**

Rewrite `src/components/IntakeConversation.tsx` to:
- Accept props: `backlog: string`, `goals: string` (from the intake page)
- Maintain `messages` array state (ConversationMessage[])
- On mount, send the first API request with backlog + goals
- Show AI responses as they come back
- Show a text input for user responses (not a pre-scripted button)
- When AI returns `boardData`, show a "Create your board" button
- On "Create your board": call `createBoard()` from Firestore helpers, then redirect to `/board/[id]`
- Show typing indicator while waiting for AI response
- Keep the existing ChatMessage component and styling

Key state:
```typescript
const [messages, setMessages] = useState<ConversationMessage[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [userInput, setUserInput] = useState("");
const [boardData, setBoardData] = useState<BoardReadyData | null>(null);
const [isCreatingBoard, setIsCreatingBoard] = useState(false);
```

Flow:
1. Component mounts → calls `/api/intake` with backlog + goals
2. AI response arrives → add to messages, show to user
3. User types response → add to messages, call `/api/intake` again
4. When AI returns boardData → show structured preview + "Create board" button
5. User clicks "Create board" → transform boardData into BoardState, save to Firestore, redirect

**Step 2: Create boardData → BoardState transformer**

Add a utility function (either in IntakeConversation or a separate file) that transforms the AI's `board_ready` JSON into the full `BoardState` type with proper IDs:

```typescript
function transformBoardData(data: BoardReadyData): BoardState {
  const goals = data.goals.map((g, i) => ({
    id: `goal-${i + 1}`,
    statement: g.statement,
    timeframe: g.timeframe || "",
    metrics: g.metrics || [],
    order: i,
    collapsed: false,
  }));

  const outcomes = data.outcomes.map((o, i) => ({
    id: `outcome-${i + 1}`,
    goalId: o.goalIndex != null ? `goal-${o.goalIndex + 1}` : null,
    statement: o.statement,
    behaviorChange: o.behaviorChange || "",
    measureOfSuccess: o.measureOfSuccess || "",
    order: i,
    collapsed: false,
  }));

  const items = data.items.map((item, i) => ({
    id: `item-${i + 1}`,
    outcomeId: item.outcomeIndex != null ? `outcome-${item.outcomeIndex + 1}` : null,
    title: item.title,
    description: item.description || "",
    type: item.type as "discovery" | "delivery",
    column: (item.column || "opportunities") as Column,
    order: i,
  }));

  return {
    goals,
    outcomes,
    items,
    nudges: [],        // Will be filled by nudge API
    discoveryPrompts: [], // Will be generated later
  };
}
```

**Step 3: Wire up board creation and redirect**

When user clicks "Create board":
```typescript
const handleCreateBoard = async () => {
  if (!boardData) return;
  setIsCreatingBoard(true);
  const boardState = transformBoardData(boardData);
  const boardId = await createBoard(boardState, messages);
  router.push(`/board/${boardId}`);
};
```

Use `useRouter` from `next/navigation` for the redirect.

**Step 4: Update intake page to pass backlog + goals to conversation**

Modify `src/app/intake/page.tsx`:
- After consent + backlog input, pass `backlog` and `goalsInput` to `<IntakeConversation backlog={backlog} goals={goalsInput} />`

**Step 5: Show transition animation**

Keep the existing `BoardTransition` component. Show it briefly between "Create board" click and redirect.

**Step 6: Verify**

Run:
```bash
npm run dev
```

- Visit `/intake` → accept consent → paste a test backlog → click "Let's go"
- AI should analyze the backlog and respond
- Type a response → AI responds again
- When AI presents board structure → click "Create board"
- Should redirect to `/board/[id]` with the new board loaded from Firestore

**Step 7: Commit**

```bash
git add src/app/intake/ src/components/IntakeConversation.tsx
git commit -m "feat: real AI intake conversation - Claude analyzes backlogs, creates boards in Firestore"
```

---

## Task 7: Nudge API & Integration

**Files:**
- Create: `src/app/api/nudge/route.ts`
- Modify: `src/components/Board.tsx` (trigger nudge generation, refresh button)

**Step 1: Create nudge API route**

Create `src/app/api/nudge/route.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { NUDGE_SYSTEM_PROMPT } from "@/lib/prompts";
import { NextRequest, NextResponse } from "next/server";
import type { BoardState } from "@/types/board";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const { boardState } = (await req.json()) as { boardState: BoardState };

  // Serialize the board state for Claude
  const boardDescription = JSON.stringify({
    goals: boardState.goals.map((g) => ({ id: g.id, statement: g.statement, timeframe: g.timeframe, metrics: g.metrics })),
    outcomes: boardState.outcomes.map((o) => ({ id: o.id, goalId: o.goalId, statement: o.statement, behaviorChange: o.behaviorChange, measureOfSuccess: o.measureOfSuccess })),
    items: boardState.items.map((i) => ({ id: i.id, outcomeId: i.outcomeId, title: i.title, description: i.description, type: i.type, column: i.column })),
  }, null, 2);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: NUDGE_SYSTEM_PROMPT,
    messages: [
      { role: "user", content: `Here is the current board state:\n\n${boardDescription}\n\nGenerate 5 coaching nudges.` },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  // Parse the nudges JSON
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
  let nudges = [];

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      nudges = parsed.map((n: { targetType: string; targetId: string; tier: string; message: string; question: string }, i: number) => ({
        id: `nudge-${Date.now()}-${i}`,
        targetType: n.targetType,
        targetId: n.targetId,
        tier: n.tier,
        message: n.message,
        question: n.question,
        status: "active",
      }));
    } catch {
      // Parse failed
    }
  }

  return NextResponse.json({ nudges });
}
```

**Step 2: Integrate nudge generation into Board**

Modify `src/components/Board.tsx`:
- After board loads (when boardId is present), call `/api/nudge` with the board state
- Dispatch `SET_NUDGES` with the result
- Add a "Refresh nudges" button (small, in the header area or floating)
- Add loading state for nudge generation

Add to Board component:
```typescript
const [nudgesLoading, setNudgesLoading] = useState(false);

const generateNudges = async () => {
  setNudgesLoading(true);
  try {
    const res = await fetch("/api/nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardState: state }),
    });
    const data = await res.json();
    dispatch({ type: "SET_NUDGES", nudges: data.nudges });
  } catch (err) {
    console.error("Failed to generate nudges:", err);
  }
  setNudgesLoading(false);
};

// Generate nudges on first load for non-demo boards
useEffect(() => {
  if (boardId && state.nudges.length === 0) {
    generateNudges();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [boardId]);
```

Pass `generateNudges` and `nudgesLoading` to BoardHeader for the refresh button.

**Step 3: Verify**

- Create a board via intake
- Board should load with AI-generated nudges appearing after a moment
- Click "Refresh nudges" → new nudges should appear

**Step 4: Commit**

```bash
git add src/app/api/nudge/ src/components/Board.tsx src/components/BoardHeader.tsx
git commit -m "feat: AI-generated nudges from actual board state with refresh button"
```

---

## Task 8: Sparring API & Panel Rewrite

**Files:**
- Create: `src/app/api/spar/route.ts`
- Rewrite: `src/components/SparringPanel.tsx`

**Step 1: Create sparring API route**

Create `src/app/api/spar/route.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { SPAR_SYSTEM_PROMPT } from "@/lib/prompts";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const { messages, nudgeContext } = await req.json();

  // nudgeContext: { nudge, target (the goal/outcome/item) }
  const contextMessage = `I'm looking at this coaching nudge on my board:

Nudge: "${nudgeContext.nudge.message} ${nudgeContext.nudge.question}"

About this ${nudgeContext.nudge.targetType}:
${JSON.stringify(nudgeContext.target, null, 2)}

Help me think through this.`;

  const claudeMessages = [];

  if (messages.length === 0) {
    claudeMessages.push({ role: "user" as const, content: contextMessage });
  } else {
    // First message is always the context
    claudeMessages.push({ role: "user" as const, content: contextMessage });
    // Then alternate assistant/user
    for (const msg of messages) {
      claudeMessages.push({
        role: msg.role === "ai" ? ("assistant" as const) : ("user" as const),
        content: msg.text,
      });
    }
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SPAR_SYSTEM_PROMPT,
    messages: claudeMessages,
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  // Check for suggestion JSON
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
  let suggestion = null;
  let displayText = text;

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.type === "suggestion") {
        suggestion = parsed;
        displayText = text.replace(/```json\n[\s\S]*?\n```/, "").trim();
      }
    } catch {
      // Parse failed
    }
  }

  return NextResponse.json({ text: displayText, suggestion });
}
```

**Step 2: Rewrite SparringPanel**

Rewrite `src/components/SparringPanel.tsx`:
- Accept `nudgeId`, `onClose`, and the board context (nudge + target item/outcome/goal)
- Show real text input (not disabled)
- Send messages to `/api/spar`
- Show AI responses
- Hard limit: 4 user messages. After 4, disable input and show "Time to act"
- When AI returns a `suggestion`, show an "Apply to board" button
- "Apply to board" dispatches the appropriate UPDATE_ action to the board reducer

Key state:
```typescript
const [messages, setMessages] = useState<SparMessage[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [userInput, setUserInput] = useState("");
const [turnCount, setTurnCount] = useState(0);
const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
const MAX_TURNS = 4;
```

Need to pass the full nudge object AND its target (goal/outcome/item) from Board to SparringPanel. Modify Board to look up the target when opening sparring.

**Step 3: Implement "Apply to board"**

When user clicks "Apply", dispatch the appropriate action based on suggestion.action:
```typescript
const handleApply = () => {
  if (!suggestion) return;
  if (suggestion.action === "update_outcome" && suggestion.targetId) {
    dispatch({ type: "UPDATE_OUTCOME", outcomeId: suggestion.targetId, updates: suggestion.changes });
  } else if (suggestion.action === "update_item" && suggestion.targetId) {
    dispatch({ type: "UPDATE_ITEM", itemId: suggestion.targetId, updates: suggestion.changes });
  }
  // etc.
};
```

**Step 4: Verify**

- Open a board with nudges
- Click "Think about this" on a nudge
- Sparring panel opens with real input
- Type a message → AI responds with coaching
- After a few turns, AI should suggest a concrete change
- Click "Apply" → board updates

**Step 5: Commit**

```bash
git add src/app/api/spar/ src/components/SparringPanel.tsx src/components/Board.tsx
git commit -m "feat: real AI sparring with turn limit and Apply to board suggestions"
```

---

## Task 9: Export to Markdown

**Files:**
- Create: `src/lib/export.ts`
- Modify: `src/components/BoardHeader.tsx` (export button triggers download)

**Step 1: Create markdown generator**

Create `src/lib/export.ts`:

```typescript
import type { BoardState } from "@/types/board";

export function generateMarkdownExport(state: BoardState): string {
  const lines: string[] = [];

  lines.push("# Shodoboard Export");
  lines.push(`\nGenerated: ${new Date().toLocaleDateString("fi-FI")}\n`);

  // Business Goals
  lines.push("## Business Goals\n");

  for (const goal of state.goals.sort((a, b) => a.order - b.order)) {
    lines.push(`### ${goal.statement}`);
    if (goal.timeframe) lines.push(`- **Timeframe:** ${goal.timeframe}`);
    if (goal.metrics.length > 0) {
      lines.push(`- **Metrics:** ${goal.metrics.join(", ")}`);
    }
    lines.push("");

    // Outcomes for this goal
    const goalOutcomes = state.outcomes
      .filter((o) => o.goalId === goal.id)
      .sort((a, b) => a.order - b.order);

    for (const outcome of goalOutcomes) {
      lines.push(`#### ${outcome.statement}`);
      if (outcome.behaviorChange) {
        lines.push(`- **Behavior change:** ${outcome.behaviorChange}`);
      }
      if (outcome.measureOfSuccess) {
        lines.push(`- **Measure of success:** ${outcome.measureOfSuccess}`);
      }

      // Work items for this outcome
      const outcomeItems = state.items
        .filter((i) => i.outcomeId === outcome.id)
        .sort((a, b) => a.order - b.order);

      if (outcomeItems.length > 0) {
        lines.push("- **Work items:**");
        for (const item of outcomeItems) {
          const typeLabel = item.type === "discovery" ? "Discovery" : "Delivery";
          const columnLabel = item.column.charAt(0).toUpperCase() + item.column.slice(1);
          lines.push(`  - [${typeLabel}] ${item.title} *(${columnLabel})*`);
        }
      }
      lines.push("");
    }
  }

  // Unlinked items
  const unlinkedItems = state.items.filter((i) => i.outcomeId === null);
  if (unlinkedItems.length > 0) {
    lines.push("## Items Not Yet Linked to an Outcome\n");
    for (const item of unlinkedItems) {
      const typeLabel = item.type === "discovery" ? "Discovery" : "Delivery";
      lines.push(`- [${typeLabel}] ${item.title}`);
      if (item.description) lines.push(`  - ${item.description}`);
    }
    lines.push("");
  }

  // Active nudges as coaching notes
  const activeNudges = state.nudges.filter((n) => n.status === "active");
  if (activeNudges.length > 0) {
    lines.push("## Coaching Notes\n");
    for (const nudge of activeNudges) {
      lines.push(`- ${nudge.message} *${nudge.question}*`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Step 2: Add export button to BoardHeader**

Modify `src/components/BoardHeader.tsx`:
- Add an "Export" button (use `Export` or `Download` icon from Phosphor)
- On click, call `generateMarkdownExport(state)` and `downloadMarkdown()`
- Only show on non-demo boards (when boardId is present), or show on all boards

```typescript
import { generateMarkdownExport, downloadMarkdown } from "@/lib/export";

const handleExport = () => {
  const markdown = generateMarkdownExport(state);
  downloadMarkdown(markdown, `shodoboard-export-${new Date().toISOString().slice(0, 10)}.md`);
};
```

**Step 3: Verify**

- Open a board
- Click "Export"
- A `.md` file should download
- Open the file — should show the tree structure with goals → outcomes → items

**Step 4: Commit**

```bash
git add src/lib/export.ts src/components/BoardHeader.tsx
git commit -m "feat: export board as structured markdown with goal/outcome/item tree"
```

---

## Task 10: Deploy to Vercel

**Files:**
- No new files — configuration in Vercel dashboard

**Step 1: Push to GitHub**

```bash
git push origin main
```

**Step 2: Set up Vercel project**

1. Go to vercel.com → Import Git Repository → select watson23/shodoboard
2. Framework preset: Next.js (auto-detected)
3. Add environment variables:
   - `ANTHROPIC_API_KEY` = (the API key from console.anthropic.com)
   - `NEXT_PUBLIC_FIREBASE_API_KEY` = (from Firebase console)
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = (from Firebase console)
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = (from Firebase console)
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = (from Firebase console)
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` = (from Firebase console)
   - `NEXT_PUBLIC_FIREBASE_APP_ID` = (from Firebase console)
4. Deploy

**Step 3: Set up Firebase project**

If not already done:
1. Go to console.firebase.google.com
2. Create project (or use existing)
3. Add a web app → copy config values
4. Enable Firestore Database
5. Set Firestore rules for the pilot (permissive for workshop):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /boards/{boardId} {
      allow read, write: if true;
    }
  }
}
```

(For the workshop this is fine — anyone can read/write boards. Add auth rules later.)

**Step 4: Test the deployed version**

1. Visit the Vercel URL
2. Go through full flow: landing → consent → intake → board → nudges → sparring → export
3. Close browser tab, reopen the board URL → board should load from Firestore
4. Test on mobile viewport (basic — should be usable even if not optimized)

**Step 5: Commit any fixes**

Fix any deployment issues and commit.

---

## Summary: Task Dependency Graph

```
Task 1: Foundation (deps, Firebase)
  ↓
Task 2: Board persistence (useBoard changes)
  ↓
Task 3: Dynamic board route /board/[id]
  ↓
Task 4: Landing page & consent  ──→  Task 5: Intake API
                                        ↓
                                   Task 6: Intake conversation rewrite
                                        ↓
                                   Task 7: Nudge API & integration
                                        ↓
                                   Task 8: Sparring API & panel rewrite
                                        ↓
                                   Task 9: Export
                                        ↓
                                   Task 10: Deploy to Vercel
```

Tasks 4-5 can be done in parallel. Tasks 7-9 can be done in parallel after Task 6 is complete.
