import { NextRequest, NextResponse } from "next/server"
import { BackupService } from "@/modules/infrastructure/backup/backup-service"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { decryptObject } from "@/modules/infrastructure/integrations/encryption"
import { isProductionRuntime, requireCronSecret } from "@/app/api/_guards/request-guards"

/**
 * CRON ENDPOINT: /api/cron/backup
 * 
 * Scheduled to run nightly.
 * Iterates over organization with BYOS Backup configured and triggers export.
 */

const PUBLIC_BACKUP_CRON_ERROR = 'Backup cron failed'
const PUBLIC_BACKUP_JOB_ERROR = 'Backup failed'

function logBackupCronError(label: string, error: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error })
}

function backupCronErrorMessage(error: unknown) {
    if (isProductionRuntime()) {
        return PUBLIC_BACKUP_CRON_ERROR
    }

    if (error instanceof Error && error.message) {
        return error.message
    }

    if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        return (error as any).message
    }

    return PUBLIC_BACKUP_CRON_ERROR
}

function sanitizeBackupResult(result: any) {
    if (!isProductionRuntime() || !result || result.success !== false || typeof result.error !== 'string') {
        return result
    }

    return { ...result, error: PUBLIC_BACKUP_JOB_ERROR }
}

export async function GET(req: NextRequest) {
    const unauthorized = requireCronSecret(req)
    if (unauthorized) return unauthorized

    try {
        // 2. Find Organizations with Active Backup Integrations
        const { data: connections } = await supabaseAdmin
            .from('integration_connections')
            .select(`
                organization_id,
                credentials,
                integration:integrations!inner (
                   key 
                )
            `)
            .eq('status', 'active')
            .in('integration.key', ['aws_s3', 'google_drive'])

        if (!connections || connections.length === 0) {
            return NextResponse.json({ message: "No active backup integrations found." })
        }

        console.log(`[Cron:Backup] Found ${connections.length} potential backups. Checking schedules...`)

        const orgIdsToBackup = []
        const todayIdx = new Date().getDay() // 0 = Sunday, 1 = Monday, ...

        for (const conn of connections) {
            // Decrypt config to check schedule
            const creds = decryptObject(conn.credentials)
            const schedule = creds?.schedule || 'daily' // Default to daily

            let shouldRun = false

            if (schedule === 'manual_only') {
                shouldRun = false
            } else if (schedule === 'weekly') {
                // Run only on Mondays (Index 1)
                shouldRun = (todayIdx === 1)
            } else {
                // 'daily'
                shouldRun = true
            }

            if (shouldRun) {
                orgIdsToBackup.push(conn.organization_id)
            }
        }

        // Deduplicate
        const uniqueOrgIds = Array.from(new Set(orgIdsToBackup))
        console.log(`[Cron:Backup] Executing backups for ${uniqueOrgIds.length} organizations (after schedule filter).`)

        const results = []
        for (const orgId of uniqueOrgIds) {
            const result = await BackupService.performBackup(orgId)
            results.push({ orgId, ...sanitizeBackupResult(result) })
        }

        return NextResponse.json({ success: true, results })

    } catch (error: any) {
        logBackupCronError("[Cron:Backup] Job Failed:", error)
        return NextResponse.json({ success: false, error: backupCronErrorMessage(error) }, { status: 500 })
    }
}
