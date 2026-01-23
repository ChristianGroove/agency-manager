import { NextResponse } from 'next/server';
import { MetaConnector } from '@/lib/integrations/meta/connector';

// Environment variables should be guaranteed by the platform or checking mechanism
const ACCESS_TOKEN = process.env.META_PERMANENT_ACCESS_TOKEN || '';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

export async function POST(request: Request) {
    if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
        return NextResponse.json(
            { error: 'Missing Meta Configuration (Token or Phone ID)' },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const { enabled } = body;

        const connector = new MetaConnector(ACCESS_TOKEN);

        // 1. Update Calling Settings
        const result = await connector.updateCallingSettings(PHONE_NUMBER_ID, enabled);

        return NextResponse.json({
            success: true,
            status: enabled ? 'ENABLED' : 'DISABLED',
            meta_response: result
        });

    } catch (error: any) {
        console.error('[API] Calling Settings Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update calling settings' },
            { status: 500 }
        );
    }
}

export async function GET() {
    // Determine current status if possible, or just return configuration presence
    // In a real scenario, we might query the endpoint to get status.
    // For now, we confirm we are 'ready' to call.
    return NextResponse.json({
        ready: !!(ACCESS_TOKEN && PHONE_NUMBER_ID),
        phoneNumberId: PHONE_NUMBER_ID
    });
}
