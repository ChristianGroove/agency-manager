"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { BrainCircuit, CheckSquare, AlignLeft, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface VoiceAnalysis {
    summary: string
    actionItems: string[]
    sentiment: 'positive' | 'neutral' | 'negative' | 'urgent'
}

interface VoiceAnalysisCardProps {
    transcription: string
    messageId?: string
    existingAnalysis?: VoiceAnalysis
    onAnalysisComplete?: (analysis: VoiceAnalysis) => void
}

export function VoiceAnalysisCard({
    transcription,
    messageId,
    existingAnalysis,
    onAnalysisComplete
}: VoiceAnalysisCardProps) {
    const [analysis, setAnalysis] = useState<VoiceAnalysis | null>(existingAnalysis || null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const handleAnalyze = async () => {
        setIsLoading(true)
        setError("")

        try {
            const response = await fetch('/api/ai/analyze-voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId, text: transcription })
            })

            const data = await response.json()

            if (data.success && data.analysis) {
                setAnalysis(data.analysis)
                onAnalysisComplete?.(data.analysis)
            } else {
                setError(data.error || "Analysis failed")
            }
        } catch (e) {
            setError("Network error")
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-md border border-indigo-100 dark:border-indigo-800 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Analizando nota de voz...</span>
            </div>
        )
    }

    if (!analysis) {
        // Only show analyze button if text is long enough to be worth it
        if (!transcription || transcription.length < 20) return null

        return (
            <div className="mt-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAnalyze}
                    className="h-6 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400"
                >
                    <BrainCircuit className="h-3 w-3 mr-1" />
                    Analizar con IA
                </Button>
                {error && <span className="text-[10px] text-red-500 ml-2">{error}</span>}
            </div>
        )
    }

    return (
        <div className="mt-2 p-3 bg-white dark:bg-zinc-900/50 rounded-md border border-indigo-100 dark:border-indigo-900/50 shadow-sm relative overflow-hidden">
            {/* Sentiment Stripe */}
            <div className={cn(
                "absolute top-0 left-0 bottom-0 w-1",
                analysis.sentiment === 'urgent' ? "bg-red-500" :
                    analysis.sentiment === 'positive' ? "bg-green-500" :
                        analysis.sentiment === 'negative' ? "bg-orange-500" :
                            "bg-indigo-300"
            )} />

            <div className="pl-2 space-y-3">
                {/* Header */}
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900 dark:text-indigo-100">
                    <BrainCircuit className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Resumen Inteligente</span>
                    {analysis.sentiment === 'urgent' && (
                        <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            <AlertCircle className="h-3 w-3" />
                            Urgente
                        </span>
                    )}
                </div>

                {/* Summary */}
                <div className="text-xs text-muted-foreground leading-relaxed">
                    {analysis.summary}
                </div>

                {/* Action Items */}
                {analysis.actionItems && analysis.actionItems.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-dashed border-indigo-100 dark:border-indigo-900/50">
                        {analysis.actionItems.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                                <CheckSquare className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" />
                                <span className="text-xs text-foreground/90">{item}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
