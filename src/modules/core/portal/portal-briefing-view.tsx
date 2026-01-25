"use client"

import { useState, useEffect } from "react"
import { FormSubmission, FormTemplate } from "@/modules/core/forms/actions"
import { getPortalBriefing, getPortalBriefingResponses } from "@/modules/core/portal/actions"
import { FormWizard } from "@/modules/core/forms/form-wizard"
import { Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PortalBriefingViewProps {
    token: string
    briefingId: string
    onBack: () => void
}

import { useTranslation } from "@/lib/i18n/use-translation"

export function PortalBriefingView({ token, briefingId, onBack }: PortalBriefingViewProps) {
    const { t: originalT } = useTranslation()
    const t = (key: any) => originalT(key)
    const [briefing, setBriefing] = useState<FormSubmission | null>(null)
    const [responses, setResponses] = useState<Record<string, any>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        const load = async () => {
            try {
                const [briefingData, responsesData] = await Promise.all([
                    getPortalBriefing(token, briefingId),
                    getPortalBriefingResponses(token, briefingId)
                ])

                setBriefing(briefingData as unknown as FormSubmission)

                // Transform responses
                const initialResponses: Record<string, any> = {}
                responsesData?.forEach((r: any) => {
                    initialResponses[r.field_id] = r.value
                })
                setResponses(initialResponses)

            } catch (err) {
                console.error("Failed to load briefing", err)
                setError(t('portal.briefing_view.error_loading'))
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [briefingId, token])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-brand-pink mb-4" />
                <p className="text-gray-500">{t('portal.briefing_view.loading')}</p>
            </div>
        )
    }

    if (error || !briefing) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error || t('portal.briefing_view.not_found')}</p>
                <Button onClick={onBack} variant="outline">{t('portal.briefing_view.back')}</Button>
            </div>
        )
    }

    // Wrap the wizard nicely
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 flex items-center">
                <Button variant="ghost" className="gap-2 text-gray-500" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                    {t('portal.briefing_view.return')}
                </Button>
            </div>

            <FormWizard
                submission={briefing}
                template={briefing.template as unknown as FormTemplate}
                initialResponses={responses}
            />
        </div>
    )
}

