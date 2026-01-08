
import { DataModule } from "@/modules/core/data-vault/types"
import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const crmDataAdapter: DataModule = {
    key: 'crm',
    name: 'CRM Core (Leads & Pipelines)',
    description: 'Leads, clientes, configuración de pipelines y etapas.',
    dependencies: [], // Core module, no dependencies

    exportData: async (organizationId: string) => {
        const supabase = await createClient() // Use user client for export to enforce RLS if run by user, or admin if needed. 
        // Better to use admin client for Vault operations to ensure full coverage, but filtered by orgId.
        // Actually, for backup, we want EVERYTHING for that Org.

        // 1. Export Leads
        const { data: leads } = await supabaseAdmin
            .from('leads')
            .select('*')
            .eq('organization_id', organizationId)

        // 2. Export Clients
        const { data: clients } = await supabaseAdmin
            .from('clients')
            .select('*')
            .eq('organization_id', organizationId)

        // 3. Export Pipeline Stages
        const { data: pipelineStages } = await supabaseAdmin
            .from('pipeline_stages')
            .select('*')
            .eq('organization_id', organizationId)

        return {
            leads: leads || [],
            clients: clients || [],
            pipeline_stages: pipelineStages || []
        }
    },

    importData: async (organizationId: string, data: any) => {
        // Validation
        if (!data.leads || !data.clients || !data.pipeline_stages) {
            throw new Error("Invalid CRM backup data format")
        }

        // Import Pipeline Stages first (config)
        if (data.pipeline_stages.length > 0) {
            // Sanitize: ensure orgId matches target
            const stages = data.pipeline_stages.map((s: any) => ({
                ...s,
                organization_id: organizationId
            }))
            const { error } = await supabaseAdmin.from('pipeline_stages').upsert(stages)
            if (error) throw new Error(`Error importing pipelines: ${error.message}`)
        }

        // Import Leads
        if (data.leads.length > 0) {
            const leads = data.leads.map((l: any) => ({
                ...l,
                organization_id: organizationId
            }))
            const { error } = await supabaseAdmin.from('leads').upsert(leads)
            if (error) throw new Error(`Error importing leads: ${error.message}`)
        }

        // Import Clients
        if (data.clients.length > 0) {
            const clients = data.clients.map((c: any) => ({
                ...c,
                organization_id: organizationId
            }))
            const { error } = await supabaseAdmin.from('clients').upsert(clients)
            if (error) throw new Error(`Error importing clients: ${error.message}`)
        }
    },

    clearData: async (organizationId: string) => {
        // Delete in reverse order of foreign keys
        // leads/clients usually depend on nothing in this module, but maybe pipeline stages?
        // Let's assume leads might reference pipeline status... but status is just a string key generally.
        // If leads table has FK to pipeline_stages, we must delete leads first.

        await supabaseAdmin.from('leads').delete().eq('organization_id', organizationId)
        await supabaseAdmin.from('clients').delete().eq('organization_id', organizationId)
        await supabaseAdmin.from('pipeline_stages').delete().eq('organization_id', organizationId)
    }
}
