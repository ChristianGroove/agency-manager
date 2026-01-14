import { NextResponse } from 'next/server'
import { processLifecycleTransitions, getExpiringTrials } from '@/modules/core/lifecycle/actions'

/**
 * Lifecycle Cleanup Cron Job
 * 
 * This endpoint should be called by a cron service (e.g., Vercel Cron, GitHub Actions)
 * Recommended: Weekly (every Sunday at 2am)
 * 
 * Cron expression: 0 2 * * 0
 * 
 * Security: Verify CRON_SECRET header
 */
export async function GET(request: Request) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }

    try {
        console.log('[Lifecycle Cron] Starting lifecycle processing...')

        // 1. Get expiring trials for notifications
        const expiringTrials = await getExpiringTrials()
        console.log(`[Lifecycle Cron] Found ${expiringTrials.length} trials needing notification`)

        // TODO: Send actual notification emails here
        // For now, just log them
        for (const trial of expiringTrials) {
            console.log(`[Lifecycle Cron] Would notify ${trial.ownerEmail} - ${trial.notificationType}`)
        }

        // 2. Process all lifecycle transitions
        const { success, results, error } = await processLifecycleTransitions()

        if (!success) {
            console.error('[Lifecycle Cron] Processing failed:', error)
            return NextResponse.json(
                { error: 'Processing failed', details: error },
                { status: 500 }
            )
        }

        console.log(`[Lifecycle Cron] Completed. Processed ${results.length} organizations.`)

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            notificationsQueued: expiringTrials.length,
            transitionsProcessed: results.length,
            results
        })

    } catch (error) {
        console.error('[Lifecycle Cron] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Vercel Cron configuration
export const runtime = 'nodejs'
export const maxDuration = 60 // seconds
