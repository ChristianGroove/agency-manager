import { SupabaseClient } from '@supabase/supabase-js'
import { ContactRepository, CreateContactRepositoryInput } from './contact-repository'
import { Lead, Client } from '@/types'
import { SecurityLogger } from '@/modules/core/security/logger'
import { calculateLeadScore as coreCalculateLeadScore } from './logic/scoring'

export class ContactService {
    private repo: ContactRepository

    constructor(private supabase: SupabaseClient, private organizationId: string, private userId?: string) {
        this.repo = new ContactRepository(supabase)
    }

    /**
     * UNIFIED CONTACT CREATION (Leads & Clients)
     */
    async createContact(input: {
        name: string
        company_name?: string
        email?: string
        phone?: string
        source?: string
        contact_type?: 'lead' | 'client'
        status?: string
    }): Promise<Lead> {
        if (!this.organizationId) throw new Error("No organization context found")

        const contactInput: CreateContactRepositoryInput = {
            ...input,
            user_id: this.userId,
            organization_id: this.organizationId,
            status: input.status || (input.contact_type === 'client' ? 'active' : 'new'),
            source: input.source || 'manual',
            contact_type: input.contact_type || 'lead'
        }
        
        const contact = await this.repo.create(contactInput)

        // Only start sales process for Leads
        if (contact.contact_type === 'lead') {
            try {
                // Temporary import from core until ProcessEngine is moved
                const { ProcessEngine } = await import('./process-engine/engine')
                const processRes = await ProcessEngine.startProcess(contact.id, 'sale')
                
                if (processRes.success && processRes.process) {
                    const startState = processRes.process.current_state
                    // Try to find matching pipeline stage UI
                    const { data: stage } = await this.supabase
                        .from('pipeline_stages')
                        .select('id, status_key')
                        .eq('organization_id', this.organizationId)
                        .eq('status_key', startState)
                        .maybeSingle()

                    if (stage) {
                        await this.repo.update(contact.id, {
                            pipeline_stage_id: stage.id,
                            status: stage.status_key
                        }, this.organizationId)
                    } else {
                        await this.repo.update(contact.id, { status: startState }, this.organizationId)
                    }
                }
            } catch (procErr) {
                console.error("Process Engine Start Failed:", procErr)
            }
        }

        // Security Metrics
        if (this.userId) {
            await SecurityLogger.log({
                action: contact.contact_type === 'client' ? 'client.create' : 'lead.create',
                resource_entity: 'leads',
                resource_id: contact.id,
                organization_id: this.organizationId,
                metadata: { name: input.name }
            })
        }

        return contact
    }

    async updateContactStatus(id: string, newStatus: string): Promise<Lead> {
        const { data: stage } = await this.supabase
            .from('pipeline_stages')
            .select('id, pipeline_id')
            .eq('organization_id', this.organizationId)
            .eq('status_key', newStatus)
            .maybeSingle()

        if (stage) {
            // Logic for Process Sync (Strict Mode)
            const { data: pipeline } = await this.supabase
                .from('pipelines')
                .select('process_enabled')
                .eq('id', stage.pipeline_id)
                .single()

            if (pipeline?.process_enabled) {
                const { ProcessMapper } = await import('./process-engine/map-service')
                const { ProcessEngine } = await import('./process-engine/engine')
                
                const { allowed, reason, requiredProcessState } = await ProcessMapper.validatePipelineMove(id, stage.id)
                if (!allowed) throw new Error(reason || "Action blocked by Process Rules.")

                if (requiredProcessState) {
                    const instance = await ProcessEngine.getActiveProcess(id)
                    if (instance) {
                        await ProcessEngine.transition(instance.id, requiredProcessState, 'user', 'Pipeline Stage Sync')
                    }
                }
            }
        }

        return this.repo.update(id, { status: newStatus }, this.organizationId)
    }

    async convertToClient(id: string): Promise<Client> {
        const updated = await this.repo.update(id, {
            contact_type: 'client',
            status: 'converted', // Can also be 'active'
            updated_at: new Date().toISOString()
        }, this.organizationId)

        if (this.userId) {
            await SecurityLogger.log({
                action: 'lead.convert',
                resource_entity: 'leads',
                resource_id: id,
                organization_id: this.organizationId
            })
        }

        return updated as unknown as Client
    }

    async updateProfile(id: string, updates: Record<string, any>): Promise<Lead> {
        const contact = await this.repo.update(id, updates, this.organizationId)
        
        if (this.userId) {
            await SecurityLogger.log({
                action: 'contact.update',
                resource_entity: 'leads',
                resource_id: id,
                organization_id: this.organizationId,
                metadata: { updates: Object.keys(updates) }
            })
        }

        return contact
    }

    async getPaginated(params: {
        page?: number,
        pageSize?: number,
        search?: string,
        stageId?: string,
        connectionId?: string | null,
        allowedChannels?: string[],
        userId?: string,
        dateFrom?: string,
        dateTo?: string,
        contactType?: 'lead' | 'client' | 'all'
    }): Promise<any> {
        let effectiveConnectionIds: string[] | undefined = undefined

        if (params.connectionId && params.connectionId !== 'all') {
            effectiveConnectionIds = [params.connectionId]
        }

        return this.repo.getPaginated({
            orgId: this.organizationId,
            page: params.page || 1,
            pageSize: params.pageSize || 50,
            search: params.search || '',
            stageId: params.stageId || 'all',
            connectionIds: effectiveConnectionIds,
            allowedChannels: params.allowedChannels,
            userId: params.userId,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            contactType: params.contactType
        })
    }

    async calculateScore(id: string): Promise<any> {
        const { score, factors, breakdown } = await coreCalculateLeadScore(id)

        await this.repo.update(id, {
            score,
            score_factors: factors,
            last_scored_at: new Date().toISOString()
        }, this.organizationId)

        return { score, factors, breakdown }
    }

    async deleteContacts(ids: string[]): Promise<number> {
        if (!this.organizationId) throw new Error("No organization context")
        
        const count = await this.repo.hardDelete(ids, this.organizationId)

        // Dispatch background cleanups
        if (count > 0 && this.userId) {
            SecurityLogger.log({
                action: 'contact.delete_bulk',
                resource_entity: 'leads',
                organization_id: this.organizationId,
                metadata: { count, ids }
            }).catch(e => console.error("Error logging deletion", e))
        }

        return count
    }

    async generateExportCSV(allowedChannels?: string[]): Promise<string> {
        const leads = await this.repo.getExportData(this.organizationId, allowedChannels)
        if (!leads || leads.length === 0) return ""

        const headers = ["Nombre", "Empresa", "Email", "Telefono", "Canal", "Estado", "Fecha Creacion"]
        const csvRows = [headers.join(";")]

        for (const lead of leads) {
            const cleanPhone = (lead.phone || '').replace(/"/g, '""')
            const cleanName = (lead.name || '').replace(/"/g, '""')
            const cleanCompany = (lead.company_name || '').replace(/"/g, '""')
            const cleanEmail = (lead.email || '').replace(/"/g, '""')
            const connectionName = lead.integration_connections?.connection_name
            const cleanSource = connectionName ? connectionName.replace(/"/g, '""') : (lead.source || '').replace(/"/g, '""')
            const cleanStatus = (lead.status || '').replace(/"/g, '""')
            const dateStr = lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ''

            const row = [
                `"${cleanName}"`,
                `"${cleanCompany}"`,
                `"${cleanEmail}"`,
                `="${cleanPhone}"`,
                `"${cleanSource}"`,
                `"${cleanStatus}"`,
                `"${dateStr}"`
            ]
            csvRows.push(row.join(";"))
        }

        return "\ufeff" + csvRows.join("\r\n")
    }

    async previewPurgeColdAccounts(criteria: { inactiveDays: number, minScore?: number, allowedChannels?: string[] }): Promise<number> {
        const thresholdDate = new Date()
        thresholdDate.setDate(thresholdDate.getDate() - criteria.inactiveDays)
        
        return this.repo.previewInactive(this.organizationId, criteria.allowedChannels, thresholdDate.toISOString(), criteria.minScore)
    }

    async purgeColdAccounts(criteria: { inactiveDays: number, minScore?: number, allowedChannels?: string[] }): Promise<number> {
        if (!this.organizationId) throw new Error("Missing orgId")
        const thresholdDate = new Date()
        thresholdDate.setDate(thresholdDate.getDate() - criteria.inactiveDays)
        
        return this.repo.purgeInactive(this.organizationId, criteria.allowedChannels, thresholdDate.toISOString(), criteria.minScore)
    }

    async getWithRelations(leadId: string): Promise<any> {
        return this.repo.findWithRelations(leadId, this.organizationId)
    }
}
