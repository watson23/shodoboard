import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth-server";
import { getAppConfig, updateAppConfig } from "@/lib/firestore";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    await verifyAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await getAppConfig();
    return NextResponse.json(config);
  } catch (err) {
    console.error("Admin config GET error:", err);
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    await verifyAdmin(authHeader);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { defaultCohort } = await request.json();

    if (!defaultCohort || typeof defaultCohort !== "string") {
      return NextResponse.json({ error: "defaultCohort required" }, { status: 400 });
    }

    await updateAppConfig({ defaultCohort: defaultCohort.trim() });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin config PATCH error:", err);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
