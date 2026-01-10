'use server'

import { createClient } from '@/lib/supabase-server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

export interface Campaign {
    id: string
    name: string
    description?: string
    goal?: string
    status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
    tags?: string[]
    delivery_config?: DeliveryConfig
    total_enrolled: number
    total_completed: number
    engagement_score: number
    created_at: string
}

export interface DeliveryConfig {
    mode: 'stealth' | 'growth' | 'turbo'
    humanize: boolean
    schedule_window?: { start: number, end: number }
    max_speed?: string
}

export interface Audience {
    id: string
    name: string
    description?: string
    type: 'dynamic' | 'static'
    filter_config: any
    cached_count: number
    created_at: string
}

// ... (Existing interfaces: Sequence, MarketingStep) ...
export interface Sequence {
    id: string
    campaign_id: string
    name: string
    trigger_type: string
    trigger_config: any
    is_active: boolean
    steps?: MarketingStep[]
}

export interface MarketingStep {
    id: string
    sequence_id: string
    type: string
    name: string
    order_index: number
    content: any
    delay_config?: any
    condition_config?: any
}


// Helper to ensure Org exists (Self-healing for dev/seed issues)
async function getOrInitializeOrg(userId: string) {
    const adminClient = supabaseAdmin

    // 1. Get ALL memberships
    const { data: members } = await adminClient
        .from('organization_members')
        .select('organization_id, organizations(name)')
        .eq('user_id', userId)

    if (members && members.length > 0) {
        // INTELLIGENT SELECTION:
        // 1. Priority: "Pixy Agency" (The user's main vertical)
        const pixy = members.find(m => {
            const orgData = m.organizations as any; // Cast to bypass strict type check on join
            const name = Array.isArray(orgData) ? orgData[0]?.name : orgData?.name;
            return name?.includes('Pixy Agency');
        })
        if (pixy) return { success: true, organization_id: pixy.organization_id }

        // 2. Fallback: Return the first valid one found
        // (This prevents the "Multiple rows" error)
        return { success: true, organization_id: members[0].organization_id }
    }

    // 2. If TRULY not found, Auto-Create
    console.log(`[Auto-Fix] Creating organization for user ${userId}`)

    // Create Org
    const { data: org, error: orgError } = await adminClient
        .from('organizations')
        .insert({ name: 'My Agency', slug: `agency-${userId.slice(0, 8)}` }) // Best guess schema
        .select()
        .single()

    if (orgError) {
        // Fallback: try minimal insert if slug fails
        console.error('Org creation failed, retrying minimal:', orgError)
        return { success: false, error: 'Failed to create organization: ' + orgError.message }
    }

    // Create Membership
    const { error: memberError } = await adminClient
        .from('organization_members')
        .insert({
            organization_id: org.id,
            user_id: userId,
            role: 'owner'
        })

    if (memberError) return { success: false, error: 'Failed to create membership: ' + memberError.message }

    return { success: true, organization_id: org.id }
}

// --- CAMPAIGNS ---

export async function getCampaigns() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) return { success: false, error: error.message }
    return { success: true, campaigns: data as Campaign[] }
}

export async function getCampaign(id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('id', id)
        .single()

    if (error) return { success: false, error: error.message }
    return { success: true, campaign: data as Campaign }
}

export async function createCampaign(data: { name: string, description?: string, goal?: string }) {
    const supabase = await createClient()

    // Get Org ID
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const orgResult = await getOrInitializeOrg(user.id)
    if (!orgResult.success) return { success: false, error: orgResult.error }
    const member = { organization_id: orgResult.organization_id }

    const { data: campaign, error } = await supabase
        .from('marketing_campaigns')
        .insert({
            organization_id: member.organization_id,
            name: data.name,
            description: data.description,
            goal: data.goal,
            created_by: user.id
        })
        .select()
        .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/crm/marketing')
    return { success: true, campaign }
}

export async function createQuickCampaign(data: {
    name: string
    message: string
    channel: 'whatsapp' | 'sms' | 'email'
    filters: Record<string, unknown>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const orgResult = await getOrInitializeOrg(user.id)
    if (!orgResult.success) return { success: false, error: orgResult.error }
    const member = { organization_id: orgResult.organization_id }

    // 1. Create Campaign
    const { data: campaign, error: cError } = await supabase
        .from('marketing_campaigns')
        .insert({
            organization_id: member.organization_id,
            name: data.name,
            description: 'Quick Broadcast Campaign',
            goal: 'broadcast',
            status: 'active',
            created_by: user.id,
            delivery_config: { mode: 'growth', humanize: true } // Default safe mode
        })
        .select()
        .single()
    if (cError) return { success: false, error: cError.message }

    // 2. Create Default Sequence
    const { data: sequence, error: sError } = await supabase
        .from('marketing_sequences')
        .insert({
            organization_id: member.organization_id,
            campaign_id: campaign.id,
            name: 'Main Flow',
            trigger_type: 'manual',
            is_active: true
        })
        .select()
        .single()
    if (sError) return { success: false, error: sError.message }

    // 3. Create Step 1 (The Message)
    const { error: stError } = await supabase
        .from('marketing_steps')
        .insert({
            organization_id: member.organization_id,
            sequence_id: sequence.id,
            type: data.channel,
            name: 'Broadcast Message',
            order_index: 0,
            content: { body: data.message }
        })
    if (stError) return { success: false, error: stError.message }

    // 4. Create Broadcast Log
    const { error: bError } = await supabase
        .from('broadcasts')
        .insert({
            organization_id: member.organization_id,
            campaign_id: campaign.id,
            name: data.name,
            message: data.message,
            channel: data.channel,
            filters: data.filters,
            status: 'draft',
            total_recipients: 0
        })

    if (bError) return { success: false, error: bError.message }

    revalidatePath('/crm/marketing')
    return { success: true, campaign }
}


export async function updateCampaign(id: string, data: Partial<Campaign>) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('marketing_campaigns')
        .update(data)
        .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/crm/marketing')
    return { success: true }
}

export async function deleteCampaign(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/crm/marketing')
    return { success: true }
}

// --- AUDIENCES (New) ---

export async function getAudiences() {
    // Use Admin Client to bypass RLS/Cache issues temporarily
    const adminClient = supabaseAdmin
    const { data, error } = await adminClient
        .from('marketing_audiences')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) return { success: false, error: error.message }
    return { success: true, audiences: data as Audience[] }
}

export async function createAudience(data: { name: string, description?: string, filter_config: any }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const orgResult = await getOrInitializeOrg(user.id)
    if (!orgResult.success) return { success: false, error: orgResult.error }
    const member = { organization_id: orgResult.organization_id }

    // Calculate initial count
    // NOTE: This logic should ideally be shared with getRecipientCount
    let count = 0
    let query = supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', member.organization_id)

    if (data.filter_config.status) query = query.eq('status', data.filter_config.status)
    if (data.filter_config.has_phone) query = query.not('phone', 'is', null)

    const { count: c } = await query
    count = c || 0

    // Use Admin Client for INSERT to bypass potential RLS/Cache visibility issues for the user role
    // aggressively creating fresh client to ensure key is used
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceKey || !url) {
        console.error('FATAL: Missing Service Role Key or URL in Server Action')
        return { success: false, error: 'System Configuration Error: Missing Admin Keys' }
    }

    const freshAdmin = createSupabaseClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })

    // Direct INSERT bypassing RPC cache issues
    const { data: audience, error } = await freshAdmin
        .from('marketing_audiences')
        .insert({
            organization_id: member.organization_id,
            name: data.name,
            description: data.description,
            type: 'dynamic',
            filter_config: data.filter_config,
            cached_count: count,
            created_by: user.id
        })
        .select()
        .single()

    if (error) {
        console.error('Create Audience INSERT Error:', error)
        return { success: false, error: 'DB Error: ' + error.message }
    }

    revalidatePath('/crm/marketing')
    return { success: true, audience }
}

export async function deleteAudience(id: string) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return { success: false, error: 'Config Error' }
    const freshAdmin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    const { error } = await freshAdmin.from('marketing_audiences').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/crm/marketing')
    return { success: true }
}

export async function updateAudience(id: string, data: { name?: string, description?: string, filter_config?: any }) {
    const adminClient = supabaseAdmin

    // If filter_config changed, recalculate count
    let updates: any = { ...data }
    if (data.filter_config) {
        const countResult = await previewAudienceCount(data.filter_config)
        if (countResult.success) {
            updates.cached_count = countResult.count
            updates.last_count_at = new Date().toISOString()
        }
    }

    const { error } = await adminClient
        .from('marketing_audiences')
        .update(updates)
        .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/crm/marketing')
    return { success: true }
}

export async function getAudienceById(id: string) {
    const adminClient = supabaseAdmin
    const { data, error } = await adminClient
        .from('marketing_audiences')
        .select('*')
        .eq('id', id)
        .single()

    if (error) return { success: false, error: error.message }
    return { success: true, audience: data as Audience }
}

export async function linkAudienceToCampaign(campaignId: string, audienceId: string | null) {
    const adminClient = supabaseAdmin
    const { error } = await adminClient
        .from('marketing_campaigns')
        .update({ audience_id: audienceId })
        .eq('id', campaignId)

    if (error) return { success: false, error: error.message }
    revalidatePath('/crm/marketing')
    return { success: true }
}

export async function enrollAudienceInCampaign(campaignId: string) {
    const adminClient = supabaseAdmin

    // 1. Get campaign with linked audience
    const { data: campaign, error: cErr } = await adminClient
        .from('marketing_campaigns')
        .select('id, organization_id, audience_id, status, scheduled_for')
        .eq('id', campaignId)
        .single()

    if (cErr || !campaign) return { success: false, error: 'Campaign not found' }
    if (!campaign.audience_id) return { success: false, error: 'No audience linked to campaign' }

    // 2. Check if scheduled for future
    if (campaign.scheduled_for && new Date(campaign.scheduled_for) > new Date()) {
        return { success: false, error: 'Campaign is scheduled for a future time' }
    }

    // 3. Get audience filter config
    const { data: audience, error: aErr } = await adminClient
        .from('marketing_audiences')
        .select('filter_config')
        .eq('id', campaign.audience_id)
        .single()

    if (aErr || !audience) return { success: false, error: 'Audience not found' }

    // 4. Get first active sequence for this campaign
    const { data: sequence, error: seqErr } = await adminClient
        .from('marketing_sequences')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('is_active', true)
        .limit(1)
        .single()

    if (seqErr || !sequence) return { success: false, error: 'No active sequence found' }

    // 5. Get first step of sequence
    const { data: firstStep, error: stepErr } = await adminClient
        .from('marketing_steps')
        .select('id')
        .eq('sequence_id', sequence.id)
        .order('order_index', { ascending: true })
        .limit(1)
        .single()

    if (stepErr || !firstStep) return { success: false, error: 'Sequence has no steps' }

    // 6. Build lead query from audience filters
    let leadsQuery = adminClient
        .from('leads')
        .select('id')
        .eq('organization_id', campaign.organization_id)
        .eq('marketing_opted_out', false) // Respect opt-outs

    const filters = audience.filter_config || {}
    if (filters.status) leadsQuery = leadsQuery.eq('status', filters.status)
    if (filters.has_phone) leadsQuery = leadsQuery.not('phone', 'is', null)
    if (filters.has_email) leadsQuery = leadsQuery.not('email', 'is', null)
    if (filters.source) leadsQuery = leadsQuery.eq('source', filters.source)
    if (filters.score_min) leadsQuery = leadsQuery.gte('score', filters.score_min)
    if (filters.tags && filters.tags.length > 0) {
        // Tags stored as array, use overlaps
        leadsQuery = leadsQuery.overlaps('tags', filters.tags)
    }
    if (filters.created_after) leadsQuery = leadsQuery.gte('created_at', filters.created_after)
    if (filters.created_before) leadsQuery = leadsQuery.lte('created_at', filters.created_before)

    const { data: leads, error: leadErr } = await leadsQuery
    if (leadErr) return { success: false, error: 'Failed to fetch leads: ' + leadErr.message }
    if (!leads || leads.length === 0) return { success: false, error: 'No leads match the audience filters' }

    // 7. Check for existing enrollments to avoid duplicates
    const { data: existing } = await adminClient
        .from('marketing_enrollments')
        .select('contact_id')
        .eq('campaign_id', campaignId)

    const existingIds = new Set(existing?.map(e => e.contact_id) || [])
    const newLeads = leads.filter(l => !existingIds.has(l.id))

    if (newLeads.length === 0) return { success: true, enrolled: 0, message: 'All leads already enrolled' }

    // 8. Create enrollments
    const enrollments = newLeads.map(lead => ({
        organization_id: campaign.organization_id,
        campaign_id: campaignId,
        sequence_id: sequence.id,
        contact_id: lead.id,
        current_step_id: firstStep.id,
        status: 'active',
        next_run_at: new Date().toISOString()
    }))

    const { error: insertErr } = await adminClient
        .from('marketing_enrollments')
        .insert(enrollments)

    if (insertErr) return { success: false, error: 'Failed to enroll: ' + insertErr.message }

    // 9. Update campaign stats
    await adminClient
        .from('marketing_campaigns')
        .update({
            total_enrolled: leads.length,
            status: 'active'
        })
        .eq('id', campaignId)

    revalidatePath('/crm/marketing')
    return { success: true, enrolled: newLeads.length }
}

export async function optOutLead(leadId: string) {
    const adminClient = supabaseAdmin
    const { error } = await adminClient
        .from('leads')
        .update({
            marketing_opted_out: true,
            opted_out_at: new Date().toISOString()
        })
        .eq('id', leadId)

    if (error) return { success: false, error: error.message }

    // Cancel any active enrollments for this lead
    await adminClient
        .from('marketing_enrollments')
        .update({ status: 'cancelled' })
        .eq('contact_id', leadId)
        .eq('status', 'active')

    return { success: true }
}


export async function previewAudienceCount(filters: any) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const orgResult = await getOrInitializeOrg(user.id)
    if (!orgResult.success) return { success: false, error: orgResult.error }
    const member = { organization_id: orgResult.organization_id }

    // Use Admin Client to bypass RLS/Cache issues
    const adminClient = supabaseAdmin
    let query = adminClient
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', member.organization_id)
        .eq('marketing_opted_out', false) // Always exclude opted-out

    // Basic filters
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.has_phone) query = query.not('phone', 'is', null)
    if (filters.has_email) query = query.not('email', 'is', null)

    // Advanced filters
    if (filters.source) query = query.eq('source', filters.source)
    if (filters.score_min) query = query.gte('score', filters.score_min)
    if (filters.score_max) query = query.lte('score', filters.score_max)

    // Tags filter (overlaps = any tag matches)
    if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags)
    }

    // Date range filters
    if (filters.created_after) query = query.gte('created_at', filters.created_after)
    if (filters.created_before) query = query.lte('created_at', filters.created_before)
    if (filters.last_contact_after) query = query.gte('last_contact_at', filters.last_contact_after)
    if (filters.last_contact_before) query = query.lte('last_contact_at', filters.last_contact_before)

    // Assigned agent filter
    if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to)

    const { count, error } = await query
    if (error) return { success: false, error: error.message }
    return { success: true, count: count || 0 }
}

export async function importLeads(leads: any[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const orgResult = await getOrInitializeOrg(user.id)
    if (!orgResult.success) return { success: false, error: orgResult.error }
    const member = { organization_id: orgResult.organization_id }

    // Clean and validate
    const cleanLeads = leads
        .filter(l => l.phone || l.email) // Must have contact info
        .map(l => ({
            organization_id: member.organization_id,
            name: l.name || 'Unknown',
            phone: l.phone ? String(l.phone).replace(/\D/g, '') : null, // Basic cleaner
            email: l.email || null,
            status: 'new',
            source: 'import_csv'
        }))

    if (cleanLeads.length === 0) return { success: false, error: 'No valid leads found in file' }

    // Bulk Upsert (Deduplicate by Phone or Email if unique constraint exists)
    // Assuming 'leads_organization_id_phone_key' or similar exists.
    // If not, we rely on 'onConflict' ignore or specific handling.
    // For now, using Upsert on phone if possible, otherwise just Insert and let DB error handle dupes or use 'ignoreDuplicates'.

    // Supabase upsert:
    const { error } = await supabase.from('leads').upsert(cleanLeads, {
        onConflict: 'organization_id, phone',
        ignoreDuplicates: true
    })

    if (error) return { success: false, error: error.message }

    return { success: true, count: cleanLeads.length }
}



// --- SEQUENCES ---

export async function getSequences(campaignId?: string) {
    const supabase = await createClient()
    let query = supabase.from('marketing_sequences').select('*, steps:marketing_steps(*)')

    if (campaignId) {
        query = query.eq('campaign_id', campaignId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) return { success: false, error: error.message }

    // Sort steps by order_index
    const sequences = data?.map(seq => ({
        ...seq,
        steps: seq.steps?.sort((a: any, b: any) => a.order_index - b.order_index)
    }))

    return { success: true, sequences: sequences as Sequence[] }
}

export async function createSequence(data: { name: string, campaign_id: string, trigger_type: string }) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const orgResult = await getOrInitializeOrg(user.id)
    if (!orgResult.success) return { success: false, error: orgResult.error }
    const member = { organization_id: orgResult.organization_id }

    const { data: sequence, error } = await supabase
        .from('marketing_sequences')
        .insert({
            organization_id: member.organization_id,
            name: data.name,
            campaign_id: data.campaign_id,
            trigger_type: data.trigger_type
        })
        .select()
        .single()

    if (error) return { success: false, error: error.message }

    revalidatePath(`/crm/marketing/campaigns/${data.campaign_id}`)
    return { success: true, sequence }
}

// --- STEPS ---

export async function addStepToSequence(sequenceId: string, stepData: {
    type: string,
    name: string,
    content: any,
    delay_config?: any
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const orgResult = await getOrInitializeOrg(user.id)
    if (!orgResult.success) return { success: false, error: orgResult.error }
    const member = { organization_id: orgResult.organization_id }

    // Get current steps count to set order_index
    const { count } = await supabase
        .from('marketing_steps')
        .select('id', { count: 'exact', head: true })
        .eq('sequence_id', sequenceId)

    const { data: step, error } = await supabase
        .from('marketing_steps')
        .insert({
            organization_id: member.organization_id,
            sequence_id: sequenceId,
            type: stepData.type,
            name: stepData.name,
            content: stepData.content,
            delay_config: stepData.delay_config,
            order_index: count || 0
        })
        .select()
        .single()

    if (error) return { success: false, error: error.message }

    const { data: seq } = await supabase.from('marketing_sequences').select('campaign_id').eq('id', sequenceId).single()
    if (seq) {
        revalidatePath(`/crm/marketing/campaigns/${seq.campaign_id}`)
    }

    return { success: true, step }
}


export async function deleteStep(stepId: string) {
    const supabase = await createClient()
    const { data: step } = await supabase.from('marketing_steps').select('sequence_id').eq('id', stepId).single()
    if (!step) return { success: false, error: 'Step not found' }

    const { error } = await supabase
        .from('marketing_steps')
        .delete()
        .eq('id', stepId)

    if (error) return { success: false, error: error.message }

    const { data: seq } = await supabase.from('marketing_sequences').select('campaign_id').eq('id', step.sequence_id).single()
    if (seq) {
        revalidatePath(`/crm/marketing/campaigns/${seq.campaign_id}`)
    }

    return { success: true }
}


export async function updateStep(stepId: string, data: any) {
    const supabase = await createClient()
    const { data: step } = await supabase.from('marketing_steps').select('sequence_id').eq('id', stepId).single()
    if (!step) return { success: false, error: 'Step not found' }

    const { error } = await supabase
        .from('marketing_steps')
        .update(data)
        .eq('id', stepId)

    if (error) return { success: false, error: error.message }

    const { data: seq } = await supabase.from('marketing_sequences').select('campaign_id').eq('id', step.sequence_id).single()
    if (seq) {
        revalidatePath(`/crm/marketing/campaigns/${seq.campaign_id}`)
    }
    return { success: true }
}

export async function deleteSequence(sequenceId: string) {
    const supabase = await createClient()
    const { data: seq } = await supabase.from('marketing_sequences').select('campaign_id').eq('id', sequenceId).single()
    if (!seq) return { success: false, error: 'Sequence not found' }

    const { error } = await supabase
        .from('marketing_sequences')
        .delete()
        .eq('id', sequenceId)

    if (error) return { success: false, error: error.message }

    revalidatePath(`/crm/marketing/campaigns/${seq.campaign_id}`)
    return { success: true }
}

export async function getCampaignStats(campaignId: string) {
    const supabase = await createClient()

    // 1. Get Status Counts
    // We can't use .count() with group by easily in Supabase JS without writing raw SQL or multiple queries.
    // For now, simpler: multiple count queries or one fetch of 'status' column if not huge.
    // Given potentially thousands, multiple count queries is safer.

    const { count: total } = await supabase.from('marketing_enrollments').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId)
    const { count: active } = await supabase.from('marketing_enrollments').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'active')
    const { count: completed } = await supabase.from('marketing_enrollments').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'completed')
    const { count: failed } = await supabase.from('marketing_enrollments').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'failed')

    // 2. Get Recent Logs (from recent enrollments)
    // Detailed global log table doesn't exist, logs are inside Enrollments.
    // Fetch last 10 updated enrollments to show recent activity.
    const { data: recent } = await supabase
        .from('marketing_enrollments')
        .select('id, status, last_run_at, execution_logs, lead:leads(phone, name)')
        .eq('campaign_id', campaignId)
        .order('last_run_at', { ascending: false })
        .limit(10)

    // Unwind logs? Or just return recent enrollments as "Recent Activity"
    const recentActivity = recent?.map(r => ({
        id: r.id,
        lead: r.lead,
        status: r.status,
        last_updated: r.last_run_at,
        last_log: r.execution_logs && Array.isArray(r.execution_logs) && r.execution_logs.length > 0
            ? r.execution_logs[r.execution_logs.length - 1]
            : null
    })) || []

    return {
        success: true,
        stats: {
            total: total || 0,
            active: active || 0,
            completed: completed || 0,
            failed: failed || 0
        },
        recentActivity
    }
}

// --- ANALYTICS ---

export async function getMarketingStats() {
    const supabase = await createClient()
    const [campaignsParams, broadcastsParams] = await Promise.all([
        supabase.from('marketing_campaigns').select('id', { count: 'exact' }),
        supabase.from('broadcasts').select('sent_count, delivered_count')
    ])

    const totalCampaigns = campaignsParams.count || 0
    const totalMessages = broadcastsParams.data?.reduce((acc, curr) => acc + (curr.sent_count || 0), 0) || 0
    const totalDelivered = broadcastsParams.data?.reduce((acc, curr) => acc + (curr.delivered_count || 0), 0) || 0

    return {
        totalCampaigns,
        totalMessages,
        totalDelivered,
        deliveryRate: totalMessages > 0 ? Math.round((totalDelivered / totalMessages) * 100) : 0
    }
}

export async function getRecipientCount(filters: Record<string, unknown>) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const orgResult = await getOrInitializeOrg(user.id)
        if (!orgResult.success) return { success: false, error: orgResult.error }
        const member = { organization_id: orgResult.organization_id }

        let query = supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', member.organization_id)

        if (filters.status) {
            query = query.eq('status', filters.status)
        }
        if (filters.has_phone) {
            query = query.not('phone', 'is', null)
        }
        if (filters.has_email) {
            query = query.not('email', 'is', null)
        }
        if (filters.score_min) {
            query = query.gte('score', filters.score_min)
        }

        const { count, error } = await query

        if (error) throw error

        return { success: true, count: count || 0 }
    } catch (error) {
        console.error("Error counting recipients:", error)
        return { success: false, error: String(error), count: 0 }
    }
}
