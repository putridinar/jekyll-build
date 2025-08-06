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
      await currentUser.getIdToken(true); 
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const updatedUser = { ...currentUser, role: userSnap.data()?.role };
        setUser(updatedUser);
      }
    }
  }, []);

  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }

      if (authUser) {
        const userRef = doc(db, 'users', authUser.uid);
        
        unsubRef.current = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                setUser({ ...authUser, role: docSnap.data()?.role });
            }
        });
        
        const idToken = await authUser.getIdToken();
        await createSessionCookie(idToken);
        
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
            setUser({ ...authUser, role: userSnap.data()?.role });
        }
        
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubRef.current) {
        unsubRef.current();
      }
    };
  }, []);

  const loginWithProvider = async (provider: GoogleAuthProvider | GithubAuthProvider) => {
      try {
          await signInWithPopup(auth, provider);
      } catch (error) {
          console.error("Error during sign-in:", error);
      }
  };

  const loginWithGoogle = async () => {
      await loginWithProvider(new GoogleAuthProvider());
  };

  const loginWithGitHub = async () => {
      await loginWithProvider(new GithubAuthProvider());
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      await signOutUser();
      // Pendengar onAuthStateChanged akan menangani pengaturan pengguna ke null
      // dan komponen halaman akan mengarahkan ke /login.
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
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
