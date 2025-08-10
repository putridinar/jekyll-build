'use client';

import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import * as React from 'react';

const isSandbox = process.env.PAYPAL_SANDBOX_ENABLED === 'true';
const PAYPAL_CLIENT_ID = isSandbox
  ? process.env.NEXT_PUBLIC_PAYPAL_SANDBOX_CLIENT_ID
  : process.env.NEXT_PUBLIC_PAYPAL_LIVE_CLIENT_ID;

export function PayPalProvider({ children }: { children: React.ReactNode }) {
  if (!PAYPAL_CLIENT_ID) {
    console.warn(
      'PayPal Client ID is not configured. PayPal functionality will be disabled.'
    );
    return <>{children}</>;
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: PAYPAL_CLIENT_ID,
        "disable-funding": "credit,card",
        disableFunding: 'paylater,venmo,card',
        components: 'buttons',
        "data-sdk-integration-source": "integrationbuilder_sc",
        "currency": "USD",
        intent: 'subscription',
        vault: true,
      }}
    >
      {children}
    </PayPalScriptProvider>
  );
}