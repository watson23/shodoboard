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
const USERS_COLLECTION = "users";

export async function createBoard(
  boardState: BoardState,
  intakeHistory?: ConversationMessage[],
  cohort?: string
): Promise<string> {
  try {
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
  } catch (err) {
    console.error("Failed to create board:", err);
    throw new Error(`Failed to create board: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function getBoard(boardId: string): Promise<BoardDocument | null> {
  try {
    const boardRef = doc(db, BOARDS_COLLECTION, boardId);
    const snap = await getDoc(boardRef);
    if (!snap.exists()) return null;
    return snap.data() as BoardDocument;
  } catch (err) {
    console.error(`Failed to load board ${boardId}:`, err);
    throw new Error(`Failed to load board: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function updateBoardState(
  boardId: string,
  boardState: BoardState
): Promise<void> {
  try {
    const boardRef = doc(db, BOARDS_COLLECTION, boardId);
    await updateDoc(boardRef, {
      boardState,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error(`Failed to save board ${boardId}:`, err);
    throw new Error(`Failed to save board: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function claimBoard(
  boardId: string,
  ownerId: string,
  ownerEmail: string
): Promise<void> {
  try {
    const boardRef = doc(db, BOARDS_COLLECTION, boardId);
    await updateDoc(boardRef, {
      ownerId,
      ownerEmail,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error(`Failed to claim board ${boardId}:`, err);
    throw new Error(`Failed to claim board: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function unclaimBoard(boardId: string): Promise<void> {
  try {
    const boardRef = doc(db, BOARDS_COLLECTION, boardId);
    await updateDoc(boardRef, {
      ownerId: deleteField(),
      ownerEmail: deleteField(),
      accessMode: deleteField(),
      members: deleteField(),
      recentVisitors: deleteField(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error(`Failed to unclaim board ${boardId}:`, err);
    throw new Error(`Failed to unclaim board: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function updateBoardAccessMode(
  boardId: string,
  accessMode: "link" | "invite_only"
): Promise<void> {
  try {
    const boardRef = doc(db, BOARDS_COLLECTION, boardId);
    await updateDoc(boardRef, {
      accessMode,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error(`Failed to update access mode for board ${boardId}:`, err);
    throw new Error(`Failed to update access mode: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function addBoardMember(
  boardId: string,
  email: string
): Promise<BoardMember[]> {
  try {
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
  } catch (err) {
    console.error(`Failed to add member to board ${boardId}:`, err);
    throw new Error(`Failed to add member: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function removeBoardMember(
  boardId: string,
  email: string
): Promise<BoardMember[]> {
  try {
    const normalized = email.toLowerCase().trim();
    const boardRef = doc(db, BOARDS_COLLECTION, boardId);
    const snap = await getDoc(boardRef);
    if (!snap.exists()) return [];

    const data = snap.data() as BoardDocument;
    const updated = (data.members || []).filter((m) => m.email !== normalized);
    await updateDoc(boardRef, { members: updated, updatedAt: serverTimestamp() });
    return updated;
  } catch (err) {
    console.error(`Failed to remove member from board ${boardId}:`, err);
    throw new Error(`Failed to remove member: ${err instanceof Error ? err.message : String(err)}`);
  }
}

const MAX_VISITORS = 50;

export async function recordBoardVisitor(
  boardId: string,
  uid: string,
  email: string
): Promise<void> {
  try {
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
  } catch (err) {
    console.error(`Failed to record visitor for board ${boardId}:`, err);
    throw new Error(`Failed to record visitor: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function flushActivityEvents(
  boardId: string,
  events: ActivityEvent[],
  session?: SessionSummary
): Promise<void> {
  try {
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
  } catch (err) {
    console.error(`Failed to flush activity for board ${boardId}:`, err);
    throw new Error(`Failed to flush activity: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// App config stored in config/app document
export interface AppConfig {
  defaultCohort: string;
}

const CONFIG_DOC = "config";
const CONFIG_ID = "app";

export async function getAppConfig(): Promise<AppConfig> {
  try {
    const configRef = doc(db, CONFIG_DOC, CONFIG_ID);
    const snap = await getDoc(configRef);
    if (!snap.exists()) return { defaultCohort: "default" };
    const data = snap.data();
    return {
      defaultCohort: data.defaultCohort || "default",
    };
  } catch (err) {
    console.error("Failed to load app config:", err);
    throw new Error(`Failed to load app config: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function updateAppConfig(updates: Partial<AppConfig>): Promise<void> {
  try {
    const configRef = doc(db, CONFIG_DOC, CONFIG_ID);
    const snap = await getDoc(configRef);
    if (snap.exists()) {
      await updateDoc(configRef, updates);
    } else {
      await setDoc(configRef, { defaultCohort: "default", ...updates });
    }
  } catch (err) {
    console.error("Failed to update app config:", err);
    throw new Error(`Failed to update app config: ${err instanceof Error ? err.message : String(err)}`);
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
  try {
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
  } catch (err) {
    console.error("Failed to load board activity:", err);
    throw new Error(`Failed to load board activity: ${err instanceof Error ? err.message : String(err)}`);
  }
}

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
