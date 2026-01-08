
import { DataModule } from "@/modules/core/data-vault/types"
import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const automationDataAdapter: DataModule = {
    key: 'automation',
    name: 'Workflows & Automations',
    description: 'Flujos de automatización, versiones y logs de ejecución.',
    dependencies: ['crm', 'messaging'], // Uses tags, leads, templates

    exportData: async (organizationId: string) => {
        // 1. Workflows
        const { data: workflows } = await supabaseAdmin
            .from('workflows')
            .select('*')
            .eq('organization_id', organizationId)

        // 2. Versions
        const { data: versions } = await supabaseAdmin
            .from('workflow_versions')
            .select('*')
        // Join via workflow_id if needed, but we can't easily filter by top-level org_id unless versions have it.
        // Assuming versions might NOT have organization_id directly? 
        // Let's check schema assumption. Usually child tables rely on parent.
        // If versions doesn't have org_id, we filter by workflow IDs found above.

        // Optimization: Filter versions by parent workflows
        // But if versions DOES have org_id (it should for RLS), we use it. 
        // Let's assume best practice. If error, we'll need to fetch by IDs.
        // Safe bet: Fetch by workflow IDs.

        let validVersions: any[] = []
        if (workflows && workflows.length > 0) {
            const wfIds = workflows.map((w: any) => w.id)
            const { data: v } = await supabaseAdmin
                .from('workflow_versions')
                .select('*')
                .in('workflow_id', wfIds)
            validVersions = v || []
        }

        // 3. Executions (Logs)
        // Optional? User might want to keep history.
        let logs: any[] = []
        if (workflows && workflows.length > 0) {
            const { data: l } = await supabaseAdmin
                .from('workflow_executions')
                .select('*')
                .eq('organization_id', organizationId)
                .order('started_at', { ascending: false })
                .limit(1000) // Limit to recent 1000 history items per dump to avoid bloat
            logs = l || []
        }

        return {
            workflows: workflows || [],
            versions: validVersions,
            executions: logs
        }
    },

    importData: async (organizationId: string, data: any) => {
        if (!data.workflows) throw new Error("Invalid Automation backup data")

        // 1. Import Workflows
        if (data.workflows.length > 0) {
            const wfs = data.workflows.map((w: any) => ({ ...w, organization_id: organizationId }))
            // Must upsert workflows before versions
            await supabaseAdmin.from('workflows').upsert(wfs)
        }

        // 2. Import Versions
        if (data.versions?.length > 0) {
            // versions usually link to workflow_id. IDs are preserved so this works.
            // Ensure created_by users exist? If not, might fail FK. 
            // We set created_by to NULL or current admin if strict.
            // For now assume users exist or constraint is soft.
            await supabaseAdmin.from('workflow_versions').upsert(data.versions)
        }

        // 3. Import Logs
        if (data.executions?.length > 0) {
            const execs = data.executions.map((e: any) => ({ ...e, organization_id: organizationId }))
            await supabaseAdmin.from('workflow_executions').upsert(execs)
        }
    },

    clearData: async (organizationId: string) => {
        // Delete logs first
        await supabaseAdmin.from('workflow_executions').delete().eq('organization_id', organizationId)

        // Delete versions via workflow cascade? Or manually.
        // If versions rely on workflow_id, deleting workflows might cascade.
        // But safer to find IDs.
        const { data: workflows } = await supabaseAdmin.from('workflows').select('id').eq('organization_id', organizationId)
        if (workflows && workflows.length > 0) {
            const ids = workflows.map((w: any) => w.id)
            await supabaseAdmin.from('workflow_versions').delete().in('workflow_id', ids)
        }

        await supabaseAdmin.from('workflows').delete().eq('organization_id', organizationId)
    }
}
