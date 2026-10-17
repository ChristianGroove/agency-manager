import { redirect } from "next/navigation"
import { getDictionary } from "@/modules/core/i18n/get-dictionary"
import { hasPermission } from "@/modules/core/iam/services/role-service"
import { PERMISSIONS } from "@/modules/core/iam/actions/permissions"

export async function generateMetadata() {
    const dict = await getDictionary()
    return {
        title: dict.crm.meta.settings_title,
        description: dict.crm.meta.settings_desc,
    }
}

/**
 * CRM Settings Index Page
 * 
 * Redirects to the Channels tab by default since it's the most common
 * configuration users need to access (connecting WhatsApp, etc.)
 */
export default async function CRMSettingsPage() {
    const [canManageSettings, canManageChannels] = await Promise.all([
        hasPermission(PERMISSIONS.CRM.MANAGE_SETTINGS),
        hasPermission(PERMISSIONS.INBOX.MANAGE_CHANNELS)
    ])

    if (!canManageSettings && !canManageChannels) {
        redirect("/dashboard?error=unauthorized")
    }

    redirect("/crm/settings/channels")
}
