/**
 * AuthStack.tsx
 *
 * Stack navigator shown when the user is NOT logged in.
 * Flow: Splash → Welcome → Login ↔ SignUp → ForgotPassword
 *
 * createNativeStackNavigator gives native animations on iOS & Android.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen        from '../screens/auth/SplashScreen';
import WelcomeScreen       from '../screens/auth/WelcomeScreen';
import LoginScreen         from '../screens/auth/LoginScreen';
import SignUpScreen        from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import { Colors }          from '../constants/colors';

// ─── Route param types (TypeScript safety) ──────────────────────────────────
// Screens that take no params get undefined. We'll add params later as needed.
export type AuthStackParamList = {
  Splash:         undefined;
  Welcome:        undefined;
  Login:          undefined;
  SignUp:         undefined;
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown:     false,          // Our screens have custom AppBars
        contentStyle:    { backgroundColor: Colors.background },
        animation:       'slide_from_right',
      }}
    >
      <Stack.Screen name="Splash"         component={SplashScreen}         />
      <Stack.Screen name="Welcome"        component={WelcomeScreen}        />
      <Stack.Screen name="Login"          component={LoginScreen}          />
      <Stack.Screen name="SignUp"         component={SignUpScreen}         />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};

export default AuthStack;
