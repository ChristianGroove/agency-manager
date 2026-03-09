"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { ActionResponse } from "./leads-actions"

export type Tag = {
    id: string
    organization_id: string
    name: string
    color: string
    created_at: string
}

export type LeadTag = Tag & {
    linked_at: string
}

// --- USER ACTIONS (For UI) ---

export async function getTags(): Promise<Tag[]> {
    const supabase = await createClient()
    try {
        const orgId = await getCurrentOrganizationId()
        if (!orgId) return []

        const { data, error } = await supabase
            .from('crm_tags')
            .select('*')
            .eq('organization_id', orgId)
            .order('name')

        if (error) throw error
        return data as Tag[]
    } catch (e) {
        console.error("Error fetching tags:", e)
        return []
    }
}

export async function createTag(name: string, color: string = '#808080'): Promise<ActionResponse<Tag>> {
    const supabase = await createClient()
    try {
        const orgId = await getCurrentOrganizationId()
        if (!orgId) throw new Error("Unauthorized")

        const { data, error } = await supabase
            .from('crm_tags')
            .insert({
                organization_id: orgId,
                name,
                color
            })
            .select()
            .single()

        if (error) throw error
        return { success: true, data: data as Tag }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function updateTag(id: string, updates: { name?: string; color?: string }): Promise<ActionResponse<Tag>> {
    const supabase = await createClient()
    try {
        const orgId = await getCurrentOrganizationId()
        if (!orgId) throw new Error("Unauthorized")

        const { data, error } = await supabase
            .from('crm_tags')
            .update(updates)
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single()

        if (error) throw error
        return { success: true, data: data as Tag }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function deleteTag(id: string): Promise<ActionResponse<void>> {
    const supabase = await createClient()
    try {
        const orgId = await getCurrentOrganizationId()
        if (!orgId) throw new Error("Unauthorized")

        const { error } = await supabase
            .from('crm_tags')
            .delete()
            .eq('id', id)
            .eq('organization_id', orgId)

        if (error) throw error
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function getLeadTags(leadId: string): Promise<LeadTag[]> {
    const supabase = await createClient()
    try {
        const { data, error } = await supabase
            .from('crm_lead_tags')
            .select(`
                created_at,
                tag:crm_tags (*)
            `)
            .eq('lead_id', leadId)

        if (error) throw error

        return data.map((item: any) => ({
            ...item.tag,
            linked_at: item.created_at
        })) as LeadTag[]
    } catch (e) {
        console.error("Error fetching lead tags:", e)
        return []
    }
}

export async function toggleLeadTag(leadId: string, tagId: string): Promise<ActionResponse<{ action: 'added' | 'removed' }>> {
    const supabase = await createClient()
    try {
        // Check if exists
        const { data: existing } = await supabase
            .from('crm_lead_tags')
            .select('*')
            .eq('lead_id', leadId)
            .eq('tag_id', tagId)
            .single()

        if (existing) {
            // Remove
            const { error: delError } = await supabase
                .from('crm_lead_tags')
                .delete()
                .eq('lead_id', leadId)
                .eq('tag_id', tagId)

            if (delError) throw delError
        } else {
            // Add
            const { error: insError } = await supabase
                .from('crm_lead_tags')
                .insert({ lead_id: leadId, tag_id: tagId })

            if (insError) throw insError
        }

        // --- SURGICAL: Sync Tags to Conversations table for UI display on cards ---
        // We use the same supabase client (user context) for consistency/RLS
        const { data: leadTags } = await supabase
            .from('crm_lead_tags')
            .select('tag:crm_tags(name)')
            .eq('lead_id', leadId);

        const tagNames = leadTags ? leadTags.map((t: any) => t.tag.name) : [];
        await supabase
            .from('conversations')
            .update({ tags: tagNames })
            .eq('lead_id', leadId)
            .neq('state', 'archived');

        return { success: true, data: { action: existing ? 'removed' : 'added' } }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// --- SYSTEM ACTIONS (For Automation) ---

/**
 * Add a tag to a lead (System/Automation)
 * 1. Finds existing tag by name OR creates it if it doesn't exist.
 * 2. Links it to the lead.
 */
export async function addLeadTagSystem(leadId: string, tagName: string, organizationId: string, executionId?: string): Promise<ActionResponse<void>> {
    const logToDb = async (level: string, message: string, details?: any) => {
        if (!executionId || !organizationId) return;
        await supabaseAdmin.from('workflow_logs').insert({
            organization_id: organizationId,
            execution_id: executionId,
            node_id: 'tag-node-internal',
            level,
            message,
            details,
            created_at: new Date().toISOString()
        });
    };
    try {
        if (!organizationId) throw new Error("Organization ID required")

        // 1. Find or Create Tag
        // Check existence
        const { data: existingTag } = await supabaseAdmin
            .from('crm_tags')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('name', tagName)
            .single()

        let tagId = existingTag?.id

        if (!tagId) {
            // Create new
            const { data: newTag, error: createError } = await supabaseAdmin
                .from('crm_tags')
                .insert({
                    organization_id: organizationId,
                    name: tagName,
                    color: '#f59e0b' // Default orange/yellow for automated tags
                })
                .select('id')
                .single()

            if (createError) throw createError
            tagId = newTag.id
        }

        // 2. Link to Lead
        const { error: linkError } = await supabaseAdmin
            .from('crm_lead_tags')
            .insert({
                lead_id: leadId,
                tag_id: tagId
            })
            // Ignore conflict if already tagged
            .maybeSingle()

        if (linkError && linkError.code !== '23505') { // 23505 = unique_violation
            throw linkError
        }

        // 3. SURGICAL: Sync Tags to Conversations table for UI display on cards
        // Find active conversations for this lead and update their denormalized 'tags' field
        const { data: leadTags } = await supabaseAdmin
            .from('crm_lead_tags')
            .select('tag:crm_tags(name)')
            .eq('lead_id', leadId);

        if (leadTags) {
            const tagNames = leadTags.map((t: any) => t.tag.name);
            const { fileLogger } = require('@/lib/file-logger');
            fileLogger.log(`[TagSync] Syncing tags for lead ${leadId}: ${tagNames.join(', ')}`);
            await logToDb('info', 'Syncing tags to conversations', { leadId, tagNames });

            const { error: syncError, data: syncData } = await supabaseAdmin
                .from('conversations')
                .update({ tags: tagNames })
                .eq('lead_id', leadId)
                .neq('state', 'archived')
                .select('id, tags');

            if (syncError) {
                fileLogger.log(`[TagSync] Error syncing to conversations: ${syncError.message}`);
                await logToDb('error', 'Sync failed', syncError);
            } else {
                fileLogger.log(`[TagSync] Successfully updated ${syncData?.length} conversations`);
                await logToDb('info', `Successfully updated ${syncData?.length} conversations`, { conversations: syncData?.map(c => c.id) });
            }
        } else {
            const { fileLogger } = require('@/lib/file-logger');
            fileLogger.log(`[TagSync] No tags found for lead ${leadId} after adding`);
            await logToDb('warn', 'No tags found for lead after addition', { leadId });
        }

        return { success: true }

    } catch (e: any) {
        console.error("[System] Error adding tag:", e)
        return { success: false, error: e.message }
    }
}

export async function removeLeadTagSystem(leadId: string, tagName: string, organizationId: string, executionId?: string): Promise<ActionResponse<void>> {
    const logToDb = async (level: string, message: string, details?: any) => {
        if (!executionId || !organizationId) return;
        await supabaseAdmin.from('workflow_logs').insert({
            organization_id: organizationId,
            execution_id: executionId,
            node_id: 'tag-node-internal-remove',
            level,
            message,
            details,
            created_at: new Date().toISOString()
        });
    };
    try {
        // 1. Find Tag ID
        const { data: existingTag } = await supabaseAdmin
            .from('crm_tags')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('name', tagName)
            .single()

        if (!existingTag) return { success: true } // Tag doesn't exist, easier to say success

        // 2. Delete Link
        const { error } = await supabaseAdmin
            .from('crm_lead_tags')
            .delete()
            .eq('lead_id', leadId)
            .eq('tag_id', existingTag.id)

        if (error) throw error

        // 3. SURGICAL: Sync Tags to Conversations table for UI display on cards
        const { data: leadTags } = await supabaseAdmin
            .from('crm_lead_tags')
            .select('tag:crm_tags(name)')
            .eq('lead_id', leadId);

        const tagNames = leadTags ? leadTags.map((t: any) => t.tag.name) : [];
        console.error(`[TagSync] Syncing tags (remove) for lead ${leadId}:`, tagNames);
        await logToDb('info', 'Syncing tags (remove) to conversations', { leadId, tagNames });

        const { error: syncError, data: syncData } = await supabaseAdmin
            .from('conversations')
            .update({ tags: tagNames })
            .eq('lead_id', leadId)
            .neq('state', 'archived')
            .select('id, tags');

        if (syncError) {
            console.error(`[TagSync] Error syncing to conversations:`, syncError);
            await logToDb('error', 'Sync failed (remove)', syncError);
        } else {
            console.error(`[TagSync] Successfully updated (remove) ${syncData?.length} conversations`);
            await logToDb('info', `Successfully updated (remove) ${syncData?.length} conversations`, { conversations: syncData?.map(c => c.id) });
        }

        return { success: true }

    } catch (e: any) {
        console.error("[System] Error removing tag:", e)
        return { success: false, error: e.message }
    }
}

/**
 * Remove ALL tags from a lead (System/Automation)
 * Used when a conversation is resolved or deleted.
 */
export async function clearLeadTagsSystem(leadId: string, organizationId: string, executionId?: string): Promise<ActionResponse<void>> {
    try {
        if (!organizationId) throw new Error("Organization ID required")

        const { fileLogger } = require('@/lib/file-logger');
        fileLogger.log(`[TagSync] CLEARING ALL TAGS for lead ${leadId}`);

        // 1. Delete all relational links
        const { error: delError } = await supabaseAdmin
            .from('crm_lead_tags')
            .delete()
            .eq('lead_id', leadId);

        if (delError) throw delError;

        // 2. Clear leads table array
        const { error: leadError } = await supabaseAdmin
            .from('leads')
            .update({ tags: [] })
            .eq('id', leadId);

        if (leadError) throw leadError;

        // 3. Clear all active conversations for this lead
        const { error: convError } = await supabaseAdmin
            .from('conversations')
            .update({ tags: [] })
            .eq('lead_id', leadId)
            .neq('state', 'archived');

        if (convError) throw convError;

        return { success: true }
    } catch (e: any) {
        console.error("[System] Error clearing tags:", e)
        return { success: false, error: e.message }
    }
}
