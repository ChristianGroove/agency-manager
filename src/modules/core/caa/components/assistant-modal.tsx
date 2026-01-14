"use client"

import { useEffect, useState, useMemo } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useViewContext } from "../context/view-context"
import { actionRegistry, helpRegistry } from "../registry"
import { ActionDefinition, HelpArticle } from "../types"
import { Search, Zap, BookOpen, ArrowLeft, Command as CommandIcon, Sparkles, X, ChevronRight, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface AssistantModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

// Helper to render text with smart action links
const SmartTextRenderer = ({ text, onAction }: { text: string, onAction: (id: string) => void }) => {
    // Regex to match {{action:action-id|Label}}
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
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 -my-0.5 mx-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors text-[0.95em]"
                        >
                            {label}
                            <ExternalLink className="h-3 w-3" />
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
    const router = useRouter()

    // State
    const [search, setSearch] = useState("")
    const [activeArticle, setActiveArticle] = useState<HelpArticle | null>(null)

    // Derived Data
    const allHelp = useMemo(() => helpRegistry.getAll(), [])
    const contextualHelp = useMemo(() => {
        if (!currentContext) return allHelp.slice(0, 4) // Fallback suggestions
        return helpRegistry.getByView(currentContext.viewId)
    }, [currentContext, allHelp])

    const filteredHelp = useMemo(() => {
        if (!search) return contextualHelp
        const query = search.toLowerCase()
        return allHelp.filter(h =>
            h.title.toLowerCase().includes(query) ||
            h.keywords.some(k => k.toLowerCase().includes(query))
        )
    }, [search, allHelp, contextualHelp])

    const handleAction = (actionId: string) => {
        const action = currentContext?.actions.find(a => a.id === actionId)
            || actionRegistry.getAll().find(a => a.id === actionId)

        if (action) {
            onOpenChange(false)
            if (action.type === 'route') {
                router.push(action.target)
            } else if (action.type === 'function') {
                const event = new CustomEvent(action.target)
                window.dispatchEvent(event)
            }
        } else {
            console.warn(`Action ${actionId} not found`)
        }
    }

    // Reset on close
    useEffect(() => {
        if (!open) {
            const t = setTimeout(() => {
                setActiveArticle(null)
                setSearch("")
            }, 300)
            return () => clearTimeout(t)
        }
    }, [open])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 overflow-hidden shadow-2xl bg-zinc-50 dark:bg-[#121212] border-none sm:max-w-[650px] h-[600px] top-[50%] translate-y-[-50%] rounded-2xl outline-none block">
                <DialogTitle className="sr-only">Centro de Ayuda</DialogTitle>

                <div className="relative h-full flex flex-col overflow-hidden">

                    {/* Header bar */}
                    <div className="flex items-center px-6 pt-6 pb-2 shrink-0 z-20 bg-zinc-50 dark:bg-[#121212]">
                        {activeArticle ? (
                            <button
                                onClick={() => setActiveArticle(null)}
                                className="mr-3 p-2 -ml-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors group"
                            >
                                <ArrowLeft className="h-5 w-5 text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
                            </button>
                        ) : (
                            <div className="mr-3 p-2 -ml-2">
                                <Search className="h-5 w-5 text-zinc-400" />
                            </div>
                        )}

                        <input
                            className={cn(
                                "flex-1 bg-transparent text-lg font-medium outline-none placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100",
                                activeArticle && "opacity-0 pointer-events-none w-0"
                            )}
                            placeholder="¿En qué podemos ayudarte hoy?"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        <button onClick={() => onOpenChange(false)} className="p-2 -mr-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                            <X className="h-5 w-5 text-zinc-400" />
                        </button>
                    </div>

                    {/* CONTENT CONTAINER */}
                    <div className="flex-1 relative">
                        <AnimatePresence initial={false} mode="popLayout">

                            {/* LIST VIEW */}
                            {!activeArticle && (
                                <motion.div
                                    key="list"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="absolute inset-0 overflow-y-auto p-6"
                                >
                                    {!search && currentContext && (
                                        <div className="mb-8">
                                            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4 px-1">
                                                Sugerido para {currentContext.label}
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {contextualHelp.slice(0, 2).map(article => (
                                                    <div
                                                        key={article.id}
                                                        onClick={() => setActiveArticle(article)}
                                                        className="group p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer"
                                                    >
                                                        <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                            <Sparkles className="h-4 w-4" />
                                                        </div>
                                                        <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-1 leading-tight">{article.title}</h4>
                                                        <p className="text-xs text-zinc-500 line-clamp-2">{article.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-1">
                                        {search ? "Resultados" : "Todos los artículos"}
                                    </h3>

                                    <div className="space-y-2">
                                        {filteredHelp.length === 0 ? (
                                            <div className="text-center py-10 opacity-50">
                                                <p>No encontramos artículos relacionados.</p>
                                            </div>
                                        ) : (
                                            filteredHelp.map(article => (
                                                <div
                                                    key={article.id}
                                                    onClick={() => setActiveArticle(article)}
                                                    className="flex items-center p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/50 cursor-pointer group transition-colors"
                                                >
                                                    <BookOpen className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 mr-4 shrink-0 transition-colors" />
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-200 truncate">{article.title}</h4>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0" />
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* ARTICLE VIEW */}
                            {activeArticle && (
                                <motion.div
                                    key="article"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 50 }}
                                    className="absolute inset-0 overflow-y-auto bg-white dark:bg-[#121212] z-10"
                                >
                                    <div className="max-w-2xl mx-auto p-8">
                                        <div className="mb-8">
                                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-4">
                                                <BookOpen className="h-3 w-3" />
                                                Guía
                                            </div>
                                            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight leading-tight mb-4">
                                                {activeArticle.title}
                                            </h1>
                                            <p className="text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                                {activeArticle.description}
                                            </p>
                                        </div>

                                        <div className="space-y-8">
                                            {activeArticle.contentBlocks.map((block, i) => (
                                                <div key={i} className="text-base text-zinc-700 dark:text-zinc-300">
                                                    {block.type === 'text' && (
                                                        <p className="leading-7">
                                                            <SmartTextRenderer text={block.content} onAction={handleAction} />
                                                        </p>
                                                    )}
                                                    {block.type === 'callout' && (
                                                        <div className={cn(
                                                            "p-5 rounded-xl border leading-relaxed flex gap-4",
                                                            block.variant === 'warning' ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30 text-amber-900 dark:text-amber-100" :
                                                                "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30 text-blue-900 dark:text-blue-100"
                                                        )}>
                                                            <div className="shrink-0 mt-1">
                                                                {block.variant === 'warning' ? <Zap className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                                                            </div>
                                                            <div>
                                                                <SmartTextRenderer text={block.content} onAction={handleAction} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-12 pt-8 border-t border-zinc-100 dark:border-zinc-800 text-center">
                                            <p className="text-sm text-zinc-400 mb-4">¿Fue útil esta información?</p>
                                            <div className="flex justify-center gap-3">
                                                <button className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-sm font-medium transition-colors">
                                                    👍 Sí, gracias
                                                </button>
                                                <button className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-sm font-medium transition-colors">
                                                    👎 Necesito más ayuda
                                                </button>
                                            </div>
                                        </div>
                                        <div className="h-8" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
