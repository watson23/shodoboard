import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth-server";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

    const boardRef = doc(db, "boards", boardId);
    await updateDoc(boardRef, { cohort: cohort.trim() });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin board update error:", err);
    return NextResponse.json(
      { error: "Failed to update board" },
      { status: 500 }
    );
  }
}
