import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth-server";
import { listFeedback } from "@/lib/firestore-admin";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    await verifyAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await listFeedback(50);

    return NextResponse.json({
      totalCount: items.length,
      items,
    });
  } catch (err) {
    console.error("Admin feedback API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}
