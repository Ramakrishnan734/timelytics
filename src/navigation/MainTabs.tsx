/**
 * MainTabs.tsx
 *
 * Bottom tab navigator shown when the user IS logged in.
 * 5 tabs:  Home | Expenses | Budget | Stopwatch | Profile
 *
 * Session 9: Replaced the placeholder "Productivity" tab with "Budget"
 *   (BudgetManagementScreen) to satisfy the competition requirement:
 *   "Set a monthly budget and show amount spent/remaining."
 *
 * The Expenses tab is a nested stack (ExpensesStack) so the history list,
 * add form, and edit form can push/pop without touching the tab bar.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import DashboardScreen        from '../screens/home/DashboardScreen';
import ExpensesStack          from './ExpensesStack';
import BudgetManagementScreen from '../screens/budget/BudgetManagementScreen';
import StopwatchScreen        from '../screens/stopwatch/StopwatchScreen';
import ProfileScreen          from '../screens/profile/ProfileScreen';
import { Colors }             from '../constants/colors';

export type MainTabParamList = {
  Home:      undefined;
  Expenses:  undefined;
  Budget:    undefined;
  Stopwatch: undefined;
  Profile:   undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surfaceContainerLow,
          borderTopColor:  Colors.outlineVariant,
          borderTopWidth:  1,
          height:          64,
          paddingBottom:   10,
        },
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: Colors.onSurfaceVariant,
        tabBarLabelStyle: {
          fontSize:   11,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen name="Home"      component={DashboardScreen}        options={{ tabBarLabel: 'Home' }}      />
      <Tab.Screen name="Expenses"  component={ExpensesStack}          options={{ tabBarLabel: 'Expenses' }}  />
      <Tab.Screen name="Budget"    component={BudgetManagementScreen} options={{ tabBarLabel: 'Budget' }}    />
      <Tab.Screen name="Stopwatch" component={StopwatchScreen}        options={{ tabBarLabel: 'Stopwatch' }} />
      <Tab.Screen name="Profile"   component={ProfileScreen}          options={{ tabBarLabel: 'Profile' }}   />
    </Tab.Navigator>
  );
};

export default MainTabs;
