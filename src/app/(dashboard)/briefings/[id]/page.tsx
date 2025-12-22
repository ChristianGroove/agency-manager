import { getBriefingById, getBriefingResponses } from "@/lib/actions/briefings"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ExternalLink } from "lucide-react"
import Link from "next/link"
import { FullBriefingTemplate } from "@/types/briefings"

interface PageProps {
    params: Promise<{
        id: string
    }>
}

export default async function BriefingDetailPage({ params }: PageProps) {
    const { id } = await params
    const briefing = await getBriefingById(id)

    if (!briefing) {
        notFound()
    }

    const responses = await getBriefingResponses(briefing.id)
    const responsesMap = new Map(responses?.map((r: any) => [r.field_id, r.value]))

    // Sort steps and fields
    const template = briefing.template as FullBriefingTemplate
    const steps = template?.steps || []
    // Note: In a real app we'd fetch the full template structure again or ensure getBriefingById returns it deep.
    // The current getBriefingById returns template but maybe not steps/fields deep.
    // Let's assume for now we might need to fetch the template details separately if they aren't included.
    // Actually, getBriefingById in actions currently only includes `template:briefing_templates(*)`.
    // It does NOT include steps/fields.
    // We need to fetch the full template structure to render the questions.

    // Let's refactor: We can reuse `getBriefingByToken` logic or create `getBriefingTemplateStructure`.
    // For now, I'll just fetch the template structure here using a new action or just assume I can add it to `getBriefingById`.
    // I'll update `getBriefingById` in the actions file to include steps and fields.

    const renderValue = (value: any, type: string) => {
        if (value === undefined || value === null) return <span className="text-gray-400 italic">Sin respuesta</span>

        if (type === 'boolean') return value ? 'Sí' : 'No'
        if (type === 'color' && Array.isArray(value)) {
            return (
                <div className="flex gap-2 flex-wrap">
                    {value.map((color: string, idx: number) => (
                        <div key={idx} className="flex flex-col items-center gap-1">
                            <div
                                className="w-8 h-8 rounded-full border shadow-sm"
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                            <span className="text-[10px] font-mono text-gray-500 uppercase">{color}</span>
                        </div>
                    ))}
                </div>
            )
        }
        if (type === 'typography' && Array.isArray(value)) {
            const stylesMap: Record<string, string> = {
                sans: "Sans Serif",
                serif: "Serif",
                slab: "Slab Serif",
                modern: "Moderno / Geometric",
                decorative: "Decorativa / Retro",
                script: "Manuscrita",
                display: "Display / Bold"
            }
            return (
                <div className="flex gap-2 flex-wrap">
                    {value.map((styleId: string) => (
                        <span key={styleId} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            {stylesMap[styleId] || styleId}
                        </span>
                    ))}
                </div>
            )
        }
        if (Array.isArray(value)) return value.join(', ')
        if (typeof value === 'object') return JSON.stringify(value)
        return value.toString()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/briefings">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Briefing: {briefing.template?.name}
                    </h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{briefing.client?.name || 'Lead'}</span>
                        <span>•</span>
                        <Badge variant="outline">{briefing.status}</Badge>
                    </div>
                </div>
                <div className="ml-auto">
                    <Link href={`/briefing/${briefing.token}`} target="_blank">
                        <Button variant="outline">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ver Formulario
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Respuestas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {steps.length === 0 ? (
                            <p className="text-muted-foreground">No hay pasos definidos en esta plantilla.</p>
                        ) : (
                            steps.map((step: any) => (
                                <div key={step.id} className="mb-10 last:mb-0">
                                    <div className="flex items-center gap-2 mb-6 border-b pb-2">
                                        <div className="h-6 w-1 bg-[#F205E2] rounded-full" />
                                        <h3 className="font-semibold text-lg text-gray-900">{step.title}</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                        {step.fields?.map((field: any) => {
                                            const value = responsesMap.get(field.id)
                                            const isWide = field.type === 'textarea' || field.type === 'multiselect' || (value && value.toString().length > 50)

                                            return (
                                                <div
                                                    key={field.id}
                                                    className={isWide ? "col-span-1 md:col-span-2" : "col-span-1"}
                                                >
                                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                                        {field.label}
                                                    </p>
                                                    <div className="text-base text-gray-900 font-medium leading-relaxed">
                                                        {renderValue(value, field.type)}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div >
    )
}
