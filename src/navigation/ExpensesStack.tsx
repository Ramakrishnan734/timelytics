/**
 * ExpensesStack.tsx
 *
 * Nested stack navigator mounted inside the Expenses bottom tab.
 * Routes:
 *   ExpensesList  — history list (default)
 *   AddExpense    — new expense form
 *   EditExpense   — same form, pre-filled with an existing expense
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ExpensesHistoryScreen from '../screens/expenses/ExpensesHistoryScreen';
import AddExpenseScreen      from '../screens/expenses/AddExpenseScreen';
import { Colors }            from '../constants/colors';
import { Expense }           from '../services/expenseService';

export type ExpensesStackParamList = {
  ExpensesList: undefined;
  AddExpense:   undefined;
  EditExpense:  { expense: Expense };
};

const Stack = createNativeStackNavigator<ExpensesStackParamList>();

const ExpensesStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown:  false,
      contentStyle: { backgroundColor: Colors.background },
      animation:    'slide_from_right',
    }}
  >
    <Stack.Screen name="ExpensesList" component={ExpensesHistoryScreen} />
    <Stack.Screen name="AddExpense"   component={AddExpenseScreen}      />
    <Stack.Screen name="EditExpense"  component={AddExpenseScreen}      />
  </Stack.Navigator>
);

export default ExpensesStack;