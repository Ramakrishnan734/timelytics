/**
 * authService.ts
 *
 * All Firebase Authentication operations.
 * Screens call these functions — they never touch Firebase directly.
 *
 * Authentication architecture (Step 2):
 *
 *   Sign Up:
 *     1. Create Firebase Auth user using REAL email address
 *        (auth/email-already-in-use handles duplicate email)
 *     2. Store { uid, username, email, ... } in Firestore via createUserProfile()
 *        (transaction enforces username uniqueness; orphaned Auth user deleted on failure)
 *
 *   Login:
 *     1. User enters username (not email) in the UI
 *     2. resolveUsernameToEmail() looks up the real email from Firestore
 *     3. signInWithEmailAndPassword() uses the real email
 *
 *   Forgot Password:
 *     1. User enters username
 *     2. resolveUsernameToEmail() looks up the real email
 *     3. sendPasswordResetEmail() sends to the real email
 *
 * Passwords are NEVER stored in Firestore. Firebase Auth owns all credentials.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  UserCredential,
} from 'firebase/auth';
import { auth } from './firebase';
import {
  createUserProfile,
  resolveUsernameToEmail,
} from './userService';

// ---------------------------------------------------------------------------
// Sign Up
// Creates Firebase Auth user with real email, then stores profile in Firestore.
// Throws descriptive error codes that the UI can map to friendly messages.
// ---------------------------------------------------------------------------

export const signUp = async (
  username:        string,
  email:           string,
  password:        string,
): Promise<UserCredential> => {
  const usernameKey = username.toLowerCase().trim();
  const emailKey    = email.toLowerCase().trim();

  // 1. Create Firebase Auth user (uses real email).
  //    If the email is already registered, Firebase throws auth/email-already-in-use
  //    which getAuthErrorMessage() maps to a clear UI message.
  const credential = await createUserWithEmailAndPassword(auth, emailKey, password);

  // 2. Write user profile + reserve username in Firestore (atomic transaction).
  //    createUserProfile() enforces username uniqueness inside the transaction —
  //    if the username is already taken it throws USERNAME_TAKEN.
  //    isUsernameTaken() and isEmailTaken() are NOT called here: those
  //    collection-level queries are rejected by Firestore security rules (users
  //    may only read their own document, not the whole collection).
  try {
    await createUserProfile(credential.user.uid, usernameKey, emailKey);
  } catch (profileError: any) {
    // If Firestore profile write fails for any reason, delete the Auth user
    // so we never leave an orphaned Auth account with no Firestore profile.
    await credential.user.delete().catch(() => {});
    throw profileError;
  }

  return credential;
};

// ---------------------------------------------------------------------------
// Login
// Resolves username → real email, then authenticates with Firebase Auth.
// ---------------------------------------------------------------------------

export const logIn = async (
  username: string,
  password: string
): Promise<UserCredential> => {
  const usernameKey = username.toLowerCase().trim();

  // Resolve username to real email via Firestore lookup
  const email = await resolveUsernameToEmail(usernameKey);

  if (!email) {
    // Username not found — throw a consistent error the UI maps to a message
    throw new Error('USER_NOT_FOUND');
  }

  // Authenticate with Firebase Auth using the real email
  return signInWithEmailAndPassword(auth, email, password);
};

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

export const logOut = async (): Promise<void> => {
  return signOut(auth);
};

// ---------------------------------------------------------------------------
// Forgot Password
// Resolves username → real email, then sends Firebase reset email.
// ---------------------------------------------------------------------------

export const sendPasswordReset = async (username: string): Promise<void> => {
  const usernameKey = username.toLowerCase().trim();

  const email = await resolveUsernameToEmail(usernameKey);

  if (!email) {
    throw new Error('USER_NOT_FOUND');
  }

  return sendPasswordResetEmail(auth, email);
};

// ---------------------------------------------------------------------------
// Change Password (user must be currently signed in)
// ---------------------------------------------------------------------------

export const changePassword = async (newPassword: string): Promise<void> => {
  if (!auth.currentUser) throw new Error('No user is currently logged in.');
  return updatePassword(auth.currentUser, newPassword);
};

// ---------------------------------------------------------------------------
// Auth state listener — used by useAuth hook in App.tsx
// ---------------------------------------------------------------------------

export const subscribeToAuthState = (
  callback: (user: User | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

// ---------------------------------------------------------------------------
// Get current user (synchronous snapshot)
// ---------------------------------------------------------------------------

export const getCurrentUser = (): User | null => auth.currentUser;

// ---------------------------------------------------------------------------
// Human-readable error messages
// Call this in catch blocks to get a message safe to show in the UI.
// ---------------------------------------------------------------------------

export const getAuthErrorMessage = (error: any): string => {
  const code: string = error?.code ?? error?.message ?? '';

  if (code.includes('USERNAME_TAKEN'))            return 'That username is already taken. Please choose another.';
  if (code.includes('EMAIL_TAKEN'))               return 'An account with that email already exists. Try logging in.';
  if (code.includes('USER_NOT_FOUND'))            return 'No account found with that username.';
  if (code.includes('auth/email-already-in-use')) return 'An account with that email already exists. Try logging in.';
  if (code.includes('auth/invalid-email'))        return 'Please enter a valid email address.';
  if (code.includes('auth/weak-password'))        return 'Password must be at least 6 characters.';
  if (code.includes('auth/wrong-password'))       return 'Incorrect password. Please try again.';
  if (code.includes('auth/invalid-credential'))   return 'Incorrect username or password.';
  if (code.includes('auth/too-many-requests'))    return 'Too many attempts. Please wait a few minutes and try again.';
  if (code.includes('auth/network-request-failed')) return 'No internet connection. Please check your network.';
  if (code.includes('auth/user-disabled'))        return 'This account has been disabled. Please contact support.';

  return 'Something went wrong. Please try again.';
};
