"use client"

import { Briefing } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, ArrowRight, CheckCircle2, Clock } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

interface PortalBriefingListProps {
    briefings: Briefing[]
    onView?: (id: string) => void
}

export function PortalBriefingList({ briefings, onView }: PortalBriefingListProps) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft': return <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-transparent hover:bg-zinc-200">Borrador</Badge>
            case 'sent': return <Badge className="bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-transparent hover:bg-blue-200 dark:hover:bg-blue-500/20">Enviado</Badge>
            case 'in_progress': return <Badge className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-transparent hover:bg-amber-200 dark:hover:bg-amber-500/20">En Progreso</Badge>
            case 'submitted': return <Badge className="bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-transparent hover:bg-green-200 dark:hover:bg-green-500/20">Completado</Badge>
            default: return <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-transparent">{status}</Badge>
        }
    }

    if (briefings.length === 0) {
        return null
    }

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-brand-pink" />
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
                                <div className="h-10 w-10 rounded-full bg-brand-pink/10 flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-brand-pink" />
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
                            ) : onView ? (
                                <Button
                                    onClick={() => onView(briefing.id)}
                                    className="w-full bg-brand-pink hover:bg-brand-pink/90 text-white"
                                >
                                    Continuar
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Link href={`/briefing/${briefing.token}`} target="_blank">
                                    <Button className="w-full bg-brand-pink hover:bg-brand-pink/90 text-white">
                                        Continuar
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card >
    )
}
