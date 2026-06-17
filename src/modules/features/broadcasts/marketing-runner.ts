import { sendOutboundMessage } from "@/modules/features/messaging/messaging-actions"
import { addMinutes, addHours, addDays, isBefore } from "date-fns"
import { createClient } from "@/modules/core/database/supabase-server";

/**
 * MARKETING RUNNER (Execution Engine)
 * -----------------------------------
 * This service runs periodically (via Cron) to process active marketing enrollments.
 * It enforces Tenant Isolation by strictly validating organization IDs.
 */

export async function runMarketingCycle() {
    const supabase = (await createClient())
    const now = new Date().toISOString()
    const logs: string[] = []

    logs.push(`[Runner] Starting cycle at ${now}`)

    // 1. Poll Active Enrollments ready to run
    // STRICT FILTER: Only 'active' enrollments where next_run_at is past or null (immediate)
    const { data: enrollments, error } = await supabase
        .from('marketing_enrollments')
        .select(`
            *,
            step:marketing_steps!current_step_id(*),
            campaign:marketing_campaigns!campaign_id(id, organization_id, delivery_config, scheduled_for),
            lead:leads!contact_id(id, organization_id, phone, name, marketing_opted_out)
        `)
        .eq('status', 'active')
        .lte('next_run_at', now)
        .order('next_run_at', { ascending: true })
        .limit(50) // Batch size to prevent timeout

    if (error) {
        console.error('[Runner] Poll Error:', error)
        return { success: false, error: error.message }
    }

    if (!enrollments || enrollments.length === 0) {
        logs.push('[Runner] No enrollments pending.')
        return { success: true, processed: 0, logs }
    }

    logs.push(`[Runner] Processing ${enrollments.length} enrollments...`)

    // 2. Process Batch
    let processedCount = 0
    for (const enrollment of enrollments) {
        try {
            await processEnrollment(supabase, enrollment, logs)
            processedCount++
        } catch (e: any) {
            console.error(`[Runner] Failed enrollment ${enrollment.id}:`, e)
            // Log failure to enrollment but don't crash runner
            await supabase.from('marketing_enrollments').update({
                execution_logs: [...(enrollment.execution_logs || []), { date: new Date().toISOString(), error: e.message }]
            }).eq('id', enrollment.id)
        }
    }

    return { success: true, processed: processedCount, logs }
}

async function processEnrollment(supabase: any, enrollment: any, debugLogs: string[]) {
    const { step, lead, campaign } = enrollment

    // TENANT ISOLATION CHECK
    if (campaign.organization_id !== lead.organization_id) {
        throw new Error(`Integrity Error: Campaign Org ${campaign.organization_id} != Lead Org ${lead.organization_id}`)
    }

    // SCHEDULED CAMPAIGN CHECK
    if (campaign.scheduled_for && new Date(campaign.scheduled_for) > new Date()) {
        debugLogs.push(`[${enrollment.id}] Campaign scheduled for future, skipping.`)
        return
    }

    // OPT-OUT CHECK
    if (lead.marketing_opted_out) {
        debugLogs.push(`[${enrollment.id}] Lead opted out, cancelling enrollment.`)
        await supabase.from('marketing_enrollments').update({
            status: 'cancelled',
            execution_logs: [...(enrollment.execution_logs || []), {
                date: new Date().toISOString(),
                action: 'cancelled_opted_out'
            }]
        }).eq('id', enrollment.id)
        return
    }

    if (!step) {
        // No current step? Should verify if finished.
        debugLogs.push(`[${enrollment.id}] No step found. Completing.`)
        await completeEnrollment(supabase, enrollment.id)
        return
    }

    // --- STEP LOGIC ---

    if (step.type === 'delay') {
        const delayConfig = step.delay_config || { value: 1, unit: 'days' }
        const nextTime = calculateDelay(delayConfig)

        debugLogs.push(`[${enrollment.id}] Processing Delay: ${delayConfig.value} ${delayConfig.unit}. Next run: ${nextTime.toISOString()}`)

        // Move to NEXT step immediately after setting the delay?
        // NO. The delay step IS the waiting period.
        // We advance the pointer to the NEXT step, and set the run time.

        const nextStep = await getNextStep(supabase, step)

        if (nextStep) {
            await supabase.from('marketing_enrollments').update({
                current_step_id: nextStep.id,
                next_run_at: nextTime.toISOString(),
                last_run_at: new Date().toISOString()
            }).eq('id', enrollment.id)
        } else {
            await completeEnrollment(supabase, enrollment.id)
        }
        return
    }

    if (['whatsapp', 'sms', 'email'].includes(step.type)) {
        debugLogs.push(`[${enrollment.id}] Sending Message (${step.type})...`)

        // 1. Get/Create Conversation
        const conversationId = await getOrCreateOutboundConversation(
            supabase,
            lead.id,
            lead.organization_id,
            step.type,
            lead.phone
        )

        if (!conversationId) {
            throw new Error('Could not create/find conversation for message dispatch')
        }

        // 2. Dispatch Message
        const content = step.content

        let result: any

        if (content.template_name && step.type === 'whatsapp') {
            // HSM Template Dispatch via MarketingAPIManager
            debugLogs.push(`[${enrollment.id}] Using HSM Template: ${content.template_name}`)

            const { marketingAPIManager } = await import('@/modules/infrastructure/meta/services/marketing-api-manager')

            // Resolve phone_number_id from the org's connection
            const { data: connection } = await supabase
                .from('integration_connections')
                .select('credentials, metadata')
                .eq('organization_id', lead.organization_id)
                .in('provider_key', ['meta_whatsapp', 'whatsapp_cloud'])
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            const creds = connection?.credentials as any
            const phoneNumberId = creds?.phoneNumberId || creds?.phone_number_id ||
                (connection?.metadata as any)?.asset_id || process.env.META_PHONE_NUMBER_ID!

            // Substitute lead-specific values into template params
            const params: Record<string, string> = {}
            if (content.template_params) {
                for (const [key, val] of Object.entries(content.template_params as Record<string, string>)) {
                    params[key] = val
                        .replace('{{nombre}}', lead.name || '')
                        .replace('{{empresa}}', lead.company || '')
                        .replace('{{telefono}}', lead.phone || '')
                }
            }

            try {
                const hsmResult = await marketingAPIManager.sendMarketingMessage({
                    phoneNumberId,
                    to: lead.phone,
                    template_name: content.template_name,
                    ttl_seconds: content.ttl_seconds || 86400,
                    parameters: params
                })
                result = { success: true, externalId: hsmResult.message_id }
            } catch (e: any) {
                result = { success: false, error: e.message }
            }
        } else {
            // Plain text dispatch (non-template or non-WhatsApp)
            result = await sendOutboundMessage(conversationId, content, step.type)
        }

        if (!result.success) {
            throw new Error(`Send Failed: ${result.error}`)
        }

        debugLogs.push(`[${enrollment.id}] Message Sent (ID: ${result.externalId || 'Internal'}). Advancing...`)

        // 3. Advance to Next Step (Immediate)
        const nextStep = await getNextStep(supabase, step)

        if (nextStep) {
            await supabase.from('marketing_enrollments').update({
                current_step_id: nextStep.id,
                // If next is a Delay, it will be handled in next polling cycle (immediately if delay=0, or next minute)
                // If next is Message, we set next_run_at to NOW to trigger it ASAP (or add small buffer for safety)
                next_run_at: new Date().toISOString(),
                last_run_at: new Date().toISOString(),
                execution_logs: [...(enrollment.execution_logs || []), {
                    date: new Date().toISOString(),
                    action: 'message_sent',
                    step_id: step.id,
                    status: 'success'
                }]
            }).eq('id', enrollment.id)
        } else {
            await completeEnrollment(supabase, enrollment.id)
        }
    }
}

// --- HELPERS ---

function calculateDelay(config: { value: number, unit: string }) {
    const now = new Date()
    const val = Number(config.value)
    if (config.unit === 'minutes') return addMinutes(now, val)
    if (config.unit === 'hours') return addHours(now, val)
    return addDays(now, val)
}

async function getNextStep(supabase: any, currentStep: any) {
    // Find step with higher order_index in same sequence
    const { data } = await supabase
        .from('marketing_steps')
        .select('id, type, order_index')
        .eq('sequence_id', currentStep.sequence_id)
        .gt('order_index', currentStep.order_index)
        .order('order_index', { ascending: true })
        .limit(1)
        .single()
    return data
}

async function completeEnrollment(supabase: any, enrollmentId: string) {
    await supabase.from('marketing_enrollments').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        next_run_at: null
    }).eq('id', enrollmentId)
}

/**
 * Resolves or creates a conversation ensuring strict Tenant Isolation
 */
async function getOrCreateOutboundConversation(
    supabase: any,
    leadId: string,
    organizationId: string,
    channel: string,
    leadPhone: string
) {
    // 1. Try Find Existing Active Conversation
    const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('organization_id', organizationId) // Strict Tenant
        .eq('lead_id', leadId)
        .eq('channel', channel)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

    if (existing) return existing.id

    // 2. Create New
    // We need to resolve a default connection to bind it if possible, 
    // but inbox-service handles auto-binding if we leave it null.
    // However, for strictness, let's just create it and let sendOutboundMessage internal logic find the connection.
    const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
            organization_id: organizationId,
            lead_id: leadId,
            channel: channel,
            phone: leadPhone,
            status: 'open',
            state: 'active',
            source: 'marketing_campaign'
        })
        .select('id')
        .single()

    if (error) {
        console.error('[Runner] Conversation Creation Failed:', error)
        return null
    }
    return newConv.id
}
