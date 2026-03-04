import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { BoardState } from "@/types/board";
import type { ConversationMessage } from "@/types/intake";
import type { ActivityEvent, SessionSummary } from "@/types/activity";

export interface BoardDocument {
  boardState: BoardState;
  intakeHistory?: ConversationMessage[];
  consentGiven: boolean;
  cohort?: string;
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
  const boardRef = doc(collection(db, BOARDS_COLLECTION));
  await setDoc(boardRef, {
    boardState,
    intakeHistory: intakeHistory ?? [],
    consentGiven: true,
    cohort: cohort ?? "default",
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
