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
  // 1. Filter
  const filtered =
    filter === 'All'
      ? expenses
      : expenses.filter(e => e.category === filter);

  // 2. Sort (return a new array — do not mutate)
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

// ---------------------------------------------------------------------------
// Expense row (unchanged from original)
// ---------------------------------------------------------------------------

interface RowProps {
  expense:  Expense;
  onEdit:   (e: Expense) => void;
  onDelete: (e: Expense) => void;
}

const ExpenseRow: React.FC<RowProps> = ({ expense, onEdit, onDelete }) => {
  const cat = CATEGORY_MAP[expense.category];
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardMain} onPress={() => onEdit(expense)} activeOpacity={0.7}>
        <View style={styles.catBadge}>
          <Text style={styles.catLabel}>{cat?.label ?? expense.category}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.amount}>{formatAmount(expense.amount)}</Text>
          <Text style={styles.dateText}>{formatDate(expense.date)}</Text>
          {!!expense.description && (
            <Text style={styles.desc} numberOfLines={1}>{expense.description}</Text>
          )}
        </View>
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
  options:   { value: string; label: string }[];
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
    animationType="fade"
    onRequestClose={onClose}
  >
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <View style={styles.modalSheet}>
        <Text style={styles.modalTitle}>{title}</Text>
        <ScrollView>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.modalOption,
                opt.value === selected && styles.modalOptionSelected,
              ]}
              onPress={() => { onSelect(opt.value); onClose(); }}
            >
              <Text style={[
                styles.modalOptionText,
                opt.value === selected && styles.modalOptionTextSelected,
              ]}>
                {opt.label}
              </Text>
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

  // Raw data from Firestore (loaded once per focus)
  const [expenses,   setExpenses]   = useState<Expense[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  // Filter + sort state
  const [filterCat,     setFilterCat]     = useState<FilterOption>('All');
  const [sortOption,    setSortOption]    = useState<SortOption>('newest');
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

  // ── Delete (unchanged) ───────────────────────────────────────────────────

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
    { value: 'All', label: 'All' },
    ...CATEGORIES.map(c => ({ value: c.key, label: c.label })),
  ];

  const sortOptions = SORT_OPTIONS.map(s => ({ value: s, label: SORT_LABELS[s] }));

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headline}>Expenses</Text>
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
        >
          <Text style={styles.controlLabel}>Filter</Text>
          <Text style={styles.controlValue} numberOfLines={1}>
            {filterCat === 'All' ? 'All' : (CATEGORY_MAP[filterCat]?.label ?? filterCat)} ▾
          </Text>
        </TouchableOpacity>

        <View style={styles.controlDivider} />

        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => setShowSortModal(true)}
        >
          <Text style={styles.controlLabel}>Sort</Text>
          <Text style={styles.controlValue} numberOfLines={1}>
            {SORT_LABELS[sortOption]} ▾
          </Text>
        </TouchableOpacity>
      </View>

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
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:      { paddingHorizontal: Spacing.marginMobile, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  headline:    { color: Colors.textPrimary, fontSize: 24, fontWeight: '700' },
  errorBox: {
    marginHorizontal: Spacing.marginMobile, marginBottom: Spacing.sm,
    backgroundColor: Colors.errorContainer + '33', borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.errorContainer, padding: Spacing.md,
  },
  errorText:   { color: Colors.danger, fontSize: 13 },

  // Filter + Sort bar
  controlsRow: {
    flexDirection:   'row',
    marginHorizontal: Spacing.marginMobile,
    marginBottom:    Spacing.sm,
    backgroundColor: Colors.surfaceContainer,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Colors.outlineVariant,
    overflow:        'hidden',
  },
  controlBtn: {
    flex:             1,
    paddingVertical:  Spacing.sm,
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
    fontWeight:    '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  2,
  },
  controlValue: {
    color:      Colors.primary,
    fontSize:   13,
    fontWeight: '600',
  },

  // List
  listContent:  { paddingHorizontal: Spacing.marginMobile, paddingBottom: 100, gap: Spacing.sm },
  emptyContent: { flex: 1 },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingTop: Spacing.xxl },
  emptyTitle:   { color: Colors.textPrimary, fontSize: 18, fontWeight: '600' },
  emptySub:     { color: Colors.textSecondary, fontSize: 14 },

  // Expense card (unchanged from original)
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceContainer, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.outlineVariant, overflow: 'hidden',
  },
  cardMain:  { flex: 1, flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  catBadge: {
    backgroundColor: Colors.primaryContainer + '30', borderRadius: Radius.base,
    paddingVertical: 4, paddingHorizontal: Spacing.sm,
    borderWidth: 1, borderColor: Colors.primaryContainer + '60',
    minWidth: 70, alignItems: 'center',
  },
  catLabel:  { color: Colors.primary, fontSize: 11, fontWeight: '600' },
  cardBody:  { flex: 1, gap: 2 },
  amount:    { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  dateText:  { color: Colors.textSecondary, fontSize: 12 },
  desc:      { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  deleteBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.lg, justifyContent: 'center', alignItems: 'center' },
  deleteIcon:{ color: Colors.danger, fontSize: 16, fontWeight: '600' },

  // FAB
  fab: {
    position: 'absolute', bottom: Spacing.xl, right: Spacing.marginMobile,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  fabIcon: { color: Colors.onPrimary, fontSize: 28, lineHeight: 32, fontWeight: '400' },

  // Picker modal
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent:  'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderTopLeftRadius:  Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop:      Spacing.lg,
    paddingBottom:   Spacing.xxl,
    maxHeight:       '60%',
  },
  modalTitle: {
    color:        Colors.textPrimary,
    fontSize:     16,
    fontWeight:   '700',
    paddingHorizontal: Spacing.marginMobile,
    marginBottom: Spacing.sm,
  },
  modalOption: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingVertical:  Spacing.md,
    paddingHorizontal: Spacing.marginMobile,
  },
  modalOptionSelected: {
    backgroundColor: Colors.primaryContainer + '20',
  },
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
