
import { fileLogger } from '@/lib/file-logger';
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        logs: fileLogger.read()
    });
}

export async function DELETE() {
    fileLogger.clear();
    return NextResponse.json({ success: true, message: 'Logs cleared' });
}
