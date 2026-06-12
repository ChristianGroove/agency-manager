import { NextResponse } from 'next/server';
import { MetaConnector } from '@/modules/infrastructure/meta/services/connector';
import { isProductionRuntime, requirePlatformAdminOrInternalSecret } from '@/app/api/_guards/request-guards';

const ACCESS_TOKEN = process.env.META_PERMANENT_ACCESS_TOKEN || '';
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';

function logMetaWebhookSubscribeError(label: string, error: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, error);
        return;
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error });
}

export async function POST(request: Request) {
    const unauthorized = await requirePlatformAdminOrInternalSecret(request);
    if (unauthorized) return unauthorized;

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
        logMetaWebhookSubscribeError('[API] Webhook Subscription Error:', error);
        return NextResponse.json(
            { error: 'Failed to subscribe to webhooks' },
            { status: 500 }
        );
    }
}
