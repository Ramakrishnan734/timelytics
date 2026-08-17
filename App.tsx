/**
 * App.tsx — Root component
 *
 * Responsibilities:
 *   1. Provide the NavigationContainer (required wrapper for all navigation)
 *   2. Listen to Firebase Auth state via useAuth()
 *   3. Show a loading spinner while Firebase resolves the session
 *   4. Render AuthStack (not logged in) or MainTabs (logged in)
 *
 * STEP 1 NOTE:
 * FIREBASE_TEST_MODE = true bypasses auth and shows the Firebase test screen.
 * Set it to false once all 4 Firebase tests pass and you are ready for Step 2.
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer }                 from '@react-navigation/native';
import { SafeAreaProvider }                    from 'react-native-safe-area-context';

import useAuth            from './src/hooks/useAuth';
import AuthStack          from './src/navigation/AuthStack';
import MainTabs           from './src/navigation/MainTabs';
import FirebaseTestScreen from './src/screens/auth/FirebaseTestScreen';
import { Colors }         from './src/constants/colors';

// Step 1 verified. Set to true temporarily to re-run Firebase tests.
const FIREBASE_TEST_MODE = false;

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (FIREBASE_TEST_MODE) {
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <FirebaseTestScreen />
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {user ? <MainTabs /> : <AuthStack />}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
