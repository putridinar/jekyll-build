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
import { createSessionCookie, signOutUser, initializeUser } from '@/actions/user';

interface CustomUser extends User {
    role?: string;
}
interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithGitHub: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      // Force refresh the token to get latest claims if needed, but Firestore is our source of truth for role.
      await currentUser.getIdToken(true); 
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const updatedUser = { ...currentUser, role: userSnap.data()?.role };
        setUser(updatedUser);
        console.log('User data manually refreshed on client.', updatedUser);
      }
    }
  }, []);

  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      // Clean up previous snapshot listener if it exists
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }

      if (authUser) {
        const userRef = doc(db, 'users', authUser.uid);
        
        // Set up a real-time listener for the user's document for live role updates
        const unsubFromDoc = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                console.log("User data updated via snapshot listener.");
                setUser({ ...authUser, role: docSnap.data()?.role });
            }
        });
        unsubRef.current = unsubFromDoc;
        
        // Initial load or first-time login
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            // This is a new user, initialize them in Firestore
            await initializeUser({
                uid: authUser.uid,
                email: authUser.email,
                displayName: authUser.displayName,
                photoURL: authUser.photoURL,
            });
            // For new users, immediately set the user state with the default role
            setUser({ ...authUser, role: 'freeUser' });
        } else {
            // Existing user, set initial data
            setUser({ ...authUser, role: userSnap.data()?.role });
        }
        
        // Create server-side session cookie for server actions and API routes
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
      // Also clean up the snapshot listener when the component unmounts
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
          // The onAuthStateChanged listener will handle the rest of the logic
      } catch (error) {
          console.error("Error during sign-in:", error);
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
      console.error("Error signing out:", error);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};