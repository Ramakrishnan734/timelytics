import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { logOut } from '../../services/authService';

// ProfileScreen - PLACEHOLDER. Full UI implemented per Stitch design in later steps.
const ProfileScreen: React.FC = () => {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logOut();
      // Auth state change is handled by useAuth → App.tsx switches to AuthStack automatically.
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>ProfileScreen</Text>

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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: Colors.textPrimary,
    fontSize: 18,
    marginBottom: 32,
  },
  signOutButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.danger,
    minWidth: 120,
    alignItems: 'center',
  },
  signOutText: {
    color: Colors.danger,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;