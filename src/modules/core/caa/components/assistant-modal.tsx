"use client"

import { useEffect, useState, useMemo } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useViewContext } from "../context/view-context"
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
    const router = useRouter()

    const [search, setSearch] = useState("")
    const [activeArticle, setActiveArticle] = useState<HelpArticle | null>(null)
    const [showAIChat, setShowAIChat] = useState(false)
    const [aiInitialQuery, setAiInitialQuery] = useState("")

    const allHelp = useMemo(() => helpRegistry.getAll(), [])
    const contextualHelp = useMemo(() => {
        if (!currentContext) return allHelp.slice(0, 4)
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
        }
    }

    useEffect(() => {
        if (!open) {
            const t = setTimeout(() => {
                setActiveArticle(null)
                setSearch("")
                setShowAIChat(false)
                setAiInitialQuery("")
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
                <DialogTitle className="sr-only">Centro de Ayuda</DialogTitle>

                {/* Animated Corner Accents */}
                <div className="absolute top-0 left-0 w-20 h-20 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary to-transparent" />
                    <div className="absolute top-0 left-0 h-full w-[2px] bg-gradient-to-b from-primary to-transparent" />
                </div>
                <div className="absolute top-0 right-0 w-20 h-20 pointer-events-none">
                    <div className="absolute top-0 right-0 w-full h-[2px] bg-gradient-to-l from-cyan-400 to-transparent" />
                    <div className="absolute top-0 right-0 h-full w-[2px] bg-gradient-to-b from-cyan-400 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 w-20 h-20 pointer-events-none">
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-400 to-transparent" />
                    <div className="absolute bottom-0 left-0 h-full w-[2px] bg-gradient-to-t from-cyan-400 to-transparent" />
                </div>
                <div className="absolute bottom-0 right-0 w-20 h-20 pointer-events-none">
                    <div className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-l from-primary to-transparent" />
                    <div className="absolute bottom-0 right-0 h-full w-[2px] bg-gradient-to-t from-primary to-transparent" />
                </div>

                {/* Background Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}
                />

                <div className="relative h-full flex flex-col overflow-hidden">

                    {/* Header */}
                    <div className={cn(
                        "flex items-center px-6 pt-5 pb-4 shrink-0 z-20",
                        "border-b border-zinc-100 dark:border-white/5",
                        "bg-gradient-to-b from-zinc-50/50 to-transparent dark:from-black/50 dark:to-transparent"
                    )}>
                        {activeArticle ? (
                            <button
                                onClick={() => setActiveArticle(null)}
                                className="absolute top-5 left-5 z-30 p-2 bg-zinc-100 dark:bg-white/5 backdrop-blur-md rounded-lg hover:bg-zinc-200 dark:hover:bg-white/10 transition-all border border-zinc-200 dark:border-white/10 group"
                            >
                                <ArrowLeft className="h-4 w-4 text-zinc-600 dark:text-white/70 group-hover:text-zinc-900 dark:group-hover:text-white group-hover:-translate-x-0.5 transition-all" />
                            </button>
                        ) : (
                            <div className="mr-3 p-2 -ml-2 rounded-lg bg-primary/10">
                                <Search className="h-4 w-4 text-primary" />
                            </div>
                        )}

                        <input
                            className={cn(
                                "flex-1 bg-transparent text-base font-medium outline-none transition-opacity duration-200",
                                "placeholder:text-zinc-400 text-zinc-900",
                                "dark:placeholder:text-white/30 dark:text-white",
                                activeArticle && "opacity-0 pointer-events-none w-0"
                            )}
                            placeholder="¿Qué necesitas saber?"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        <button
                            onClick={() => onOpenChange(false)}
                            className="absolute top-5 right-5 z-30 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-white/10"
                        >
                            <X className="h-4 w-4 text-zinc-400 dark:text-white/50 hover:text-zinc-600 dark:hover:text-white" />
                        </button>
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 relative">
                        <AnimatePresence initial={false} mode="popLayout">

                            {/* LIST VIEW */}
                            {!activeArticle && !showAIChat && (
                                <motion.div
                                    key="list"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute inset-0 overflow-y-auto p-6 scrollbar-modern"
                                >
                                    {/* Suggested Cards */}
                                    {!search && currentContext && (
                                        <div className="mb-6">
                                            <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <Sparkles className="h-3 w-3" />
                                                Sugerido para {currentContext.label}
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {contextualHelp.slice(0, 2).map(article => (
                                                    <motion.div
                                                        key={article.id}
                                                        whileHover={{ scale: 1.02, y: -2 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => setActiveArticle(article)}
                                                        className={cn(
                                                            "group p-4 rounded-xl cursor-pointer relative overflow-hidden transition-all",
                                                            "bg-zinc-50 border border-zinc-200 hover:border-primary/50 hover:bg-primary/5",
                                                            "dark:bg-white/5 dark:border-white/10 dark:hover:border-primary/50 dark:hover:bg-primary/5"
                                                        )}
                                                    >
                                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                                        <div className="relative z-10">
                                                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-fuchsia-500/20 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-primary/20">
                                                                <Sparkles className="h-4 w-4" />
                                                            </div>
                                                            <h4 className="font-semibold text-sm text-zinc-900 dark:text-white mb-1 leading-tight">{article.title}</h4>
                                                            <p className="text-xs text-zinc-500 dark:text-white/50 line-clamp-2">{article.description}</p>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <h3 className="text-[10px] font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest mb-3">
                                        {search ? "Resultados" : "Explorar"}
                                    </h3>

                                    <div className="space-y-1">
                                        {filteredHelp.length === 0 ? (
                                            <div className="text-center py-12 flex flex-col items-center">
                                                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                                                    <MessageCircle className="h-7 w-7 text-primary" />
                                                </div>
                                                <h3 className="font-medium text-zinc-900 dark:text-white mb-1">Sin resultados locales</h3>
                                                <p className="text-xs text-zinc-500 dark:text-white/50 max-w-[220px] mb-6">
                                                    No encontramos guías para "{search}".
                                                </p>

                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => {
                                                        setAiInitialQuery(search)
                                                        setShowAIChat(true)
                                                    }}
                                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-fuchsia-500 text-white text-sm font-medium shadow-[0_0_30px_rgba(242,5,226,0.3)] hover:shadow-[0_0_40px_rgba(242,5,226,0.5)] transition-all"
                                                >
                                                    <Sparkles className="h-4 w-4" />
                                                    <span>Preguntar a Pixy IA</span>
                                                </motion.button>
                                            </div>
                                        ) : (
                                            filteredHelp.map(article => (
                                                <motion.div
                                                    key={article.id}
                                                    whileHover={{ x: 4 }}
                                                    onClick={() => setActiveArticle(article)}
                                                    className={cn(
                                                        "flex items-center p-3 rounded-lg cursor-pointer group transition-colors border border-transparent",
                                                        "hover:bg-zinc-100 hover:border-zinc-200",
                                                        "dark:hover:bg-white/5 dark:hover:border-white/10"
                                                    )}
                                                >
                                                    <BookOpen className="h-4 w-4 text-zinc-400 dark:text-white/30 group-hover:text-primary mr-3 shrink-0 transition-colors" />
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-medium text-zinc-700 dark:text-white/80 group-hover:text-zinc-900 dark:group-hover:text-white truncate">{article.title}</h4>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-white/20 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                                                </motion.div>
                                            ))
                                        )}
                                    </div>

                                    {/* Quick AI Access */}
                                    {!search && (
                                        <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-white/5">
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setShowAIChat(true)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 p-4 rounded-xl transition-all group",
                                                    "bg-gradient-to-r from-primary/5 to-cyan-400/5 border border-primary/20 hover:border-primary/40",
                                                    "dark:from-primary/10 dark:to-cyan-400/10"
                                                )}
                                            >
                                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center shadow-lg">
                                                    <Sparkles className="h-5 w-5 text-white" />
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <h4 className="font-semibold text-zinc-900 dark:text-white text-sm">Pregúntale a Pixy IA</h4>
                                                    <p className="text-xs text-zinc-500 dark:text-white/50">Respuestas instantáneas sobre cualquier función</p>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-zinc-400 dark:text-white/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                            </motion.button>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* ARTICLE VIEW */}
                            {activeArticle && !showAIChat && (
                                <motion.div
                                    key="article"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 50 }}
                                    className="absolute inset-0 overflow-y-auto scrollbar-modern"
                                >
                                    {/* Hero Header */}
                                    <div className="relative h-32 bg-gradient-to-br from-primary/20 via-fuchsia-500/10 to-cyan-400/10 overflow-hidden">
                                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(242,5,226,0.2),transparent_70%)]" />
                                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-black to-transparent" />

                                        {/* Floating Particles */}
                                        {[...Array(5)].map((_: unknown, i: number) => (
                                            <motion.div
                                                key={i}
                                                className="absolute w-1 h-1 rounded-full bg-primary/50"
                                                initial={{ x: Math.random() * 100 + '%', y: '100%' }}
                                                animate={{
                                                    y: '-20%',
                                                    opacity: [0, 1, 0]
                                                }}
                                                transition={{
                                                    duration: 3 + Math.random() * 2,
                                                    repeat: Infinity,
                                                    delay: i * 0.5
                                                }}
                                            />
                                        ))}

                                        <div className="absolute bottom-4 left-6 right-6">
                                            <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">{activeArticle.title}</h1>
                                            <p className="text-sm text-zinc-600 dark:text-white/60">{activeArticle.description}</p>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 space-y-6">
                                        {activeArticle.contentBlocks.map((block, idx: number) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                            >
                                                {block.type === 'text' && (
                                                    <p className="text-zinc-600 dark:text-white/70 text-sm leading-relaxed">
                                                        <SmartTextRenderer text={block.content} onAction={handleAction} />
                                                    </p>
                                                )}
                                                {block.type === 'callout' && (
                                                    <div className={cn(
                                                        "flex gap-3 p-4 rounded-xl border",
                                                        block.variant === 'warning'
                                                            ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
                                                            : "bg-primary/5 dark:bg-primary/10 border-primary/20"
                                                    )}>
                                                        <Zap className={cn(
                                                            "h-5 w-5 shrink-0 mt-0.5",
                                                            block.variant === 'warning' ? "text-amber-500" : "text-primary"
                                                        )} />
                                                        <p className="text-sm text-zinc-700 dark:text-white/80">
                                                            <SmartTextRenderer text={block.content} onAction={handleAction} />
                                                        </p>
                                                    </div>
                                                )}
                                                {block.type === 'code' && (
                                                    <pre className="p-4 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 overflow-x-auto">
                                                        <code className="text-xs text-primary dark:text-cyan-400 font-mono">{block.code}</code>
                                                    </pre>
                                                )}
                                                {block.type === 'image' && (
                                                    <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10">
                                                        <img src={block.url} alt={block.caption || ''} className="w-full" />
                                                        {block.caption && (
                                                            <p className="p-2 text-xs text-zinc-500 dark:text-white/50 text-center bg-zinc-50 dark:bg-white/5">{block.caption}</p>
                                                        )}
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}

                                        {/* Feedback */}
                                        <div className="pt-6 mt-6 border-t border-zinc-100 dark:border-white/10">
                                            <p className="text-xs text-zinc-400 dark:text-white/40 text-center mb-3">¿Te fue útil?</p>
                                            <div className="flex justify-center gap-3">
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-zinc-100 dark:bg-white/5 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-sm border border-zinc-200 dark:border-white/10 hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all"
                                                >
                                                    <span className="text-base">👍</span>
                                                    <span className="text-zinc-600 dark:text-white/70">Sí</span>
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-zinc-100 dark:bg-white/5 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-sm border border-zinc-200 dark:border-white/10 hover:border-rose-300 dark:hover:border-rose-500/50 transition-all"
                                                >
                                                    <span className="text-base">👎</span>
                                                    <span className="text-zinc-600 dark:text-white/70">No</span>
                                                </motion.button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* AI CHAT VIEW */}
                            {showAIChat && (
                                <motion.div
                                    key="ai-chat"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="absolute inset-0 z-30 bg-white dark:bg-black"
                                >
                                    <AIChatPanel
                                        initialQuery={aiInitialQuery}
                                        onBack={() => setShowAIChat(false)}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
