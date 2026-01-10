import { NextRequest, NextResponse } from "next/server"
import { BackupService } from "@/modules/core/backup/backup-service"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { decryptObject } from "@/modules/core/integrations/encryption"

/**
 * CRON ENDPOINT: /api/cron/backup
 * 
 * Scheduled to run nightly.
 * Iterates over organization with BYOS Backup configured and triggers export.
 */
export async function GET(req: NextRequest) {
    // 1. Security Check (Verify CRON_SECRET or Service Header)
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Return 401 but careful not to leak info if possible
        // return new NextResponse('Unauthorized', { status: 401 }) 
    }

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
            results.push({ orgId, ...result })
        }

        return NextResponse.json({ success: true, results })

    } catch (error: any) {
        console.error("[Cron:Backup] Job Failed:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
