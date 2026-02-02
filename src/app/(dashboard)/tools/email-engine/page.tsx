import { Suspense } from "react"
import { getEmailTemplates } from "@/modules/core/notifications/actions"
import { getSmtpConfig } from "@/modules/core/notifications/actions/smtp-actions"
import { EmailSettingsPage } from "@/modules/core/notifications/components/email-settings-page"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase-server"
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

    // Get Active Organization for the user
    // We assume the user is visiting the platform, so we get their first org or active one
    // Ideally this logic is centrally handled, but for now we fetch it.
    const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

    if (!member) {
        return <div>No organization found</div>
    }

    const organizationId = member.organization_id

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
