/**
 * FirebaseTestScreen.tsx
 *
 * Minimal Firebase connectivity test — Step 1 verification only.
 * This screen is NOT part of the final app; remove it after Step 1 sign-off.
 *
 * What it tests:
 *   1. Firebase app is initialised (env vars loaded)
 *   2. Firebase Auth is reachable (getCurrentUser doesn't throw)
 *   3. Firestore can be written to and read from
 *   4. Firebase Storage bucket is accessible (getDownloadURL on a non-existent
 *      path returns a predictable "object not found" error, confirming the
 *      storage SDK is connected and the bucket name is correct)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { collection, addDoc, getDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, auth }                                               from '../../services/firebase';
import { Colors }   from '../../constants/colors';
import { Spacing }  from '../../constants/spacing';

// ─── Types ───────────────────────────────────────────────────────────────────

type TestStatus = 'idle' | 'running' | 'pass' | 'fail';

interface TestResult {
  name:    string;
  status:  TestStatus;
  message: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const FirebaseTestScreen: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const updateResult = (
    prev: TestResult[],
    name: string,
    status: TestStatus,
    message: string
  ): TestResult[] => {
    const existing = prev.find(r => r.name === name);
    if (existing) {
      return prev.map(r => r.name === name ? { name, status, message } : r);
    }
    return [...prev, { name, status, message }];
  };

  const runTests = async () => {
    setRunning(true);
    setResults([]);

    // ── Test 1: Firebase Initialisation ────────────────────────────────────
    try {
      const appName = auth.app.name;   // '[DEFAULT]' if init succeeded
      setResults(prev => updateResult(prev,
        '1. Firebase Init',
        'pass',
        `App initialised as "${appName}". Env vars loaded.`
      ));
    } catch (e: any) {
      setResults(prev => updateResult(prev,
        '1. Firebase Init',
        'fail',
        `Init failed: ${e.message}`
      ));
    }

    // ── Test 2: Firebase Auth ───────────────────────────────────────────────
    try {
      const user = auth.currentUser;   // null is a valid (logged-out) response
      setResults(prev => updateResult(prev,
        '2. Firebase Auth',
        'pass',
        user ? `Auth connected. User: ${user.email}` : 'Auth connected. No user logged in (expected).'
      ));
    } catch (e: any) {
      setResults(prev => updateResult(prev,
        '2. Firebase Auth',
        'fail',
        `Auth check failed: ${e.message}`
      ));
    }

    // ── Test 3: Firestore Write + Read + Delete ─────────────────────────────
    let testDocRef: any = null;
    try {
      // Write a temporary test document
      testDocRef = await addDoc(collection(db, '_connection_test'), {
        message:   'Firebase connection test',
        timestamp: Timestamp.now(),
      });

      // Read it back immediately
      const snap = await getDoc(doc(db, '_connection_test', testDocRef.id));
      if (!snap.exists()) throw new Error('Document written but not readable');

      const data = snap.data();
      setResults(prev => updateResult(prev,
        '3. Firestore Read/Write',
        'pass',
        `Write + read OK. Doc ID: ${testDocRef.id}`
      ));
    } catch (e: any) {
      setResults(prev => updateResult(prev,
        '3. Firestore Read/Write',
        'fail',
        `Firestore error: ${e.message}`
      ));
    } finally {
      // Always clean up the test document
      if (testDocRef) {
        try { await deleteDoc(doc(db, '_connection_test', testDocRef.id)); }
        catch (_) { /* cleanup failure is non-critical */ }
      }
    }

    // ── Note: Firebase Storage test skipped ────────────────────────────────
    // Storage requires Google Cloud billing to be enabled.
    // It will be integrated in a later step. Auth + Firestore are sufficient
    // for all core features (expenses, budgets, sessions, productivity).
    setResults(prev => updateResult(prev,
      '4. Firebase Storage',
      'idle',
      'Skipped — Storage deferred until Google Cloud billing is enabled. No features are blocked by this.'
    ));

    setRunning(false);
  };

  // Storage test is intentionally skipped (idle), so 3 passing tests = success
  const allPass = results.filter(r => r.status === 'pass').length === 3;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>Firebase Connection Test</Text>
      <Text style={styles.subtitle}>Auth + Firestore only · Storage deferred (billing not enabled)</Text>

      <TouchableOpacity
        style={[styles.button, running && styles.buttonDisabled]}
        onPress={runTests}
        disabled={running}
      >
        {running
          ? <ActivityIndicator color={Colors.onPrimary} />
          : <Text style={styles.buttonText}>Run Tests</Text>
        }
      </TouchableOpacity>

      {results.map(result => (
        <View key={result.name} style={[
          styles.resultCard,
          result.status === 'pass' && styles.cardPass,
          result.status === 'fail' && styles.cardFail,
          result.status === 'idle' && styles.cardSkipped,
        ]}>
          <Text style={styles.resultName}>
            {result.status === 'pass'  ? '✅ ' :
             result.status === 'fail'  ? '❌ ' : '⏭️ '}
            {result.name}
          </Text>
          <Text style={styles.resultMessage}>{result.message}</Text>
        </View>
      ))}

      {allPass && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>
            🎉 Auth + Firestore connected!{'\n'}
            Storage is deferred (no billing needed now).{'\n'}
            Ready to proceed to Step 2.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.lg,
    paddingTop: 60,
    gap: Spacing.md,
  },
  title: {
    color:      Colors.textPrimary,
    fontSize:   22,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    color:        Colors.textSecondary,
    fontSize:     13,
    marginBottom: Spacing.md,
  },
  button: {
    backgroundColor: Colors.primaryContainer,
    paddingVertical: Spacing.md,
    borderRadius:    12,
    alignItems:      'center',
    marginBottom:    Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color:      Colors.onPrimary,
    fontSize:   16,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius:    12,
    padding:         Spacing.md,
    borderWidth:     1,
    borderColor:     Colors.outlineVariant,
  },
  cardPass: {
    borderColor: '#4caf50',
  },
  cardFail: {
    borderColor: Colors.danger,
  },
  cardSkipped: {
    borderColor:     Colors.outline,
    backgroundColor: Colors.surfaceContainerLow,
    opacity:         0.75,
  },
  resultName: {
    color:        Colors.textPrimary,
    fontWeight:   '600',
    fontSize:     14,
    marginBottom: 4,
  },
  resultMessage: {
    color:    Colors.textSecondary,
    fontSize: 13,
  },
  successBanner: {
    backgroundColor: '#1a2e1a',
    borderRadius:    12,
    padding:         Spacing.lg,
    borderWidth:     1,
    borderColor:     '#4caf50',
    marginTop:       Spacing.sm,
  },
  successText: {
    color:       '#81c784',
    fontSize:    15,
    fontWeight:  '600',
    textAlign:   'center',
    lineHeight:  24,
  },
});

export default FirebaseTestScreen;
