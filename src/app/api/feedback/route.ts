import { NextResponse } from "next/server";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const { boardId, productName, category, message } = await request.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const feedbackRef = collection(db, "feedback");
    await addDoc(feedbackRef, {
      boardId: boardId || "unknown",
      productName: productName || "Unknown",
      category: category || "idea",
      message: message.trim(),
      createdAt: serverTimestamp(),
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
