/**
 * WelcomeScreen.tsx
 *
 * App introduction screen shown after splash.
 * Two actions: Log In, Sign Up.
 * No auth logic here — this is pure navigation.
 *
 * Stitch design: dark background, centered hero illustration area,
 * headline + subtitle, stacked CTA buttons.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation }             from '@react-navigation/native';
import { Colors }  from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { AuthStackParamList } from '../../navigation/AuthStack';

type WelcomeNav = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<WelcomeNav>();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Hero area */}
        <View style={styles.heroArea}>
          {/* Decorative rings */}
          <View style={styles.ring3} />
          <View style={styles.ring2} />
          <View style={styles.ring1} />
          <View style={styles.heroIcon}>
            <Text style={styles.heroSymbol}>⏱</Text>
          </View>

          {/* Floating stat chips */}
          <View style={[styles.chip, styles.chipTopLeft]}>
            <Text style={styles.chipText}>₹12,450 saved</Text>
          </View>
          <View style={[styles.chip, styles.chipBottomRight]}>
            <Text style={styles.chipText}>4h 20m focused</Text>
          </View>
        </View>

        {/* Text */}
        <View style={styles.textArea}>
          <Text style={styles.headline}>Your finances,{'\n'}finally in focus.</Text>
          <Text style={styles.subtitle}>
            Track expenses, set budgets, and stay productive — all in one place.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => navigation.navigate('SignUp')}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={styles.btnSecondaryText}>Log In</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex:            1,
    backgroundColor: Colors.background,
  },
  container: {
    flex:            1,
    paddingHorizontal: Spacing.marginMobile,
    paddingBottom:   Spacing.xl,
    alignItems:      'center',
    justifyContent:  'space-between',
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroArea: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    width:          '100%',
    marginTop:      Spacing.xl,
  },
  ring1: {
    position:        'absolute',
    width:           140,
    height:          140,
    borderRadius:    70,
    borderWidth:     1.5,
    borderColor:     Colors.primary + '55',
  },
  ring2: {
    position:        'absolute',
    width:           200,
    height:          200,
    borderRadius:    100,
    borderWidth:     1,
    borderColor:     Colors.primary + '28',
  },
  ring3: {
    position:        'absolute',
    width:           270,
    height:          270,
    borderRadius:    135,
    borderWidth:     1,
    borderColor:     Colors.primary + '14',
  },
  heroIcon: {
    width:           100,
    height:          100,
    borderRadius:    Radius.xl,
    backgroundColor: Colors.primaryContainer,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     Colors.primary,
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   0.5,
    shadowRadius:    24,
    elevation:       14,
  },
  heroSymbol: {
    fontSize: 42,
  },
  chip: {
    position:        'absolute',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius:    Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical:   6,
    borderWidth:     1,
    borderColor:     Colors.outlineVariant,
  },
  chipTopLeft: {
    top:  30,
    left: 16,
  },
  chipBottomRight: {
    bottom: 30,
    right:  16,
  },
  chipText: {
    color:    Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Text ──────────────────────────────────────────────────────────────────
  textArea: {
    alignItems:   'center',
    gap:          Spacing.sm,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  headline: {
    color:       Colors.textPrimary,
    fontSize:    28,
    fontWeight:  '700',
    textAlign:   'center',
    lineHeight:  36,
    letterSpacing: -0.3,
  },
  subtitle: {
    color:     Colors.textSecondary,
    fontSize:  15,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Buttons ───────────────────────────────────────────────────────────────
  actions: {
    width: '100%',
    gap:   Spacing.sm,
  },
  btnPrimary: {
    backgroundColor: Colors.primaryContainer,
    borderRadius:    Radius.lg,
    paddingVertical: Spacing.md + 2,
    alignItems:      'center',
  },
  btnPrimaryText: {
    color:      Colors.onPrimary,
    fontSize:   16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  btnSecondary: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius:    Radius.lg,
    paddingVertical: Spacing.md + 2,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     Colors.outlineVariant,
  },
  btnSecondaryText: {
    color:      Colors.textPrimary,
    fontSize:   16,
    fontWeight: '600',
  },
});

export default WelcomeScreen;
