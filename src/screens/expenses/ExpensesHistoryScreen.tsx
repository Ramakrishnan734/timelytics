/**
 * ExpensesHistoryScreen.tsx
 *
 * Displays all expenses for the current user with filter and sort controls.
 *
 * Filter: All | Food | Travel | Shopping | Bills | Entertainment | Education | Other
 * Sort:   Newest first | Oldest first | Amount High→Low | Amount Low→High
 *
 * Important:
 *   - getExpenses(uid) is called ONCE; all filter/sort is done client-side on
 *     the returned Expense[]. No second Firestore query is made.
 *   - Add / Edit / Delete logic is unchanged from the original implementation.
 */

import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView }              from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getCurrentUser }                      from '../../services/authService';
import { getExpenses, deleteExpense, Expense } from '../../services/expenseService';
import { CATEGORIES, CATEGORY_MAP, CategoryKey } from '../../constants/categories';
import { Colors }                              from '../../constants/colors';
import { Spacing, Radius }                     from '../../constants/spacing';
import { ExpensesStackParamList }              from '../../navigation/ExpensesStack';

type Nav = NativeStackNavigationProp<ExpensesStackParamList, 'ExpensesList'>;

// ---------------------------------------------------------------------------
// Category emoji map
// ---------------------------------------------------------------------------

const CATEGORY_EMOJI: Record<CategoryKey, string> = {
  Food:          '🍽️',
  Travel:        '✈️',
  Shopping:      '🛍️',
  Bills:         '🧾',
  Entertainment: '🎬',
  Education:     '📚',
  Other:         '📦',
};

// ---------------------------------------------------------------------------
// Filter + Sort types
// ---------------------------------------------------------------------------

type FilterOption = 'All' | CategoryKey;

type SortOption =
  | 'newest'
  | 'oldest'
  | 'amount_desc'
  | 'amount_asc';

const SORT_LABELS: Record<SortOption, string> = {
  newest:      'Newest first',
  oldest:      'Oldest first',
  amount_desc: 'Amount: High → Low',
  amount_asc:  'Amount: Low → High',
};

const SORT_OPTIONS: SortOption[] = ['newest', 'oldest', 'amount_desc', 'amount_asc'];

// ---------------------------------------------------------------------------
// Client-side filter + sort (pure — no Firestore call)
// ---------------------------------------------------------------------------

function applyFilterAndSort(
  expenses:  Expense[],
  filter:    FilterOption,
  sort:      SortOption,
): Expense[] {
  const filtered =
    filter === 'All'
      ? expenses
      : expenses.filter(e => e.category === filter);

  const sorted = [...filtered];
  switch (sort) {
    case 'newest':
      sorted.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case 'oldest':
      sorted.sort((a, b) => a.createdAt - b.createdAt);
      break;
    case 'amount_desc':
      sorted.sort((a, b) => b.amount - a.amount);
      break;
    case 'amount_asc':
      sorted.sort((a, b) => a.amount - b.amount);
      break;
  }
  return sorted;
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function formatAmount(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatAmountCompact(n: number): string {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

// ---------------------------------------------------------------------------
// Expense row
// ---------------------------------------------------------------------------

interface RowProps {
  expense:  Expense;
  onEdit:   (e: Expense) => void;
  onDelete: (e: Expense) => void;
}

const ExpenseRow: React.FC<RowProps> = ({ expense, onEdit, onDelete }) => {
  const cat   = CATEGORY_MAP[expense.category];
  const emoji = CATEGORY_EMOJI[expense.category] ?? '📦';

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardMain} onPress={() => onEdit(expense)} activeOpacity={0.7}>
        {/* Emoji badge */}
        <View style={styles.emojiBadge}>
          <Text style={styles.emojiText}>{emoji}</Text>
        </View>

        {/* Middle: category + description + date */}
        <View style={styles.cardBody}>
          <Text style={styles.catLabel}>{cat?.label ?? expense.category}</Text>
          {!!expense.description && (
            <Text style={styles.desc} numberOfLines={1}>{expense.description}</Text>
          )}
          <Text style={styles.dateText}>{formatDate(expense.date)}</Text>
        </View>

        {/* Right: amount */}
        <Text style={styles.amount}>{formatAmount(expense.amount)}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(expense)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.deleteIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Picker modal — reused for both filter and sort
// ---------------------------------------------------------------------------

interface PickerModalProps {
  visible:   boolean;
  title:     string;
  options:   { value: string; label: string; emoji?: string }[];
  selected:  string;
  onSelect:  (value: string) => void;
  onClose:   () => void;
}

const PickerModal: React.FC<PickerModalProps> = ({
  visible, title, options, selected, onSelect, onClose,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>{title}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.modalOption,
                opt.value === selected && styles.modalOptionSelected,
              ]}
              onPress={() => { onSelect(opt.value); onClose(); }}
            >
              <View style={styles.modalOptionLeft}>
                {!!opt.emoji && <Text style={styles.modalEmoji}>{opt.emoji}</Text>}
                <Text style={[
                  styles.modalOptionText,
                  opt.value === selected && styles.modalOptionTextSelected,
                ]}>
                  {opt.label}
                </Text>
              </View>
              {opt.value === selected && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </TouchableOpacity>
  </Modal>
);

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const ExpensesHistoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const [expenses,   setExpenses]   = useState<Expense[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const [filterCat,       setFilterCat]       = useState<FilterOption>('All');
  const [sortOption,      setSortOption]      = useState<SortOption>('newest');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal,   setShowSortModal]   = useState(false);

  const uid = getCurrentUser()?.uid ?? '';

  // ── Load ─────────────────────────────────────────────────────────────────

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await getExpenses(uid);
      setExpenses(data);
    } catch {
      setError('Could not load expenses. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [uid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Derived list (filter + sort applied client-side) ─────────────────────

  const displayedExpenses = useMemo(
    () => applyFilterAndSort(expenses, filterCat, sortOption),
    [expenses, filterCat, sortOption],
  );

  // ── Summary (respects current filter) ────────────────────────────────────

  const summaryCount = displayedExpenses.length;
  const summaryTotal = useMemo(
    () => displayedExpenses.reduce((sum, e) => sum + e.amount, 0),
    [displayedExpenses],
  );

  // ── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = (expense: Expense) => {
    Alert.alert(
      'Delete expense',
      `Delete ${CATEGORY_MAP[expense.category]?.label ?? expense.category} — ${formatAmount(expense.amount)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(uid, expense.id);
              setExpenses(prev => prev.filter(e => e.id !== expense.id));
            } catch {
              Alert.alert('Error', 'Could not delete expense. Please try again.');
            }
          },
        },
      ],
    );
  };

  // ── Filter picker options ────────────────────────────────────────────────

  const filterOptions = [
    { value: 'All', label: 'All categories', emoji: '📊' },
    ...CATEGORIES.map(c => ({ value: c.key, label: c.label, emoji: CATEGORY_EMOJI[c.key] })),
  ];

  const sortOptions = SORT_OPTIONS.map(s => ({ value: s, label: SORT_LABELS[s] }));

  const activeFilterLabel =
    filterCat === 'All'
      ? 'All'
      : (CATEGORY_MAP[filterCat]?.label ?? filterCat);

  const activeFilterEmoji =
    filterCat === 'All' ? '📊' : (CATEGORY_EMOJI[filterCat] ?? '');

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading expenses…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headline}>Expenses</Text>
        {expenses.length > 0 && (
          <Text style={styles.summary}>
            {summaryCount} {summaryCount === 1 ? 'expense' : 'expenses'} · {formatAmountCompact(summaryTotal)}
          </Text>
        )}
      </View>

      {/* Error banner */}
      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Filter + Sort controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.controlLabel}>FILTER</Text>
          <View style={styles.controlValueRow}>
            <Text style={styles.controlEmoji}>{activeFilterEmoji}</Text>
            <Text style={styles.controlValue} numberOfLines={1}>
              {activeFilterLabel}
            </Text>
            <Text style={styles.controlChevron}>▾</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.controlDivider} />

        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => setShowSortModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.controlLabel}>SORT</Text>
          <View style={styles.controlValueRow}>
            <Text style={styles.controlValue} numberOfLines={1}>
              {SORT_LABELS[sortOption]}
            </Text>
            <Text style={styles.controlChevron}>▾</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Active filter pill (shown when not "All") */}
      {filterCat !== 'All' && (
        <View style={styles.activePillRow}>
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>
              {activeFilterEmoji} {activeFilterLabel}
            </Text>
            <TouchableOpacity
              onPress={() => setFilterCat('All')}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.activePillClear}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Expense list */}
      <FlatList
        data={displayedExpenses}
        keyExtractor={e => e.id}
        contentContainerStyle={[
          styles.listContent,
          displayedExpenses.length === 0 && styles.emptyContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>
              {expenses.length === 0 ? '💸' : '🔍'}
            </Text>
            <Text style={styles.emptyTitle}>
              {expenses.length === 0 ? 'No expenses yet' : 'No expenses found'}
            </Text>
            <Text style={styles.emptySub}>
              {expenses.length === 0
                ? 'Tap + to add your first expense.'
                : 'Try a different filter or category.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ExpenseRow
            expense={item}
            onEdit={e => navigation.navigate('EditExpense', { expense: e })}
            onDelete={handleDelete}
          />
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddExpense')}
        accessibilityLabel="Add expense"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Filter modal */}
      <PickerModal
        visible={showFilterModal}
        title="Filter by category"
        options={filterOptions}
        selected={filterCat}
        onSelect={v => setFilterCat(v as FilterOption)}
        onClose={() => setShowFilterModal(false)}
      />

      {/* Sort modal */}
      <PickerModal
        visible={showSortModal}
        title="Sort by"
        options={sortOptions}
        selected={sortOption}
        onSelect={v => setSortOption(v as SortOption)}
        onClose={() => setShowSortModal(false)}
      />
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },

  // Header
  header:   { paddingHorizontal: Spacing.marginMobile, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  headline: { color: Colors.textPrimary, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  summary:  { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },

  // Error
  errorBox: {
    marginHorizontal: Spacing.marginMobile, marginBottom: Spacing.sm,
    backgroundColor: Colors.errorContainer + '33', borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.errorContainer, padding: Spacing.md,
  },
  errorText: { color: Colors.danger, fontSize: 13 },

  // Filter + Sort bar
  controlsRow: {
    flexDirection:    'row',
    marginHorizontal: Spacing.marginMobile,
    marginBottom:     Spacing.sm,
    backgroundColor:  Colors.surfaceContainerHigh,
    borderRadius:     Radius.lg,
    borderWidth:      1,
    borderColor:      Colors.outlineVariant,
    overflow:         'hidden',
  },
  controlBtn: {
    flex:              1,
    paddingVertical:   Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
  },
  controlDivider: {
    width:           1,
    backgroundColor: Colors.outlineVariant,
    marginVertical:  Spacing.sm,
  },
  controlLabel: {
    color:         Colors.textSecondary,
    fontSize:      10,
    fontWeight:    '700',
    letterSpacing: 1,
    marginBottom:  3,
  },
  controlValueRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  controlEmoji:   { fontSize: 13 },
  controlValue:   { color: Colors.primary, fontSize: 13, fontWeight: '600', flex: 1 },
  controlChevron: { color: Colors.textSecondary, fontSize: 11 },

  // Active filter pill
  activePillRow: {
    flexDirection:    'row',
    paddingHorizontal: Spacing.marginMobile,
    marginBottom:     Spacing.sm,
  },
  activePill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.sm,
    backgroundColor:   Colors.primaryContainer + '25',
    borderRadius:      Radius.full,
    borderWidth:       1,
    borderColor:       Colors.primaryContainer + '60',
    paddingVertical:   4,
    paddingHorizontal: Spacing.md,
  },
  activePillText:  { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  activePillClear: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },

  // List
  listContent:  { paddingHorizontal: Spacing.marginMobile, paddingBottom: 100, gap: Spacing.sm },
  emptyContent: { flex: 1 },

  // Empty state
  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingTop: Spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.sm },
  emptyTitle:{ color: Colors.textPrimary, fontSize: 18, fontWeight: '600' },
  emptySub:  { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: Spacing.xl },

  // Expense card
  card: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius:    Radius.xl,
    borderWidth:     1,
    borderColor:     Colors.outlineVariant,
    overflow:        'hidden',
  },
  cardMain: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    padding:       Spacing.md,
    gap:           Spacing.md,
  },
  emojiBadge: {
    width:           44,
    height:          44,
    borderRadius:    Radius.md,
    backgroundColor: Colors.surfaceContainer,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     Colors.outlineVariant,
  },
  emojiText: { fontSize: 20 },
  cardBody:  { flex: 1, gap: 2 },
  catLabel:  { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  desc:      { color: Colors.textSecondary, fontSize: 12, marginTop: 1 },
  dateText:  { color: Colors.textSecondary, fontSize: 11, marginTop: 1 },
  amount:    { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'right' },

  deleteBtn:  { paddingHorizontal: Spacing.md, paddingVertical: Spacing.lg + 4, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: Colors.outlineVariant },
  deleteIcon: { color: Colors.danger, fontSize: 14, fontWeight: '600' },

  // FAB
  fab: {
    position:        'absolute',
    bottom:          Spacing.xl,
    right:           Spacing.marginMobile,
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: Colors.primaryContainer,
    alignItems:      'center',
    justifyContent:  'center',
    elevation:       4,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.3,
    shadowRadius:    4,
  },
  fabIcon: { color: Colors.onPrimary, fontSize: 28, lineHeight: 32, fontWeight: '400' },

  // Picker modal
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent:  'flex-end',
  },
  modalSheet: {
    backgroundColor:      Colors.surfaceContainerHigh,
    borderTopLeftRadius:  Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop:           Spacing.md,
    paddingBottom:        Spacing.xxl,
    maxHeight:            '65%',
    borderTopWidth:       1,
    borderColor:          Colors.outlineVariant,
  },
  modalHandle: {
    width:           40,
    height:          4,
    borderRadius:    2,
    backgroundColor: Colors.outlineVariant,
    alignSelf:       'center',
    marginBottom:    Spacing.md,
  },
  modalTitle: {
    color:             Colors.textPrimary,
    fontSize:          16,
    fontWeight:        '700',
    paddingHorizontal: Spacing.marginMobile,
    marginBottom:      Spacing.sm,
  },
  modalOption: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing.marginMobile,
  },
  modalOptionSelected: {
    backgroundColor: Colors.primaryContainer + '20',
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.md,
  },
  modalEmoji: { fontSize: 18 },
  modalOptionText: {
    color:    Colors.textPrimary,
    fontSize: 15,
  },
  modalOptionTextSelected: {
    color:      Colors.primary,
    fontWeight: '600',
  },
  checkmark: {
    color:      Colors.primary,
    fontSize:   16,
    fontWeight: '700',
  },
});

export default ExpensesHistoryScreen;
