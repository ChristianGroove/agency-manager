import { NextResponse } from 'next/server';
import { MetaConnector } from '@/lib/integrations/meta/connector';

const ACCESS_TOKEN = process.env.META_PERMANENT_ACCESS_TOKEN || '';
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';

export async function GET() {
    if (!ACCESS_TOKEN || !WABA_ID) {
        return NextResponse.json(
            { error: 'Missing Meta Configuration (Token or WABA ID)' },
            { status: 500 }
        );
    }

    try {
        const connector = new MetaConnector(ACCESS_TOKEN);
        const data = await connector.getFlows(WABA_ID);

        return NextResponse.json({
            flows: data.data || [] // Graph API returns { data: [] }
        });

    } catch (error: any) {
        console.error('[API] Get Flows Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch flows' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    if (!ACCESS_TOKEN) {
        return NextResponse.json(
            { error: 'Missing Meta Access Token' },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const { flowId, action } = body;

        if (!flowId) {
            return NextResponse.json({ error: 'Flow ID required' }, { status: 400 });
        }

        const connector = new MetaConnector(ACCESS_TOKEN);

        if (action === 'publish') {
            const result = await connector.publishFlow(flowId);
            return NextResponse.json({ success: true, meta_response: result });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('[API] Publish Flow Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to publish flow' },
            { status: 500 }
        );
    }
}
