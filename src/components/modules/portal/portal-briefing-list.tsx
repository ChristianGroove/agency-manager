"use client"

import { Briefing } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, ArrowRight, CheckCircle2, Clock } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

interface PortalBriefingListProps {
    briefings: Briefing[]
}

export function PortalBriefingList({ briefings }: PortalBriefingListProps) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft': return <Badge variant="outline">Borrador</Badge>
            case 'sent': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Enviado</Badge>
            case 'in_progress': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">En Progreso</Badge>
            case 'submitted': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Completado</Badge>
            default: return <Badge variant="secondary">{status}</Badge>
        }
    }

    if (briefings.length === 0) {
        return null
    }

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-pink-500" />
                    Briefings y Formularios
                </CardTitle>
            </CardHeader>
            <CardContent className="px-0 grid gap-4 sm:grid-cols-2">
                {briefings.map((briefing, index) => (
                    <div
                        key={briefing.id}
                        className="group relative flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-10 w-10 rounded-full bg-pink-50 flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-pink-500" />
                                </div>
                                {getStatusBadge(briefing.status)}
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-1">
                                {briefing.template?.name || "Briefing sin nombre"}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {new Date(briefing.created_at).toLocaleDateString()}
                            </p>
                        </div>

                        <div className="mt-6">
                            {briefing.status === 'submitted' ? (
                                <Button variant="outline" className="w-full" disabled>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Enviado
                                </Button>
                            ) : (
                                <Link href={`/briefing/${briefing.token}`} target="_blank">
                                    <Button className="w-full bg-pink-500 hover:bg-pink-600 text-white">
                                        Continuar
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
