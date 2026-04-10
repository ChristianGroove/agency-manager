import { SupabaseClient } from '@supabase/supabase-js'
import { CRMAdvancedRepository } from '../repositories/crm-advanced.repository'

export class CRMAdvancedService {
    private repo: CRMAdvancedRepository

    constructor(private supabase: SupabaseClient, private orgId: string, private userId?: string) {
        this.repo = new CRMAdvancedRepository(supabase)
    }

    // --- ACTIVITIES ---
    async getActivities(leadId: string): Promise<any[]> {
        return this.repo.getActivities(leadId, this.orgId)
    }

    async createActivity(leadId: string, type: string, description: string, metadata?: any): Promise<void> {
        if (!this.userId) throw new Error("Unauthorized")
        
        await this.repo.insertActivity({
            organization_id: this.orgId,
            lead_id: leadId,
            activity_type: type,
            description,
            metadata: metadata || {},
            performed_by: this.userId
        })
    }

    // --- TASKS ---
    async getTasks(leadId?: string): Promise<any[]> {
        return this.repo.getTasks(this.orgId, leadId)
    }

    async createTask(input: any): Promise<any> {
        if (!this.userId) throw new Error("Unauthorized")

        const task = await this.repo.insertTask({
            organization_id: this.orgId,
            ...input,
            created_by: this.userId,
            assigned_to: input.assigned_to || this.userId
        })

        if (input.lead_id) {
            await this.createActivity(
                input.lead_id,
                'task_created',
                `Task created: ${input.title}`
            )
        }

        return task
    }

    async updateTask(taskId: string, input: any): Promise<any> {
        if (!this.userId) throw new Error("Unauthorized")

        const currentTask = await this.repo.getTaskById(taskId, this.orgId)
        if (!currentTask) throw new Error("Task not found")

        const updateData: any = { ...input }

        // Completion logic
        if (input.status === 'completed' && currentTask.status !== 'completed') {
            updateData.completed_at = new Date().toISOString()
            updateData.completed_by = this.userId
        }

        const task = await this.repo.updateTask(taskId, this.orgId, updateData)

        if (input.status === 'completed' && currentTask.lead_id) {
            await this.createActivity(
                currentTask.lead_id,
                'task_completed',
                `Task completed: ${currentTask.title}`
            )
        }

        return task
    }

    async deleteTask(taskId: string): Promise<void> {
        await this.repo.deleteTask(taskId, this.orgId)
    }

    // --- NOTES ---
    async getNotes(leadId: string): Promise<any[]> {
        return this.repo.getNotes(leadId, this.orgId)
    }

    async createNote(input: any): Promise<any> {
        if (!this.userId) throw new Error("Unauthorized")

        const note = await this.repo.insertNote({
            organization_id: this.orgId,
            ...input,
            created_by: this.userId
        })

        await this.createActivity(
            input.lead_id,
            'note_added',
            'Note added'
        )

        return note
    }

    async updateNote(noteId: string, content: string, isPinned?: boolean): Promise<any> {
        const updateData: any = {
            content,
            updated_at: new Date().toISOString()
        }
        if (isPinned !== undefined) updateData.is_pinned = isPinned

        return this.repo.updateNote(noteId, this.orgId, updateData)
    }

    async deleteNote(noteId: string): Promise<void> {
        await this.repo.deleteNote(noteId, this.orgId)
    }

    // --- DOCUMENTS ---
    async createDocument(leadId: string, name: string, url: string, size: number, type: string): Promise<any> {
        if (!this.userId) throw new Error("Unauthorized")

        return this.repo.insertDocument({
            organization_id: this.orgId,
            lead_id: leadId,
            file_name: name,
            file_url: url,
            file_size: size,
            file_type: type,
            uploaded_by: this.userId
        })
    }

    async deleteDocument(documentId: string): Promise<void> {
        await this.repo.deleteDocument(documentId, this.orgId)
    }

    // --- ASSIGNMENT ---
    async assignLeads(leadIds: string[], assignedTo: string | null): Promise<void> {
        await this.repo.bulkUpdateAssignment(leadIds, this.orgId, assignedTo)
    }

    // --- EMAILS ---
    async getEmails(leadId: string): Promise<any[]> {
        return this.repo.getEmails(leadId, this.orgId)
    }

    async sendEmail(input: any): Promise<void> {
        if (!this.userId) throw new Error("Unauthorized")

        // 1. Resolve Email Provider (Resend)
        let sentStatus: any = 'sent'
        let metadata: any = {}
        
        try {
            const { resend } = await import('@/modules/infrastructure/notifications/services/resend')
            if (resend) {
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
                    sentStatus = 'failed'
                    metadata.provider_error = emailError
                } else {
                    metadata.provider_id = emailData?.id
                }
            } else {
                metadata.simulation = true
            }
        } catch (err: any) {
            sentStatus = 'failed'
            metadata.provider_error = err.message
        }

        // 2. Persist record
        // We need user's email for the record
        const { data: profile } = await this.supabase.from('profiles').select('email').eq('id', this.userId).single()

        await this.repo.insertEmail({
            organization_id: this.orgId,
            lead_id: input.lead_id,
            direction: 'outbound',
            from_email: profile?.email || 'unknown@system.com',
            to_email: input.to_email,
            cc_emails: input.cc_emails || [],
            subject: input.subject,
            body_html: input.body_html,
            body_text: input.body_text || input.body_html.replace(/<[^>]*>/g, ''),
            status: sentStatus,
            sent_at: sentStatus === 'sent' ? new Date().toISOString() : null,
            metadata
        })

        // 3. Log activity
        await this.createActivity(
            input.lead_id,
            'email_sent',
            sentStatus === 'sent' ? `Email sent: ${input.subject}` : `Email failed: ${input.subject}`
        )
    }
}
