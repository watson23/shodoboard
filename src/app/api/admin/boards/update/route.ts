import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth-server";
import { updateBoardCohort } from "@/lib/firestore-admin";

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    await verifyAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { boardId, cohort } = await request.json();

    if (!boardId || typeof boardId !== "string") {
      return NextResponse.json({ error: "boardId required" }, { status: 400 });
    }
    if (!cohort || typeof cohort !== "string") {
      return NextResponse.json({ error: "cohort required" }, { status: 400 });
    }

    await updateBoardCohort(boardId, cohort.trim());

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin board update error:", err);
    return NextResponse.json(
      { error: "Failed to update board" },
      { status: 500 }
    );
  }
}
