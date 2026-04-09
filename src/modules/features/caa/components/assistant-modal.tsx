"use client"

import { useEffect, useState, useMemo } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useViewContext } from "@\/modules\/features\/caa/context/view-context"
import { actionRegistry, helpRegistry } from "../registry"
import { ActionDefinition, HelpArticle } from "../types"
import { Search, Zap, BookOpen, ArrowLeft, Sparkles, X, ChevronRight, ExternalLink, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { AIChatPanel } from "./ai-chat-panel"

interface AssistantModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

// Smart action link renderer
const SmartTextRenderer = ({ text, onAction }: { text: string, onAction: (id: string) => void }) => {
    const parts = text.split(/(\{\{action:[^}]+\}\})/)
    return (
        <span className="leading-relaxed">
            {parts.map((part, i) => {
                const match = part.match(/^\{\{action:([^|]+)\|([^}]+)\}\}$/)
                if (match) {
                    const [_, actionId, label] = match
                    return (
                        <button
                            key={i}
                            onClick={() => onAction(actionId)}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-all text-[0.9em] border border-primary/20"
                        >
                            {label}
                            <ExternalLink className="h-3 w-3 opacity-70" />
                        </button>
                    )
                }
                return <span key={i}>{part}</span>
            })}
        </span>
    )
}

export function AssistantModal({ open, onOpenChange }: AssistantModalProps) {
    const { currentContext } = useViewContext()
    
    // AI-First: Default to chat mode
    const [showAIChat, setShowAIChat] = useState(true)

    // Zero Technical Debt: Articles are now handled on-demand via AI
    // We keep the Dialog structure but simplify the content to be 100% AI Chat

    useEffect(() => {
        if (!open) {
            const t = setTimeout(() => {
                setShowAIChat(true)
            }, 300)
            return () => clearTimeout(t)
        }
    }, [open])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn(
                "p-0 overflow-hidden backdrop-blur-2xl sm:max-w-[700px] h-[650px] top-[50%] translate-y-[-50%] rounded-2xl outline-none block",
                // Light mode
                "bg-white/95 border border-zinc-200 shadow-[0_0_60px_rgba(242,5,226,0.1)]",
                // Dark mode
                "dark:bg-black/95 dark:border-primary/30 dark:shadow-[0_0_100px_rgba(242,5,226,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]"
            )}>
                <DialogTitle className="sr-only">Asistente Inteligente Pixy</DialogTitle>

                {/* Background Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}
                />

                <div className="relative h-full flex flex-col overflow-hidden">
                    {/* Header is handled inside AIChatPanel now for total clean flow */}
                    <div className="flex-1 relative">
                        <AnimatePresence initial={false} mode="popLayout">
                            {showAIChat && (
                                <motion.div
                                    key="ai-chat"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className="absolute inset-0 z-30 bg-transparent"
                                >
                                    <AIChatPanel
                                        className="h-full"
                                        onBack={() => onOpenChange(false)} // Treat back as close in AI-only mode
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                
                {/* Close Button UI override if needed */}
                <button
                    onClick={() => onOpenChange(false)}
                    className="absolute top-4 right-4 z-[40] p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
                >
                    <X className="h-4 w-4 text-zinc-400 dark:text-white/50" />
                </button>
            </DialogContent>
        </Dialog>
    )
}
