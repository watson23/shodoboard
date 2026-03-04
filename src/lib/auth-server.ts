import { adminAuth } from "./firebase-admin";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export interface AuthResult {
  uid: string;
  email: string;
  isAdmin: boolean;
}

export async function verifyAdmin(
  authHeader: string | null
): Promise<AuthResult> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7);
  const decoded = await adminAuth.verifyIdToken(token);

  if (!decoded.email) {
    throw new Error("No email in token");
  }

  const isAdmin = ADMIN_EMAILS.includes(decoded.email.toLowerCase());

  if (!isAdmin) {
    throw new Error("Not authorized as admin");
  }

  return {
    uid: decoded.uid,
    email: decoded.email,
    isAdmin,
  };
}
