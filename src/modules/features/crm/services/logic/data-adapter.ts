
import { DataModule } from "@/modules/infrastructure/data-vault/types"
import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const crmDataAdapter: DataModule = {
    key: 'crm',
    name: 'CRM Core (Leads & Pipelines)',
    description: 'Leads, clientes, configuración de pipelines y etapas.',
    dependencies: [], // Core module, no dependencies

    exportData: async (organizationId: string) => {
        const supabase = await createClient()

        // 1. Export Leads (includes clients with contact_type='client')
        const { data: leads } = await supabaseAdmin
            .from('leads')
            .select('*')
            .eq('organization_id', organizationId)

        // 2. Export Pipeline Stages
        const { data: pipelineStages } = await supabaseAdmin
            .from('pipeline_stages')
            .select('*')
            .eq('organization_id', organizationId)

        return {
            leads: leads || [],
            pipeline_stages: pipelineStages || []
        }
    },

    importData: async (organizationId: string, data: any) => {
        // Validation
        if (!data.leads || !data.pipeline_stages) {
            throw new Error("Invalid CRM backup data format")
        }

        // Import Pipeline Stages first (config)
        if (data.pipeline_stages.length > 0) {
            const stages = data.pipeline_stages.map((s: any) => ({
                ...s,
                organization_id: organizationId
            }))
            const { error } = await supabaseAdmin.from('pipeline_stages').upsert(stages)
            if (error) throw new Error(`Error importing pipelines: ${error.message}`)
        }

        // Import Leads (includes clients)
        if (data.leads.length > 0) {
            const leads = data.leads.map((l: any) => ({
                ...l,
                organization_id: organizationId
            }))
            const { error } = await supabaseAdmin.from('leads').upsert(leads)
            if (error) throw new Error(`Error importing leads: ${error.message}`)
        }

        // Backward compat: handle old backups that have separate 'clients' key
        if (data.clients && data.clients.length > 0) {
            const clients = data.clients.map((c: any) => ({
                ...c,
                organization_id: organizationId,
                contact_type: 'client'
            }))
            const { error } = await supabaseAdmin.from('leads').upsert(clients)
            if (error) throw new Error(`Error importing legacy clients: ${error.message}`)
        }
    },

    clearData: async (organizationId: string) => {
        await supabaseAdmin.from('leads').delete().eq('organization_id', organizationId)
        await supabaseAdmin.from('pipeline_stages').delete().eq('organization_id', organizationId)
    }
}
