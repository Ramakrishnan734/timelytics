# Timelytics — Context Snapshot
> Auto-generated at the end of each Claude session.  
> **Purpose:** If token budget runs out or the next session has no prior context, read this file + `AI_DEVELOPMENT_LOG.md` + `TIMELYTICS_HANDOFF.md` to resume from the exact checkpoint.  
> **Last updated:** 2026-08-16 — Session 3, Prompt 1 (Firebase Android fix applied)

---

## Current Checkpoint

| Field | Value |
|---|---|
| Step | **Step 2 complete — Real Authentication** (Firebase Android fix also applied) |
| FIREBASE_TEST_MODE | `false` in `App.tsx` — normal auth flow active |
| Auth screens | **All implemented** (Splash, Welcome, Login, SignUp, ForgotPassword) |
| Feature screens | All **placeholders** (Dashboard, Expenses, Budget, Analytics, Stopwatch, Productivity, Profile) |
| Services | `authService.ts` + `userService.ts` are real; all feature services are stubs |
| Firebase Storage | **Deferred** — do not enable until billing is sorted |
| Firebase Firestore init | `initializeFirestore(app, { experimentalForceLongPolling: true })` ✅ |
| authService signUp order | Firebase Auth FIRST, then Firestore pre-flight checks ✅ |

---

## ⚠️ Physical Device Testing Status

**Samsung A55 testing: NOT YET PERFORMED.**  
Developer must run `npm install`, `npx tsc --noEmit`, `npx expo-doctor`, then test on device.

---

## Immediate Next Task

**Step 3 — Home / Dashboard**

Connect `DashboardScreen.tsx` to real Firestore data. Display:
- Monthly spending total (sum of current month's expenses for the user)
- Budget progress (current spend vs budget)
- Today's productivity time (sum of today's sessions)
- Recent expenses (last 3–5 from Firestore)
- Highest spending category

Rules:
- Do NOT hard-code demo data once real Firestore integration begins
- expenseService.ts and budgetService.ts stubs must be implemented to support this
- Preserve Stitch UI layout for Dashboard exactly

---

## Authentication Architecture (implemented in Step 2, fixed in Session 3)

### Firestore schema

```
users/{uid}
  uid:         string       — Firebase Auth UID
  username:    string       — lowercase unique handle
  email:       string       — real email (for password reset only)
  createdAt:   Timestamp
  updatedAt:   Timestamp
  currency:    string       — default 'INR'
  displayName: string       — defaults to username

usernames/{username}
  uid: string               — maps username → uid (O(1) lookup)
```

### Sign Up flow (CURRENT — Auth before Firestore)
```
User enters: username + realEmail + password + confirm
  → createUserWithEmailAndPassword(auth, realEmail, password)   ← FIRST
  → isUsernameTaken(username)          [Firestore check; rollback Auth if taken]
  → isEmailTaken(email)                [Firestore check; rollback Auth if taken]
  → createUserProfile(uid, username, email)  [atomic Firestore transaction]
  → useAuth detects session → App.tsx renders MainTabs
```

### Login flow
```
User enters username
  → resolveUsernameToEmail(username)   [Firestore: usernames/{username} → uid → users/{uid}.email]
  → signInWithEmailAndPassword(auth, realEmail, password)
  → useAuth detects session → App.tsx renders MainTabs
```

### Forgot Password flow
```
User enters username
  → resolveUsernameToEmail(username)
  → sendPasswordResetEmail(auth, realEmail)
  → Success screen shown (email not revealed to user)
```

### Passwords
**Never stored in Firestore. Firebase Auth owns all credentials.**

---

## Key File States (Session 3 changes highlighted)

### `src/services/firebase.ts` ✅ CHANGED (Session 3)
```ts
// Firestore init — forces long-polling for Android compatibility
export const db: Firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
```

### `src/services/authService.ts` ✅ CHANGED (Session 3)
- `signUp`: Auth user created FIRST, Firestore checks SECOND
- Rollback (Auth user deleted) if username taken, email taken, or profile write fails
- `createUserProfile` transaction still enforces uniqueness atomically

---

## Project Structure (as of Session 3)

```
timelytics/
├── App.tsx                              ← FIREBASE_TEST_MODE = false ✅
├── index.ts
├── app.json
├── package.json
├── .env                                 ← Developer fills in real Firebase config
├── AI_DEVELOPMENT_LOG.md               ← Always update after every session
├── context.md                           ← This file — regenerate at end of session
│
├── assets/
│
└── src/
    ├── components/
    │   └── common/
    │       └── AuthInput.tsx            ← ✅ REAL: shared input for auth screens
    │
    ├── constants/
    │   ├── colors.ts                    ← All color tokens
    │   ├── typography.ts               ← Sora + Inter (system fonts until polished)
    │   ├── spacing.ts                  ← 8px grid + border radii
    │   └── categories.ts              ← 7 expense categories
    │
    ├── hooks/
    │   └── useAuth.ts                  ← Auth state hook (unchanged)
    │
    ├── navigation/
    │   ├── AuthStack.tsx               ← Splash/Welcome/Login/SignUp/ForgotPassword (unchanged)
    │   └── MainTabs.tsx                ← Home/Expenses/Stopwatch/Productivity/Profile (unchanged)
    │
    ├── services/
    │   ├── firebase.ts                 ← ✅ CHANGED: initializeFirestore + experimentalForceLongPolling
    │   ├── authService.ts              ← ✅ CHANGED: Auth first, Firestore checks second
    │   ├── userService.ts              ← ✅ REAL: createUserProfile/resolveUsernameToEmail/isUsernameTaken/isEmailTaken
    │   ├── expenseService.ts           ← STUB
    │   ├── budgetService.ts            ← STUB
    │   ├── sessionService.ts           ← STUB
    │   └── storageService.ts           ← STUB (Storage deferred)
    │
    └── screens/
        ├── auth/
        │   ├── FirebaseTestScreen.tsx  ← Keep (Step 1 tool, FIREBASE_TEST_MODE=true to re-run)
        │   ├── SplashScreen.tsx        ← ✅ REAL
        │   ├── WelcomeScreen.tsx       ← ✅ REAL
        │   ├── LoginScreen.tsx         ← ✅ REAL
        │   ├── SignUpScreen.tsx         ← ✅ REAL
        │   └── ForgotPasswordScreen.tsx← ✅ REAL
        ├── home/
        │   └── DashboardScreen.tsx     ← PLACEHOLDER → implement in Step 3
        ├── expenses/
        │   ├── AddExpenseScreen.tsx    ← PLACEHOLDER
        │   ├── ExpenseDetailsScreen.tsx← PLACEHOLDER
        │   └── ExpensesHistoryScreen.tsx← PLACEHOLDER
        ├── budget/
        │   ├── BudgetManagementScreen.tsx  ← PLACEHOLDER
        │   └── SpendingAnalyticsScreen.tsx ← PLACEHOLDER
        ├── stopwatch/
        │   └── StopwatchScreen.tsx     ← PLACEHOLDER
        ├── productivity/
        │   ├── ProductivityHubScreen.tsx   ← PLACEHOLDER
        │   └── IntegratedHistoryScreen.tsx ← PLACEHOLDER
        └── profile/
            └── ProfileScreen.tsx       ← PLACEHOLDER (logout not yet wired)
```

---

## Packages Installed (as of Session 3)

No new packages added in Session 3.

Still to install when needed:
```bash
npx expo install @expo/vector-icons          # For Material Icons (Steps 3+)
npx expo install @expo-google-fonts/sora @expo-google-fonts/inter expo-font  # Typography polish
```

---

## Key Design Tokens (quick reference)

```ts
Colors.background          = '#13131b'   // Dark app background
Colors.surfaceContainer    = '#1f1f27'   // Cards
Colors.surfaceContainerHigh= '#292932'   // Elevated cards / inputs
Colors.textPrimary         = '#e4e1ed'   // Primary text
Colors.textSecondary       = '#c7c4d7'   // Secondary/muted text
Colors.primary             = '#c0c1ff'   // Active, CTAs, links (electric indigo)
Colors.primaryContainer    = '#8083ff'   // Button fills
Colors.onPrimary           = '#1000a9'   // Text on primary buttons
Colors.warning             = '#ffb783'   // Amber
Colors.danger              = '#ffb4ab'   // Red — errors, delete
Colors.outline             = '#908fa0'   // Borders, placeholders
Colors.outlineVariant      = '#464554'   // Subtle dividers
Colors.errorContainer      = '#93000a'   // Error background

Spacing.marginMobile  = 20   // Screen horizontal margin
Spacing.md            = 16   // Standard padding
Spacing.lg            = 24   // Card padding / section gap
Radius.lg             = 16   // Inputs, buttons
Radius.xl             = 24   // Large cards
```

---

## Architecture Rules (never break)

1. Screens NEVER import from `firebase/*` directly — use `src/services/` only
2. Firebase initialized once in `firebase.ts` with `getApps()` guard
3. Auth state owned by `useAuth` hook — single source of truth
4. React Navigation (stack + tabs) — do NOT switch to Expo Router
5. `EXPO_PUBLIC_` prefix for all env vars
6. Firebase Storage = off until explicitly enabled by developer
7. Username UI → resolved to real email internally (userService handles this)
8. Passwords are NEVER stored in Firestore
9. Firestore initialized with `experimentalForceLongPolling: true` for Android compat

---

## Implementation Order (remaining steps)

| Step | Feature | Status |
|---|---|---|
| 1 | Foundation + Firebase setup | ✅ Done |
| 2 | Real Authentication | ✅ Done |
| 2b | Firebase Android long-polling fix | ✅ Done (Session 3) |
| 3 | Home/Dashboard (real Firestore data) | 🔲 Next |
| 4 | Expenses (CRUD + Firestore) | 🔲 |
| 5 | Budgets | 🔲 |
| 6 | Analytics | 🔲 |
| 7 | Stopwatch + Productivity | 🔲 |
| 8 | Profile + Settings | 🔲 |
| 9 | Integration | 🔲 |
| 10 | Testing + Polish | 🔲 |

---

## Firestore Security Rules (must configure before production)

Current: Firestore is in test mode (rules may allow all reads/writes).  
Before going to production, set rules like:

```firestore-rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /usernames/{username} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## How This File Is Maintained

At the end of every Claude session (or when token limit approaches):
1. Claude updates `AI_DEVELOPMENT_LOG.md` with the session entry
2. Claude regenerates this `context.md` to reflect the new current state
3. Both files are included in the next session's ZIP/handoff

If a session ends abruptly, the next session should:
1. Read this file
2. Read `AI_DEVELOPMENT_LOG.md`
3. Read `TIMELYTICS_HANDOFF.md`
4. Inspect changed files to verify actual state
5. Resume from the checkpoint described above
