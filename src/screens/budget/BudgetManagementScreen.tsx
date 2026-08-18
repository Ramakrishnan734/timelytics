/**
 * BudgetManagementScreen.tsx
 *
 * Session 9 — Monthly Budget milestone.
 * Session 14 — Budget UI Polish.
 *
 * Displays:
 *   - Current monthly budget amount (hero display)
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
 *
 * UI Polish (Session 14):
 *   - Hero budget amount card (large display number, primary accent)
 *   - Spent / Remaining metric tiles side-by-side
 *   - Improved progress bar with percentage label
 *   - Over-budget state: prominent danger coloring throughout
 *   - Polished empty state with icon and CTA
 *   - Input card with ₹ prefix panel
 *   - Section headers matching Dashboard visual rhythm
 *   - All calculations, persistence, and Firestore logic unchanged
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

import { Colors }          from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import useAuth             from '../../hooks/useAuth';
import { getExpenses, Expense } from '../../services/expenseService';
import {
  getMonthlyBudget,
  setMonthlyBudget,
  currentMonthString,
  MonthlyBudget,
} from '../../services/budgetService';

// ---------------------------------------------------------------------------
// Helpers — unchanged from Session 9
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

/** Single metric tile: label on top, large value below */
interface MetricTileProps {
  label:      string;
  value:      string;
  valueColor?: string;
  flex?:      number;
}

const MetricTile: React.FC<MetricTileProps> = ({ label, value, valueColor, flex = 1 }) => (
  <View style={[styles.metricTile, { flex }]}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, valueColor ? { color: valueColor } : null]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
  </View>
);

/** Progress bar — ratio 0–1 (already capped externally) */
interface ProgressBarProps {
  ratio:   number;
  isOver:  boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ ratio, isOver }) => {
  const fillColor =
    isOver        ? Colors.danger  :
    ratio >= 0.8  ? Colors.warning :
    Colors.primaryContainer;

  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { flex: ratio, backgroundColor: fillColor },
        ]}
      />
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

  const [budget,     setBudget]     = useState<MonthlyBudget | null>(null);
  const [monthSpent, setMonthSpent] = useState(0);
  const [inputValue, setInputValue] = useState('');

  const month = currentMonthString(); // 'YYYY-MM'

  // -----------------------------------------------------------------------
  // Load budget + expenses — logic unchanged
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

      if (fetchedBudget && inputValue === '') {
        setInputValue(String(Math.round(fetchedBudget.amount)));
      }
    } catch {
      setError('Could not load budget data. Pull down to retry.');
    }
  }, [user, month]); // intentionally omit inputValue to avoid re-setting while user types

  React.useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

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
  // Save budget — logic unchanged
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
  // Derived values — unchanged
  // -----------------------------------------------------------------------

  const budgetAmount  = budget?.amount ?? 0;
  const remaining     = budgetAmount - monthSpent;
  const isOverBudget  = remaining < 0;

  const progressRatio =
    budgetAmount > 0
      ? Math.min(monthSpent / budgetAmount, 1)
      : 0;

  const progressPercent =
    budgetAmount > 0
      ? Math.min(Math.round((monthSpent / budgetAmount) * 100), 100)
      : 0;

  const [yearStr, monthNum] = month.split('-');
  const monthLabel = new Date(
    Number(yearStr),
    Number(monthNum) - 1,
    1,
  ).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // -----------------------------------------------------------------------
  // Render — loading
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading budget…</Text>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >

        {/* ── Page header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Monthly Budget</Text>
          <Text style={styles.headerSubtitle}>{monthLabel}</Text>
        </View>

        {/* ── Error banner ── */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Budget set: hero card + metrics + progress ── */}
        {budget ? (
          <>
            {/* Hero budget amount */}
            <View style={[styles.heroCard, isOverBudget && styles.heroCardDanger]}>
              <Text style={styles.heroLabel}>MONTHLY BUDGET</Text>
              <Text style={[styles.heroAmount, isOverBudget && styles.heroAmountDanger]}>
                {formatINR(budgetAmount)}
              </Text>
              {isOverBudget ? (
                <View style={styles.overBudgetBadge}>
                  <Text style={styles.overBudgetBadgeText}>⚠ Over budget</Text>
                </View>
              ) : (
                <Text style={styles.heroSub}>
                  {progressPercent}% used
                </Text>
              )}
            </View>

            {/* Spent / Remaining tiles */}
            <Text style={styles.sectionHeader}>This Month</Text>
            <View style={styles.tilesRow}>
              <MetricTile
                label="Spent"
                value={formatINR(monthSpent)}
                valueColor={Colors.textPrimary}
              />
              <View style={styles.tilesDivider} />
              <MetricTile
                label="Remaining"
                value={formatINR(remaining)}
                valueColor={isOverBudget ? Colors.danger : Colors.primary}
              />
            </View>

            {/* Over-budget detail banner */}
            {isOverBudget ? (
              <View style={styles.overBudgetBanner}>
                <Text style={styles.overBudgetBannerText}>
                  You've exceeded your budget by{' '}
                  <Text style={styles.overBudgetBannerAmount}>
                    {formatINR(Math.abs(remaining))}
                  </Text>
                </Text>
              </View>
            ) : null}

            {/* Progress */}
            <Text style={styles.sectionHeader}>Progress</Text>
            <View style={styles.progressCard}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLegend}>
                  {formatINR(monthSpent)} spent
                </Text>
                <Text style={[
                  styles.progressPct,
                  isOverBudget && { color: Colors.danger },
                  progressRatio >= 0.8 && !isOverBudget && { color: Colors.warning },
                ]}>
                  {progressPercent}%
                </Text>
              </View>
              <ProgressBar ratio={progressRatio} isOver={isOverBudget} />
              <View style={styles.progressEndRow}>
                <Text style={styles.progressEndLabel}>₹0</Text>
                <Text style={styles.progressEndLabel}>{formatINR(budgetAmount)}</Text>
              </View>
            </View>
          </>
        ) : (
          /* ── No budget set: empty state ── */
          <>
            <Text style={styles.sectionHeader}>This Month</Text>
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>💰</Text>
              <Text style={styles.emptyTitle}>No budget set</Text>
              <Text style={styles.emptyHint}>
                Set a monthly budget below to start tracking your spending for {monthLabel}.
              </Text>
            </View>
          </>
        )}

        {/* ── Set / Update budget input ── */}
        <Text style={styles.sectionHeader}>
          {budget ? 'Update Budget' : 'Set Budget'}
        </Text>
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Monthly limit</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputPrefix}>
              <Text style={styles.inputPrefixText}>₹</Text>
            </View>
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
          </View>
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

  // Layout
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.marginMobile,
    paddingBottom: Spacing.xxl,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },

  // Header — matches Dashboard rhythm
  header: {
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 3,
  },

  // Error
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

  // Section headers — matches Dashboard
  sectionHeader: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },

  // Hero card
  heroCard: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'flex-start',
  },
  heroCardDanger: {
    borderColor: Colors.errorContainer,
  },
  heroLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  heroAmount: {
    color: Colors.primary,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 46,
  },
  heroAmountDanger: {
    color: Colors.danger,
  },
  heroSub: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  overBudgetBadge: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.errorContainer,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  overBudgetBadgeText: {
    color: Colors.onErrorContainer,
    fontSize: 12,
    fontWeight: '700',
  },

  // Metric tiles row
  tilesRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  metricTile: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  metricLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  metricValue: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tilesDivider: {
    width: 1,
    backgroundColor: Colors.outlineVariant,
    marginVertical: Spacing.md,
  },

  // Over-budget banner
  overBudgetBanner: {
    backgroundColor: Colors.errorContainer,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  overBudgetBannerText: {
    color: Colors.onErrorContainer,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  overBudgetBannerAmount: {
    fontWeight: '700',
  },

  // Progress card
  progressCard: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressLegend: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  progressPct: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  progressTrack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: Radius.full,
  },
  progressEndRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  progressEndLabel: {
    color: Colors.outline,
    fontSize: 11,
    fontWeight: '500',
  },

  // Empty state
  emptyCard: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  emptyHint: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Input card
  inputCard: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  inputPrefix: {
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.outlineVariant,
  },
  inputPrefixText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
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
    letterSpacing: 0.3,
  },
});

export default BudgetManagementScreen;
