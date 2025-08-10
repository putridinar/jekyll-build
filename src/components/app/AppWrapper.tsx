'use client';

import React from 'react';
import useLicenseCheck from '@/hooks/useLicenseCheck';

const AppWrapper = ({ children }: { children: React.ReactNode }) => {
  const isLocked = useLicenseCheck();

  return (
    <>
        {children}
    </>
  );
};

export default AppWrapper;