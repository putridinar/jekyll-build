import { NextRequest, NextResponse } from 'next/server';
import { upgradeToPro } from '@/actions/user'; // Impor tindakan terpusat

const isSandbox = process.env.NEXT_PUBLIC_PAYPAL_SANDBOX_ENABLED === 'true';
const PAYPAL_API_URL = isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
const PAYPAL_CLIENT_ID = isSandbox ? process.env.PAYPAL_SANDBOX_CLIENT_ID : process.env.PAYPAL_LIVE_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = isSandbox ? process.env.PAYPAL_SANDBOX_CLIENT_SECRET : process.env.PAYPAL_LIVE_CLIENT_SECRET;
const PAYPAL_WEBHOOK_ID = (isSandbox ? process.env.PAYPAL_SANDBOX_WEBHOOK_ID : process.env.PAYPAL_LIVE_WEBHOOK_ID) || '';

// Fungsi untuk mendapatkan access token dari PayPal (diperlukan untuk verifikasi webhook)
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

  const data = await response.json();
  return data.access_token;
}

// Fungsi untuk memverifikasi notifikasi webhook
async function verifyPayPalWebhook(accessToken: string, headers: Headers, rawBody: string): Promise<boolean> {
  if (!PAYPAL_WEBHOOK_ID) {
    console.error('PAYPAL_WEBHOOK_ID is not set in environment variables.');
    return false;
  }
  
  const event = JSON.parse(rawBody);

  const requestBody = {
    transmission_id: headers.get('paypal-transmission-id'),
    transmission_time: headers.get('paypal-transmission-time'),
    cert_url: headers.get('paypal-cert-url'),
    auth_algo: headers.get('paypal-auth-algo'),
    transmission_sig: headers.get('paypal-transmission-sig'),
    webhook_id: PAYPAL_WEBHOOK_ID,
    webhook_event: event
  };

  const response = await fetch(`${PAYPAL_API_URL}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  if (data.verification_status !== 'SUCCESS') {
      console.error("Webhook verification failed. Response from PayPal:", data);
  }
  return data.verification_status === 'SUCCESS';
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const headers = req.headers;

  try {
    const accessToken = await getPayPalAccessToken();

    const isVerified = await verifyPayPalWebhook(accessToken, headers, rawBody);

    if (!isVerified) {
      console.warn('PayPal Webhook Verification Failed.');
      return NextResponse.json({ success: false, message: 'Webhook verification failed.' }, { status: 403 });
    }

    const event = JSON.parse(rawBody);
    
    // Tangani aktivasi langganan
    if (event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const subscription = event.resource;
      const userId = subscription.custom_id;
      const subscriptionId = subscription.id;
      const payerId = subscription.subscriber?.payer_id;

      if (!userId) {
        console.error('User ID (custom_id) not found in webhook payload');
        return NextResponse.json({ success: false, message: 'User ID not found.' }, { status: 400 });
      }

      try {
        // Panggil tindakan terpusat untuk meningkatkan pengguna
        await upgradeToPro(userId, subscriptionId, payerId);
      } catch (error: any) {
        console.error(`Failed to upgrade user ${userId}:`, error.message);
        return NextResponse.json({ success: true, message: "Webhook received, but user upgrade failed." });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('PayPal Webhook Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
