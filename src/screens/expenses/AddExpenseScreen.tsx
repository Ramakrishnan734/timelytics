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
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={pickerStyles.overlay} activeOpacity={1} onPress={onClose}>
      <View style={pickerStyles.sheet}>
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
              <Text style={[pickerStyles.rowText, selected === item.key && pickerStyles.rowTextSelected]}>
                {item.label}
              </Text>
              {selected === item.key && <Text style={pickerStyles.check}>✓</Text>}
            </TouchableOpacity>
          )}
        />
      </View>
    </TouchableOpacity>
  </Modal>
);

const pickerStyles = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: Spacing.marginMobile },
  sheet:          { backgroundColor: Colors.surfaceContainerHigh, borderRadius: Radius.xl, padding: Spacing.lg, maxHeight: 400 },
  title:          { color: Colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: Spacing.md, textAlign: 'center' },
  sep:            { height: 1, backgroundColor: Colors.outlineVariant },
  row:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm },
  rowSelected:    { backgroundColor: Colors.primaryContainer + '20', borderRadius: Radius.base },
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
    if (!amount.trim())              next.amount   = 'Amount is required.';
    else if (isNaN(parsed) || parsed <= 0) next.amount = 'Enter a valid amount greater than 0.';
    if (!category)                   next.category = 'Please select a category.';
    if (!isValidDate(date))          next.date     = 'Date must be in YYYY-MM-DD format.';
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

  const categoryLabel = category
    ? (CATEGORIES.find(c => c.key === category)?.label ?? category)
    : 'Select category';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headline}>{isEdit ? 'Edit Expense' : 'Add Expense'}</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Amount *</Text>
            <TextInput
              style={[styles.input, !!errors.amount && styles.inputError]}
              value={amount}
              onChangeText={v => { setAmount(v); setErrors(p => ({ ...p, amount: undefined })); }}
              placeholder="0.00"
              placeholderTextColor={Colors.outline}
              keyboardType="decimal-pad"
              selectionColor={Colors.primary}
            />
            {!!errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Category *</Text>
            <TouchableOpacity
              style={[styles.selector, !!errors.category && styles.inputError]}
              onPress={() => setPickerOpen(true)}
            >
              <Text style={[styles.selectorText, !category && styles.placeholder]}>{categoryLabel}</Text>
              <Text style={styles.chevron}>▾</Text>
            </TouchableOpacity>
            {!!errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.input, !!errors.date && styles.inputError]}
              value={date}
              onChangeText={v => { setDate(v); setErrors(p => ({ ...p, date: undefined })); }}
              placeholder="2026-08-17"
              placeholderTextColor={Colors.outline}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              selectionColor={Colors.primary}
            />
            {!!errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional note"
              placeholderTextColor={Colors.outline}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              selectionColor={Colors.primary}
            />
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleSave}
            disabled={loading}
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
  safe:         { flex: 1, backgroundColor: Colors.background },
  kav:          { flex: 1 },
  scroll:       { paddingHorizontal: Spacing.marginMobile, paddingBottom: Spacing.xxl },
  headerRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, marginBottom: Spacing.sm },
  backArrow:    { color: Colors.textPrimary, fontSize: 24 },
  headline:     { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },
  field:        { marginBottom: Spacing.md, gap: 6 },
  label:        { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  input:        { backgroundColor: Colors.surfaceContainerHigh, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.outlineVariant, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md - 2, color: Colors.textPrimary, fontSize: 15 },
  multiline:    { minHeight: 90, paddingTop: Spacing.md - 2 },
  inputError:   { borderColor: Colors.danger },
  selector:     { backgroundColor: Colors.surfaceContainerHigh, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.outlineVariant, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md - 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectorText: { color: Colors.textPrimary, fontSize: 15 },
  placeholder:  { color: Colors.outline },
  chevron:      { color: Colors.textSecondary, fontSize: 14 },
  errorText:    { color: Colors.danger, fontSize: 12 },
  btnPrimary:   { backgroundColor: Colors.primaryContainer, borderRadius: Radius.lg, paddingVertical: Spacing.md + 2, alignItems: 'center', marginTop: Spacing.sm },
  btnDisabled:  { opacity: 0.65 },
  btnText:      { color: Colors.onPrimary, fontSize: 16, fontWeight: '600' },
});

export default AddExpenseScreen;