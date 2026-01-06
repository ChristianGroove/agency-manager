import { getFormTemplates } from "@/modules/core/forms/actions"
import { CreateFormSubmission } from "@/modules/core/forms/create-form-submission"
import { createClient } from "@/lib/supabase-server"

export default async function NewBriefingPage() {
    const templates = await getFormTemplates()

    // Fetch clients for the select dropdown
    const supabase = await createClient()
    const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .order('name')

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Nuevo Formulario / Briefing</h1>
                <p className="text-muted-foreground">
                    Selecciona una plantilla y un cliente para generar un nuevo enlace.
                </p>
            </div>

            <div className="bg-white dark:bg-white/5 backdrop-blur-md p-6 rounded-lg border dark:border-white/10 shadow-sm">
                <CreateFormSubmission
                    templates={templates || []}
                    clients={clients || []}
                />
            </div>
        </div>
    )
}
