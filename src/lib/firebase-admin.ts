import "server-only";
import { cert, getApps, getApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// FIREBASE_SERVICE_ACCOUNT_KEY holds the full service account JSON (from
// Firebase Console -> Project Settings -> Service Accounts -> Generate new
// private key), stored as a single-line JSON string. This is a server-only
// secret with full admin access to the Firebase project — never expose it
// with a NEXT_PUBLIC_ prefix or log it.
function getAdminApp(): App {
  if (getApps().length) return getApp();

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
  }

  return initializeApp({ credential: cert(JSON.parse(raw)) });
}

let authInstance: Auth | undefined;
export function getAdminAuth(): Auth {
  authInstance ??= getAuth(getAdminApp());
  return authInstance;
}

let dbInstance: Firestore | undefined;
export function getAdminDb(): Firestore {
  dbInstance ??= getFirestore(getAdminApp());
  return dbInstance;
}
