// src/app/api/ai/generateComponent/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { generateJekyllComponent } from '@/ai/flows/jekyll-generator-flow';

// Konfigurasi Headers untuk CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handler untuk preflight request
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
    });
}

export async function POST(request: NextRequest) {
    // 1. Verifikasi Pengguna
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }
    const idToken = authHeader.split('Bearer ')[1];

    try {
        if (!adminAuth) throw new Error("Firebase Admin not configured.");
        await adminAuth.verifyIdToken(idToken);
        
        // 2. Ambil prompt dan path file dari body request
        const { prompt, activeFilePath } = await request.json();
        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required.' }, { status: 400, headers: corsHeaders });
        }

        // 3. Panggil Genkit Flow-mu
        const result = await generateJekyllComponent(prompt, activeFilePath);

        // 4. Kirim hasilnya kembali ke ekstensi
        return NextResponse.json(result, { headers: corsHeaders });

    } catch (error: any) {
        console.error("AI Component Generation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }
}
