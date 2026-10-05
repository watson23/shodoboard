import { NextResponse } from "next/server";
import { flushActivityEvents } from "@/lib/firestore-admin";
import type { ActivityEvent, SessionSummary } from "@/types/activity";

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

    const found = await flushActivityEvents(boardId, events, session);
    if (!found) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Activity flush error:", err);
    return NextResponse.json({ error: "Flush failed" }, { status: 500 });
  }
}
