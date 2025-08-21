// src/app/api/paypal/create-product-and-plan/route.ts
import { NextRequest, NextResponse } from 'next/server';

const isSandbox = process.env.PAYPAL_SANDBOX_ENABLED === 'true';
const PAYPAL_API_URL = isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
const PAYPAL_CLIENT_ID = isSandbox ? process.env.PAYPAL_SANDBOX_CLIENT_ID : process.env.PAYPAL_LIVE_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = isSandbox ? process.env.PAYPAL_SANDBOX_CLIENT_SECRET : process.env.PAYPAL_LIVE_CLIENT_SECRET;

// Fungsi untuk mendapatkan access token dari PayPal
async function getPayPalAccessToken() {
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

// Handler untuk metode POST
export async function POST(req: NextRequest) {
  try {
    const accessToken = await getPayPalAccessToken();

    // 1. Membuat Produk
    const productResponse = await fetch(`${PAYPAL_API_URL}/v1/catalogs/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'jekyll-buildr proUser Plan',
        type: 'SERVICE',
        category: 'SOFTWARE',
        description: 'Unlock advanced features',
      }),
    });

    if (!productResponse.ok) {
      const error = await productResponse.json();
      console.error('PayPal Product Creation Error:', error);
      return NextResponse.json({ success: false, error: 'Failed to create product', details: error }, { status: 500 });
    }

    const productData = await productResponse.json();
    const productId = productData.id;

    // 2. Membuat Plan
    const planResponse = await fetch(`${PAYPAL_API_URL}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: productId,
        name: 'Jekyll Buildr proUser Plan',
        description: 'Monthly subscription for pro features.',
        status: 'ACTIVE',
        billing_cycles: [
          {
            frequency: {
              interval_unit: 'MONTH',
              interval_count: 1,
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // Berlangganan tanpa batas
            pricing_scheme: {
              fixed_price: {
                value: '9.99', // Ganti dengan harga yang Anda inginkan
                currency_code: 'USD',
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee: {
            value: '0',
            currency_code: 'USD',
          },
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 1,
        },
      }),
    });

    if (!planResponse.ok) {
      const error = await planResponse.json();
      console.error('PayPal Plan Creation Error:', error);
      return NextResponse.json({ success: false, error: 'Failed to create plan', details: error }, { status: 500 });
    }

    const planData = await planResponse.json();

    return NextResponse.json({
      success: true,
      product: productData,
      plan: planData,
    });

  } catch (error: any) {
    console.error('Internal Server Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// curl -X POST http://localhost:9002/api/paypal/create-product-and-plan