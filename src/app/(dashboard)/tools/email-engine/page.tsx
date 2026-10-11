import { Suspense } from "react"
import { getEmailTemplates } from "@/modules/features/notifications/actions/template-actions"
import { getSmtpConfig } from "@/modules/features/notifications/actions/smtp-actions"
import { EmailSettingsPage } from "@/modules/features/notifications/components/email-settings-page"
import { Loader2 } from "lucide-react"
import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions/crud"
import { redirect } from "next/navigation"

export const metadata = {
    title: "Motor de Correos",
    description: "Gestiona las plantillas de correo electrónico y la conexión SMTP",
}

export default async function Page() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    const organizationId = await getCurrentOrganizationId()
    if (!organizationId) return <div>Selecciona una organización para configurar el correo.</div>

    // Parallel fetching
    const [templates, smtpConfig] = await Promise.all([
        getEmailTemplates(),
        getSmtpConfig(organizationId)
    ])

    return (
        <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-pink w-8 h-8" /></div>}>
            <EmailSettingsPage
                templates={templates}
                organizationId={organizationId}
                smtpConfig={smtpConfig}
            />
        </Suspense>
    )
}
