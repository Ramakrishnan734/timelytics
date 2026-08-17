import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Colors }          from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { logOut }          from '../../services/authService';
import { getExpenses, Expense } from '../../services/expenseService';
import { getUserProfile } from '../../services/userService';
import { CATEGORIES, CATEGORY_MAP, CategoryKey } from '../../constants/categories';
import useAuth             from '../../hooks/useAuth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthPrefix(): string {
  return todayString().slice(0, 7);
}

function formatINR(amount: number): string {
  if (amount === 0) return '₹0';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ---------------------------------------------------------------------------
// Calculations (preserved exactly from original)
// ---------------------------------------------------------------------------

function calcTodayTotal(expenses: Expense[]): number {
  const today = todayString();
  return expenses
    .filter(e => e.date === today)
    .reduce((sum, e) => sum + e.amount, 0);
}

function calcMonthTotal(expenses: Expense[]): number {
  const prefix = monthPrefix();
  return expenses
    .filter(e => e.date.startsWith(prefix))
    .reduce((sum, e) => sum + e.amount, 0);
}

function calcCategoryTotals(expenses: Expense[]): { key: CategoryKey; label: string; icon: string; total: number }[] {
  const prefix = monthPrefix();
  const monthExpenses = expenses.filter(e => e.date.startsWith(prefix));
  const totals: Partial<Record<CategoryKey, number>> = {};
  for (const e of monthExpenses) {
    totals[e.category] = (totals[e.category] ?? 0) + e.amount;
  }
  return CATEGORIES
    .map(c => ({ key: c.key, label: c.label, icon: c.icon, total: totals[c.key] ?? 0 }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);
}

// Category emoji fallback map (no library needed)
const CATEGORY_EMOJI: Record<CategoryKey, string> = {
  Food:          '🍽',
  Travel:        '🚗',
  Shopping:      '🛍',
  Bills:         '🧾',
  Entertainment: '🎬',
  Education:     '📚',
  Other:         '•••',
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const DashboardScreen: React.FC = () => {
  const { user } = useAuth();

  const [expenses,   setExpenses]   = useState<Expense[]>([]);
  const [profileName, setProfileName] = useState<string>('there');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const loadExpenses = useCallback(async () => {
  if (!user) return;

  try {
    const data = await getExpenses(user.uid);
    setExpenses(data);

    const profile = await getUserProfile(user.uid);

    if (profile?.username) {
      setProfileName(profile.username);
    } else if (profile?.displayName) {
      setProfileName(profile.displayName);
    } else {
      setProfileName('there');
    }

    setError(null);
  } catch {
    setError('Could not load expenses. Pull down to retry.');
  }
}, [user]);

  useEffect(() => {
    setLoading(true);
    loadExpenses().finally(() => setLoading(false));
  }, [loadExpenses]);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadExpenses();
    setRefreshing(false);
  }, [loadExpenses]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logOut();
    } catch {
      setSigningOut(false);
    }
  };

  // Derived data
  const todayTotal           = calcTodayTotal(expenses);
  const monthTotal           = calcMonthTotal(expenses);
  const categoryTotals       = calcCategoryTotals(expenses);
  const highestCat           = categoryTotals[0] ?? null;
  const maxCatTotal          = highestCat?.total ?? 0;
  const recentExpenses       = expenses.slice(0, 5);
  const prefix               = monthPrefix();
  const monthTransactionCount = expenses.filter((e: Expense) => e.date.startsWith(prefix)).length;


  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard…</Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
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

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greetingText}>{greeting()},</Text>
          <Text style={styles.usernameText} numberOfLines={1}>
  {profileName}
</Text>
        </View>
        <TouchableOpacity
          onPress={handleSignOut}
          disabled={signingOut}
          style={styles.signOutBtn}
          accessibilityLabel="Sign out"
        >
          {signingOut
            ? <ActivityIndicator size="small" color={Colors.danger} />
            : <Text style={styles.signOutText}>Sign Out</Text>
          }
        </TouchableOpacity>
      </View>

      {/* ── Error banner ── */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* ── Monthly overview card ── */}
      <View style={styles.monthCard}>
        <Text style={styles.monthCardLabel}>Monthly Overview</Text>
        <Text style={styles.monthCardAmount}>{formatINR(monthTotal)}</Text>
        <Text style={styles.monthCardSub}>Spent this month</Text>
        <View style={styles.monthCardDivider} />
        <View style={styles.monthCardRow}>
          <View style={styles.monthCardStat}>
            <Text style={styles.monthCardStatLabel}>Transactions</Text>
            <Text style={styles.monthCardStatValue}>
              {monthTransactionCount}
            </Text>
          </View>
          <View style={styles.monthCardStatDivider} />
          <View style={styles.monthCardStat}>
            <Text style={styles.monthCardStatLabel}>Today</Text>
            <Text style={styles.monthCardStatValue}>{formatINR(todayTotal)}</Text>
          </View>
          <View style={styles.monthCardStatDivider} />
          <View style={styles.monthCardStat}>
            <Text style={styles.monthCardStatLabel}>Categories</Text>
            <Text style={styles.monthCardStatValue}>{categoryTotals.length}</Text>
          </View>
        </View>
      </View>

      {/* ── Highest spending category ── */}
      <Text style={styles.sectionHeader}>Highest Spending</Text>
      {highestCat ? (
        <View style={styles.highestCard}>
          <View style={styles.highestLeft}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryEmoji}>{CATEGORY_EMOJI[highestCat.key]}</Text>
            </View>
            <View>
              <Text style={styles.highestCategoryName}>{highestCat.label}</Text>
              <Text style={styles.highestSub}>Top category this month</Text>
            </View>
          </View>
          <Text style={styles.highestAmount}>{formatINR(highestCat.total)}</Text>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No expenses this month</Text>
        </View>
      )}

      {/* ── Category breakdown ── */}
      <Text style={styles.sectionHeader}>Category Breakdown</Text>
      <View style={styles.card}>
        {categoryTotals.length > 0 ? (
          categoryTotals.map((cat, idx) => {
            const pct = maxCatTotal > 0 ? Math.round((cat.total / monthTotal) * 100) : 0;
            const fillRatio = maxCatTotal > 0 ? cat.total / maxCatTotal : 0;
            return (
              <View key={cat.key} style={[styles.barRow, idx < categoryTotals.length - 1 && styles.barRowBorder]}>
                <Text style={styles.barEmoji}>{CATEGORY_EMOJI[cat.key]}</Text>
                <View style={styles.barContent}>
                  <View style={styles.barLabelRow}>
                    <Text style={styles.barLabel}>{cat.label}</Text>
                    <View style={styles.barRightLabel}>
                      <Text style={styles.barPct}>{pct}%</Text>
                      <Text style={styles.barAmount}>{formatINR(cat.total)}</Text>
                    </View>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { flex: fillRatio }]} />
                    <View style={{ flex: Math.max(0, 1 - fillRatio) }} />
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No expenses this month</Text>
        )}
      </View>

      {/* ── Recent Expenses ── */}
      {recentExpenses.length > 0 ? (
        <>
          <Text style={styles.sectionHeader}>Recent Expenses</Text>
          <View style={styles.card}>
            {recentExpenses.map((expense: Expense, idx: number) => {
              const cat = CATEGORY_MAP[expense.category];
              return (
                <View
                  key={expense.id}
                  style={[styles.expenseRow, idx < recentExpenses.length - 1 && styles.expenseRowBorder]}
                >
                  <View style={styles.expenseBadge}>
                    <Text style={styles.expenseEmoji}>{CATEGORY_EMOJI[expense.category]}</Text>
                  </View>
                  <View style={styles.expenseInfo}>
                    <Text style={styles.expenseDesc} numberOfLines={1}>
                      {expense.description.trim().length > 0 ? expense.description : cat?.label ?? expense.category}
                    </Text>
                    <Text style={styles.expenseMeta}>{cat?.label ?? expense.category}  ·  {formatDate(expense.date)}</Text>
                  </View>
                  <Text style={styles.expenseAmount}>{formatINR(expense.amount)}</Text>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

    </ScrollView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({

  // Layout
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
  },
  headerLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  greetingText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '400',
  },
  usernameText: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  signOutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.danger,
    minWidth: 84,
    alignItems: 'center',
  },
  signOutText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '600',
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

  // Section header
  sectionHeader: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },

  // Generic card shell
  card: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },

  // Empty state
  emptyCard: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.outline,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },

  // Monthly overview card
  monthCard: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  monthCardLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  monthCardAmount: {
    color: Colors.primary,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 46,
  },
  monthCardSub: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  monthCardDivider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginBottom: Spacing.md,
  },
  monthCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthCardStat: {
    flex: 1,
    alignItems: 'center',
  },
  monthCardStatDivider: {
    width: 1,
    backgroundColor: Colors.outlineVariant,
  },
  monthCardStatLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  monthCardStatValue: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },

  // Highest spending card
  highestCard: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  highestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
    marginRight: Spacing.md,
  },
  categoryBadge: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: {
    fontSize: 20,
  },
  highestCategoryName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  highestSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  highestAmount: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },

  // Category breakdown bars
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  barRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  barEmoji: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  barContent: {
    flex: 1,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  barLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  barRightLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barPct: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  barAmount: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  barTrack: {
    flexDirection: 'row',
    height: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },

  // Recent expenses
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  expenseRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  expenseBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.base,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseEmoji: {
    fontSize: 16,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDesc: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  expenseMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  expenseAmount: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default DashboardScreen;
