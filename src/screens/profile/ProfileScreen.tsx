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
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Unable to load profile.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>

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
      </View>

      {/* ── Avatar + name ── */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{getInitial(profile.username)}</Text>
        </View>
        <Text style={styles.username}>@{profile.username}</Text>
        <Text style={styles.email}>{profile.email}</Text>
      </View>

      {/* ── Info card ── */}
      <View style={styles.card}>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Display Name</Text>
          <Text style={styles.rowValue}>{profile.displayName || profile.username}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Currency</Text>
          <Text style={styles.rowValue}>{profile.currency}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Member Since</Text>
          <Text style={styles.rowValue}>{formatDate(profile.createdAt)}</Text>
        </View>

      </View>

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

  // Avatar section
  avatarSection: {
    alignItems:    'center',
    marginBottom:  Spacing.xl,
  },
  avatar: {
    width:           72,
    height:          72,
    borderRadius:    Radius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    Spacing.md,
  },
  avatarInitial: {
    ...Typography.titleLg,
    color:      Colors.onPrimaryContainer,
    fontSize:   28,
    lineHeight: 34,
  },
  username: {
    ...Typography.titleLg,
    color:        Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  email: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
  },

  // Info card
  card: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius:    Radius.xl,
    padding:         Spacing.lg,
    marginBottom:    Spacing.xl,
  },
  row: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingVertical: Spacing.sm,
  },
  rowLabel: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
  },
  rowValue: {
    ...Typography.bodyMd,
    color:     Colors.textPrimary,
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
    marginTop:         Spacing.sm,
  },
  signOutText: {
    ...Typography.bodyLg,
    color:      Colors.danger,
    fontWeight: '600',
  },

  // Error state
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
    backgroundColor:   Colors.surfaceContainerHigh,
    marginBottom:      Spacing.xl,
  },
  retryText: {
    ...Typography.bodyMd,
    color: Colors.primary,
  },
});

export default ProfileScreen;
