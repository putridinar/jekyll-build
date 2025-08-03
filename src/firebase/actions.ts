
'use server';

import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';

// This is a server action to create/update a user in Firestore.
export async function upsertUserInFirestore(user: User) {
    const userDocRef = doc(db, "users", user.uid);
    try {
        await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
        }, { merge: true }); // Use merge to avoid overwriting isPro field
        return { success: true };
    } catch (error: any) {
        console.error("Firestore upsert Error:", error);
        return { success: false, error: error.message };
    }
}


// This is a server action to check if a user is a pro user.
export const isProUser = async () => {
    const user = auth.currentUser;
    if (!user) return false;

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    return userDoc.exists() && userDoc.data().isPro === true;
}

// NOTE: PayPal functions are kept for future use but are not currently wired up
// to the new Firebase auth system. They would need to be adapted to use the 
// Firebase user UID instead of GitHub user info.

async function getPayPalAccessToken() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(`${process.env.PAYPAL_API_URL}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });

    const data = await response.json();
    return data.access_token;
}

export async function createPaypalSubscription(prevState: { error: string, link: string }, formData: FormData) {
    // This function needs to be called by an authenticated user.
    // The user's identity should be retrieved from Firebase Auth context on the client
    // or passed securely to this server action.
    // For now, we will return an error if the user is not logged in.
    return { error: 'User must be logged in to subscribe. Firebase integration required.', link: '' };
}

// These AI functions should remain as server actions.
import { z } from 'zod';
import { contentIdeaGeneration as genIdeas, ContentIdeaGenerationInput } from '@/ai/flows/content-idea-generation';
import { generateContentDraft as genDraft, ContentDraftInput, ContentDraftOutput } from '@/ai/flows/content-draft-generation';
import { generateImage as genImage, GenerateImageInput } from '@/ai/flows/generate-image';

const draftSchema = z.object({
    contentSchema: z.string(),
    theme: z.string(),
});

const ideasSchema = z.object({
    topic: z.string(),
    schema: z.string(),
});

const imageSchema = z.object({
    prompt: z.string(),
});

export async function generateContentDraft(
    prevState: { draft: ContentDraftOutput, error: string },
    formData: FormData
): Promise<{ draft: ContentDraftOutput, error: string }> {
    if (!(await isProUser())) {
        return { draft: { title: '', content: '' }, error: 'This is a Pro feature. Please upgrade your plan.' };
    }

    const parsed = draftSchema.safeParse({
        contentSchema: formData.get('contentSchema'),
        theme: formData.get('theme'),
    });

    if (!parsed.success) {
        return { draft: { title: '', content: '' }, error: 'Invalid input.' };
    }

    try {
        const input: ContentDraftInput = {
            contentSchema: parsed.data.contentSchema,
            theme: parsed.data.theme,
        };
        const result = await genDraft(input);
        return { draft: result, error: '' };
    } catch (error) {
        console.error(error);
        return { draft: { title: '', content: '' }, error: 'Failed to generate draft.' };
    }
}

export async function contentIdeaGeneration(
    prevState: { ideas: string[]; error: string },
    formData: FormData
) {
    if (!(await isProUser())) {
        return { ideas: [], error: 'This is a Pro feature. Please upgrade your plan.' };
    }

    const parsed = ideasSchema.safeParse({
        topic: formData.get('topic'),
        schema: formData.get('schema'),
    });

    if (!parsed.success) {
        return { ideas: [], error: 'Invalid input.' };
    }
    
    if (!parsed.data.topic) {
        return { ideas: [], error: 'Please provide a topic to get ideas.' };
    }

    try {
        const input: ContentIdeaGenerationInput = {
            topic: parsed.data.topic,
            contentSchema: parsed.data.schema,
        };
        const result = await genIdeas(input);
        return { ideas: result.ideas, error: '' };
    } catch (error) {
        console.error(error);
        return { ideas: [], error: 'Failed to generate ideas.' };
    }
}

export async function generateImage(
    prevState: { imageUrl: string; error: string },
    formData: FormData
) {
     if (!(await isProUser())) {
        return { imageUrl: '', error: 'This is a Pro feature. Please upgrade your plan.' };
    }

    const parsed = imageSchema.safeParse({
        prompt: formData.get('prompt'),
    });

    if (!parsed.success) {
        return { imageUrl: '', error: 'Invalid prompt.' };
    }

    try {
        const input: GenerateImageInput = {
            prompt: parsed.data.prompt,
        };
        const result = await genImage(input);
        return { imageUrl: result.imageUrl, error: '' };
    } catch (error) {
        console.error(error);
        return { imageUrl: '', error: 'Failed to generate image. Please try again.' };
    }
}
