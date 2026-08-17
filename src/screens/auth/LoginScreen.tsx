/**
 * LoginScreen.tsx
 *
 * Username + password login.
 * Username is resolved to real email via userService before Firebase Auth call.
 * Never exposes internal email to the user.
 *
 * Error states handled:
 *   - Empty fields
 *   - Username not found
 *   - Wrong password / invalid credential
 *   - Too many attempts
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

import { logIn, getAuthErrorMessage } from '../../services/authService';
import AuthInput                      from '../../components/common/AuthInput';
import { Colors }  from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { AuthStackParamList } from '../../navigation/AuthStack';

type LoginNav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface FieldErrors {
  username?: string;
  password?: string;
}

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNav>();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors,   setErrors]   = useState<FieldErrors>({});
  const [apiError, setApiError] = useState('');
  const [loading,  setLoading]  = useState(false);

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const next: FieldErrors = {};

    if (!username.trim()) {
      next.username = 'Username is required.';
    } else if (username.trim().length < 3) {
      next.username = 'Username must be at least 3 characters.';
    }

    if (!password) {
      next.password = 'Password is required.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    setApiError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await logIn(username.trim(), password);
      // useAuth in App.tsx detects auth state change → navigates to MainTabs automatically
    } catch (err: any) {
      setApiError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={styles.headline}>Welcome back</Text>
            <Text style={styles.sub}>Sign in to your account</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <AuthInput
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChangeText={t => { setUsername(t); setErrors(e => ({ ...e, username: undefined })); setApiError(''); }}
              error={errors.username}
              autoCapitalize="none"
              returnKeyType="next"
            />

            <AuthInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: undefined })); setApiError(''); }}
              error={errors.password}
              isPassword
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            {/* API-level error */}
            {!!apiError && (
              <View style={styles.apiErrorBox}>
                <Text style={styles.apiErrorText}>{apiError}</Text>
              </View>
            )}

            {/* Forgot password */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={Colors.onPrimary} />
              : <Text style={styles.btnPrimaryText}>Log In</Text>
            }
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.footerLink}>Sign Up</Text>
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
    marginBottom: Spacing.xl + Spacing.md,
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
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.xs,
  },
  forgotText: {
    color:    Colors.primary,
    fontSize: 13,
    fontWeight: '500',
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems:     'center',
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

export default LoginScreen;
