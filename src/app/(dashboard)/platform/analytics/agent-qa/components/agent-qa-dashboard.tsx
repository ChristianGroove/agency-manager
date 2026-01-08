"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, TrendingDown, User, RefreshCw } from "lucide-react"

interface QAResult {
    empathy: number
    resolution: number
    clarity: number
    speed: number
    grammar: number
    overallScore: number
    strengths: string[]
    improvements: string[]
}

// Mock agents for demo - replace with real data fetch
const mockAgents = [
    { id: 'agent-1', name: 'Carlos García' },
    { id: 'agent-2', name: 'María López' },
    { id: 'agent-3', name: 'Juan Rodríguez' }
]

export function AgentQADashboard() {
    const [selectedAgent, setSelectedAgent] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<QAResult | null>(null)
    const [messagesAnalyzed, setMessagesAnalyzed] = useState(0)
    const [error, setError] = useState("")

    const handleAnalyze = async () => {
        if (!selectedAgent) return
        setIsLoading(true)
        setError("")

        try {
            const res = await fetch('/api/ai/agent-qa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId: selectedAgent, messageLimit: 50 })
            })

            const data = await res.json()

            if (data.success && data.report) {
                setResult(data.report)
                setMessagesAnalyzed(data.messagesAnalyzed || 0)
            } else {
                setError(data.error || 'Error al analizar')
            }
        } catch (e: any) {
            setError(e.message || 'Error de red')
        } finally {
            setIsLoading(false)
        }
    }

    const getScoreColor = (score: number) => {
        if (score >= 8) return 'text-emerald-600'
        if (score >= 6) return 'text-amber-600'
        return 'text-red-600'
    }

    const getScoreBg = (score: number) => {
        if (score >= 8) return 'bg-emerald-100 dark:bg-emerald-900/30'
        if (score >= 6) return 'bg-amber-100 dark:bg-amber-900/30'
        return 'bg-red-100 dark:bg-red-900/30'
    }

    return (
        <div className="space-y-6">
            {/* Agent Selector */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Seleccionar Agente
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
                    <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Selecciona un agente..." />
                        </SelectTrigger>
                        <SelectContent>
                            {mockAgents.map(agent => (
                                <SelectItem key={agent.id} value={agent.id}>
                                    {agent.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        onClick={handleAnalyze}
                        disabled={!selectedAgent || isLoading}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analizando...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Analizar con IA
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="py-4 text-red-700">{error}</CardContent>
                </Card>
            )}

            {/* Results */}
            {result && (
                <>
                    {/* Overall Score */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        <Card className={`col-span-2 ${getScoreBg(result.overallScore)}`}>
                            <CardHeader className="pb-2">
                                <CardDescription>Puntuación General</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className={`text-4xl font-bold ${getScoreColor(result.overallScore)}`}>
                                    {result.overallScore.toFixed(1)} <span className="text-lg font-normal">/ 10</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Basado en {messagesAnalyzed} mensajes
                                </p>
                            </CardContent>
                        </Card>

                        {/* Individual Metrics */}
                        {[
                            { label: 'Empatía', value: result.empathy },
                            { label: 'Resolución', value: result.resolution },
                            { label: 'Claridad', value: result.clarity },
                            { label: 'Velocidad', value: result.speed },
                        ].map(metric => (
                            <Card key={metric.label}>
                                <CardHeader className="pb-2">
                                    <CardDescription>{metric.label}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className={`text-2xl font-bold ${getScoreColor(metric.value)}`}>
                                        {metric.value}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Strengths & Improvements */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10">
                            <CardHeader>
                                <CardTitle className="text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    Fortalezas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {result.strengths.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <Badge variant="outline" className="bg-emerald-100 border-emerald-300 text-emerald-800">✓</Badge>
                                            <span>{s}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10">
                            <CardHeader>
                                <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                    <TrendingDown className="h-5 w-5" />
                                    Áreas de Mejora
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {result.improvements.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <Badge variant="outline" className="bg-amber-100 border-amber-300 text-amber-800">→</Badge>
                                            <span>{s}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    )
}
