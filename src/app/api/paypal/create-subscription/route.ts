
'use server';

import { getUserId } from '@/lib/auth-utils';
import { NextResponse } from 'next/server';

const isSandbox = process.env.PAYPAL_SANDBOX_ENABLED === 'true';
const PAYPAL_API_URL = isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
const PAYPAL_CLIENT_ID = isSandbox ? process.env.PAYPAL_SANDBOX_CLIENT_ID : process.env.PAYPAL_LIVE_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = isSandbox ? process.env.PAYPAL_SANDBOX_CLIENT_SECRET : process.env.PAYPAL_LIVE_CLIENT_SECRET;
const PAYPAL_PLAN_ID = (isSandbox ? process.env.PAYPAL_SANDBOX_PLAN_ID : process.env.PAYPAL_LIVE_PLAN_ID)?.trim();


// Pembantu untuk mendapatkan token akses PayPal
async function getPayPalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('Missing PayPal client ID or secret in environment variables.');
  }
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to get PayPal access token: ${errorData.error_description}`);
  }
  const data = await response.json();
  return data.access_token;
}

/**
 * Creates a PayPal subscription and returns the subscription ID to the client.
 * Requires PAYPAL_PLAN_ID to be set in environment variables.
 */
export async function POST() {
  try {
    const userId = await getUserId(); // Dapatkan ID pengguna dari sesi

    if (!PAYPAL_PLAN_ID) {
      const message = isSandbox 
        ? 'PAYPAL_SANDBOX_PLAN_ID is not set in environment variables.'
        : 'PAYPAL_LIVE_PLAN_ID is not set in environment variables.';
      console.error(`[PayPal Create Subscription] Error: ${message}`);
      throw new Error(message);
    }
    const accessToken = await getPayPalAccessToken();
    const url = `${PAYPAL_API_URL}/v1/billing/subscriptions`;
    
    const subscriptionPayload = {
      plan_id: PAYPAL_PLAN_ID,
      custom_id: userId, // Tambahkan ID pengguna di sini
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Pembuatan langganan PayPal gagal:', errorData);
      // Log yang lebih detail untuk membantu debugging
      console.error(`Detail Kesalahan: status=${response.status}, message=${errorData.message}, details=${JSON.stringify(errorData.details)}`);
      throw new Error(`Gagal membuat langganan PayPal: ${errorData.message || 'Kesalahan tidak dikenal'}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('Error in create-subscription route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
