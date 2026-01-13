"use client"

import { useState, useMemo, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import {
    Bot, Check, ChevronDown, ChevronRight, GripVertical,
    Info, Key, Plus, Trash2, Zap, ExternalLink, Loader2
} from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from "@dnd-kit/core"
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { cn } from "@/lib/utils"
import { addAICredential, deleteAICredential, updateAICredentialPriority } from "@/modules/core/ai-engine/actions"

interface AIEngineSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    credentials: any[]
    providers: any[]
}

// Logo mapping for official branding
const PROVIDER_LOGOS: Record<string, string> = {
    'openai': 'https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg',
    'anthropic': 'https://upload.wikimedia.org/wikipedia/commons/7/78/Anthropic_logo.svg',
    'groq': 'https://groq.com/wp-content/uploads/2024/03/PBG-mark1-color.svg',
    'google': 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg'
}

const PROVIDER_GUIDES: Record<string, { title: string, url: string, steps: string[] }> = {
    'openai': {
        title: 'Obtener Key de OpenAI',
        url: 'https://platform.openai.com/api-keys',
        steps: [
            'Inicia sesión en OpenAI Platform',
            'Ve a Dashboard > API Keys',
            'Haz clic en "Create new secret key"'
        ]
    },
    'anthropic': {
        title: 'Obtener Key de Anthropic',
        url: 'https://console.anthropic.com/settings/keys',
        steps: [
            'Inicia sesión en Anthropic Console',
            'Navega a Settings > API Keys',
            'Haz clic en "Create Key"'
        ]
    },
    'groq': {
        title: 'Obtener Key de Groq',
        url: 'https://console.groq.com/keys',
        steps: [
            'Inicia sesión en Groq Console',
            'Ve a la sección API Keys',
            'Genera una nueva API Key'
        ]
    },
    'google': {
        title: 'Obtener Key de Gemini',
        url: 'https://aistudio.google.com/app/apikey',
        steps: [
            'Ve a Google AI Studio',
            'Haz clic en "Get API key"',
            'Crea una key en un proyecto nuevo o existente'
        ]
    }
}

export function AIEngineSheet({ open, onOpenChange, credentials, providers }: AIEngineSheetProps) {
    // Merge providers and credentials
    const initialItems = useMemo(() => {
        // Map configured creds
        const configured = credentials.map(c => ({
            id: c.provider_id, // Use provider_id as stable ID for UI list
            credentialId: c.id,
            providerName: c.providerName || providers.find(p => p.id === c.provider_id)?.name,
            status: c.status,
            priority: c.priority,
            apiKeyMasked: c.api_key_encrypted
        }))

        // Find providers NOT configured
        const unconfigured = providers
            .filter(p => !configured.find(c => c.id === p.id))
            .map(p => ({
                id: p.id,
                credentialId: null,
                providerName: p.name,
                status: 'missing',
                priority: 999,
                apiKeyMasked: null
            }))

        // Sort by priority (configured first)
        return [...configured, ...unconfigured].sort((a, b) => a.priority - b.priority)
    }, [credentials, providers])

    const [items, setItems] = useState(initialItems)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    // Sync state when props change
    useEffect(() => {
        setItems(initialItems)
    }, [initialItems])

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (active.id !== over?.id) {
            let newItems: any[] = []

            setItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id)
                const newIndex = items.findIndex((item) => item.id === over?.id)

                newItems = arrayMove(items, oldIndex, newIndex)
                return newItems
            })

            // Trigger backend update for configured items OUTSIDE state setter
            const updates = newItems
                .filter(i => i.credentialId) // Only update active creds
                .map((item, index) => ({
                    id: item.credentialId!,
                    priority: index + 1
                }))

            if (updates.length > 0) {
                // Non-blocking update
                updateAICredentialPriority(updates).then(() => {
                    toast.success("Prioridad actualizada")
                })
            }
        }
    }

    const activeCount = items.filter(i => i.credentialId).length

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-[700px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl">
                    {/* Premium Header */}
                    <SheetHeader className="p-6 pb-2 border-b bg-white/50 dark:bg-zinc-900/50 border-border/40 space-y-1">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
                                <Bot className="h-6 w-6" />
                            </div>
                            <div>
                                <SheetTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                                    Centro de Comando AI
                                </SheetTitle>
                                <SheetDescription className="text-sm font-medium text-muted-foreground/80">
                                    Orquesta tu infraestructura de inteligencia artificial.
                                </SheetDescription>
                            </div>
                            <div className="ml-auto flex flex-col items-end">
                                <Badge variant="outline" className="font-mono text-xs gap-1.5 py-1.5 px-3 border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 rounded-full">
                                    <Zap className="h-3.5 w-3.5 fill-indigo-500 text-indigo-500" />
                                    {activeCount} / {providers.length} Activos
                                </Badge>
                            </div>
                        </div>
                    </SheetHeader>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden relative">
                        <div className="absolute inset-0 p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-100 dark:scrollbar-thumb-indigo-900">
                            <div className="space-y-6 max-w-2xl mx-auto">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50 border border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30">
                                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex gap-2 items-center">
                                        <Info className="h-4 w-4" />
                                        Arrastra las tarjetas para reordenar la prioridad
                                    </span>
                                </div>

                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={items.map(i => i.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-3">
                                            {items.map((item) => (
                                                <ProviderCard
                                                    key={item.id}
                                                    item={item}
                                                    providers={providers}
                                                    isExpanded={expandedId === item.id}
                                                    onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t bg-white dark:bg-zinc-900 text-center">
                        <p className="text-[10px] text-muted-foreground">
                            Tus keys están encriptadas con AES-256 en reposo.
                        </p>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

function ProviderCard({ item, providers, isExpanded, onToggleExpand }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.8 : 1
    }

    const [apiKey, setApiKey] = useState("")
    const [loading, setLoading] = useState(false)
    const isActive = item.status === 'active'

    const handleSave = async () => {
        if (!apiKey) return
        setLoading(true)
        try {
            await addAICredential(item.id, apiKey)
            toast.success("Credencial guardada seguramente")
            setApiKey("")
        } catch (e) {
            toast.error("Error al guardar")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm("¿Desconectar este proveedor?")) return
        setLoading(true)
        try {
            await deleteAICredential(item.credentialId)
            toast.success("Desconectado")
        } catch (e) {
            toast.error("Error al eliminar")
        } finally {
            setLoading(false)
        }
    }

    const guide = PROVIDER_GUIDES[item.id]

    return (
        <div ref={setNodeRef} style={style} className={cn("group rounded-xl border bg-white dark:bg-zinc-900 shadow-sm transition-all", isActive ? "border-indigo-100 dark:border-indigo-900/50" : "border-border/50")}>
            {/* Card Header */}
            <div className="flex items-center gap-3 p-3">
                <div {...attributes} {...listeners} className="cursor-grab hover:text-foreground text-muted-foreground/50 transition-colors">
                    <GripVertical className="h-5 w-5" />
                </div>

                <div className="h-10 w-10 rounded-lg bg-zinc-50 dark:bg-zinc-800 border p-1.5 flex items-center justify-center">
                    {PROVIDER_LOGOS[item.id] ? (
                        <img src={PROVIDER_LOGOS[item.id]} alt={item.providerName} className="w-full h-full object-contain" />
                    ) : (
                        <Bot className="h-5 w-5 text-muted-foreground" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{item.providerName}</span>
                        {isActive && <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400">Activo</Badge>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", isActive ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-700")} />
                        <span className="text-xs text-muted-foreground">{isActive ? `Prioridad #${item.priority}` : 'No Configurado'}</span>
                    </div>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-indigo-500">
                            <Info className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Key className="h-4 w-4" /> {guide?.title || 'Guía de API Key'}
                            </DialogTitle>
                            <DialogDescription>Sigue estos pasos para generar una clave.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                {guide?.steps.map((step, i) => (
                                    <div key={i} className="flex items-start gap-2 text-sm">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium">{i + 1}</span>
                                        <span className="text-muted-foreground">{step}</span>
                                    </div>
                                ))}
                            </div>
                            {guide?.url && (
                                <Button variant="outline" className="w-full gap-2" asChild>
                                    <a href={guide.url} target="_blank" rel="noopener noreferrer">
                                        Abrir Consola <ExternalLink className="h-3 w-3" />
                                    </a>
                                </Button>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                <Button variant="ghost" size="icon" onClick={onToggleExpand} className="h-8 w-8">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
            </div>

            {/* Collapsible Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 pt-0 border-t border-border/40 bg-zinc-50/50 dark:bg-zinc-900/50">
                            <div className="pt-3 space-y-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">API Key</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="password"
                                            placeholder={isActive ? "••••••••••••••••" : "sk-..."}
                                            value={apiKey}
                                            onChange={e => setApiKey(e.target.value)}
                                            className="h-8 text-sm bg-white dark:bg-zinc-950"
                                        />
                                        <Button size="sm" onClick={handleSave} disabled={loading || !apiKey} className="h-8 bg-indigo-600 hover:bg-indigo-700">
                                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                        </Button>
                                    </div>
                                </div>
                                {isActive && (
                                    <div className="flex justify-between items-center pt-2">
                                        <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">{item.apiKeyMasked}</p>
                                        <Button variant="ghost" size="sm" onClick={handleDelete} className="h-7 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs px-2">
                                            <Trash2 className="h-3 w-3 mr-1" /> Desconectar
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
