import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccount) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccount) as ServiceAccount),
    });
  }

  // Fallback: auto-detect in GCP/Vercel environments
  return initializeApp();
}

const adminApp = getAdminApp();
export const adminAuth = getAuth(adminApp);

/**
 * Server-side Firestore access. Unlike the client SDK's `db`, this runs as the
 * service account and is not subject to security rules, which is what API
 * routes need (the client SDK on the server is an anonymous user and gets
 * "Missing or insufficient permissions").
 */
export const adminDb = getFirestore(adminApp);
