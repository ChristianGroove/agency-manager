import { notFound } from "next/navigation"
import { getSubmissionByToken, getSubmissionResponses } from "@/modules/core/forms/actions"
import { FormWizard } from "@/modules/core/forms/form-wizard"
import { FormTemplate } from "@/modules/core/forms/actions"
import boyWithDogAnimation from "../../../../../public/animations/boy-with-dog-in-wilderness-illustration-2025-10-20-03-04-06-utc.json"
import { LottieAnimation } from "@/components/ui/lottie-animation"

interface PageProps {
    params: Promise<{
        token: string
    }>
}

export default async function BriefingPage({ params }: PageProps) {
    const { token } = await params
    const data = await getSubmissionByToken(token)

    if (!data) {
        notFound()
    }

    const briefing = data
    const template = briefing.template as unknown as FormTemplate

    // Fetch existing responses if any (to resume progress)
    const existingResponses = await getSubmissionResponses(briefing.id)

    // Transform responses to a map for easier consumption
    const initialResponses: Record<string, any> = {}
    existingResponses?.forEach((r: any) => {
        initialResponses[r.field_id] = r.value
    })

    if (briefing.status === 'submitted' || briefing.status === 'locked') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
                <div className="w-64 h-64">
                    <LottieAnimation animationData={boyWithDogAnimation} />
                </div>
                <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border text-center">
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
        <FormWizard
            submission={briefing}
            template={template}
            initialResponses={initialResponses}
        />
    )
}

