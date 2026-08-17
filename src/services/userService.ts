/**
 * userService.ts
 *
 * Firestore operations for user profiles.
 *
 * Firestore document path:
 *   users/{uid}
 *
 * Document shape:
 *   {
 *     uid:         string   — Firebase Auth UID
 *     username:    string   — lowercase, unique display handle
 *     email:       string   — real email used for Firebase Auth + password reset
 *     createdAt:   Timestamp
 *     updatedAt:   Timestamp
 *     currency:    string   — default 'INR'
 *     displayName: string   — optional, defaults to username
 *   }
 *
 * Uniqueness strategy:
 *   A separate top-level collection `usernames` maps each taken username to
 *   the uid that owns it. This allows an O(1) lookup without scanning `users`.
 *
 *   usernames/{username} → { uid: string, email: string }
 *
 * Password hashing:
 *   Passwords are NEVER written to Firestore. Firebase Auth owns credentials.
 */

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserProfile {
  uid:         string;
  username:    string;
  email:       string;
  createdAt:   Timestamp;
  updatedAt:   Timestamp;
  currency:    string;
  displayName: string;
}

// ---------------------------------------------------------------------------
// Create user profile + reserve username atomically
// Called immediately after Firebase Auth createUserWithEmailAndPassword
// ---------------------------------------------------------------------------

export const createUserProfile = async (
  uid:      string,
  username: string,
  email:    string
): Promise<void> => {
  const usernameKey = username.toLowerCase().trim();

  // Run as a Firestore transaction so both writes succeed or both fail.
  await runTransaction(db, async (tx) => {
    const usernameRef = doc(db, 'usernames', usernameKey);
    const usernameSnap = await tx.get(usernameRef);

    if (usernameSnap.exists()) {
      throw new Error('USERNAME_TAKEN');
    }

    const userRef = doc(db, 'users', uid);
    const now = Timestamp.now();

    const profile: UserProfile = {
      uid,
      username:    usernameKey,
      email:       email.toLowerCase().trim(),
      createdAt:   now,
      updatedAt:   now,
      currency:    'INR',
      displayName: usernameKey,
    };

    tx.set(userRef, profile);
    // Store email alongside uid so resolveUsernameToEmail can complete in a
    // single unauthenticated read (login must look up email BEFORE auth).
    tx.set(usernameRef, { uid, email: email.toLowerCase().trim() });
  });
};

// ---------------------------------------------------------------------------
// Resolve username → real email (used by login flow)
// Returns null if username does not exist
// ---------------------------------------------------------------------------

export const resolveUsernameToEmail = async (
  username: string
): Promise<string | null> => {
  const usernameKey = username.toLowerCase().trim();
  const usernameRef = doc(db, 'usernames', usernameKey);
  const usernameSnap = await getDoc(usernameRef);

  if (!usernameSnap.exists()) return null;

  // usernames/{username} stores { uid, email } — single unauthenticated read.
  // This avoids a second read of users/{uid} which requires authentication
  // and would fail with permission-denied during login (user not yet signed in).
  //
  // NOTE: Accounts created before this schema change only have { uid } here.
  // Those accounts will get null from data.email and return null (login fails
  // with "No account found with that username"). Fix: delete and re-create the
  // account, or manually add the email field to usernames/{username} in the
  // Firebase Console.
  const data = usernameSnap.data() as { uid: string; email?: string };
  return data.email ?? null;
};

// ---------------------------------------------------------------------------
// Check if a username is already taken (used for real-time validation)
// ---------------------------------------------------------------------------

export const isUsernameTaken = async (username: string): Promise<boolean> => {
  const usernameKey = username.toLowerCase().trim();
  const snap = await getDoc(doc(db, 'usernames', usernameKey));
  return snap.exists();
};

// ---------------------------------------------------------------------------
// Check if an email is already registered (used for sign-up validation)
// Firebase Auth throws auth/email-already-in-use, but we check Firestore
// too so we can surface a clear message before attempting Auth.
// ---------------------------------------------------------------------------

export const isEmailTaken = async (email: string): Promise<boolean> => {
  const emailKey = email.toLowerCase().trim();
  const usersRef = collection(db, 'users');
  const q        = query(usersRef, where('email', '==', emailKey));
  const snap     = await getDocs(q);
  return !snap.empty;
};

// ---------------------------------------------------------------------------
// Get user profile by UID
// ---------------------------------------------------------------------------

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
};
