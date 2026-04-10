"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, X, Send, Trash2 } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"

interface AudioRecorderProps {
    onSend: (blob: Blob, duration: number, mimeType: string) => void
    onCancel: () => void
}

export function AudioRecorder({ onSend, onCancel }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false)
    const [duration, setDuration] = useState(0)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const startedRef = useRef(false)

    useEffect(() => {
        if (startedRef.current) return
        startedRef.current = true
        startRecording()
        
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop()
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
            }
        }
    }, [])

    const startRecording = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Su navegador no soporta grabación de audio o no está en un entorno seguro (HTTPS)")
            }

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1, // Mono
                    sampleRate: 48000 // 48kHz
                } 
            })
            streamRef.current = stream
            
            // Detect supported types - Meta prefers ogg/opus 
            const mimeType = [
                'audio/ogg;codecs=opus',
                'audio/webm;codecs=opus',
                'audio/webm'
            ].find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm'

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                audioBitsPerSecond: 32000 // 32kbps as requested
            })
            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            mediaRecorder.start() // Collect all data at the end to avoid choppy audio
            setIsRecording(true)
            
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1)
            }, 1000)

        } catch (err: any) {
            console.error("Error accessing microphone:", err)
            const msg = err.name === 'NotAllowedError' 
                ? "Permiso de micrófono denegado. Por favor, actívelo en su navegador." 
                : "Error al acceder al micrófono: " + err.message
            
            // We use toast via window event if import not accessible here easily, 
            // but ChatArea already handles toasts. 
            // We'll just rely on the parent or window global for simplicity in this module if needed,
            // but standard practice is to pass a prop or just use sonner if imported.
            import("sonner").then(({ toast }) => toast.error(msg))
            onCancel()
        }
    }

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleConfirm = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            const mimeType = mediaRecorderRef.current.mimeType
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType })
                if (blob.size > 0) {
                    onSend(blob, duration, mimeType)
                }
                mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop())
            }
            mediaRecorderRef.current.stop()
        }
    }

    const handleTrash = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.onstop = () => {
                mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop())
            }
            mediaRecorderRef.current.stop()
        }
        onCancel()
    }

    return (
        <div className="flex items-center gap-4 w-full bg-zinc-50 dark:bg-zinc-900 px-4 py-2 rounded-2xl animate-in slide-in-from-bottom-2 duration-300 shadow-inner">
            <div className="flex items-center gap-2 flex-1">
                <div className="relative flex items-center justify-center">
                    <div className="absolute h-3 w-3 bg-red-500 rounded-full animate-ping" />
                    <div className="h-3 w-3 bg-red-500 rounded-full relative z-10" />
                </div>
                <span className="text-sm font-mono font-medium text-foreground w-12 text-center">
                    {formatDuration(duration)}
                </span>
                <div className="h-1 flex-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-red-500 transition-all duration-1000" 
                        style={{ width: `${Math.min((duration / 60) * 100, 100)}%` }}
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                    onClick={handleTrash}
                >
                    <Trash2 className="h-5 w-5" />
                </Button>
                <Button
                    size="icon"
                    className="h-10 w-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg"
                    onClick={handleConfirm}
                >
                    <Send className="h-5 w-5 ml-0.5" />
                </Button>
            </div>
        </div>
    )
}
