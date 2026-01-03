'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"
import type {
    LeadActivity,
    LeadTask,
    LeadNote,
    LeadDocument,
    CreateLeadTaskInput,
    UpdateLeadTaskInput,
    CreateLeadNoteInput,
    AssignLeadInput,
    UpdateLeadInput,
    LeadWithRelations,
    ScoreFactors,
    LeadEmail,
    SendEmailInput
} from "@/types/crm-advanced"

// ============================================
// LEAD UPDATE
// ============================================

export async function updateLead(leadId: string, input: UpdateLeadInput) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) throw new Error("No organization context")

        const { data, error } = await supabase
            .from('leads')
            .update({
                ...input,
                updated_at: new Date().toISOString()
            })
            .eq('id', leadId)
            .eq('organization_id', orgId)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/crm')
        return { success: true, data }
    } catch (error: any) {
        console.error('updateLead error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// LEAD DETAIL WITH RELATIONS
// ============================================

export async function getLeadWithRelations(leadId: string): Promise<LeadWithRelations | null> {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) return null

        // Fetch lead
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .eq('organization_id', orgId)
            .single()

        if (leadError || !lead) return null

        // Fetch relations in parallel
        const [
            { data: activities },
            { data: tasks },
            { data: notes },
            { data: documents },
            { data: assignee },
            { data: emails }
        ] = await Promise.all([
            supabase
                .from('lead_activities')
                .select('*')
                .eq('lead_id', leadId)
                .order('created_at', { ascending: false })
                .limit(50),
            supabase
                .from('lead_tasks')
                .select('*')
                .eq('lead_id', leadId)
                .order('due_date', { ascending: true, nullsFirst: false }),
            supabase
                .from('lead_notes')
                .select('*')
                .eq('lead_id', leadId)
                .order('created_at', { ascending: false }),
            supabase
                .from('lead_documents')
                .select('*')
                .eq('lead_id', leadId)
                .order('created_at', { ascending: false }),
            lead.assigned_to
                ? supabase
                    .from('profiles')
                    .select('id, email, full_name, avatar_url')
                    .eq('id', lead.assigned_to)
                    .single()
                : Promise.resolve({ data: null }),
            supabase
                .from('lead_emails')
                .select('*')
                .eq('lead_id', leadId)
                .order('created_at', { ascending: false })
        ])

        return {
            ...lead,
            activities: activities || [],
            tasks: tasks || [],
            note_entries: notes || [],
            documents: documents || [],
            emails: emails || [],
            assignee: assignee || undefined
        }
    } catch (error) {
        console.error('getLeadWithRelations error:', error)
        return null
    }
}

// ============================================
// ACTIVITIES
// ============================================

export async function getLeadActivities(leadId: string): Promise<LeadActivity[]> {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) return []

        const { data, error } = await supabase
            .from('lead_activities')
            .select('*')
            .eq('lead_id', leadId)
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('getLeadActivities error:', error)
        return []
    }
}

export async function createActivity(
    leadId: string,
    activityType: string,
    description: string,
    metadata?: Record<string, any>
) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()
        const { data: { user } } = await supabase.auth.getUser()

        if (!orgId || !user) throw new Error("Unauthorized")

        const { error } = await supabase
            .from('lead_activities')
            .insert({
                organization_id: orgId,
                lead_id: leadId,
                activity_type: activityType,
                description,
                metadata: metadata || {},
                performed_by: user.id
            })

        if (error) throw error

        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        console.error('createActivity error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// TASKS
// ============================================

export async function getLeadTasks(leadId?: string): Promise<LeadTask[]> {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) return []

        let query = supabase
            .from('lead_tasks')
            .select('*')
            .eq('organization_id', orgId)

        if (leadId) {
            query = query.eq('lead_id', leadId)
        }

        const { data, error } = await query.order('due_date', { ascending: true, nullsFirst: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('getLeadTasks error:', error)
        return []
    }
}

export async function createLeadTask(input: CreateLeadTaskInput) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()
        const { data: { user } } = await supabase.auth.getUser()

        if (!orgId || !user) throw new Error("Unauthorized")

        const { data, error } = await supabase
            .from('lead_tasks')
            .insert({
                organization_id: orgId,
                ...input,
                created_by: user.id,
                assigned_to: input.assigned_to || user.id
            })
            .select()
            .single()

        if (error) throw error

        // Create activity if lead_id exists
        if (input.lead_id) {
            await createActivity(
                input.lead_id,
                'task_created',
                `Task created: ${input.title}`
            )
        }

        revalidatePath('/crm')
        return { success: true, data }
    } catch (error: any) {
        console.error('createLeadTask error:', error)
        return { success: false, error: error.message }
    }
}

export async function updateLeadTask(taskId: string, input: UpdateLeadTaskInput) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()
        const { data: { user } } = await supabase.auth.getUser()

        if (!orgId || !user) throw new Error("Unauthorized")

        // Get current task
        const { data: currentTask } = await supabase
            .from('lead_tasks')
            .select('*')
            .eq('id', taskId)
            .eq('organization_id', orgId)
            .single()

        if (!currentTask) throw new Error("Task not found")

        // Update
        const updateData: any = { ...input }

        // If marking as completed
        if (input.status === 'completed' && currentTask.status !== 'completed') {
            updateData.completed_at = new Date().toISOString()
            updateData.completed_by = user.id
        }

        const { data, error } = await supabase
            .from('lead_tasks')
            .update(updateData)
            .eq('id', taskId)
            .eq('organization_id', orgId)
            .select()
            .single()

        if (error) throw error

        // Create activity if completed
        if (input.status === 'completed' && currentTask.lead_id) {
            await createActivity(
                currentTask.lead_id,
                'task_completed',
                `Task completed: ${currentTask.title}`
            )
        }

        revalidatePath('/crm')
        return { success: true, data }
    } catch (error: any) {
        console.error('updateLeadTask error:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteLeadTask(taskId: string) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) throw new Error("Unauthorized")

        const { error } = await supabase
            .from('lead_tasks')
            .delete()
            .eq('id', taskId)
            .eq('organization_id', orgId)

        if (error) throw error

        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        console.error('deleteLeadTask error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// NOTES
// ============================================

export async function getLeadNotes(leadId: string): Promise<LeadNote[]> {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) return []

        const { data, error } = await supabase
            .from('lead_notes')
            .select('*')
            .eq('lead_id', leadId)
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('getLeadNotes error:', error)
        return []
    }
}

export async function createLeadNote(input: CreateLeadNoteInput) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()
        const { data: { user } } = await supabase.auth.getUser()

        if (!orgId || !user) throw new Error("Unauthorized")

        const { data, error } = await supabase
            .from('lead_notes')
            .insert({
                organization_id: orgId,
                ...input,
                created_by: user.id
            })
            .select()
            .single()

        if (error) throw error

        // Create activity
        await createActivity(
            input.lead_id,
            'note_added',
            'Note added'
        )

        revalidatePath('/crm')
        return { success: true, data }
    } catch (error: any) {
        console.error('createLeadNote error:', error)
        return { success: false, error: error.message }
    }
}

export async function updateLeadNote(noteId: string, content: string, isPinned?: boolean) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) throw new Error("Unauthorized")

        const updateData: any = {
            content,
            updated_at: new Date().toISOString()
        }

        if (isPinned !== undefined) {
            updateData.is_pinned = isPinned
        }

        const { data, error } = await supabase
            .from('lead_notes')
            .update(updateData)
            .eq('id', noteId)
            .eq('organization_id', orgId)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/crm')
        return { success: true, data }
    } catch (error: any) {
        console.error('updateLeadNote error:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteLeadNote(noteId: string) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) throw new Error("Unauthorized")

        const { error } = await supabase
            .from('lead_notes')
            .delete()
            .eq('id', noteId)
            .eq('organization_id', orgId)

        if (error) throw error

        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        console.error('deleteLeadNote error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// DOCUMENTS
// ============================================

export async function uploadLeadFile(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) throw new Error("Unauthorized")

        const file = formData.get("file") as File
        const bucket = "crm-documents"

        if (!file) throw new Error("No file selected")

        // Validate
        if (file.size > 10 * 1024 * 1024) throw new Error("File too large (max 10MB)")

        const fileExt = file.name.split(".").pop()
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, file, {
                upsert: true
            })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName)

        return { success: true, url: publicUrl, size: file.size, type: file.type }
    } catch (error: any) {
        console.error('uploadLeadFile error:', error)
        return { success: false, error: error.message }
    }
}

export async function createLeadDocument(leadId: string, name: string, url: string, size: number, type: string) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()
        const { data: { user } } = await supabase.auth.getUser()

        if (!orgId || !user) throw new Error("Unauthorized")

        const { data, error } = await supabase
            .from('lead_documents')
            .insert({
                organization_id: orgId,
                lead_id: leadId,
                file_name: name,
                file_url: url,
                file_size: size,
                file_type: type,
                uploaded_by: user.id
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/crm')
        return { success: true, data }
    } catch (error: any) {
        console.error('createLeadDocument error:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteLeadDocument(documentId: string) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) throw new Error("Unauthorized")

        const { error } = await supabase
            .from('lead_documents')
            .delete()
            .eq('id', documentId)
            .eq('organization_id', orgId)

        if (error) throw error

        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        console.error('deleteLeadDocument error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// ASSIGNMENT
// ============================================

export async function assignLeads(input: AssignLeadInput) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()
        const { data: { user } } = await supabase.auth.getUser()

        if (!orgId || !user) throw new Error("Unauthorized")

        // Update leads
        const { error } = await supabase
            .from('leads')
            .update({ assigned_to: input.assigned_to })
            .in('id', input.lead_ids)
            .eq('organization_id', orgId)

        if (error) throw error

        // Note: Triggers will auto-create activities and assignment records

        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        console.error('assignLeads error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// LEAD SCORING
// ============================================

export async function calculateLeadScore(leadId: string) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) throw new Error("Unauthorized")

        // Get lead
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .eq('organization_id', orgId)
            .single()

        if (leadError || !lead) throw new Error("Lead not found")

        // Fetch engagement metrics
        const [
            { count: activityCount },
            { count: completedTasks },
            { count: emailsExchanged }
        ] = await Promise.all([
            supabase.from('lead_activities').select('*', { count: 'exact', head: true }).eq('lead_id', leadId),
            supabase.from('lead_tasks').select('*', { count: 'exact', head: true }).eq('lead_id', leadId).eq('status', 'completed'),
            supabase.from('lead_emails').select('*', { count: 'exact', head: true }).eq('lead_id', leadId)
        ])

        // Calculate score
        let score = 0
        const factors: ScoreFactors = {
            hasEmail: !!lead.email,
            hasPhone: !!lead.phone,
            hasCompany: !!lead.company_name,
            emailDomain: 'unknown',
            pipelineProgress: 0,
            engagement: 0
        }

        // 1. Profile Completeness (Max 45)
        // Email: +10
        if (lead.email) {
            score += 10
            // Business email: +10
            const domain = lead.email.split('@')[1]
            if (domain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(domain)) {
                factors.emailDomain = 'business'
                score += 10
            } else {
                factors.emailDomain = 'personal'
            }
        }

        // Phone: +10
        if (lead.phone) score += 10

        // Company: +5
        if (lead.company_name) score += 5

        // Source
        if (lead.source) {
            factors.source = lead.source
            if (lead.source === 'referral') score += 10
            else if (lead.source === 'website') score += 5
        }

        // Estimated value
        if (lead.estimated_value) {
            factors.estimatedValue = lead.estimated_value
            if (lead.estimated_value > 10000) score += 10
            else if (lead.estimated_value > 5000) score += 5
        }

        // 2. Engagement (Max 40)
        let engagementScore = 0

        // Items
        engagementScore += (activityCount || 0) * 1 // 1 point per activity
        engagementScore += (completedTasks || 0) * 5 // 5 points per completed task
        engagementScore += (emailsExchanged || 0) * 3 // 3 points per email exchanged

        // Recent Activity Bonus
        if (lead.updated_at) {
            const daysSinceUpdate = (new Date().getTime() - new Date(lead.updated_at).getTime()) / (1000 * 3600 * 24)
            if (daysSinceUpdate < 7) engagementScore += 10
            else if (daysSinceUpdate < 30) engagementScore += 5
        }

        // Cap Engagement at 40
        engagementScore = Math.min(40, engagementScore)
        factors.engagement = engagementScore
        score += engagementScore

        // 3. Pipeline Progress (Max 15)
        // Simple heuristic based on status
        if (lead.status === 'qualified') {
            score += 10
            factors.pipelineProgress = 10
        } else if (lead.status === 'negotiation') {
            score += 15
            factors.pipelineProgress = 15
        }

        // Final Cap at 100
        score = Math.min(100, score)

        // Update lead
        const { error: updateError } = await supabase
            .from('leads')
            .update({
                score,
                score_factors: factors,
                last_scored_at: new Date().toISOString()
            })
            .eq('id', leadId)
            .eq('organization_id', orgId)

        if (updateError) throw updateError

        revalidatePath('/crm')
        return { success: true, score, factors }
    } catch (error: any) {
        console.error('calculateLeadScore error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// EMAILS
// ============================================

export async function getLeadEmails(leadId: string): Promise<LeadEmail[]> {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) return []

        const { data, error } = await supabase
            .from('lead_emails')
            .select('*')
            .eq('lead_id', leadId)
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('getLeadEmails error:', error)
        return []
    }
}

export async function sendLeadEmail(input: SendEmailInput) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()
        const { data: { user } } = await supabase.auth.getUser()

        if (!orgId || !user) throw new Error("Unauthorized")

        // 0. Attempt to send via Resend
        let sentStatus: any = 'sent'
        let metadata: any = {}
        const { resend } = await import('@/lib/resend')

        if (resend) {
            try {
                // Use a default sender or configured one. 
                // For a real app, this should come from organization settings (if verified domain)
                // or a system-wide default.
                const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

                const { data: emailData, error: emailError } = await resend.emails.send({
                    from: fromEmail,
                    to: [input.to_email],
                    cc: input.cc_emails,
                    subject: input.subject,
                    html: input.body_html,
                    text: input.body_text
                })

                if (emailError) {
                    console.error("Resend Error:", emailError)
                    sentStatus = 'failed'
                    metadata.provider_error = emailError
                } else {
                    metadata.provider_id = emailData?.id
                }
            } catch (err: any) {
                console.error("Resend Exception:", err)
                sentStatus = 'failed'
                metadata.provider_error = err.message
            }
        } else {
            console.warn("Resend client not initialized (missing API Key), simulating send")
            metadata.simulation = true
        }

        // 1. Create Email Record
        const { error } = await supabase
            .from('lead_emails')
            .insert({
                organization_id: orgId,
                lead_id: input.lead_id,
                direction: 'outbound',
                from_email: user.email, // The user who triggered it
                to_email: input.to_email,
                cc_emails: input.cc_emails || [],
                subject: input.subject,
                body_html: input.body_html,
                body_text: input.body_text || input.body_html.replace(/<[^>]*>/g, ''),
                status: sentStatus,
                sent_at: sentStatus === 'sent' ? new Date().toISOString() : null,
                metadata
            })

        if (error) throw error

        // 2. Create Activity
        await createActivity(
            input.lead_id,
            'email_sent',
            sentStatus === 'sent' ? `Email sent: ${input.subject}` : `Email failed: ${input.subject}`
        )

        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        console.error('sendLeadEmail error:', error)
        return { success: false, error: error.message }
    }
}
