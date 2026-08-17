/**
 * budgetService.ts
 *
 * Firestore CRUD for monthly budgets.
 * Budget documents live under: users/{uid}/budgets/{month}
 *   where {month} is the ISO month string: 'YYYY-MM' (e.g. '2026-08')
 *
 * Architecture rules:
 *   - Screens NEVER import from firebase directly — they call these functions.
 *   - One document per (user, month) — set/overwrite to update.
 *   - Reading returns null when no budget has been set for that month.
 */

import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MonthlyBudget {
  uid:       string;   // owner's Firebase Auth UID
  month:     string;   // 'YYYY-MM'
  amount:    number;   // budget ceiling in the user's currency (e.g. 10000)
  updatedAt: number;   // epoch ms — for auditing
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the Firestore document reference for a user's monthly budget. */
function budgetDocRef(uid: string, month: string) {
  return doc(db, 'users', uid, 'budgets', month);
}

/** Returns the current month as 'YYYY-MM' in local time. */
export function currentMonthString(): string {
  const d   = new Date();
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ---------------------------------------------------------------------------
// Get budget for a given month — returns null if not set
// ---------------------------------------------------------------------------

export async function getMonthlyBudget(
  uid:   string,
  month: string,
): Promise<MonthlyBudget | null> {
  const ref  = budgetDocRef(uid, month);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    uid:       data['uid']       as string,
    month:     data['month']     as string,
    amount:    data['amount']    as number,
    updatedAt: data['updatedAt'] as number,
  };
}

// ---------------------------------------------------------------------------
// Set (create or overwrite) budget for a given month
// ---------------------------------------------------------------------------

export async function setMonthlyBudget(
  uid:    string,
  month:  string,
  amount: number,
): Promise<MonthlyBudget> {
  const now    = Date.now();
  const budget: MonthlyBudget = { uid, month, amount, updatedAt: now };
  await setDoc(budgetDocRef(uid, month), budget);
  return budget;
}
