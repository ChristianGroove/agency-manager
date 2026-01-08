
import { DataModule } from "@/modules/core/data-vault/types"
import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const messagingDataAdapter: DataModule = {
    key: 'messaging',
    name: 'Messaging System (Chat)',
    description: 'Conversaciones, mensajes, plantillas y configuración de canales.',
    dependencies: ['crm'], // Depends on CRM because conversations might link to leads/contacts (though often loose linkage via conversation_id)

    exportData: async (organizationId: string) => {
        // 1. Templates
        const { data: templates } = await supabaseAdmin
            .from('messaging_templates')
            .select('*')
            .eq('organization_id', organizationId)

        // 2. Channels (Integration settings)
        // Usually 'integration_connections' table or 'messaging_channels' view
        // Based on previous files, let's assume 'integration_connections' is the main one.
        // We need to be careful with secrets (API Keys). Ideally we export them encrypted or ask heavily.
        // For a full "Backup/Restore" within same environment, exporting is fine if Vault is secure.
        const { data: channels } = await supabaseAdmin
            .from('integration_connections')
            .select('*')
            .eq('organization_id', organizationId)

        // 3. Conversations
        const { data: conversations } = await supabaseAdmin
            .from('conversations')
            .select('*')
            .eq('organization_id', organizationId)

        // 4. Messages
        // WARNING: This can be huge. We might want to limit or batch execution.
        // For this implementation, we fetch all. In production, utilize pagination or streams.
        const { data: messages } = await supabaseAdmin
            .from('messages')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: true })

        return {
            templates: templates || [],
            channels: channels || [],
            conversations: conversations || [],
            messages: messages || []
        }
    },

    importData: async (organizationId: string, data: any) => {
        if (!data.conversations) throw new Error("Invalid Messaging backup data")

        // 1. Import Templates
        if (data.templates?.length > 0) {
            const temps = data.templates.map((t: any) => ({ ...t, organization_id: organizationId }))
            // remove id collision if needed, or use upsert
            await supabaseAdmin.from('messaging_templates').upsert(temps)
        }

        // 2. Import Channels
        if (data.channels?.length > 0) {
            const chans = data.channels.map((c: any) => ({ ...c, organization_id: organizationId }))
            await supabaseAdmin.from('integration_connections').upsert(chans)
        }

        // 3. Import Conversations
        if (data.conversations?.length > 0) {
            const convs = data.conversations.map((c: any) => ({ ...c, organization_id: organizationId }))
            await supabaseAdmin.from('conversations').upsert(convs)
        }

        // 4. Import Messages
        if (data.messages?.length > 0) {
            // Chunking for large datasets
            const chunkSize = 1000;
            const messages = data.messages.map((m: any) => ({ ...m, organization_id: organizationId }))

            for (let i = 0; i < messages.length; i += chunkSize) {
                const chunk = messages.slice(i, i + chunkSize);
                const { error } = await supabaseAdmin.from('messages').upsert(chunk)
                if (error) console.error("Error importing messages chunk:", error)
            }
        }
    },

    clearData: async (organizationId: string) => {
        // Reverse order of dependencies
        await supabaseAdmin.from('messages').delete().eq('organization_id', organizationId)
        await supabaseAdmin.from('conversations').delete().eq('organization_id', organizationId)
        await supabaseAdmin.from('messaging_templates').delete().eq('organization_id', organizationId)
        // We might NOT want to clear connections automatically as they hold credentials?
        // But for a true "Restore", we should.
        await supabaseAdmin.from('integration_connections').delete().eq('organization_id', organizationId)
    }
}
