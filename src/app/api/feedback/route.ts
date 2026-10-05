import { NextResponse } from "next/server";
import { addFeedback } from "@/lib/firestore-admin";

export async function POST(request: Request) {
  try {
    const { boardId, productName, category, message } = await request.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    await addFeedback({
      boardId: boardId || "unknown",
      productName: productName || "Unknown",
      category: category || "idea",
      message: message.trim(),
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Feedback API error:", err);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }
}
