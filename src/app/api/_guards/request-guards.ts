import { NextResponse } from "next/server"
import { createHmac } from "crypto"
import { createClient } from "@/modules/core/database/supabase-server"

export function isProductionRuntime() {
    return process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV
}

export function requireCronSecret(req: Request) {
    if (!process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Service Unavailable' }, { status: 503 })
    }
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return null
}

export function requireStripeWebhookSignature(req: Request, rawBody?: string | Buffer): NextResponse | null {
    if (!isProductionRuntime()) return null;
    if (!rawBody) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const sigHeader = req.headers.get('stripe-signature') || '';
    const match = sigHeader.match(/t=(\d+),v1=([a-fA-F0-9]+)/);
    if (!match) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const [, timestamp, signature] = match;
    const expected = createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET || '').update(`${timestamp}.${rawBody}`).digest('hex');
    
    if (signature !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return null;
}

export function requireMetaWebhookSignature(req: Request, rawBody?: string | Buffer): NextResponse | null {
    if (!isProductionRuntime()) return null;
    if (!rawBody) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const sigHeader = req.headers.get('x-hub-signature-256') || '';
    if (!sigHeader.startsWith('sha256=')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const signature = sigHeader.substring(7);
    const expected = createHmac('sha256', process.env.META_APP_SECRET || '').update(rawBody).digest('hex');
    
    if (signature !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return null;
}

export function requireProductionInternalAccess(req: Request): NextResponse | null {
    if (!isProductionRuntime()) return null;
    const secret = process.env.INTERNAL_API_SECRET;
    if (!secret || req.headers.get('x-internal-api-secret') !== secret) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return null;
}

export async function requirePlatformAdminOrInternalSecret(req: Request): Promise<NextResponse | null> {
    const secret = process.env.INTERNAL_API_SECRET;
    if (secret && req.headers.get('x-internal-api-secret') === secret) {
        return null;
    }
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { data: profile } = await supabase.from('profiles').select('platform_role').eq('id', user.id).single();
    if (!profile || profile.platform_role !== 'super_admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return null;
}
