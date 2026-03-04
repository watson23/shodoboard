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

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const boardStats = boards.map((b) => {
      const lastEvent = b.events.length > 0
        ? b.events[b.events.length - 1]
        : null;
      const lastSession = b.sessions.length > 0
        ? b.sessions[b.sessions.length - 1]
        : null;

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
