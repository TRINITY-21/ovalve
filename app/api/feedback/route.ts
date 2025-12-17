import { initFirebaseAdmin } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 0;

// POST endpoint to save feedback to Firestore
export async function POST(req: NextRequest) {
  try {
    let admin;
    try {
      admin = initFirebaseAdmin();
      console.log('[Feedback API] Firebase Admin initialized successfully');
    } catch (initError: unknown) {
      const errorMessage = initError instanceof Error ? initError.message : 'Unknown error';
      console.error('[Feedback API] Firebase initialization error:', errorMessage);
      return NextResponse.json({ 
        error: 'Firebase initialization failed', 
        details: errorMessage 
      }, { status: 500 });
    }

    const body = await req.json();
    const { message } = body;

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Feedback message is required' 
      }, { status: 400 });
    }

    // Limit message length
    if (message.length > 2000) {
      return NextResponse.json({ 
        error: 'Feedback message is too long (max 2000 characters)' 
      }, { status: 400 });
    }

    const db = admin.firestore();
    const feedbackCollection = db.collection('feedback');

    // Create feedback document
    const feedbackData = {
      message: message.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userAgent: req.headers.get('user-agent') || 'Unknown',
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown',
      read: false, // Mark as unread for admin review
    };

    // Save to Firestore
    const docRef = await feedbackCollection.add(feedbackData);
    
    console.log(`[Feedback API] Feedback saved with ID: ${docRef.id}`);

    return NextResponse.json({ 
      success: true, 
      id: docRef.id,
      message: 'Feedback submitted successfully' 
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Error saving feedback:', err);
    return NextResponse.json({ 
      error: 'Failed to save feedback', 
      details: errorMessage 
    }, { status: 500 });
  }
}
