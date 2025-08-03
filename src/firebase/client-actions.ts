
'use client';

import { auth } from '@/lib/firebase';
import { GithubAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';

const provider = new GithubAuthProvider();

// This is a client-side function to initiate GitHub sign-in.
export async function signInWithGithub() {
  try {
    const result = await signInWithPopup(auth, provider);
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error("Firebase Auth Error:", error);
    return { success: false, error: error.message };
  }
}

// This is a client-side function to sign out.
export async function signOut() {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error("Firebase Sign Out Error:", error);
    return { success: false, error: error.message };
  }
}
