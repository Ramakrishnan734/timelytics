/**
 * SignUpScreen.tsx
 *
 * Registration: username + real email + password + confirm password.
 *
 * Flow:
 *   1. Client-side validation (all fields, email format, password match, strength)
 *   2. signUp() → checks username uniqueness → checks email uniqueness
 *      → creates Firebase Auth user (with real email)
 *      → writes Firestore profile in atomic transaction
 *   3. On success, useAuth in App.tsx detects the new session → navigates to MainTabs
 *
 * Error states handled:
 *   - Empty fields
 *   - Invalid email format
 *   - Username too short / invalid chars
 *   - Password too short
 *   - Passwords not matching
 *   - Username already taken
 *   - Email already registered
 *   - Network error
 *   - Weak password (Firebase)
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

import { signUp, getAuthErrorMessage } from '../../services/authService';
import AuthInput                        from '../../components/common/AuthInput';
import { Colors }  from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { AuthStackParamList } from '../../navigation/AuthStack';

type SignUpNav = NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;

interface FieldErrors {
  username?:  string;
  email?:     string;
  password?:  string;
  confirm?:   string;
}

// Simple email regex — Firebase validates definitively on the server
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Username: 3–20 chars, letters/digits/underscores/hyphens
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;

const SignUpScreen: React.FC = () => {
  const navigation = useNavigation<SignUpNav>();

  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [errors,   setErrors]   = useState<FieldErrors>({});
  const [apiError, setApiError] = useState('');
  const [loading,  setLoading]  = useState(false);

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const next: FieldErrors = {};

    if (!username.trim()) {
      next.username = 'Username is required.';
    } else if (!USERNAME_RE.test(username.trim())) {
      next.username = 'Username must be 3–20 characters: letters, numbers, _ or -.';
    }

    if (!email.trim()) {
      next.email = 'Email address is required.';
    } else if (!EMAIL_RE.test(email.trim())) {
      next.email = 'Please enter a valid email address.';
    }

    if (!password) {
      next.password = 'Password is required.';
    } else if (password.length < 6) {
      next.password = 'Password must be at least 6 characters.';
    }

    if (!confirm) {
      next.confirm = 'Please confirm your password.';
    } else if (confirm !== password) {
      next.confirm = 'Passwords do not match.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSignUp = async () => {
    setApiError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await signUp(username.trim(), email.trim(), password);
      // useAuth detects the new session and navigates to MainTabs automatically
    } catch (err: any) {
      setApiError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const clearFieldError = (field: keyof FieldErrors) =>
    setErrors(e => ({ ...e, [field]: undefined }));

  // ── Render ────────────────────────────────────────────────────────────────

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
            <Text style={styles.headline}>Create account</Text>
            <Text style={styles.sub}>Start tracking your finances</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <AuthInput
              label="Username"
              placeholder="Choose a username"
              value={username}
              onChangeText={t => { setUsername(t); clearFieldError('username'); setApiError(''); }}
              error={errors.username}
              autoCapitalize="none"
              returnKeyType="next"
            />

            <AuthInput
              label="Email Address"
              placeholder="your@email.com"
              value={email}
              onChangeText={t => { setEmail(t); clearFieldError('email'); setApiError(''); }}
              error={errors.email}
              keyboardType="email-address"
              returnKeyType="next"
            />

            {/* Email usage note */}
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>
                📧  Your email is only used for password recovery. Your username is used to log in.
              </Text>
            </View>

            <AuthInput
              label="Password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={t => { setPassword(t); clearFieldError('password'); setApiError(''); }}
              error={errors.password}
              isPassword
              returnKeyType="next"
            />

            <AuthInput
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirm}
              onChangeText={t => { setConfirm(t); clearFieldError('confirm'); setApiError(''); }}
              error={errors.confirm}
              isPassword
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
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
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={Colors.onPrimary} />
              : <Text style={styles.btnPrimaryText}>Create Account</Text>
            }
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
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
    marginBottom: Spacing.lg,
    gap:          Spacing.xs,
  },
  headline: {
    color:       Colors.textPrimary,
    fontSize:    28,
    fontWeight:  '700',
    letterSpacing: -0.3,
  },
  sub: {
    color:    Colors.textSecondary,
    fontSize: 15,
  },
  form: {
    gap:          Spacing.md,
    marginBottom: Spacing.xl,
  },
  noteBox: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius:    Radius.md,
    padding:         Spacing.sm + 4,
    borderWidth:     1,
    borderColor:     Colors.outlineVariant,
    marginTop:       -Spacing.xs,
    marginBottom:    Spacing.xs,
  },
  noteText: {
    color:    Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
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

export default SignUpScreen;
