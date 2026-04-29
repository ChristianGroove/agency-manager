import { NextResponse } from 'next/server'
import { processLifecycleTransitions, getExpiringTrials } from '@/modules/core/lifecycle/lifecycle-actions'
import { cleanupAttendancePhotos } from '@/modules/features/attendance/actions'
import { requireCronSecret } from '@/modules/core/security/api-route-guards'

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
    const guard = requireCronSecret(request)
    if (guard) return guard

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

        // 3. Cleanup Attendance Photos (Keep 32 days)
        console.log('[Lifecycle Cron] Running attendance photo cleanup (32 days)...')
        const cleanupResult = await cleanupAttendancePhotos(32)
        console.log(`[Lifecycle Cron] Cleanup finished. Deleted ${cleanupResult.count || 0} photos.`)

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            notificationsQueued: expiringTrials.length,
            transitionsProcessed: results.length,
            attendancePhotosCleaned: cleanupResult.count || 0,
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
