import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { generateImage } from '@/actions/ai';
import { checkAndRecordImageGeneration } from '@/actions/user';

// Konfigurasi Headers untuk CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }
    const idToken = authHeader.split('Bearer ')[1];

    try {
        if (!adminAuth) throw new Error("Firebase Admin not configured.");
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const { prompt } = await request.json();
        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required.' }, { status: 400, headers: corsHeaders });
        }
        
        // Cek limit penggunaan AI
        const permission = await checkAndRecordImageGeneration(userId);
        if (!permission.success) {
            return NextResponse.json({ error: permission.error }, { status: 429, headers: corsHeaders });
        }

        const result = await generateImage(prompt);
        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to generate image from AI flow.');
        }

        return NextResponse.json(result.data, { headers: corsHeaders });

    } catch (error: any) {
        console.error("AI Image Generation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }
}