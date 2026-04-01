import { SupabaseClient } from '@supabase/supabase-js'
import { LeadsRepository, CreateLeadRepositoryInput } from '../repositories/leads.repository'
import { Lead, Client } from '@/types'
import { ProcessEngine } from '../../process-engine/engine'
import { ProcessMapper } from '../../process-engine/map-service'
import { calculateLeadScore as coreCalculateLeadScore } from '../scoring'
import { SecurityLogger } from '@/lib/security/logger'

export class LeadsService {
    private repo: LeadsRepository

    constructor(private supabase: SupabaseClient, private organizationId: string, private userId?: string) {
        this.repo = new LeadsRepository(supabase)
    }

    async createLead(input: {
        name: string
        company_name?: string
        email?: string
        phone?: string
        source?: string
    }): Promise<Lead> {
        if (!this.organizationId) throw new Error("No organization context found")

        // 1. Create raw lead
        const leadInput: CreateLeadRepositoryInput = {
            ...input,
            user_id: this.userId,
            organization_id: this.organizationId,
            status: 'new',
            source: input.source || 'manual'
        }
        
        const lead = await this.repo.create(leadInput)

        // 2. Process Engine Auto-Start
        try {
            const processRes = await ProcessEngine.startProcess(lead.id, 'sale')
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
                    await this.repo.update(lead.id, {
                        pipeline_stage_id: stage.id,
                        status: stage.status_key
                    })
                } else {
                    await this.repo.update(lead.id, { status: startState })
                }
            }
        } catch (procErr) {
            console.error("Process Engine Start Failed:", procErr)
            // Continue, don't block lead creation
        }

        // 3. Security Metrics
        if (this.userId) {
            await SecurityLogger.log({
                action: 'lead.create',
                resource_entity: 'leads',
                resource_id: lead.id,
                organization_id: this.organizationId,
                metadata: { name: input.name }
            })
        }

        return lead
    }

    async updateLeadStatus(leadId: string, newStatus: string): Promise<Lead> {
        // 1. Resolve Stage ID from Status Key
        const { data: stage } = await this.supabase
            .from('pipeline_stages')
            .select('id, pipeline_id')
            .eq('organization_id', this.organizationId)
            .eq('status_key', newStatus)
            .maybeSingle()

        if (stage) {
            // Check Pipeline "Process Enabled" Flag (Strict Mode)
            let strictMode = false
            if (stage.pipeline_id) {
                const { data: pipeline } = await this.supabase
                    .from('pipelines')
                    .select('process_enabled')
                    .eq('id', stage.pipeline_id)
                    .single()
                if (pipeline) strictMode = pipeline.process_enabled
            }

            if (strictMode) {
                // Validate Transition (Only in Strict Mode)
                const { allowed, reason, requiredProcessState } = await ProcessMapper.validatePipelineMove(leadId, stage.id)
                if (!allowed) {
                    throw new Error(reason || "Action blocked by Process Rules.")
                }

                // Sync Process State (Auto-Transition)
                if (requiredProcessState) {
                    const instance = await ProcessEngine.getActiveProcess(leadId)
                    if (instance) {
                        const result = await ProcessEngine.transition(instance.id, requiredProcessState, 'user', 'Pipeline Stage Sync')
                        if (!result.success) {
                            throw new Error("Process synchronization failed: " + result.error)
                        }
                    }
                }
            }
        }

        return this.repo.update(leadId, { status: newStatus }, this.organizationId)
    }

    async convertToClient(leadId: string): Promise<Client> {
        // 1. Ensure lead belongs to org
        const lead = await this.repo.findById(leadId, this.organizationId)

        // 2. Update contact_type to 'client' (SAME UUID)
        const updatedLead = await this.repo.update(leadId, {
            contact_type: 'client',
            status: 'converted'
        }, this.organizationId)

        return updatedLead as unknown as Client
    }

    async updateProfile(leadId: string, updates: Record<string, any>): Promise<Lead> {
        const lead = await this.repo.update(leadId, updates, this.organizationId)
        
        // Security logging
        if (this.userId) {
            await SecurityLogger.log({
                action: 'lead.update',
                resource_entity: 'leads',
                resource_id: leadId,
                organization_id: this.organizationId,
                metadata: { updates: Object.keys(updates) }
            })
        }

        return lead
    }

    async calculateScore(leadId: string): Promise<{ score: number, breakdown: Record<string, number> }> {
        const { score, breakdown } = await coreCalculateLeadScore(leadId)

        // Admin override usually or standard repo update
        await this.repo.update(leadId, {
            score,
            last_scored_at: new Date().toISOString()
        })

        return { score, breakdown }
    }

    async recalculateAllScores(): Promise<number> {
        const leadIds = await this.repo.getAllIdsForOrganization(this.organizationId)
        if (!leadIds.length) return 0

        let updated = 0
        for (const id of leadIds) {
            try {
                await this.calculateScore(id)
                updated++
            } catch (err) {
                console.error("Score Error for", id, err)
            }
        }
        return updated
    }

    async generateExportCSV(): Promise<string> {
        const leads = await this.repo.getExportData(this.organizationId)
        if (!leads || leads.length === 0) return ""

        const headers = ["Nombre", "Telefono"]
        const csvRows = [headers.join(";")]

        for (const lead of leads) {
            const cleanPhone = (lead.phone || '').replace(/"/g, '""')
            const row = [
                `"${(lead.name || '').replace(/"/g, '""')}"`,
                `="${cleanPhone}"`
            ]
            csvRows.push(row.join(";"))
        }

        return "\ufeff" + csvRows.join("\r\n")
    }

    async purgeColdAccounts(criteria: { inactiveDays: number, minScore?: number }): Promise<number> {
        const thresholdDate = new Date()
        thresholdDate.setDate(thresholdDate.getDate() - criteria.inactiveDays)
        
        return this.repo.purgeInactive(this.organizationId, thresholdDate.toISOString(), criteria.minScore)
    }

    async getPaginated(params: {
        page?: number,
        pageSize?: number,
        search?: string,
        stageId?: string,
        connectionId?: string | null,
        allowedChannels?: string[],
        dateFrom?: string,
        dateTo?: string
    }): Promise<any> {
        let effectiveConnectionId = params.connectionId
        if (params.allowedChannels && params.allowedChannels.length > 0) {
            if (!params.connectionId) {
                effectiveConnectionId = params.allowedChannels[0]
            }
        }

        return this.repo.getPaginated({
            orgId: this.organizationId,
            page: params.page || 1,
            pageSize: params.pageSize || 50,
            search: params.search || '',
            stageId: params.stageId || 'all',
            connectionId: effectiveConnectionId || undefined,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo
        })
    }
}
