/**
 * SplashScreen.tsx
 *
 * Brand splash screen shown briefly on cold start.
 * Auto-navigates to Welcome after 2 seconds.
 * No user interaction required.
 *
 * Design: dark background, centered logo mark + app name + tagline.
 * Uses only Colors and Spacing tokens — no external icon packages.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation }             from '@react-navigation/native';
import { Colors }  from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { AuthStackParamList } from '../../navigation/AuthStack';

type SplashNav = NativeStackNavigationProp<AuthStackParamList, 'Splash'>;

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashNav>();

  // Fade-in animation
  const opacity = new Animated.Value(0);
  const scale   = new Animated.Value(0.88);

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 600, useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1, friction: 8, tension: 60, useNativeDriver: true,
      }),
    ]).start();

    // Navigate to Welcome after 2.2s
    const timer = setTimeout(() => {
      navigation.replace('Welcome');
    }, 2200);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        {/* Logo mark */}
        <View style={styles.logoContainer}>
          <View style={styles.logoOuter}>
            <View style={styles.logoInner}>
              <Text style={styles.logoSymbol}>⏱</Text>
            </View>
          </View>
        </View>

        {/* App name */}
        <Text style={styles.appName}>Timelytics</Text>

        {/* Tagline */}
        <Text style={styles.tagline}>Track time. Spend wisely. Improve your day </Text>
      </Animated.View>

      {/* Bottom version */}
      <Text style={styles.version}>v1.0</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: Colors.background,
    alignItems:      'center',
    justifyContent:  'center',
  },
  content: {
    alignItems: 'center',
    gap:        Spacing.md,
  },
  logoContainer: {
    marginBottom: Spacing.sm,
  },
  logoOuter: {
    width:           88,
    height:          88,
    borderRadius:    Radius.xl,
    backgroundColor: Colors.primaryContainer,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     Colors.primary,
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   0.45,
    shadowRadius:    20,
    elevation:       12,
  },
  logoInner: {
    width:           64,
    height:          64,
    borderRadius:    Radius.lg,
    backgroundColor: Colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  logoSymbol: {
    fontSize: 30,
  },
  appName: {
    color:       Colors.textPrimary,
    fontSize:    32,
    fontWeight:  '700',
    letterSpacing: -0.5,
    marginTop:   Spacing.sm,
  },
  tagline: {
    color:    Colors.textSecondary,
    fontSize: 15,
    fontWeight: '400',
  },
  version: {
    position: 'absolute',
    bottom:   Spacing.xl,
    color:    Colors.outline,
    fontSize: 12,
  },
});

export default SplashScreen;
