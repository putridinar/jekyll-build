import { NextRequest, NextResponse } from 'next/server';

const PAYPAL_API_URL = 'https://api-m.sandbox.paypal.com';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_SANDBOX_CLIENT_ID!;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_SANDBOX_CLIENT_SECRET!;

async function getPayPalAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'Failed to get PayPal token');
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = await getPayPalAccessToken();

    // 1. Buat Product
    const productRes = await fetch(`${PAYPAL_API_URL}/v1/catalogs/products`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Jekyll Buildr Pro',
        type: 'SERVICE',
        category: 'SOFTWARE',
        description: 'Unlock all advanced features',
      }),
    });

    const productData = await productRes.json();
    if (!productRes.ok) throw new Error(JSON.stringify(productData));

    const productId = productData.id;

    // 2. Buat Plan
    const planRes = await fetch(`${PAYPAL_API_URL}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: productId,
        name: 'Jekyll Buildr Pro Monthly',
        description: 'Monthly subscription for pro features',
        status: 'ACTIVE',
        billing_cycles: [
          {
            frequency: { interval_unit: 'MONTH', interval_count: 1 },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: {
              fixed_price: {
                value: '9.99',
                currency_code: 'USD',
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee: { value: '0', currency_code: 'USD' },
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 1,
        },
      }),
    });

    const planData = await planRes.json();
    if (!planRes.ok) throw new Error(JSON.stringify(planData));

    return NextResponse.json({ success: true, plan_id: planData.id, details: planData });
  } catch (err: any) {
    console.error('PayPal Error:', err.message || err);
    return NextResponse.json({ success: false, error: err.message || err }, { status: 500 });
  }
}
