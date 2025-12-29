import { getBriefingTemplates } from "@/modules/verticals/agency/briefings/actions"
import { CreateBriefingForm } from "@/modules/verticals/agency/briefings/create-briefing-form"
import { createClient } from "@/lib/supabase-server"

export default async function NewBriefingPage() {
    const templates = await getBriefingTemplates()

    // Fetch clients for the select dropdown
    const supabase = await createClient()
    const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .order('name')

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Nuevo Briefing</h1>
                <p className="text-muted-foreground">
                    Selecciona una plantilla y un cliente para generar un nuevo enlace de briefing.
                </p>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
                <CreateBriefingForm
                    templates={templates || []}
                    clients={clients || []}
                />
            </div>
        </div>
    )
}
