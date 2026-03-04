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

    const HEARTBEAT_ACTIONS = new Set(["session_heartbeat", "session_start", "session_end"]);

    const boardStats = boards.map((b) => {
      let lastActiveMs = 0;   // last real user interaction
      let lastHeartbeatMs = 0; // last heartbeat (board tab open)

      for (const event of b.events) {
        if (!event.timestamp) continue;
        const ts = typeof event.timestamp === "string"
          ? new Date(event.timestamp).getTime()
          : event.timestamp;

        if (HEARTBEAT_ACTIONS.has(event.action)) {
          if (ts > lastHeartbeatMs) lastHeartbeatMs = ts;
        } else {
          if (ts > lastActiveMs) lastActiveMs = ts;
        }
      }

      // Also check session endedAt for last activity
      const lastSession = b.sessions.length > 0
        ? b.sessions[b.sessions.length - 1]
        : null;
      if (lastSession?.endedAt) {
        const ts = typeof lastSession.endedAt === "string"
          ? new Date(lastSession.endedAt).getTime()
          : lastSession.endedAt;
        if (ts > lastHeartbeatMs) lastHeartbeatMs = ts;
      }

      return {
        boardId: b.boardId,
        productName: b.productName || "Untitled",
        cohort: b.cohort || "default",
        createdAt: b.createdAt,
        lastActive: lastActiveMs > 0 ? new Date(lastActiveMs).toISOString() : null,
        lastHeartbeat: lastHeartbeatMs > 0 ? new Date(lastHeartbeatMs).toISOString() : null,
        sessionCount: b.sessions.length,
        eventCount: b.events.length,
      };
    });

    const activeLastWeek = boardStats.filter(
      (b) => {
        const activeTime = b.lastActive ? new Date(b.lastActive).getTime() : 0;
        const heartbeatTime = b.lastHeartbeat ? new Date(b.lastHeartbeat).getTime() : 0;
        return Math.max(activeTime, heartbeatTime) > sevenDaysAgo;
      }
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
        if (aTime !== bTime) return bTime - aTime;
        // If same real activity, fall back to heartbeat
        const aHb = a.lastHeartbeat ? new Date(a.lastHeartbeat).getTime() : 0;
        const bHb = b.lastHeartbeat ? new Date(b.lastHeartbeat).getTime() : 0;
        return bHb - aHb;
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
