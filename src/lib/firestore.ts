import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteField,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { BoardState } from "@/types/board";
import type { ConversationMessage } from "@/types/intake";
import type { ActivityEvent, SessionSummary } from "@/types/activity";

export interface BoardMember {
  email: string;      // normalized lowercase
  addedAt: string;    // ISO 8601
}

export interface BoardVisitor {
  uid: string;
  email: string;
  lastVisitedAt: string;
}

export interface BoardDocument {
  boardState: BoardState;
  intakeHistory?: ConversationMessage[];
  consentGiven: boolean;
  cohort?: string;
  ownerId?: string;
  ownerEmail?: string;
  accessMode?: "link" | "invite_only";
  members?: BoardMember[];
  recentVisitors?: BoardVisitor[];
  createdAt: unknown;
  updatedAt: unknown;
  activityLog?: ActivityEvent[];
  activitySessions?: SessionSummary[];
}

const BOARDS_COLLECTION = "boards";

export async function createBoard(
  boardState: BoardState,
  intakeHistory?: ConversationMessage[],
  cohort?: string
): Promise<string> {
  // If no cohort specified, fetch the default from config
  let resolvedCohort = cohort;
  if (!resolvedCohort) {
    try {
      const config = await getAppConfig();
      resolvedCohort = config.defaultCohort;
    } catch {
      resolvedCohort = "default";
    }
  }

  const boardRef = doc(collection(db, BOARDS_COLLECTION));
  await setDoc(boardRef, {
    boardState,
    intakeHistory: intakeHistory ?? [],
    consentGiven: true,
    cohort: resolvedCohort,
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

export async function claimBoard(
  boardId: string,
  ownerId: string,
  ownerEmail: string
): Promise<void> {
  const boardRef = doc(db, BOARDS_COLLECTION, boardId);
  await updateDoc(boardRef, {
    ownerId,
    ownerEmail,
    updatedAt: serverTimestamp(),
  });
}

export async function unclaimBoard(boardId: string): Promise<void> {
  const boardRef = doc(db, BOARDS_COLLECTION, boardId);
  await updateDoc(boardRef, {
    ownerId: deleteField(),
    ownerEmail: deleteField(),
    accessMode: deleteField(),
    members: deleteField(),
    recentVisitors: deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateBoardAccessMode(
  boardId: string,
  accessMode: "link" | "invite_only"
): Promise<void> {
  const boardRef = doc(db, BOARDS_COLLECTION, boardId);
  await updateDoc(boardRef, {
    accessMode,
    updatedAt: serverTimestamp(),
  });
}

export async function addBoardMember(
  boardId: string,
  email: string
): Promise<BoardMember[]> {
  const normalized = email.toLowerCase().trim();
  const boardRef = doc(db, BOARDS_COLLECTION, boardId);
  const snap = await getDoc(boardRef);
  if (!snap.exists()) return [];

  const data = snap.data() as BoardDocument;
  const existing = data.members || [];

  // Dedup check
  if (existing.some((m) => m.email === normalized)) return existing;

  const newMember: BoardMember = {
    email: normalized,
    addedAt: new Date().toISOString(),
  };
  const updated = [...existing, newMember];
  await updateDoc(boardRef, { members: updated, updatedAt: serverTimestamp() });
  return updated;
}

export async function removeBoardMember(
  boardId: string,
  email: string
): Promise<BoardMember[]> {
  const normalized = email.toLowerCase().trim();
  const boardRef = doc(db, BOARDS_COLLECTION, boardId);
  const snap = await getDoc(boardRef);
  if (!snap.exists()) return [];

  const data = snap.data() as BoardDocument;
  const updated = (data.members || []).filter((m) => m.email !== normalized);
  await updateDoc(boardRef, { members: updated, updatedAt: serverTimestamp() });
  return updated;
}

const MAX_VISITORS = 50;

export async function recordBoardVisitor(
  boardId: string,
  uid: string,
  email: string
): Promise<void> {
  const boardRef = doc(db, BOARDS_COLLECTION, boardId);
  const snap = await getDoc(boardRef);
  if (!snap.exists()) return;

  const data = snap.data() as BoardDocument;
  const visitors = data.recentVisitors || [];
  const now = new Date().toISOString();

  const existingIdx = visitors.findIndex((v) => v.uid === uid);
  if (existingIdx >= 0) {
    visitors[existingIdx].lastVisitedAt = now;
    visitors[existingIdx].email = email; // update in case it changed
  } else {
    visitors.push({ uid, email, lastVisitedAt: now });
  }

  // Cap at MAX_VISITORS, keep most recent
  const capped = visitors
    .sort((a, b) => b.lastVisitedAt.localeCompare(a.lastVisitedAt))
    .slice(0, MAX_VISITORS);

  await updateDoc(boardRef, { recentVisitors: capped });
}

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

// App config stored in config/app document
export interface AppConfig {
  defaultCohort: string;
}

const CONFIG_DOC = "config";
const CONFIG_ID = "app";

export async function getAppConfig(): Promise<AppConfig> {
  const configRef = doc(db, CONFIG_DOC, CONFIG_ID);
  const snap = await getDoc(configRef);
  if (!snap.exists()) return { defaultCohort: "default" };
  const data = snap.data();
  return {
    defaultCohort: data.defaultCohort || "default",
  };
}

export async function updateAppConfig(updates: Partial<AppConfig>): Promise<void> {
  const configRef = doc(db, CONFIG_DOC, CONFIG_ID);
  const snap = await getDoc(configRef);
  if (snap.exists()) {
    await updateDoc(configRef, updates);
  } else {
    await setDoc(configRef, { defaultCohort: "default", ...updates });
  }
}

export async function getAllBoardsActivity(): Promise<
  {
    boardId: string;
    productName?: string;
    cohort?: string;
    createdAt?: string;
    sessions: SessionSummary[];
    events: ActivityEvent[];
  }[]
> {
  const colRef = collection(db, BOARDS_COLLECTION);
  const snapshot = await getDocs(colRef);
  const results: {
    boardId: string;
    productName?: string;
    cohort?: string;
    createdAt?: string;
    sessions: SessionSummary[];
    events: ActivityEvent[];
  }[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as BoardDocument;
    const events = data.activityLog || [];
    const sessions = data.activitySessions || [];
    if (events.length > 0 || sessions.length > 0) {
      // Convert Firestore Timestamp to ISO string
      let createdAtStr: string | undefined;
      if (data.createdAt && typeof data.createdAt === "object" && "toDate" in data.createdAt) {
        createdAtStr = (data.createdAt as { toDate: () => Date }).toDate().toISOString();
      }

      results.push({
        boardId: docSnap.id,
        productName: data.boardState?.productName,
        cohort: data.cohort,
        createdAt: createdAtStr,
        sessions,
        events,
      });
    }
  });

  return results;
}
