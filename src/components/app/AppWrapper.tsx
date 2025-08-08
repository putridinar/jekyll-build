'use client';

import { useLicenseCheck } from '@/hooks/useLicenseCheck';
import LockScreen, { LoadingScreen } from './LockScreen';

export default function AppWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const licenseStatus = useLicenseCheck();

  if (licenseStatus === 'checking') {
    return <LoadingScreen />;
  }
  
  if (licenseStatus === 'invalid') {
    return <LockScreen />;
  }
  
  return <>{children}</>;
}