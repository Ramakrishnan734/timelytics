# Timelytics — Current Project Context

> **Purpose:** This is the current master context for Timelytics development. Read this file together with `AI_DEVELOPMENT_LOG.md` when starting a new AI-assisted development session.
>
> **Last updated:** Session 18 — final project context checkpoint

---

## 1. Project Overview

**Timelytics** is a mobile Expense Tracker + Stopwatch/Productivity application built for the **3rd-year Mobile App Development – AI Build Round**.

The application is a **mobile app**, not a web application.

### Required 3rd-Year Features

The app must provide all 2nd-year Expense Tracker requirements plus:

- Stopwatch
- Start
- Pause
- Resume
- Lap
- Previous stopwatch session/history

The current implementation also includes named stopwatch sessions and saved-session deletion.

---

## 2. Technology Stack

- React Native
- Expo
- TypeScript / TSX
- Firebase Authentication
- Cloud Firestore
- React Navigation
- Android testing on a physical Samsung A55
- Git/GitHub

No new packages were added for the latest features.

---

## 3. AI / Design Tools Used

### Google Stitch
Used during the initial design phase to provide the UI/UX design source and visual reference for Timelytics.

### Claude
Used as the primary AI development assistant for:
- Architecture planning
- Source-code inspection
- Feature implementation
- Firebase/Firestore implementation
- Debugging
- UI polish
- Testing/checkpoint reports
- Documentation

### ChatGPT
Used for:
- Development planning
- Debugging/reasoning assistance
- Git workflow guidance
- Testing/checkpoint guidance
- Reviewing AI-generated implementation plans
- Preparing prompts for Claude

The developer reviewed, manually adjusted, and tested AI-generated work before accepting changes.

See `AI_DEVELOPMENT_LOG.md` for the detailed AI development history and prompts.

---

## 4. Current Application Status

### Authentication
- Sign Up → complete
- Login → complete
- Username-based login → complete
- Forgot Password → complete
- Logout → complete
- Firebase Auth persistence → complete
- User profiles stored in Firestore → complete

### Expense Tracker
- Add expenses → complete
- Amount/category/date/description → complete
- Expense history → complete
- Edit expenses → complete
- Delete expenses → complete
- Filter/sort → complete
- Today's expense calculation → complete
- Monthly expense calculation → complete
- Highest spending category → complete
- Category breakdown visualization → complete
- Monthly budget → complete
- Amount spent/remaining → complete
- Firestore persistence → complete

### Stopwatch / Productivity
- Start → complete
- Pause → complete
- Resume → complete
- Lap → complete
- End workflow → complete
- Named sessions → complete
- Session history → complete
- Saved session deletion → complete
- Firestore persistence → complete

### Profile
- Username → complete
- Email → complete
- Display name → complete
- Currency → complete
- Member Since → complete
- Sign Out → complete
- Loading state → polished
- Error state → polished

---

## 5. UI / Visual Polish Status

Completed:

- Dashboard UI polish
- Expenses UI polish
- Budget UI polish
- Stopwatch UI polish
- Profile UI polish
- Bottom navigation icons
- Welcome screen cleanup
- Consistent semantic colors
- Consistent typography/spacing/radius tokens
- Improved loading/error states

### Welcome Screen

The following hardcoded demo statistics were removed:

- `₹12,450 saved`
- `4h 20m focused`

They were static strings and were not connected to real user data. They were removed rather than replaced with fake data.

### Splash Screen

No major change required after the polish review.

---

## 6. Stopwatch Session Deletion — Latest Feature

### Files Changed

- `src/services/sessionService.ts`
- `src/screens/stopwatch/StopwatchScreen.tsx`

### Implementation

`deleteSession(uid, sessionId)` uses:

`deleteDoc(doc(db, 'users', uid, 'sessions', sessionId))`

The UI:

- Provides a delete action for saved sessions.
- Shows a confirmation dialog.
- Shows deletion loading state for the selected session only.
- Removes the deleted session from local state after successful Firestore deletion.
- Keeps the session visible if deletion fails.
- Shows an error message on failure.

### Preserved

Do not accidentally change:

- Start
- Pause
- Resume
- Lap
- End
- Named-session behavior
- Session saving
- Firestore collection structure
- Authentication
- Navigation

The visible stopwatch control was manually renamed from **Reset** to **End** intentionally. Do not rename it back unless explicitly requested.

---

## 7. Important Source Files

### Navigation
- `src/navigation/AuthStack.tsx`
- `src/navigation/MainTabs.tsx`

### Services
- `src/services/firebase.ts`
- `src/services/authService.ts`
- `src/services/userService.ts`
- `src/services/expenseService.ts`
- `src/services/budgetService.ts`
- `src/services/sessionService.ts`
- `src/services/storageService.ts`

### Screens
- `src/screens/auth/SplashScreen.tsx`
- `src/screens/auth/WelcomeScreen.tsx`
- `src/screens/auth/LoginScreen.tsx`
- `src/screens/auth/SignUpScreen.tsx`
- `src/screens/auth/ForgotPasswordScreen.tsx`
- `src/screens/home/DashboardScreen.tsx`
- `src/screens/expenses/ExpensesHistoryScreen.tsx`
- `src/screens/expenses/AddExpenseScreen.tsx`
- `src/screens/budget/BudgetManagementScreen.tsx`
- `src/screens/stopwatch/StopwatchScreen.tsx`
- `src/screens/profile/ProfileScreen.tsx`

### Constants
- `src/constants/colors.ts`
- `src/constants/typography.ts`
- `src/constants/spacing.ts`
- `src/constants/categories.ts`

---

## 8. Firebase / Data Architecture

### Authentication

Firebase Authentication is the source of truth for authenticated users.

Passwords are not stored in Firestore.

### Firestore

Important collections include:

- `users/{uid}`
- `users/{uid}/expenses`
- `users/{uid}/sessions`
- `users/{uid}/budget` / existing budget structure

Username lookup uses the established username mapping.

### Important Rule

Keep Firebase/Firestore calls inside service files where possible. Do not move data operations into screens without a specific reason.

---

## 9. Testing / Verification

### TypeScript

Latest stopwatch session-deletion implementation:

`npx tsc --noEmit` → **0 errors**

### Android

Physical Android testing was performed successfully.

Verified latest stopwatch deletion flow:

1. Saved session appears in history.
2. Delete opens confirmation.
3. Cancel keeps session.
4. Confirm removes session.
5. Deleted session remains deleted after reopening the app.
6. Other sessions remain unaffected.
7. Active stopwatch behavior remains functional.

### Network Issue

A Wi-Fi-specific Firebase/Firestore connectivity problem was observed:

- The app could reach the Dashboard using mobile data.
- The same app could fail to load Firebase/Firestore using a particular Wi-Fi network.
- Mac connectivity tests showed Google/Firebase domains were reachable.
- `firestore.googleapis.com` returning HTTP 404 at its root URL was determined not to be evidence that Firestore itself was unavailable; the root endpoint is not a normal Firestore data request.

This was treated as a network-specific issue rather than an application-code failure and was intentionally left alone after mobile-data testing confirmed the application worked.

---

## 10. Git / Repository Status

The project is maintained on GitHub using:

`git add → git commit → git push`

Latest source-code checkpoint was committed and pushed.

Final verification showed:

`nothing to commit, working tree clean`

The final submission ZIP was created after excluding generated/unnecessary files.

---

## 11. Final Submission ZIP

Final ZIP:

`Timelytics_Final_Submission.zip`

The clean ZIP was approximately **1.2 MB**.

Excluded:

- `node_modules/`
- `.git/`
- `.expo/`
- `.env`
- Android `.cxx/`
- Android generated build directories
- other generated/cache artifacts

The ZIP contains the source project and required documentation.

---

## 12. Documentation

Required competition documentation:

- `AI_DEVELOPMENT_LOG.md`
- This current context file

The AI Development Log records significant AI interactions including:

1. AI tool used
2. Prompt/goal
3. What AI generated/suggested
4. What was actually used
5. Manual changes
6. Reasons for changes
7. Testing/verification results

Google Stitch must be recognized as part of the initial design process.

---

## 13. Development Rules for Future AI Sessions

Before changing code:

1. Read this context file.
2. Read the relevant existing source files.
3. Read `AI_DEVELOPMENT_LOG.md` when the task affects historical decisions or AI documentation.
4. Inspect existing implementation before proposing changes.
5. Do not invent missing architecture or data structures.
6. Do not modify unrelated files.
7. Do not install packages unless explicitly necessary and approved.
8. Preserve existing Firebase/Auth/Firestore behavior.
9. Preserve mandatory competition functionality.
10. Test TypeScript and Android behavior where applicable.
11. Update the AI Development Log after significant AI-assisted work.
12. Do not create a `TIMELYTICS_HANDOFF.md` unless explicitly requested; this current context file is the master context.

---
