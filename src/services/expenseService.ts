/**
 * expenseService.ts
 *
 * Firestore CRUD for expenses.
 * All expenses live under: users/{uid}/expenses/{expenseId}
 *
 * Screens never import from firebase directly — they call these functions.
 */

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { CategoryKey } from '../constants/categories';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Expense {
  id:          string;       // Firestore document ID
  uid:         string;       // owner's Firebase Auth UID
  amount:      number;       // stored as a number
  category:    CategoryKey;
  date:        string;       // ISO date string e.g. '2026-08-17'
  description: string;       // free text, may be empty
  createdAt:   number;       // epoch ms — for ordering
  updatedAt:   number;
}

export type ExpenseInput = Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expensesCol(uid: string) {
  return collection(db, 'users', uid, 'expenses');
}

// ---------------------------------------------------------------------------
// Add
// ---------------------------------------------------------------------------

export async function addExpense(input: ExpenseInput): Promise<Expense> {
  const now  = Date.now();
  const data = { ...input, createdAt: now, updatedAt: now };
  const ref  = await addDoc(expensesCol(input.uid), data);
  return { id: ref.id, ...data };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateExpense(
  uid:     string,
  id:      string,
  changes: Partial<Omit<Expense, 'id' | 'uid' | 'createdAt'>>,
): Promise<void> {
  const ref = doc(db, 'users', uid, 'expenses', id);
  await updateDoc(ref, { ...changes, updatedAt: Date.now() });
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteExpense(uid: string, id: string): Promise<void> {
  const ref = doc(db, 'users', uid, 'expenses', id);
  await deleteDoc(ref);
}

// ---------------------------------------------------------------------------
// Get all — ordered newest first by createdAt
// ---------------------------------------------------------------------------

export async function getExpenses(uid: string): Promise<Expense[]> {
  const q    = query(expensesCol(uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id:          d.id,
      uid:         data['uid']         as string,
      amount:      data['amount']      as number,
      category:    data['category']    as CategoryKey,
      date:        data['date']        as string,
      description: data['description'] as string,
      createdAt:   data['createdAt']   as number,
      updatedAt:   data['updatedAt']   as number,
    };
  });
}