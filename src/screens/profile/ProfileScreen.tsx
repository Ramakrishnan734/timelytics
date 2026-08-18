import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Colors }     from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Spacing, Radius } from '../../constants/spacing';
import { logOut, getCurrentUser } from '../../services/authService';
import { getUserProfile, UserProfile } from '../../services/userService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the user's first initial in uppercase, or '?' as fallback. */
function getInitial(username: string): string {
  return username.trim().charAt(0).toUpperCase() || '?';
}

/** Formats a Firestore Timestamp or plain date value as a readable string. */
function formatDate(createdAt: UserProfile['createdAt']): string {
  try {
    // Firestore Timestamp has a .toDate() method
    const date: Date =
      typeof (createdAt as any).toDate === 'function'
        ? (createdAt as any).toDate()
        : new Date((createdAt as any).seconds * 1000);

    return date.toLocaleDateString('en-IN', {
      year:  'numeric',
      month: 'long',
      day:   'numeric',
    });
  } catch {
    return '—';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ProfileScreen: React.FC = () => {
  const [profile,    setProfile]    = useState<UserProfile | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Load profile on mount
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setError('No authenticated user found.');
        return;
      }
      const data = await getUserProfile(currentUser.uid);
      if (!data) {
        setError('Profile not found. Please sign in again.');
        return;
      }
      setProfile(data);
    } catch {
      setError('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Sign out — auth state change handled by useAuth → App.tsx
  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logOut();
    } catch {
      setSigningOut(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error ?? 'Unable to load profile.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={signingOut}
          accessibilityLabel="Sign out"
        >
          {signingOut
            ? <ActivityIndicator size="small" color={Colors.danger} />
            : <Text style={styles.signOutText}>Sign Out</Text>
          }
        </TouchableOpacity>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Profile</Text>
        <Text style={styles.screenSubtitle}>@{profile.username}</Text>
      </View>

      {/* ── Hero card: Avatar + name ── */}
      <View style={styles.heroCard}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{getInitial(profile.username)}</Text>
          </View>
        </View>
        <Text style={styles.displayName}>{profile.displayName || profile.username}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        <Text style={styles.email}>{profile.email}</Text>
      </View>

      {/* ── Section: Account Info ── */}
      <Text style={styles.sectionHeader}>ACCOUNT INFO</Text>

      {/* ── Info card ── */}
      <View style={styles.card}>

        <View style={styles.row}>
          <View style={styles.rowLabelGroup}>
            <Text style={styles.rowEmoji}>👤</Text>
            <Text style={styles.rowLabel}>Display Name</Text>
          </View>
          <Text style={styles.rowValue}>{profile.displayName || profile.username}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowLabelGroup}>
            <Text style={styles.rowEmoji}>💰</Text>
            <Text style={styles.rowLabel}>Currency</Text>
          </View>
          <Text style={styles.rowValue}>{profile.currency}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowLabelGroup}>
            <Text style={styles.rowEmoji}>📅</Text>
            <Text style={styles.rowLabel}>Member Since</Text>
          </View>
          <Text style={styles.rowValue}>{formatDate(profile.createdAt)}</Text>
        </View>

      </View>

      {/* ── Section: Account ── */}
      <Text style={styles.sectionHeader}>ACCOUNT</Text>

      {/* ── Sign Out ── */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        disabled={signingOut}
        accessibilityLabel="Sign out"
      >
        {signingOut
          ? <ActivityIndicator size="small" color={Colors.danger} />
          : <Text style={styles.signOutText}>Sign Out</Text>
        }
      </TouchableOpacity>

    </ScrollView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Layout helpers
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.marginMobile,
    paddingBottom:     Spacing.xxl,
  },
  centered: {
    flex:            1,
    backgroundColor: Colors.background,
    alignItems:      'center',
    justifyContent:  'center',
    padding:         Spacing.lg,
    gap:             Spacing.lg,
  },

  // Header
  header: {
    paddingTop:    Spacing.xxl,
    paddingBottom: Spacing.lg,
  },
  screenTitle: {
    ...Typography.headlineLgMobile,
    color: Colors.textPrimary,
  },
  screenSubtitle: {
    ...Typography.bodyMd,
    color:   Colors.textSecondary,
    marginTop: Spacing.xs,
  },

  // Hero card
  heroCard: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius:    Radius.xl,
    padding:         Spacing.xl,
    alignItems:      'center',
    marginBottom:    Spacing.xl,
  },
  avatarRing: {
    width:           100,
    height:          100,
    borderRadius:    50,
    borderWidth:     2,
    borderColor:     Colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    Spacing.md,
  },
  avatar: {
    width:           88,
    height:          88,
    borderRadius:    44,
    backgroundColor: Colors.primaryContainer,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarInitial: {
    ...Typography.titleLg,
    color:      Colors.onPrimaryContainer,
    fontSize:   32,
    lineHeight: 38,
  },
  displayName: {
    ...Typography.titleLg,
    color:        Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  username: {
    ...Typography.bodyMd,
    color:        Colors.primary,
    marginBottom: Spacing.xs,
  },
  email: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
  },

  // Section headers
  sectionHeader: {
    ...Typography.bodyMd,
    color:         Colors.textSecondary,
    fontSize:      11,
    letterSpacing: 1.2,
    fontWeight:    '600',
    marginBottom:  Spacing.sm,
    marginLeft:    Spacing.xs,
  },

  // Info card
  card: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius:    Radius.xl,
    paddingVertical:   Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom:    Spacing.xl,
  },
  row: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    paddingVertical: Spacing.md,
  },
  rowLabelGroup: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },
  rowEmoji: {
    fontSize:   16,
    lineHeight: 20,
  },
  rowLabel: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
  },
  rowValue: {
    ...Typography.bodyMd,
    color:      Colors.textPrimary,
    fontWeight: '500',
    flexShrink: 1,
    textAlign:  'right',
    marginLeft: Spacing.md,
  },
  divider: {
    height:          1,
    backgroundColor: Colors.outlineVariant,
  },

  // Sign Out
  signOutButton: {
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius:      Radius.lg,
    borderWidth:       1,
    borderColor:       Colors.danger,
    alignSelf:         'center',
    minWidth:          160,
    alignItems:        'center',
  },
  signOutText: {
    ...Typography.bodyLg,
    color:      Colors.danger,
    fontWeight: '600',
  },

  // Loading
  loadingText: {
    ...Typography.bodyMd,
    color:     Colors.textSecondary,
    marginTop: Spacing.md,
  },

  // Error state
  errorCard: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius:    Radius.xl,
    padding:         Spacing.xl,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     Colors.errorContainer,
    width:           '100%',
  },
  errorIcon: {
    fontSize:     32,
    marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.bodyMd,
    color:        Colors.textSecondary,
    textAlign:    'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    paddingVertical:   Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius:      Radius.lg,
    backgroundColor:   Colors.surfaceContainerHighest,
  },
  retryText: {
    ...Typography.bodyMd,
    color:      Colors.primary,
    fontWeight: '500',
  },
});

export default ProfileScreen;
