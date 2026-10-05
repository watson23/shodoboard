/**
 * Firestore operations used by API routes. These run with the Admin SDK
 * (service account), so they bypass security rules. Only call them from
 * server code, after whatever authorization the route needs (verifyAdmin
 * for admin routes).
 */
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import type { BoardDocument, AppConfig } from "./firestore";
import type { ActivityEvent, SessionSummary } from "@/types/activity";

const BOARDS = "boards";
const FEEDBACK = "feedback";
const CONFIG_DOC = "config";
const CONFIG_ID = "app";

function toIso(value: unknown): string | undefined {
  return value instanceof Timestamp ? value.toDate().toISOString() : undefined;
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
  const snapshot = await adminDb.collection(BOARDS).get();
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
      results.push({
        boardId: docSnap.id,
        productName: data.boardState?.productName,
        cohort: data.cohort,
        createdAt: toIso(data.createdAt),
        sessions,
        events,
      });
    }
  });

  return results;
}

export async function updateBoardCohort(boardId: string, cohort: string): Promise<void> {
  await adminDb.collection(BOARDS).doc(boardId).update({ cohort });
}

export async function getAppConfig(): Promise<AppConfig> {
  const snap = await adminDb.collection(CONFIG_DOC).doc(CONFIG_ID).get();
  if (!snap.exists) return { defaultCohort: "default" };
  const data = snap.data() ?? {};
  return { defaultCohort: (data.defaultCohort as string) || "default" };
}

export async function updateAppConfig(updates: Partial<AppConfig>): Promise<void> {
  await adminDb
    .collection(CONFIG_DOC)
    .doc(CONFIG_ID)
    .set({ defaultCohort: "default", ...updates }, { merge: true });
}

export interface FeedbackItem {
  id: string;
  boardId: string;
  productName: string;
  category: string;
  message: string;
  createdAt: string | null;
}

export async function listFeedback(max = 50): Promise<FeedbackItem[]> {
  const snapshot = await adminDb
    .collection(FEEDBACK)
    .orderBy("createdAt", "desc")
    .limit(max)
    .get();

  const items: FeedbackItem[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    items.push({
      id: docSnap.id,
      boardId: data.boardId || "unknown",
      productName: data.productName || "Unknown",
      category: data.category || "idea",
      message: data.message || "",
      createdAt: toIso(data.createdAt) ?? null,
    });
  });
  return items;
}

export async function addFeedback(entry: {
  boardId: string;
  productName: string;
  category: string;
  message: string;
  userAgent: string;
}): Promise<void> {
  await adminDb.collection(FEEDBACK).add({
    ...entry,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/** Appends activity events (and upserts the session) on a board. Returns false if the board does not exist. */
export async function flushActivityEvents(
  boardId: string,
  events: ActivityEvent[],
  session?: SessionSummary
): Promise<boolean> {
  const ref = adminDb.collection(BOARDS).doc(boardId);
  const snap = await ref.get();
  if (!snap.exists) return false;

  const data = snap.data() as BoardDocument;
  const existingEvents = data.activityLog || [];
  const existingSessions = data.activitySessions || [];

  const updateData: Record<string, unknown> = {
    activityLog: [...existingEvents, ...events],
  };

  if (session) {
    const idx = existingSessions.findIndex((s) => s.sessionId === session.sessionId);
    if (idx >= 0) {
      existingSessions[idx] = session;
    } else {
      existingSessions.push(session);
    }
    updateData.activitySessions = existingSessions;
  }

  await ref.update(updateData);
  return true;
}
