/**
 * firebase.ts
 *
 * Single source of truth for all Firebase initialisation.
 * Import { auth, db, storage } from here — never call initializeApp() again elsewhere.
 *
 * Why EXPO_PUBLIC_ prefix?
 *   Expo reads variables prefixed with EXPO_PUBLIC_ from the .env file and
 *   inlines them at build time via process.env. They are safe for client-side
 *   Firebase config (these values are also embedded in your web app anyway).
 *   Never use EXPO_PUBLIC_ for truly secret server-side keys.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth }       from 'firebase/auth';
import { initializeFirestore, Firestore } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// NOTE: Firebase Storage is intentionally excluded.
// It requires Google Cloud billing to be enabled (one-time prepayment).
// Receipt upload and profile picture features will be added in a later step
// once billing is set up. The storageService.ts file remains as a stub.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Firebase project configuration
// Values are read from the .env file at build time via EXPO_PUBLIC_ prefix.
// storageBucket is kept here so the config is complete for when Storage is
// added later — it does not cost anything to include the field.
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// ---------------------------------------------------------------------------
// Guard: warn clearly if env vars are missing (easy to miss during setup)
// ---------------------------------------------------------------------------
const requiredKeys: (keyof typeof firebaseConfig)[] = [
  'apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId',
];

const missingKeys = requiredKeys.filter(k => !firebaseConfig[k]);

if (missingKeys.length > 0) {
  console.warn(
    '[Firebase] Missing environment variables:',
    missingKeys.join(', '),
    '\nCheck your .env file and restart Expo.'
  );
}

// ---------------------------------------------------------------------------
// Initialise — getApps() prevents "already initialised" errors on hot reload
// ---------------------------------------------------------------------------
const app: FirebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// ---------------------------------------------------------------------------
// Exports — Auth and Firestore only. Storage added in a later step.
// ---------------------------------------------------------------------------
export const auth: Auth           = getAuth(app);
export const db:   Firestore      = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export default app;
