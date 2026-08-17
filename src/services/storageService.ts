/**
 * storageService.ts — DEFERRED (not part of current implementation)
 *
 * Firebase Storage requires Google Cloud billing to be enabled before use.
 * This file is intentionally left as a stub until that is set up.
 *
 * When Storage is enabled, this file will contain:
 *   - uploadReceipt(uri, expenseId)  → returns download URL
 *   - deleteReceipt(expenseId)       → removes file from bucket
 *   - uploadProfilePicture(uri, uid) → returns download URL
 *
 * To enable later:
 *   1. Enable billing on your Google Cloud project
 *   2. Uncomment `import { getStorage } from 'firebase/storage'` in firebase.ts
 *   3. Re-export `storage` from firebase.ts
 *   4. Implement the functions below
 *
 * Impact of deferral:
 *   - Receipt upload on AddExpenseScreen will be hidden/disabled until enabled
 *   - Profile picture update will be hidden/disabled until enabled
 *   - All other features (Auth, Firestore expenses, budgets, sessions) work fully
 */

export {};

