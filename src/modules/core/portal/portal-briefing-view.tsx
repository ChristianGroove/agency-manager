"use client"

import { useState, useEffect } from "react"
import { Briefing, FullBriefingTemplate } from "@/types/briefings"
import { getPortalBriefing, getPortalBriefingResponses } from "@/modules/core/portal/actions"
import { BriefingWizard } from "@/modules/verticals/agency/briefings/briefing-wizard"
import { Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PortalBriefingViewProps {
    token: string
    briefingId: string
    onBack: () => void
}

export function PortalBriefingView({ token, briefingId, onBack }: PortalBriefingViewProps) {
    const [briefing, setBriefing] = useState<Briefing | null>(null)
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

                setBriefing(briefingData)

                // Transform responses
                const initialResponses: Record<string, any> = {}
                responsesData?.forEach((r: any) => {
                    initialResponses[r.field_id] = r.value
                })
                setResponses(initialResponses)

            } catch (err) {
                console.error("Failed to load briefing", err)
                setError("Error al cargar el briefing. Por favor intenta de nuevo.")
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [briefingId])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-pink-500 mb-4" />
                <p className="text-gray-500">Cargando briefing...</p>
            </div>
        )
    }

    if (error || !briefing) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error || "Briefing no encontrado"}</p>
                <Button onClick={onBack} variant="outline">Volver</Button>
            </div>
        )
    }

    // Wrap the wizard nicely
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 flex items-center">
                <Button variant="ghost" className="gap-2 text-gray-500" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                    Regresar
                </Button>
            </div>

            <BriefingWizard
                briefing={briefing}
                template={briefing.template as FullBriefingTemplate}
                initialResponses={responses}
            />
        </div>
    )
}
