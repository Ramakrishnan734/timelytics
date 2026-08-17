/**
 * ForgotPasswordScreen.tsx
 *
 * Password recovery via username lookup → real email → Firebase reset email.
 *
 * Flow:
 *   1. User enters their username
 *   2. sendPasswordReset() resolves username → real email via Firestore
 *   3. Firebase sends a reset link to the real email address
 *   4. UI shows success state (email sent) — does not reveal the email address
 *      to protect privacy, just confirms "we sent instructions to the email
 *      address associated with your account"
 *
 * Error states handled:
 *   - Empty username
 *   - Username not found
 *   - Network error
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView }              from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation }             from '@react-navigation/native';

import { sendPasswordReset, getAuthErrorMessage } from '../../services/authService';
import AuthInput                                   from '../../components/common/AuthInput';
import { Colors }  from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { AuthStackParamList } from '../../navigation/AuthStack';

type ForgotNav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ForgotNav>();

  const [username,  setUsername]  = useState('');
  const [fieldError, setFieldError] = useState('');
  const [apiError,  setApiError]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [sent,      setSent]      = useState(false);   // success state

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleReset = async () => {
    setApiError('');
    setFieldError('');

    if (!username.trim()) {
      setFieldError('Username is required.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(username.trim());
      setSent(true);
    } catch (err: any) {
      setApiError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────

  if (sent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>✉️</Text>
          </View>

          <Text style={styles.successHeadline}>Check your email</Text>
          <Text style={styles.successBody}>
            We've sent password reset instructions to the email address associated with{' '}
            <Text style={styles.successUsername}>@{username.toLowerCase().trim()}</Text>.
            {'\n\n'}
            Check your inbox and follow the link to set a new password.
          </Text>

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>Back to Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendBtn}
            onPress={() => setSent(false)}
          >
            <Text style={styles.resendText}>Didn't receive it? Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Form state ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Header */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.headline}>Reset password</Text>
            <Text style={styles.sub}>
              Enter your username and we'll send reset instructions to the email address on your account.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <AuthInput
              label="Username"
              placeholder="Your username"
              value={username}
              onChangeText={t => { setUsername(t); setFieldError(''); setApiError(''); }}
              error={fieldError}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleReset}
            />

            {/* API-level error */}
            {!!apiError && (
              <View style={styles.apiErrorBox}>
                <Text style={styles.apiErrorText}>{apiError}</Text>
              </View>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleReset}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={Colors.onPrimary} />
              : <Text style={styles.btnPrimaryText}>Send Reset Link</Text>
            }
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Log In</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex:            1,
    backgroundColor: Colors.background,
  },
  kav: {
    flex: 1,
  },

  // ── Success ───────────────────────────────────────────────────────────────
  successContainer: {
    flex:              1,
    paddingHorizontal: Spacing.marginMobile,
    alignItems:        'center',
    justifyContent:    'center',
    gap:               Spacing.md,
  },
  successIcon: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    Spacing.sm,
  },
  successEmoji: {
    fontSize: 36,
  },
  successHeadline: {
    color:       Colors.textPrimary,
    fontSize:    24,
    fontWeight:  '700',
    textAlign:   'center',
    letterSpacing: -0.3,
  },
  successBody: {
    color:      Colors.textSecondary,
    fontSize:   15,
    textAlign:  'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.sm,
  },
  successUsername: {
    color:      Colors.primary,
    fontWeight: '600',
  },

  // ── Form ──────────────────────────────────────────────────────────────────
  scroll: {
    flexGrow:          1,
    paddingHorizontal: Spacing.marginMobile,
    paddingBottom:     Spacing.xl,
  },
  backBtn: {
    marginTop:    Spacing.md,
    marginBottom: Spacing.sm,
    alignSelf:    'flex-start',
  },
  backArrow: {
    color:    Colors.textPrimary,
    fontSize: 24,
  },
  header: {
    marginBottom: Spacing.xl,
    gap:          Spacing.sm,
  },
  headline: {
    color:       Colors.textPrimary,
    fontSize:    28,
    fontWeight:  '700',
    letterSpacing: -0.3,
  },
  sub: {
    color:      Colors.textSecondary,
    fontSize:   15,
    lineHeight: 22,
  },
  form: {
    gap:          Spacing.md,
    marginBottom: Spacing.xl,
  },
  apiErrorBox: {
    backgroundColor: Colors.errorContainer + '33',
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     Colors.errorContainer,
    padding:         Spacing.md,
  },
  apiErrorText: {
    color:    Colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  btnPrimary: {
    backgroundColor: Colors.primaryContainer,
    borderRadius:    Radius.lg,
    paddingVertical: Spacing.md + 2,
    alignItems:      'center',
    marginBottom:    Spacing.xl,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  btnPrimaryText: {
    color:      Colors.onPrimary,
    fontSize:   16,
    fontWeight: '600',
  },
  resendBtn: {
    marginTop: Spacing.sm,
  },
  resendText: {
    color:    Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    paddingBottom:  Spacing.sm,
  },
  footerText: {
    color:    Colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color:      Colors.primary,
    fontSize:   14,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;
