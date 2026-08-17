# Timelytics — AI Development Log

> This file records every significant Claude prompt, decision, and architectural choice made during development.
> Updated automatically as the project progresses.

---

## Session 1 — 2026-08-16

### Prompt 1: Design Analysis
**Type:** Analysis  
**Summary:** Uploaded Stitch ZIP (`stitch_timelytics_mobile_application.zip`). Claude was asked to inspect and analyse without implementing.

**Output:** Full analysis covering:
- 16 distinct screens identified (_2 variants as source of truth)
- Navigation flows (AuthStack + 5-tab MainTabs)
- Reusable component list (16 components)
- Full color token table from DESIGN.md
- Typography scale (Sora + Inter, 8 styles)
- Material Symbols icon set identified
- 5 gaps / missing screens found (Forgot Password, Edit Expense mode, Set Budget modal, Light Theme, Session Naming)
- Firestore data model proposed (users, expenses, budgets, sessions sub-collections)
- 8-phase implementation plan proposed

**Key Decisions:**
- Use `_2` Stitch screens as sole UI source of truth
- Username → `username@timelytics.app` internal email trick for Firebase Auth
- Firestore: compute spent amounts from expenses (no duplication in budget doc)
- Expo managed workflow (not bare)

---

### Prompt 2: Step 1 — Project Setup + Firebase Configuration
**Type:** Implementation  
**Summary:** Implement project scaffold, Firebase config, folder structure, navigation skeleton, and Firebase connection test. No feature logic.

**Packages installed:**
- `firebase@12.17.1` — Auth, Firestore, Storage SDK
- `@react-navigation/native` — NavigationContainer
- `@react-navigation/stack` — Stack navigator
- `@react-navigation/native-stack` — Native stack (smoother animations)
- `@react-navigation/bottom-tabs` — Bottom tab bar
- `react-native-screens` — Native screen primitives (required by React Navigation)
- `react-native-safe-area-context` — SafeAreaProvider + safe area insets
- `expo-constants` — (reserved for env var access if needed beyond EXPO_PUBLIC_)

**Architecture Decisions:**
- `EXPO_PUBLIC_` prefix for env vars — inlined at build time by Expo, no extra plugin needed
- Firebase initialised once in `src/services/firebase.ts`, guards against hot-reload re-init with `getApps()` check
- All Firebase calls go through `src/services/` layer — screens never import firebase directly
- `useAuth` hook owns auth state subscription — single source of truth for logged-in/logged-out
- `FIREBASE_TEST_MODE = true` in App.tsx bypasses navigation for Step 1 verification
- Placeholder screens render a `<Text>` with their name so navigation wiring can be tested before UI is built

**Files Created (Step 1):**
- `.env` — Firebase config env vars template
- `.gitignore` — includes `.env`
- `app.json` — updated to dark theme, correct app name
- `App.tsx` — root component with auth state switch
- `src/services/firebase.ts` — Firebase init (Auth, Firestore, Storage)
- `src/services/authService.ts` — All Auth operations
- `src/services/expenseService.ts` — Stub
- `src/services/budgetService.ts` — Stub
- `src/services/sessionService.ts` — Stub
- `src/services/storageService.ts` — Stub
- `src/hooks/useAuth.ts` — Firebase auth state listener hook
- `src/navigation/AuthStack.tsx` — Splash/Welcome/Login/SignUp/ForgotPassword
- `src/navigation/MainTabs.tsx` — 5-tab bottom navigator
- `src/constants/colors.ts` — All Timelytics color tokens
- `src/constants/typography.ts` — Sora + Inter type scale
- `src/constants/spacing.ts` — 8px grid + border radius values
- `src/constants/categories.ts` — 7 expense categories with icons
- `src/screens/auth/FirebaseTestScreen.tsx` — Step 1 verification (remove after)
- 15× placeholder screen files across all feature folders

**Verification:** Run `npm start`, open app, tap "Run Tests" — all 4 Firebase tests should show ✅

---

---

### Decision: Firebase Storage Deferred (2026-08-16)
**Type:** Architecture Decision  
**Triggered by:** Firebase Storage requires Google Cloud billing to be enabled before the Storage SDK can write or read files. This involves a ₹1,000 one-time prepayment that is not required at this stage of development.

**Decision:** Remove Firebase Storage from Step 1 setup. Do not call `getStorage()` in `firebase.ts`. Keep `storageService.ts` as a clearly commented stub.

**Impact on the app:**
- ✅ Firebase Auth — fully working, unaffected
- ✅ Cloud Firestore — fully working, unaffected
- ✅ All core features work without Storage: expenses (text only), budgets, stopwatch sessions, productivity stats, profile settings
- ⏭️ Receipt upload on AddExpense screen — will be hidden/disabled until Storage is enabled
- ⏭️ Profile picture upload — will be hidden/disabled until Storage is enabled

**Files changed:**
- `src/services/firebase.ts` — removed `getStorage` import and `storage` export
- `src/services/storageService.ts` — updated stub comment with re-enablement instructions
- `src/screens/auth/FirebaseTestScreen.tsx` — Test 4 changed from active to skipped (⏭️); `allPass` threshold updated to 3/3 instead of 4/4

**How to enable Storage later (when billing is set up):**
1. Enable Google Cloud billing on your Firebase project
2. In Firebase Console → Storage → Get Started
3. In `src/services/firebase.ts`: add `import { getStorage, FirebaseStorage } from 'firebase/storage'` and `export const storage: FirebaseStorage = getStorage(app)`
4. Implement functions in `src/services/storageService.ts`
5. Un-hide the receipt upload UI in `AddExpenseScreen` and profile picture UI in `ProfileScreen`

**Principle:** Storage is an enhancement, not a core dependency. The app delivers full value (track expenses, budgets, time, productivity) without it.

---

_Next entry will be added at the start of Step 2._

---

## Session 2 — 2026-08-16

### Prompt 1: Session Handoff + Context System Setup
**Type:** Infrastructure / Meta  
**Summary:** New Claude session started. Uploaded `timelytics_step1.zip` and `TIMELYTICS_HANDOFF.md`. Claude read the handoff document, the existing AI_DEVELOPMENT_LOG.md, and inspected the full ZIP structure and all key source files before doing anything else.

**Actions taken this prompt:**
- Read `TIMELYTICS_HANDOFF.md` in full
- Read `AI_DEVELOPMENT_LOG.md` (Session 1 entries)
- Inspected all source files: App.tsx, authService.ts, AuthStack.tsx, MainTabs.tsx, colors.ts, typography.ts, all auth screen placeholders, all service stubs
- Confirmed current checkpoint: Step 1 complete, `FIREBASE_TEST_MODE = true`, all auth screens are placeholders

**Files created:**
- `AI_DEVELOPMENT_LOG.md` — updated with this session entry (appended)
- `context.md` — project state snapshot for token-limit continuity

**Token-limit continuity system:**
- `context.md` will be regenerated automatically at the end of every significant session, capturing: current step, all files changed, decisions made, known state, and next task. This ensures the next Claude session can resume from the exact checkpoint even if this session's context is lost.

**Confirmed current state:**
- Step 1: ✅ Complete (Firebase init, Auth service, Firestore, Navigation skeleton)
- `FIREBASE_TEST_MODE = true` in App.tsx (must be set to false after Step 1 Firebase verification)
- All auth screens (Splash, Welcome, Login, SignUp, ForgotPassword) are placeholders
- All feature screens are placeholders
- All services except authService are stubs
- Firebase Storage is intentionally deferred (₹1,000 billing requirement)

**Next task:** Step 2 — Real Authentication  
(Sign Up, Login, Logout, auth persistence, username→email mapping, error messages, Forgot Password, Stitch UI for all auth screens)

**Known limitations:**
- Cannot run `npm install` or `npx expo start` in this environment (no network/Node); all code changes are file edits only
- Firebase `.env` placeholders must be replaced by the developer with real Firebase config before testing

---

## Session 2 — 2026-08-16 (continued)

### Prompt 2: Step 2 — Real Authentication
**Type:** Implementation  
**Decision confirmed by developer:** Option B — Collect real email at Sign Up; use for password recovery.

**Architecture implemented:**

#### Authentication flow
- **Sign Up:** username + real email + password + confirm → validate uniqueness → Firebase Auth (real email) → Firestore profile write (atomic transaction)
- **Login:** username → Firestore lookup → resolve to real email → Firebase Auth signIn
- **Forgot Password:** username → Firestore lookup → resolve to real email → Firebase sendPasswordResetEmail
- **Logout:** Firebase signOut (existing, unchanged)
- **Auth persistence:** Firebase handles this automatically; useAuth hook in App.tsx observes state changes

#### Firestore schema (new)
```
users/{uid}
  uid:         string   — Firebase Auth UID
  username:    string   — lowercase, unique
  email:       string   — real email address
  createdAt:   Timestamp
  updatedAt:   Timestamp
  currency:    string   — default 'INR'
  displayName: string   — defaults to username

usernames/{username}
  uid: string           — maps username → uid (O(1) lookup, uniqueness enforcement)
```

Passwords are NEVER stored in Firestore. Firebase Auth owns all credentials.

**Files created:**
- `src/services/userService.ts` — Firestore user profile CRUD + username/email uniqueness checks + username→email resolution
- `src/components/common/AuthInput.tsx` — shared input component (label + error + password eye toggle)
- `src/screens/auth/SplashScreen.tsx` — animated brand screen, auto-navigates to Welcome after 2.2s
- `src/screens/auth/WelcomeScreen.tsx` — app intro with Get Started + Log In buttons
- `src/screens/auth/LoginScreen.tsx` — username + password, full error handling
- `src/screens/auth/SignUpScreen.tsx` — username + email + password + confirm, full validation
- `src/screens/auth/ForgotPasswordScreen.tsx` — username → email lookup → Firebase reset email, success state

**Files modified:**
- `src/services/authService.ts` — rewritten: signUp now uses real email + Firestore profile; logIn resolves username→email; sendPasswordReset added; getAuthErrorMessage() added for UI-safe messages
- `App.tsx` — FIREBASE_TEST_MODE flipped to false

**Files NOT modified (confirmed):**
- All feature screens (Dashboard, Expenses, Budget, Stopwatch, Productivity, Profile) — untouched
- All service stubs (expenseService, budgetService, sessionService, storageService) — untouched
- Navigation files (AuthStack, MainTabs) — untouched
- Constants (colors, typography, spacing, categories) — untouched
- useAuth hook — untouched
- firebase.ts — untouched

**Packages — no new installs required for Step 2**
- All auth screens use only: react-native core, react-native-safe-area-context (already installed), firebase (already installed)
- Icons: emoji used as fallback (no @expo/vector-icons needed yet)
- Fonts: system fonts used (Google Fonts deferred to when screens need final polish)

**Validation rules implemented:**
- Username: 3–20 chars, letters/digits/underscore/hyphen only (regex enforced)
- Email: basic format regex client-side; Firebase validates definitively server-side
- Password: minimum 6 characters (matching Firebase minimum)
- Confirm: must exactly match password

**Error messages mapped:**
| Code/condition | User-facing message |
|---|---|
| USERNAME_TAKEN | "That username is already taken. Please choose another." |
| EMAIL_TAKEN | "An account with that email already exists. Try logging in." |
| USER_NOT_FOUND | "No account found with that username." |
| auth/email-already-in-use | "An account with that email already exists. Try logging in." |
| auth/invalid-email | "Please enter a valid email address." |
| auth/weak-password | "Password must be at least 6 characters." |
| auth/wrong-password | "Incorrect username or password." |
| auth/invalid-credential | "Incorrect username or password." |
| auth/too-many-requests | "Too many attempts. Please wait a few minutes and try again." |
| auth/network-request-failed | "No internet connection. Please check your network." |
| auth/user-disabled | "This account has been disabled. Please contact support." |
| (fallback) | "Something went wrong. Please try again." |

**Security notes:**
- Username→email mapping uses a separate `usernames` top-level collection for O(1) lookup and atomic uniqueness enforcement via Firestore transaction
- No passwords stored anywhere in Firestore
- Orphan prevention: if Firestore profile write fails after Auth user creation, the Auth user is deleted before throwing
- Real email is never shown to the user in the Forgot Password success screen (privacy)

**Tests to perform (manual — requires real Firebase .env):**
1. Sign Up with new username + email → verify Firestore `users` + `usernames` documents created
2. Sign Up with duplicate username → expect "That username is already taken"
3. Sign Up with duplicate email → expect "An account with that email already exists"
4. Sign Up with invalid email format → expect client-side validation error
5. Sign Up with password < 6 chars → expect "Password must be at least 6 characters"
6. Sign Up with mismatched passwords → expect "Passwords do not match"
7. Login with correct username + password → navigates to MainTabs
8. Login with wrong password → expect "Incorrect username or password"
9. Login with nonexistent username → expect "No account found with that username"
10. Forgot Password with valid username → success screen shown, email received
11. Forgot Password with invalid username → expect "No account found with that username"
12. Close and reopen app while logged in → stays on MainTabs (auth persistence)
13. Logout (from Profile placeholder) → returns to AuthStack

**Known limitations:**
- `@expo/vector-icons` and Google Fonts not yet installed; screens use emoji + system fonts as functional placeholders
- Profile logout button not yet implemented (ProfileScreen is still a placeholder); to test logout, use Firebase console or implement temporarily
- Firestore security rules must be configured to allow reads/writes for authenticated users before production

**Next step:** Step 3 — Home/Dashboard with real Firestore data

---

## Session 3 — 2026-08-16

### Prompt 1: Firebase Android Connectivity Fix
**Type:** Bug Fix / Infrastructure  
**Trigger:** Claude 3 had identified two required fixes for Android (Samsung A55) Firestore connectivity issues before its context limit was reached. This session verified the state of the project and applied the changes.

#### Verification Step
Inspected the uploaded bundle (`TIMELYTICS_LATEST_PROJECT_BUNDLE__3_.zip`) and confirmed **both changes were NOT yet applied** in the uploaded code — the previous session ended before persisting them.

#### Change 1 — `src/services/firebase.ts`

**Problem:** `getFirestore(app)` uses the default Firestore transport, which on React Native / Android can hang or time out due to WebSocket/XHR incompatibilities.

**Fix:** Replaced with `initializeFirestore(app, { experimentalForceLongPolling: true })`.

```diff
- import { getFirestore, Firestore } from 'firebase/firestore';
+ import { initializeFirestore, Firestore } from 'firebase/firestore';

- export const db: Firestore = getFirestore(app);
+ export const db: Firestore = initializeFirestore(app, {
+   experimentalForceLongPolling: true,
+ });
```

**Why:** `experimentalForceLongPolling` forces Firestore to use HTTP long-polling instead of WebSockets/gRPC streaming. This is the recommended fix for React Native on Android where native networking layers may not support the streaming transport reliably.

#### Change 2 — `src/services/authService.ts` — `signUp` function

**Problem:** Pre-flight `isUsernameTaken` / `isEmailTaken` Firestore checks ran BEFORE Firebase Auth `createUserWithEmailAndPassword`. On Android, if Firestore long-polling was not yet configured (or was timing out), these pre-flight checks could block or fail silently — preventing account creation entirely even when the Auth call would have succeeded.

**Fix:** Moved `createUserWithEmailAndPassword` to Step 1. Firestore pre-flight checks (isUsernameTaken, isEmailTaken) now run AFTER Auth succeeds, inside the try/catch block that handles rollback.

**Rollback safety preserved:**
- If username is taken after Auth: Auth user is deleted → throws `USERNAME_TAKEN`
- If email is taken after Auth: Auth user is deleted → throws `EMAIL_TAKEN`  
- If `createUserProfile` transaction fails: Auth user is deleted → original error rethrown
- `createUserProfile` transaction STILL enforces username uniqueness atomically — this is the true uniqueness guarantee

**New sign-up flow:**
```
1. createUserWithEmailAndPassword(auth, email, password)   ← Auth first
2. isUsernameTaken(usernameKey)                            ← then Firestore checks
3. isEmailTaken(emailKey)
4. createUserProfile(uid, username, email)                 ← atomic transaction (also enforces uniqueness)
```

#### Checks Performed
- **TypeScript static analysis (manual):** All imports and types verified correct for Firebase JS SDK 12.17.1. `initializeFirestore(app, { experimentalForceLongPolling: true })` is a valid call that returns `Firestore`. All authService imports unchanged and structurally correct.
- **`npx tsc --noEmit`:** Cannot run in this sandboxed environment (npm registry blocked by egress proxy). Must be run by developer locally after installing node_modules (`npm install`).
- **`npx expo-doctor`:** Same — requires network/node_modules. Run locally.

#### Files Changed
1. `src/services/firebase.ts` — `initializeFirestore` with `experimentalForceLongPolling: true`
2. `src/services/authService.ts` — Auth before pre-flight; rollback logic preserved

#### Files NOT Changed
- All screens, navigation, hooks, constants, other services — untouched
- Expo version, package.json, Firestore rules — untouched
- Firebase Storage — still deferred (unchanged)
- `.env` — not included in output ZIP (developer's real credentials preserved locally)

#### Developer Checklist (before physical device testing)
1. `cd timelytics && npm install`
2. `npx tsc --noEmit` — should pass with zero errors
3. `npx expo-doctor` — should show all checks green
4. Fill real Firebase credentials in `.env`
5. `npx expo start --android` → test on Samsung A55
6. Test: sign up new account → verify Firestore `users` + `usernames` docs created
7. Test: duplicate username → expect "That username is already taken"
8. Test: duplicate email → expect "An account with that email already exists"
9. Test: login → navigates to MainTabs

**Physical Samsung A55 testing: NOT YET PERFORMED — developer must test on device.**

