/**
 * BudgetManagementScreen.tsx
 *
 * Session 9 — Monthly Budget milestone.
 *
 * Displays:
 *   - Current monthly budget amount
 *   - Total spent this month (from existing expenses — no new Firestore query)
 *   - Remaining budget (may be negative if over budget)
 *   - Progress bar (capped at 100% visually; numbers remain accurate)
 *   - Set / Update Budget input + button
 *
 * Architecture rules followed:
 *   - Does NOT import firebase directly — uses budgetService + expenseService
 *   - Reuses getExpenses(uid) — the single Firestore read for expense data
 *   - useFocusEffect to refresh when tab gains focus
 *   - No new packages / chart libraries
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Colors }   from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import useAuth      from '../../hooks/useAuth';
import { getExpenses, Expense } from '../../services/expenseService';
import {
  getMonthlyBudget,
  setMonthlyBudget,
  currentMonthString,
  MonthlyBudget,
} from '../../services/budgetService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a rupee amount — integer display, may show negative */
function formatINR(amount: number): string {
  const abs = Math.abs(Math.round(amount));
  const formatted = abs.toLocaleString('en-IN');
  return amount < 0 ? `-₹${formatted}` : `₹${formatted}`;
}

/** Sum all expenses in the current month from an Expense[] */
function calcMonthTotal(expenses: Expense[], month: string): number {
  return expenses
    .filter(e => e.date.startsWith(month))
    .reduce((sum, e) => sum + e.amount, 0);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface BudgetRowProps {
  label:   string;
  value:   string;
  valueColor?: string;
}

const BudgetRow: React.FC<BudgetRowProps> = ({ label, value, valueColor }) => (
  <View style={styles.budgetRow}>
    <Text style={styles.budgetRowLabel}>{label}</Text>
    <Text style={[styles.budgetRowValue, valueColor ? { color: valueColor } : null]}>
      {value}
    </Text>
  </View>
);

interface ProgressBarProps {
  ratio: number; // 0–1 (already capped externally)
}

const ProgressBar: React.FC<ProgressBarProps> = ({ ratio }) => {
  // Color: green-ish primary when under budget, warning when close, danger when at/over
  const fillColor =
    ratio >= 1   ? Colors.danger  :
    ratio >= 0.8 ? Colors.warning :
    Colors.primaryContainer;

  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { flex: ratio, backgroundColor: fillColor },
        ]}
      />
      {/* Empty space — flex fills remaining portion */}
      {ratio < 1 ? <View style={{ flex: 1 - ratio }} /> : null}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const BudgetManagementScreen: React.FC = () => {
  const { user } = useAuth();

  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const [budget,    setBudget]    = useState<MonthlyBudget | null>(null);
  const [monthSpent, setMonthSpent] = useState(0);
  const [inputValue, setInputValue] = useState('');

  const month = currentMonthString(); // 'YYYY-MM'

  // -----------------------------------------------------------------------
  // Load budget + expenses
  // -----------------------------------------------------------------------

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [fetchedBudget, expenses] = await Promise.all([
        getMonthlyBudget(user.uid, month),
        getExpenses(user.uid),
      ]);

      setBudget(fetchedBudget);
      setMonthSpent(calcMonthTotal(expenses, month));
      setError(null);

      // Pre-fill input only if budget is set and input hasn't been touched
      if (fetchedBudget && inputValue === '') {
        setInputValue(String(Math.round(fetchedBudget.amount)));
      }
    } catch {
      setError('Could not load budget data. Pull down to retry.');
    }
  }, [user, month]); // intentionally omit inputValue to avoid re-setting while user types

  // Initial load
  React.useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  // Refresh on tab focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // -----------------------------------------------------------------------
  // Save budget
  // -----------------------------------------------------------------------

  const handleSave = async () => {
    const trimmed = inputValue.trim();

    if (trimmed === '') {
      Alert.alert('Invalid amount', 'Please enter a budget amount.');
      return;
    }

    const parsed = Number(trimmed);

    if (isNaN(parsed)) {
      Alert.alert('Invalid amount', 'Please enter a valid number.');
      return;
    }

    if (parsed <= 0) {
      Alert.alert('Invalid amount', 'Budget must be greater than zero.');
      return;
    }

    if (!user) return;

    setSaving(true);
    try {
      const saved = await setMonthlyBudget(user.uid, month, parsed);
      setBudget(saved);
      setError(null);
    } catch {
      Alert.alert('Error', 'Could not save budget. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------------------------------------
  // Derived values (safe — no NaN)
  // -----------------------------------------------------------------------

  const budgetAmount = budget?.amount ?? 0;
  const remaining    = budgetAmount - monthSpent;
  const isOverBudget = remaining < 0;

  // Progress ratio capped to [0, 1] for the visual bar
  const progressRatio =
    budgetAmount > 0
      ? Math.min(monthSpent / budgetAmount, 1)
      : 0;

  const progressPercent =
    budgetAmount > 0
      ? Math.min(Math.round((monthSpent / budgetAmount) * 100), 100)
      : 0;

  // Friendly month label e.g. "August 2026"
  const [yearStr, monthNum] = month.split('-');
  const monthLabel = new Date(
    Number(yearStr),
    Number(monthNum) - 1,
    1,
  ).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Monthly Budget</Text>
          <Text style={styles.headerSubtitle}>{monthLabel}</Text>
        </View>

        {/* Error banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Budget summary card */}
        {budget ? (
          <View style={styles.card}>
            <BudgetRow
              label="Budget"
              value={formatINR(budgetAmount)}
              valueColor={Colors.primary}
            />
            <View style={styles.divider} />
            <BudgetRow
              label="Spent This Month"
              value={formatINR(monthSpent)}
            />
            <View style={styles.divider} />
            <BudgetRow
              label="Remaining"
              value={formatINR(remaining)}
              valueColor={isOverBudget ? Colors.danger : Colors.textPrimary}
            />

            {/* Over-budget notice */}
            {isOverBudget ? (
              <View style={styles.overBudgetBanner}>
                <Text style={styles.overBudgetText}>
                  ⚠ You have exceeded your budget by {formatINR(Math.abs(remaining))}
                </Text>
              </View>
            ) : null}

            {/* Progress bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressPercent}>{progressPercent}%</Text>
              </View>
              <ProgressBar ratio={progressRatio} />
            </View>
          </View>
        ) : (
          /* No budget set state */
          <View style={styles.card}>
            <Text style={styles.noBudgetText}>No monthly budget set</Text>
            <Text style={styles.noBudgetHint}>
              Set a budget below to start tracking your spending for {monthLabel}.
            </Text>
          </View>
        )}

        {/* Set / Update budget input */}
        <View style={styles.card}>
          <Text style={styles.inputLabel}>
            {budget ? 'Update Budget' : 'Set Budget'} (₹)
          </Text>
          <TextInput
            style={styles.input}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="e.g. 10000"
            placeholderTextColor={Colors.outline}
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={handleSave}
            accessibilityLabel="Monthly budget amount"
          />
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityLabel={budget ? 'Update budget' : 'Set budget'}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.onPrimaryContainer} />
            ) : (
              <Text style={styles.saveButtonText}>
                {budget ? 'Update Budget' : 'Set Budget'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.marginMobile,
    paddingBottom: Spacing.xxl,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: Colors.errorContainer,
    borderRadius: Radius.base,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.onErrorContainer,
    fontSize: 13,
  },
  card: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginVertical: Spacing.sm,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  budgetRowLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  budgetRowValue: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  overBudgetBanner: {
    backgroundColor: Colors.errorContainer,
    borderRadius: Radius.base,
    padding: Spacing.sm,
    marginTop: Spacing.md,
  },
  overBudgetText: {
    color: Colors.onErrorContainer,
    fontSize: 13,
    fontWeight: '500',
  },
  progressSection: {
    marginTop: Spacing.md,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressPercent: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    flexDirection: 'row',
    height: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: Radius.full,
  },
  noBudgetText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  noBudgetHint: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.base,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  saveButton: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.onPrimaryContainer,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default BudgetManagementScreen;
