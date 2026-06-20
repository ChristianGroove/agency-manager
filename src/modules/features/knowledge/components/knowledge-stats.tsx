"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Book, Lightbulb, Tag, BrainCircuit } from "lucide-react"

interface KnowledgeStatsProps {
    data: any[]
}

export function KnowledgeStats({ data }: KnowledgeStatsProps) {
    const total = data.length
    const manual = data.filter(i => i.source === 'manual').length
    const ai = data.filter(i => i.source === 'ai_extracted').length

    // Count categories
    const categories = new Set(data.map(i => i.category)).size

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-[var(--brand-pink)]/5 to-white dark:from-[var(--brand-pink)]/10 dark:to-zinc-900 border-[var(--brand-pink)]/20 dark:border-[var(--brand-pink)]/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-[var(--brand-pink)] dark:text-[var(--brand-pink)]">
                        Total Conocimiento
                    </CardTitle>
                    <Book className="h-4 w-4 text-[var(--brand-pink)]" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-[var(--brand-pink)] dark:text-purple-300">{total}</div>
                    <p className="text-xs text-[var(--brand-pink)]/60 dark:text-[var(--brand-pink)]/60">
                        Artículos en la base
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Extraído por IA</CardTitle>
                    <BrainCircuit className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{ai}</div>
                    <p className="text-xs text-muted-foreground">
                        Desde conversaciones
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Manual</CardTitle>
                    <Lightbulb className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{manual}</div>
                    <p className="text-xs text-muted-foreground">
                        Creado por humanos
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Categorías</CardTitle>
                    <Tag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{categories}</div>
                    <p className="text-xs text-muted-foreground">
                        Temas activos
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
