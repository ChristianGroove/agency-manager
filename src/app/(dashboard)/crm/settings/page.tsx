import { redirect } from "next/navigation"

export const metadata = {
    title: "Configuración CRM",
    description: "Gestiona la configuración de tu CRM",
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
