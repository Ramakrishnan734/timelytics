/**
 * sessionService.ts
 *
 * Firestore CRUD for stopwatch sessions.
 * Sessions live under: users/{uid}/sessions/{sessionId}
 *
 * Architecture rules:
 *   - Screens NEVER import from firebase directly — they call these functions.
 *   - Sessions use Firestore auto-generated IDs (addDoc).
 *   - getSessions returns newest first (ordered by savedAt desc).
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionLap {
  lapNumber: number;
  time:      number;   // milliseconds for this lap split
}

export interface StopwatchSession {
  id:        string;   // Firestore document ID
  uid:       string;   // owner's Firebase Auth UID
  label:     string;   // activity name — e.g. "Coding", "Study", "Session"
  duration:  number;   // total elapsed time in ms
  laps:      SessionLap[];
  startedAt: number;   // epoch ms — when the stopwatch was first started
  savedAt:   number;   // epoch ms — when the session was saved to Firestore
}

export type SessionInput = Omit<StopwatchSession, 'id'>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sessionsCol(uid: string) {
  return collection(db, 'users', uid, 'sessions');
}

// ---------------------------------------------------------------------------
// Save a session — uses Firestore auto-generated ID
// ---------------------------------------------------------------------------

export async function saveSession(
  uid:  string,
  data: Omit<SessionInput, 'uid' | 'savedAt'>,
): Promise<StopwatchSession> {
  const now = Date.now();
  const payload: SessionInput = {
    ...data,
    uid,
    savedAt: now,
  };
  const ref = await addDoc(sessionsCol(uid), payload);
  return { id: ref.id, ...payload };
}

// ---------------------------------------------------------------------------
// Delete a session by Firestore document ID
// ---------------------------------------------------------------------------

export async function deleteSession(
  uid:       string,
  sessionId: string,
): Promise<void> {
  const ref = doc(db, 'users', uid, 'sessions', sessionId);
  await deleteDoc(ref);
}

// ---------------------------------------------------------------------------
// Get all sessions — ordered newest first by savedAt
// ---------------------------------------------------------------------------

export async function getSessions(uid: string): Promise<StopwatchSession[]> {
  const q    = query(sessionsCol(uid), orderBy('savedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id:        d.id,
      uid:       data['uid']       as string,
      label:     data['label']     as string,
      duration:  data['duration']  as number,
      laps:      (data['laps']     as SessionLap[]) ?? [],
      startedAt: data['startedAt'] as number,
      savedAt:   data['savedAt']   as number,
    };
  });
}
