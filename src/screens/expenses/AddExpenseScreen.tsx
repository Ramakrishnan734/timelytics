/**
 * AddExpenseScreen.tsx
 *
 * Dual-mode form: Add (route name = 'AddExpense') or Edit (route name = 'EditExpense').
 * When editing, route.params.expense pre-fills the form.
 *
 * Fields: amount · category · date · description
 * Validation: amount and category required; date defaults to today.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView }                          from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp }    from '@react-navigation/native';
import { NativeStackNavigationProp }             from '@react-navigation/native-stack';

import { getCurrentUser }            from '../../services/authService';
import { addExpense, updateExpense } from '../../services/expenseService';
import { CATEGORIES, CategoryKey }  from '../../constants/categories';
import { Colors }                   from '../../constants/colors';
import { Spacing, Radius }          from '../../constants/spacing';
import { ExpensesStackParamList }   from '../../navigation/ExpensesStack';

type AddNav  = NativeStackNavigationProp<ExpensesStackParamList, 'AddExpense'>;
type EditNav = NativeStackNavigationProp<ExpensesStackParamList, 'EditExpense'>;
type AddRoute  = RouteProp<ExpensesStackParamList, 'AddExpense'>;
type EditRoute = RouteProp<ExpensesStackParamList, 'EditExpense'>;

// ---------------------------------------------------------------------------
// Category emoji map (local — no change to categories.ts)
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
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// ── Category picker modal ─────────────────────────────────────────────────────

interface CategoryPickerProps {
  visible:  boolean;
  selected: CategoryKey | '';
  onSelect: (k: CategoryKey) => void;
  onClose:  () => void;
}

const CategoryPicker: React.FC<CategoryPickerProps> = ({ visible, selected, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={pickerStyles.overlay} activeOpacity={1} onPress={onClose}>
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.handle} />
        <Text style={pickerStyles.title}>Select Category</Text>
        <FlatList
          data={CATEGORIES}
          keyExtractor={c => c.key}
          ItemSeparatorComponent={() => <View style={pickerStyles.sep} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[pickerStyles.row, selected === item.key && pickerStyles.rowSelected]}
              onPress={() => { onSelect(item.key); onClose(); }}
            >
              <View style={pickerStyles.rowLeft}>
                <View style={pickerStyles.rowEmojiBadge}>
                  <Text style={pickerStyles.rowEmoji}>{CATEGORY_EMOJI[item.key]}</Text>
                </View>
                <Text style={[pickerStyles.rowText, selected === item.key && pickerStyles.rowTextSelected]}>
                  {item.label}
                </Text>
              </View>
              {selected === item.key && <Text style={pickerStyles.check}>✓</Text>}
            </TouchableOpacity>
          )}
        />
      </View>
    </TouchableOpacity>
  </Modal>
);

const pickerStyles = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: Colors.surfaceContainerHigh, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingTop: Spacing.md, paddingBottom: Spacing.xxl, maxHeight: '60%', borderTopWidth: 1, borderColor: Colors.outlineVariant },
  handle:         { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.outlineVariant, alignSelf: 'center', marginBottom: Spacing.md },
  title:          { color: Colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: Spacing.sm, paddingHorizontal: Spacing.marginMobile },
  sep:            { height: 1, backgroundColor: Colors.outlineVariant, marginHorizontal: Spacing.marginMobile },
  row:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, paddingHorizontal: Spacing.marginMobile },
  rowSelected:    { backgroundColor: Colors.primaryContainer + '20' },
  rowLeft:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rowEmojiBadge:  { width: 36, height: 36, borderRadius: Radius.base, backgroundColor: Colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  rowEmoji:       { fontSize: 18 },
  rowText:        { color: Colors.textPrimary, fontSize: 15 },
  rowTextSelected:{ color: Colors.primary, fontWeight: '600' },
  check:          { color: Colors.primary, fontSize: 16, fontWeight: '700' },
});

// ── Screen ────────────────────────────────────────────────────────────────────

const AddExpenseScreen: React.FC = () => {
  const navigation = useNavigation<AddNav | EditNav>();
  const route      = useRoute<AddRoute | EditRoute>();

  const isEdit   = route.name === 'EditExpense';
  const existing = isEdit
    ? (route as RouteProp<ExpensesStackParamList, 'EditExpense'>).params.expense
    : null;

  const uid = getCurrentUser()?.uid ?? '';

  const [amount,      setAmount]      = useState(existing ? String(existing.amount) : '');
  const [category,    setCategory]    = useState<CategoryKey | ''>(existing?.category ?? '');
  const [date,        setDate]        = useState(existing?.date ?? todayISO());
  const [description, setDescription] = useState(existing?.description ?? '');
  const [pickerOpen,  setPickerOpen]  = useState(false);
  const [loading,     setLoading]     = useState(false);

  interface FieldErrors { amount?: string; category?: string; date?: string; }
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = (): boolean => {
    const next: FieldErrors = {};
    const parsed = parseFloat(amount.replace(/,/g, ''));
    if (!amount.trim())                    next.amount   = 'Amount is required.';
    else if (isNaN(parsed) || parsed <= 0) next.amount   = 'Enter a valid amount greater than 0.';
    if (!category)                         next.category = 'Please select a category.';
    if (!isValidDate(date))                next.date     = 'Date must be in YYYY-MM-DD format.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    const parsed = parseFloat(amount.replace(/,/g, ''));
    try {
      if (isEdit && existing) {
        await updateExpense(uid, existing.id, {
          amount: parsed, category: category as CategoryKey,
          date, description: description.trim(),
        });
      } else {
        await addExpense({
          uid, amount: parsed, category: category as CategoryKey,
          date, description: description.trim(),
        });
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save the expense. Please try again.');
      setLoading(false);
    }
  };

  const selectedCategory = category ? CATEGORIES.find(c => c.key === category) : null;
  const categoryLabel    = selectedCategory ? selectedCategory.label : 'Select category';
  const categoryEmoji    = selectedCategory ? CATEGORY_EMOJI[selectedCategory.key] : null;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headline}>{isEdit ? 'Edit Expense' : 'Add Expense'}</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Form card */}
          <View style={styles.formCard}>

            {/* Amount */}
            <View style={styles.field}>
              <Text style={styles.label}>AMOUNT</Text>
              <View style={styles.amountWrapper}>
                <View style={[styles.amountPrefix, !!errors.amount && styles.inputError]}>
                  <Text style={styles.amountPrefixText}>₹</Text>
                </View>
                <TextInput
                  style={[styles.amountInput, !!errors.amount && styles.inputError]}
                  value={amount}
                  onChangeText={v => { setAmount(v); setErrors(p => ({ ...p, amount: undefined })); }}
                  placeholder="0.00"
                  placeholderTextColor={Colors.outline}
                  keyboardType="decimal-pad"
                  selectionColor={Colors.primary}
                />
              </View>
              {!!errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
            </View>

            <View style={styles.fieldDivider} />

            {/* Category */}
            <View style={styles.field}>
              <Text style={styles.label}>CATEGORY</Text>
              <TouchableOpacity
                style={[styles.selector, !!errors.category && styles.selectorError]}
                onPress={() => setPickerOpen(true)}
                activeOpacity={0.7}
              >
                <View style={styles.selectorLeft}>
                  {categoryEmoji ? (
                    <View style={styles.selectorEmojiBadge}>
                      <Text style={styles.selectorEmoji}>{categoryEmoji}</Text>
                    </View>
                  ) : (
                    <View style={styles.selectorEmojiBadgeEmpty}>
                      <Text style={styles.selectorEmojiPlaceholder}>＋</Text>
                    </View>
                  )}
                  <Text style={[styles.selectorText, !category && styles.placeholder]}>
                    {categoryLabel}
                  </Text>
                </View>
                <Text style={styles.chevron}>▾</Text>
              </TouchableOpacity>
              {!!errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
            </View>

            <View style={styles.fieldDivider} />

            {/* Date */}
            <View style={styles.field}>
              <Text style={styles.label}>DATE</Text>
              <TextInput
                style={[styles.input, !!errors.date && styles.inputError]}
                value={date}
                onChangeText={v => { setDate(v); setErrors(p => ({ ...p, date: undefined })); }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.outline}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                selectionColor={Colors.primary}
              />
              {!!errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
            </View>

            <View style={styles.fieldDivider} />

            {/* Description */}
            <View style={[styles.field, { marginBottom: 0 }]}>
              <Text style={styles.label}>DESCRIPTION <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={description}
                onChangeText={setDescription}
                placeholder="What was this for?"
                placeholderTextColor={Colors.outline}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                selectionColor={Colors.primary}
              />
            </View>

          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color={Colors.onPrimary} />
              : <Text style={styles.btnText}>{isEdit ? 'Save Changes' : 'Add Expense'}</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      <CategoryPicker
        visible={pickerOpen}
        selected={category}
        onSelect={k => { setCategory(k); setErrors(p => ({ ...p, category: undefined })); }}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.background },
  kav:       { flex: 1 },
  scroll:    { paddingHorizontal: Spacing.marginMobile, paddingBottom: Spacing.xxl },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, marginBottom: Spacing.md },
  backBtn:   { width: 40, height: 40, borderRadius: Radius.lg, backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.outlineVariant },
  backArrow: { color: Colors.textPrimary, fontSize: 20, lineHeight: 22 },
  headline:  { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },

  // Form card
  formCard: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius:    Radius.xl,
    borderWidth:     1,
    borderColor:     Colors.outlineVariant,
    padding:         Spacing.lg,
    marginBottom:    Spacing.lg,
    gap:             Spacing.md,
  },
  fieldDivider: { height: 1, backgroundColor: Colors.outlineVariant, marginVertical: 2 },

  // Fields
  field:  { gap: 8 },
  label:  { color: Colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  optional: { color: Colors.outline, fontWeight: '400', textTransform: 'none', letterSpacing: 0 },

  // Standard input
  input: {
    backgroundColor:  Colors.surfaceContainer,
    borderRadius:     Radius.lg,
    borderWidth:      1.5,
    borderColor:      Colors.outlineVariant,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.md - 2,
    color:            Colors.textPrimary,
    fontSize:         15,
  },
  multiline:   { minHeight: 80, paddingTop: Spacing.md - 2 },
  inputError:  { borderColor: Colors.danger },

  // Amount row (₹ prefix + input joined)
  amountWrapper: { flexDirection: 'row', borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1.5, borderColor: Colors.outlineVariant },
  amountPrefix:  { backgroundColor: Colors.surfaceContainer, paddingHorizontal: Spacing.md, justifyContent: 'center', borderRightWidth: 1, borderRightColor: Colors.outlineVariant },
  amountPrefixText: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600' },
  amountInput:   { flex: 1, backgroundColor: Colors.surfaceContainer, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md - 2, color: Colors.textPrimary, fontSize: 18, fontWeight: '600', borderWidth: 0 },

  // Category selector
  selector: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    backgroundColor:   Colors.surfaceContainer,
    borderRadius:      Radius.lg,
    borderWidth:       1.5,
    borderColor:       Colors.outlineVariant,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm + 2,
  },
  selectorError: { borderColor: Colors.danger },
  selectorLeft:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  selectorEmojiBadge: {
    width: 32, height: 32, borderRadius: Radius.base,
    backgroundColor: Colors.primaryContainer + '25',
    alignItems: 'center', justifyContent: 'center',
  },
  selectorEmojiBadgeEmpty: {
    width: 32, height: 32, borderRadius: Radius.base,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  selectorEmoji:       { fontSize: 17 },
  selectorEmojiPlaceholder: { color: Colors.outline, fontSize: 14 },
  selectorText:        { color: Colors.textPrimary, fontSize: 15 },
  placeholder:         { color: Colors.outline },
  chevron:             { color: Colors.textSecondary, fontSize: 14 },

  // Error text
  errorText: { color: Colors.danger, fontSize: 12 },

  // Save button
  btnPrimary: {
    backgroundColor: Colors.primaryContainer,
    borderRadius:    Radius.lg,
    paddingVertical: Spacing.md + 4,
    alignItems:      'center',
    elevation:       2,
  },
  btnDisabled: { opacity: 0.65 },
  btnText:     { color: Colors.onPrimary, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});

export default AddExpenseScreen;
