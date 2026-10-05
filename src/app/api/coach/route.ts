export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { hasApiKey } from "@/lib/ai";
import { generateCoaching } from "@/lib/coach";
import { coachingHash } from "@/lib/board-hash";
import type { BoardState } from "@/types/board";

/**
 * One call produces both the nudges and the coaching agenda. The previous
 * /api/nudge and /api/focus routes sent the same board and the same playbooks
 * twice; this halves cost and wall-clock per board open.
 */
export async function POST(req: NextRequest) {
  if (!hasApiKey()) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const { boardState } = (await req.json()) as { boardState: BoardState };
  if (!boardState || !Array.isArray(boardState.goals)) {
    return NextResponse.json({ error: "Missing boardState" }, { status: 400 });
  }

  try {
    const result = await generateCoaching(boardState);
    console.log(
      `[coach] ${result.model} in=${result.usage.input} cacheRead=${result.usage.cacheRead} cacheWrite=${result.usage.cacheWrite} out=${result.usage.output}`
    );
    return NextResponse.json({
      nudges: result.nudges,
      focusItems: result.focusItems,
      boardStrengths: result.boardStrengths,
      coachedHash: coachingHash(boardState),
    });
  } catch (error) {
    console.error("Coach API error:", error);
    return NextResponse.json({ error: "Failed to coach this board" }, { status: 500 });
  }
}
