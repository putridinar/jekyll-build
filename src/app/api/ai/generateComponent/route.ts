// src/app/api/ai/generateComponent/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { generateJekyllComponent } from '@/ai/flows/jekyll-generator-flow'; // Improt Genkit flow-mu

export async function POST(request: NextRequest) {
    // 1. Verifikasi Pengguna (wajib untuk fitur Pro)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];

    try {
        if (!adminAuth) throw new Error("Firebase Admin not configured.");
        await adminAuth.verifyIdToken(idToken); // Cukup verifikasi, tidak perlu cek role di sini
        
        // 2. Ambil prompt dari body request
        const { prompt, activeFilePath } = await request.json();
        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
        }

        // 3. Panggil Genkit Flow-mu
        const result = await generateJekyllComponent(prompt, activeFilePath);

        // 4. Kirim hasilnya kembali ke ekstensi
        return NextResponse.json(result);

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}