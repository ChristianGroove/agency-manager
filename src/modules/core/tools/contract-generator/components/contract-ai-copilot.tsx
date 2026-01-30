"use client"

import React, { useState } from "react"
import { Send, User, Bot, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useContract } from "../context/contract-context"

export function ContractAiCopilot() {
    const { generateWithAi, isGenerating, selectedClientId } = useContract()
    const [messages, setMessages] = useState([
        {
            id: '1',
            role: 'assistant',
            content: "¡Hola! Soy tu asistente legal IA. Selecciona un cliente y servicios a la izquierda, y luego haz clic en 'Generar con IA' para redactar el contrato profesionalmente."
        }
    ])
    const [input, setInput] = useState("")

    const handleSend = async (customPrompt?: string) => {
        const text = customPrompt || input
        if (!text.trim() || isGenerating) return

        const userMsg = { id: Date.now().toString(), role: 'user', content: text }
        setMessages(prev => [...prev, userMsg])
        setInput("")

        try {
            await generateWithAi(text)
            const aiMsg = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "He redactado el contrato siguiendo tus instrucciones. Puedes revisarlo en la previsualización a la izquierda."
            }
            setMessages(prev => [...prev, aiMsg])
        } catch (error: any) {
            const errorMsg = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `⚠️ Error: ${error.message}`
            }
            setMessages(prev => [...prev, errorMsg])
        }
    }

    const handleMagicGenerate = () => {
        if (!selectedClientId) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "Por favor, selecciona primero un cliente en el panel de configuración."
            }])
            return
        }
        handleSend("Generar el contrato completo basado en los servicios seleccionados.")
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-white/5">
            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-modern">
                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={cn(
                            "flex gap-3 max-w-[90%]",
                            m.role === 'user' ? "ml-auto flex-row-reverse" : ""
                        )}
                    >
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                            m.role === 'assistant'
                                ? "bg-brand-pink/10 border-brand-pink/20 text-brand-pink"
                                : "bg-gray-100 border-gray-200 dark:bg-zinc-800 dark:border-white/10 text-gray-500"
                        )}>
                            {m.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>
                        <div className={cn(
                            "p-3 rounded-2xl text-[13px] leading-relaxed",
                            m.role === 'assistant'
                                ? "bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-tl-none"
                                : "bg-brand-pink text-white rounded-tr-none shadow-md shadow-brand-pink/10"
                        )}>
                            {m.content}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 space-y-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <button
                        onClick={handleMagicGenerate}
                        disabled={isGenerating}
                        className="whitespace-nowrap px-3 py-1 bg-brand-pink text-white border border-brand-pink rounded-full text-[10px] font-black hover:bg-brand-pink/90 transition-all uppercase flex items-center gap-1.5 shadow-sm shadow-brand-pink/20 disabled:opacity-50"
                    >
                        <Sparkles className="w-3 h-3" />
                        Generar con IA (Mágico)
                    </button>
                    <button
                        onClick={() => setInput("Redactar cláusula de confidencialidad estricta")}
                        className="whitespace-nowrap px-3 py-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-full text-[10px] font-bold text-gray-500 hover:text-brand-pink hover:border-brand-pink/30 hover:bg-brand-pink/[0.02] transition-all uppercase"
                    >
                        Confidencialidad
                    </button>
                    <button
                        onClick={() => setInput("Agregar penalidad por mora en los pagos")}
                        className="whitespace-nowrap px-3 py-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-full text-[10px] font-bold text-gray-500 hover:text-brand-pink hover:border-brand-pink/30 hover:bg-brand-pink/[0.02] transition-all uppercase"
                    >
                        Cláusula de Mora
                    </button>
                </div>
                <div className="relative group">
                    <Input
                        placeholder={isGenerating ? "Redactando..." : "Pregunta o ajusta con IA..."}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        disabled={isGenerating}
                        className="pr-10 bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 py-5 rounded-xl shadow-inner focus-visible:ring-brand-pink/20"
                    />
                    <Button
                        size="sm"
                        onClick={() => handleSend()}
                        disabled={isGenerating || !input.trim()}
                        className="absolute right-1.5 top-1.5 bottom-1.5 bg-brand-pink hover:bg-brand-pink/90 text-white rounded-lg px-2 group-hover:scale-105 transition-transform"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                </div>
                <div className="flex items-center gap-1.5 justify-center opacity-40 hover:opacity-100 transition-opacity">
                    <div className={cn("w-1.5 h-1.5 bg-brand-pink rounded-full", isGenerating && "animate-pulse")} />
                    <span className="text-[10px] items-center gap-1 font-bold uppercase tracking-widest flex group">
                        AI Powered by <Sparkles className="w-3 h-3 text-brand-pink group-hover:animate-spin" /> Pixy Intelligence
                    </span>
                </div>
            </div>
        </div>
    )
}
