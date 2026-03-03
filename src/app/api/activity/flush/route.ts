import { NextResponse } from "next/server";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ActivityEvent, SessionSummary } from "@/types/activity";
import type { BoardDocument } from "@/lib/firestore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { boardId, events, session } = body as {
      boardId: string;
      events: ActivityEvent[];
      session?: SessionSummary;
    };

    if (!boardId || !events || events.length === 0) {
      return NextResponse.json({ ok: true }); // silently ignore empty
    }

    const boardRef = doc(db, "boards", boardId);
    const snap = await getDoc(boardRef);
    if (!snap.exists()) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const data = snap.data() as BoardDocument;
    const existingEvents = data.activityLog || [];
    const existingSessions = data.activitySessions || [];

    const updateData: Record<string, unknown> = {
      activityLog: [...existingEvents, ...events],
    };

    if (session) {
      const idx = existingSessions.findIndex(
        (s) => s.sessionId === session.sessionId
      );
      if (idx >= 0) {
        existingSessions[idx] = session;
      } else {
        existingSessions.push(session);
      }
      updateData.activitySessions = existingSessions;
    }

    await updateDoc(boardRef, updateData);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Activity flush error:", err);
    return NextResponse.json({ error: "Flush failed" }, { status: 500 });
  }
}
