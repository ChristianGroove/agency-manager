
import { fileLogger } from '@/modules/infrastructure/logging/services/file-logger';
import { NextResponse } from 'next/server';
import { requireNonProductionRoute } from '@/modules/core/security/api-route-guards';

export async function GET() {
    const guard = requireNonProductionRoute();
    if (guard) return guard;

    return NextResponse.json({
        logs: fileLogger.read()
    });
}

export async function DELETE() {
    const guard = requireNonProductionRoute();
    if (guard) return guard;

    fileLogger.clear();
    return NextResponse.json({ success: true, message: 'Logs cleared' });
}
