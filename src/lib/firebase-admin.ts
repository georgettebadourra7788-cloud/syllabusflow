import "server-only";
import { cert, getApps, getApp, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { createRemoteJWKSet, jwtVerify } from "jose";

interface ServiceAccountJson {
  project_id: string;
  [key: string]: unknown;
}

// FIREBASE_SERVICE_ACCOUNT_KEY holds the full service account JSON (from
// Firebase Console -> Project Settings -> Service Accounts -> Generate new
// private key), stored as a single-line JSON string. This is a server-only
// secret with full admin access to the Firebase project — never expose it
// with a NEXT_PUBLIC_ prefix or log it.
let cachedServiceAccount: ServiceAccountJson | undefined;
function getServiceAccount(): ServiceAccountJson {
  if (cachedServiceAccount) return cachedServiceAccount;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
  }

  cachedServiceAccount = JSON.parse(raw) as ServiceAccountJson;
  return cachedServiceAccount;
}

function getAdminApp(): App {
  if (getApps().length) return getApp();
  // cert() accepts the raw downloaded JSON (snake_case keys) at runtime —
  // that's the documented usage — but its TS type only names the camelCase
  // ServiceAccount shape, hence the cast.
  return initializeApp({ credential: cert(getServiceAccount() as unknown as ServiceAccount) });
}

let dbInstance: Firestore | undefined;
export function getAdminDb(): Firestore {
  dbInstance ??= getFirestore(getAdminApp());
  return dbInstance;
}

// firebase-admin's own getAuth().verifyIdToken() pulls in jwks-rsa, which
// does a top-level `require("jose")` — but jose 6's package.json "exports"
// map has no "require" condition anymore (ESM-only), so that require()
// crashes with ERR_REQUIRE_ESM the moment firebase-admin/auth is loaded.
// This is a genuine incompatibility between the latest jwks-rsa and jose
// releases, not something bundler config can route around. Verifying the
// token directly with jose here (loaded via a real ESM `import`, which
// correctly resolves jose 6's export map) sidesteps that broken chain
// entirely — Firestore access above doesn't touch jwks-rsa at all.
const googleJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export async function verifyFirebaseIdToken(token: string): Promise<string> {
  const { project_id: projectId } = getServiceAccount();

  const { payload } = await jwtVerify(token, googleJwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("Firebase ID token is missing a subject (uid) claim");
  }

  return payload.sub;
}
