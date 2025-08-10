// src/hooks/use-auth.tsx
'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { createSessionCookie, signOutUser, initializeUser, updateUserRole } from '@/actions/user';

interface CustomUser extends User {
  role?: string;
  payerId?: string;
}

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithGitHub: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserRole: (newRole: 'freeUser' | 'proUser', licenseId: string, payerId?: string, subscriptionId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await currentUser.getIdToken(true);
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const updatedUser = { ...currentUser, role: userSnap.data()?.role, payerId: userSnap.data()?.payerId };
        setUser(updatedUser);
        console.log('User data manually refreshed on client.', updatedUser);
      }
    }
  }, []);

  const updateUserRoleHandler = useCallback(async (newRole: 'freeUser' | 'proUser', licenseId: string, payerId?: string, subscriptionId?: string) => {
    try {
      setLoading(true);
      const result = await updateUserRole(newRole, licenseId, payerId, subscriptionId); // Panggil server action
      if (!result.success) {
        throw new Error(result.error || 'Failed to update user role');
      }
      await refreshUser();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);

  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }

      if (authUser) {
        const userRef = doc(db, 'users', authUser.uid);
        const unsubFromDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            console.log('User data updated via snapshot listener.');
            setUser({ ...authUser, role: docSnap.data()?.role, payerId: docSnap.data()?.payerId });
          }
        });
        unsubRef.current = unsubFromDoc;

        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await initializeUser({
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName,
            photoURL: authUser.photoURL,
          });
          setUser({ ...authUser, role: 'freeUser' });
        } else {
          setUser({ ...authUser, role: userSnap.data()?.role, payerId: userSnap.data()?.payerId });
        }

        const idToken = await authUser.getIdToken();
        await createSessionCookie(idToken);
        setLoading(false);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, []);

  const loginWithProvider = async (provider: GoogleAuthProvider | GithubAuthProvider) => {
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error during sign-in:', error);
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    await loginWithProvider(new GoogleAuthProvider());
  };

  const loginWithGitHub = async () => {
    await loginWithProvider(new GithubAuthProvider());
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      await signOutUser();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    loginWithGoogle,
    loginWithGitHub,
    logout,
    refreshUser,
    updateUserRole: updateUserRoleHandler,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}