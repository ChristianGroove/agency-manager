"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// ============================================
// ACTIVITY TRACKING
// ============================================

type ActivityType =
    | 'login'
    | 'create_contact'
    | 'send_message'
    | 'create_invoice'
    | 'create_quote'
    | 'create_automation'
    | 'general'

const ACTIVITY_POINTS: Record<ActivityType, number> = {
    login: 1,
    create_contact: 5,
    send_message: 10,
    create_invoice: 15,
    create_quote: 10,
    create_automation: 20,
    general: 1
}

/**
 * Record organization activity
 * Call this from various actions to track engagement
 */
export async function recordActivity(
    organizationId: string,
    activityType: ActivityType = 'general'
): Promise<{ success: boolean }> {
    const supabase = await createClient()
    const points = ACTIVITY_POINTS[activityType] || 1

    const { error } = await supabase.rpc('record_org_activity', {
        p_organization_id: organizationId,
        p_activity_type: activityType,
        p_points: points
    })

    if (error) {
        console.error('Failed to record activity:', error)
        return { success: false }
    }

    return { success: true }
}

// ============================================
// LIFECYCLE STATUS
// ============================================

export interface LifecycleStatus {
    status: 'active' | 'trial' | 'dormant' | 'suspended' | 'pending_deletion'
    trialEndsAt: string | null
    trialDaysRemaining: number | null
    lastActivityAt: string | null
    daysSinceActivity: number | null
    deletionScheduledAt: string | null
    daysUntilDeletion: number | null
}

export async function getOrganizationLifecycleStatus(
    organizationId: string
): Promise<LifecycleStatus | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('organizations')
        .select(`
            status,
            subscription_status,
            trial_ends_at,
            last_activity_at,
            dormant_at,
            suspended_at,
            deletion_scheduled_at
        `)
        .eq('id', organizationId)
        .single()

    if (error || !data) return null

    const now = new Date()

    // Calculate trial days remaining
    let trialDaysRemaining: number | null = null
    if (data.trial_ends_at && data.subscription_status !== 'active') {
        const trialEnd = new Date(data.trial_ends_at)
        trialDaysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Calculate days since activity
    let daysSinceActivity: number | null = null
    if (data.last_activity_at) {
        const lastActivity = new Date(data.last_activity_at)
        daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Calculate days until deletion
    let daysUntilDeletion: number | null = null
    if (data.deletion_scheduled_at) {
        const deletionDate = new Date(data.deletion_scheduled_at)
        daysUntilDeletion = Math.ceil((deletionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Determine status
    let status: LifecycleStatus['status'] = 'active'
    if (data.deletion_scheduled_at) {
        status = 'pending_deletion'
    } else if (data.status === 'suspended') {
        status = 'suspended'
    } else if (data.dormant_at) {
        status = 'dormant'
    } else if (trialDaysRemaining !== null && trialDaysRemaining > 0) {
        status = 'trial'
    }

    return {
        status,
        trialEndsAt: data.trial_ends_at,
        trialDaysRemaining,
        lastActivityAt: data.last_activity_at,
        daysSinceActivity,
        deletionScheduledAt: data.deletion_scheduled_at,
        daysUntilDeletion
    }
}

// ============================================
// ADMIN: PROCESS LIFECYCLE (CRON)
// ============================================

export interface LifecycleProcessResult {
    orgId: string
    orgName: string
    actionTaken: string
}

/**
 * Process all lifecycle transitions
 * Should be called by cron job (weekly recommended)
 */
export async function processLifecycleTransitions(): Promise<{
    success: boolean
    results: LifecycleProcessResult[]
    error?: string
}> {
    try {
        // Process expirations and suspensions
        const { data: expirationResults, error: expError } = await supabaseAdmin
            .rpc('process_trial_expirations')

        if (expError) {
            console.error('Error processing expirations:', expError)
        }

        // Execute scheduled deletions
        const { data: deletionResults, error: delError } = await supabaseAdmin
            .rpc('execute_scheduled_deletions')

        if (delError) {
            console.error('Error executing deletions:', delError)
        }

        const results: LifecycleProcessResult[] = [
            ...(expirationResults || []).map((r: any) => ({
                orgId: r.org_id,
                orgName: r.org_name,
                actionTaken: r.action_taken
            })),
            ...(deletionResults || []).map((r: any) => ({
                orgId: r.org_id,
                orgName: r.org_name,
                actionTaken: r.action_taken
            }))
        ]

        return { success: true, results }
    } catch (error) {
        console.error('Lifecycle processing failed:', error)
        return {
            success: false,
            results: [],
            error: String(error)
        }
    }
}

// ============================================
// GET EXPIRING TRIALS FOR NOTIFICATIONS
// ============================================

export interface ExpiringTrial {
    orgId: string
    orgName: string
    ownerEmail: string
    daysRemaining: number
    notificationType: string
}

export async function getExpiringTrials(): Promise<ExpiringTrial[]> {
    const { data, error } = await supabaseAdmin
        .rpc('get_expiring_trials')

    if (error) {
        console.error('Error fetching expiring trials:', error)
        return []
    }

    return (data || []).map((r: any) => ({
        orgId: r.org_id,
        orgName: r.org_name,
        ownerEmail: r.owner_email,
        daysRemaining: r.days_remaining,
        notificationType: r.notification_type
    }))
}

// ============================================
// REACTIVATE SUSPENDED ACCOUNT
// ============================================

export async function reactivateAccount(
    organizationId: string
): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabaseAdmin
        .from('organizations')
        .update({
            status: 'active',
            dormant_at: null,
            suspended_at: null,
            deletion_scheduled_at: null,
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', organizationId)

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true }
}
