import { notFound } from "next/navigation"
import { getBriefingByToken, getBriefingResponses } from "@/lib/actions/briefings"
import { BriefingWizard } from "@/components/modules/briefings/briefing-wizard"
import { FullBriefingTemplate } from "@/types/briefings"

interface PageProps {
    params: Promise<{
        token: string
    }>
}

export default async function BriefingPage({ params }: PageProps) {
    const { token } = await params
    const data = await getBriefingByToken(token)

    if (!data) {
        notFound()
    }

    const briefing = data
    const template = briefing.template as FullBriefingTemplate

    // Fetch existing responses if any (to resume progress)
    const existingResponses = await getBriefingResponses(briefing.id)

    // Transform responses to a map for easier consumption
    const initialResponses: Record<string, any> = {}
    existingResponses?.forEach((r: any) => {
        initialResponses[r.field_id] = r.value
    })

    if (briefing.status === 'submitted' || briefing.status === 'locked') {
        return (
            <div className="max-w-md mx-auto text-center py-20">
                <div className="bg-white p-8 rounded-xl shadow-sm border">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Briefing Completado</h1>
                    <p className="text-gray-600">
                        Este briefing ya ha sido enviado y no puede ser modificado.
                        Gracias por tu tiempo.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <BriefingWizard
            briefing={briefing}
            template={template}
            initialResponses={initialResponses}
        />
    )
}
