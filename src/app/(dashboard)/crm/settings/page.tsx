import { redirect } from "next/navigation"
import { getDictionary } from "@/lib/i18n/get-dictionary"

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
export default function CRMSettingsPage() {
    redirect("/crm/settings/channels")
}
