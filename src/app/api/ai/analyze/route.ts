import { NextResponse } from 'next/server'

export async function POST() {
    return NextResponse.json({
        success: false,
        error: "AI Analysis temporarily disabled for maintenance"
    }, { status: 503 })
}
