import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth-server";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    await verifyAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const feedbackRef = collection(db, "feedback");
    const q = query(feedbackRef, orderBy("createdAt", "desc"), limit(50));
    const snapshot = await getDocs(q);

    const items: {
      id: string;
      boardId: string;
      productName: string;
      category: string;
      message: string;
      createdAt: string | null;
    }[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      let createdAtStr: string | null = null;
      if (data.createdAt && typeof data.createdAt === "object" && "toDate" in data.createdAt) {
        createdAtStr = (data.createdAt as { toDate: () => Date }).toDate().toISOString();
      }

      items.push({
        id: docSnap.id,
        boardId: data.boardId || "unknown",
        productName: data.productName || "Unknown",
        category: data.category || "idea",
        message: data.message || "",
        createdAt: createdAtStr,
      });
    });

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
