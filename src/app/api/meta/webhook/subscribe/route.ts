import { NextResponse } from 'next/server';
import { MetaConnector } from '@/lib/integrations/meta/connector';

const ACCESS_TOKEN = process.env.META_PERMANENT_ACCESS_TOKEN || '';
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';

export async function POST() {
    if (!ACCESS_TOKEN || !WABA_ID) {
        return NextResponse.json(
            { error: 'Missing Meta Config for Webhooks' },
            { status: 500 }
        );
    }

    try {
        const connector = new MetaConnector(ACCESS_TOKEN);

        // This subscribes the app to the WABA's 'messages' field
        const result = await connector.subscribeToWebhooks(WABA_ID);

        return NextResponse.json({
            success: true,
            message: 'Successfully subscribed to WABA webhooks',
            meta_response: result
        });

    } catch (error: any) {
        console.error('[API] Webhook Subscription Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to subscribe to webhooks' },
            { status: 500 }
        );
    }
}
