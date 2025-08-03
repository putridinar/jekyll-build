
'use client';
import { useAuth } from './useAuth';

export function useIsPro() {
  const { isPro, loading } = useAuth();
  // Return the pro status from the central auth context.
  // The component using this hook can decide how to handle the loading state.
  return isPro;
}
