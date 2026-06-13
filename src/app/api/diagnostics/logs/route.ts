import { requireProductionInternalAccess } from "@/app/api/_guards/request-guards"

import { fileLogger } from '@/modules/infrastructure/logging/services/file-logger';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const guard = requireProductionInternalAccess(req)
    if (guard) return guard;

    return NextResponse.json({
        logs: fileLogger.read()
    });
}

export async function DELETE(req: Request) {
    const guard = requireProductionInternalAccess(req)
    if (guard) return guard;

    fileLogger.clear();
    return NextResponse.json({ success: true, message: 'Logs cleared' });
}
