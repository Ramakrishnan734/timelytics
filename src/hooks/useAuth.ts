/**
 * useAuth.ts
 *
 * Subscribes to Firebase Authentication state changes.
 * Returns { user, loading }:
 *   - loading: true while Firebase is still determining if a session exists
 *   - user:    the Firebase User object, or null if not logged in
 *
 * App.tsx uses this to decide which navigator to render (AuthStack vs MainTabs).
 * This pattern means screens NEVER need to check auth state themselves.
 */

import { useState, useEffect } from 'react';
import { User }                from 'firebase/auth';
import { subscribeToAuthState } from '../services/authService';

interface AuthState {
  user:    User | null;
  loading: boolean;
}

const useAuth = (): AuthState => {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);  // true until first auth event fires

  useEffect(() => {
    // Subscribe — Firebase calls this immediately with the current state,
    // then again whenever sign-in or sign-out happens.
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    // Cleanup: unsubscribe when the component using this hook unmounts.
    return unsubscribe;
  }, []);

  return { user, loading };
};

export default useAuth;
