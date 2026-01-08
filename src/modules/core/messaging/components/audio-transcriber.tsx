"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, FileText, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface AudioTranscriberProps {
    audioUrl: string
    cachedTranscription?: string
    onTranscriptionComplete?: (text: string) => void
}

export function AudioTranscriber({ audioUrl, cachedTranscription, onTranscriptionComplete }: AudioTranscriberProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [transcription, setTranscription] = useState(cachedTranscription || "")
    const [isExpanded, setIsExpanded] = useState(Boolean(cachedTranscription))
    const [error, setError] = useState("")

    const handleTranscribe = async () => {
        setIsLoading(true)
        setError("")

        try {
            const response = await fetch('/api/ai/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioUrl })
            })

            const data = await response.json()

            if (data.success && data.text) {
                setTranscription(data.text)
                setIsExpanded(true)
                onTranscriptionComplete?.(data.text)
            } else {
                setError(data.error || 'Transcription failed')
            }
        } catch (e: any) {
            setError(e.message || 'Network error')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="mt-2 space-y-2">
            {!transcription && !isLoading && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTranscribe}
                    className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                    <FileText className="h-3 w-3 mr-1" />
                    Transcribir
                </Button>
            )}

            {isLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Procesando audio...
                </div>
            )}

            {error && (
                <p className="text-xs text-red-500">{error}</p>
            )}

            {transcription && (
                <div className="rounded-md bg-black/5 dark:bg-white/5 overflow-hidden">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-black/5 transition-colors"
                    >
                        <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Transcripción
                        </span>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    {isExpanded && (
                        <p className="px-2 pb-2 text-xs leading-relaxed whitespace-pre-wrap">
                            {transcription}
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
