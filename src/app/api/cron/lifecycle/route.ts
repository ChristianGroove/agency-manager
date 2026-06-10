import { NextResponse } from 'next/server'
import { processLifecycleTransitions, getExpiringTrials } from '@/modules/core/lifecycle/lifecycle-actions'
import { cleanupAttendancePhotos } from '@/modules/features/attendance/actions'
import { isProductionRuntime, requireCronSecret } from '@/app/api/_guards/request-guards'

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
const PUBLIC_LIFECYCLE_CRON_ERROR = 'Lifecycle cron failed'
const PUBLIC_LIFECYCLE_PROCESSING_ERROR = 'Lifecycle processing failed'

function logLifecycleCronError(label: string, error: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error })
}

function lifecycleCronErrorMessage(error: unknown, fallback = PUBLIC_LIFECYCLE_CRON_ERROR) {
    if (isProductionRuntime()) {
        return fallback
    }

    if (error instanceof Error && error.message) {
        return error.message
    }

    if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        return (error as any).message
    }

    if (typeof error === 'string' && error) {
        return error
    }

    return fallback
}

export async function GET(request: Request) {
    const unauthorized = requireCronSecret(request)
    if (unauthorized) return unauthorized

    try {
        console.log('[Lifecycle Cron] Starting lifecycle processing...')

        // 1. Get expiring trials for notifications
        const expiringTrials = await getExpiringTrials()
        console.log(`[Lifecycle Cron] Found ${expiringTrials.length} trials needing notification`)

        // TODO: Send actual notification emails here
        // For now, just log them
        for (const trial of expiringTrials) {
            if (isProductionRuntime()) {
                console.log(`[Lifecycle Cron] Trial notification pending: ${trial.notificationType}`)
            } else {
                console.log(`[Lifecycle Cron] Would notify ${trial.ownerEmail} - ${trial.notificationType}`)
            }
        }

        // 2. Process all lifecycle transitions
        const { success, results, error } = await processLifecycleTransitions()

        if (!success) {
            logLifecycleCronError('[Lifecycle Cron] Processing failed:', error)
            return NextResponse.json(
                {
                    error: lifecycleCronErrorMessage(error, PUBLIC_LIFECYCLE_PROCESSING_ERROR),
                    ...(isProductionRuntime() ? {} : { details: error })
                },
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
        logLifecycleCronError('[Lifecycle Cron] Unexpected error:', error)
        return NextResponse.json(
            { error: lifecycleCronErrorMessage(error) },
            { status: 500 }
        )
    }
}

// Vercel Cron configuration
export const runtime = 'nodejs'
export const maxDuration = 60 // seconds
