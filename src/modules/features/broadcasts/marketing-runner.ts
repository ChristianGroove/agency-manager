
import { resolveConnectionCredentials } from '@/modules/infrastructure/integrations/connection-secrets'
import { sendOutboundMessage } from "@/modules/features/messaging/messaging-actions"
import { addMinutes, addHours, addDays, isBefore } from "date-fns"
import { createClient } from "@/modules/core/database/supabase-server";
import { addJitter, enforceScheduleWindow } from './marketing-utils'

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
            const errorMsg = e.message || 'Unknown Error'
            
            // QoS Monitor: Auto-pause on critical Meta errors to protect WhatsApp number
            const isCritical = errorMsg.toLowerCase().includes('rate limit') || 
                               errorMsg.toLowerCase().includes('spam') || 
                               errorMsg.toLowerCase().includes('restricted') ||
                               errorMsg.toLowerCase().includes('template') ||
                               errorMsg.toLowerCase().includes('not approved')

            if (isCritical) {
                console.warn(`[QoS Monitor] Auto-paused campaign ${enrollment.campaign.id} due to critical error: ${errorMsg}`)
                await supabase.from('marketing_campaigns').update({
                    status: 'paused'
                }).eq('id', enrollment.campaign.id)
            }

            await supabase.from('marketing_enrollments').update({
                status: 'failed',
                execution_logs: [...(enrollment.execution_logs || []), { date: new Date().toISOString(), error: errorMsg }]
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

    // CAMPAIGN STATUS CHECK
    if (campaign.status === 'paused') {
        debugLogs.push(`[${enrollment.id}] Campaign is paused. Skipping.`)
        return
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
        let nextTime = calculateDelay(delayConfig)
        
        if (campaign.delivery_config) {
            nextTime = addJitter(nextTime, campaign.delivery_config)
            nextTime = enforceScheduleWindow(nextTime, campaign.delivery_config)
        }

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
        const operationKey = `campaign:${enrollment.id}:${step.id}`

        let result: any

        if (content.template_name && step.type === 'whatsapp') {
            // Scheduled sends use the same tenant binding and suppression policy as inbox sends.
            const { outboundService } = await import('@/modules/features/messaging/outbound-service')
            const parameters = Object.values(content.template_params || {}).map((value: any) => String(value)
                .replace('{{nombre}}', lead.name || '').replace('{{empresa}}', lead.company || '').replace('{{telefono}}', lead.phone || ''))
            result = await outboundService.sendSystemMessage(conversationId, {
                type: 'template', templateName: content.template_name,
                templateLanguage: content.template_language || 'es', templateComponents: parameters.length ? [{type:'body',parameters:parameters.map(text=>({type:'text',text}))}] : [],
            }, 'whatsapp', undefined, 'System', operationKey)
        } else {
            // Plain text dispatch (non-template or non-WhatsApp)
            result = await sendOutboundMessage(conversationId, content, step.type, undefined, 'System', operationKey)
        }

        if (!result.success) {
            throw new Error(`Send Failed: ${result.error}`)
        }

        debugLogs.push(`[${enrollment.id}] Message Sent (ID: ${result.externalId || 'Internal'}). Advancing...`)

        // 3. Advance to Next Step (Immediate)
        const nextStep = await getNextStep(supabase, step)

        if (nextStep) {
            let nextRun = new Date()
            if (campaign.delivery_config) {
                nextRun = addJitter(nextRun, campaign.delivery_config)
                nextRun = enforceScheduleWindow(nextRun, campaign.delivery_config)
            }

            await supabase.from('marketing_enrollments').update({
                current_step_id: nextStep.id,
                next_run_at: nextRun.toISOString(),
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
        .select('id,connection_id')
        .eq('organization_id', organizationId) // Strict Tenant
        .eq('lead_id', leadId)
        .eq('channel', channel)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

    if (existing?.connection_id || (existing && channel !== 'whatsapp')) return existing.id
    let connectionId: string | null = null
    if (channel === 'whatsapp') {
        const { data: channels, error: channelError } = await supabase.from('integration_connections').select('id')
            .eq('organization_id',organizationId).eq('status','active').in('provider_key',['whatsapp_cloud','meta_whatsapp']).limit(2)
        if (channelError || channels?.length !== 1) throw new Error('Selecciona un canal de WhatsApp para la campaña; no hay un único canal disponible.')
        connectionId = channels[0].id
        if (existing) {
            const bound = await supabase.from('conversations').update({connection_id:connectionId}).eq('id',existing.id).eq('organization_id',organizationId).is('connection_id',null).select('id').single()
            if (bound.error || !bound.data) throw new Error('Could not bind the campaign conversation')
            return existing.id
        }
    }
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
            source: 'marketing_campaign',
            connection_id: connectionId
        })
        .select('id')
        .single()

    if (error) {
        console.error('[Runner] Conversation Creation Failed:', error)
        return null
    }
    return newConv.id
}
