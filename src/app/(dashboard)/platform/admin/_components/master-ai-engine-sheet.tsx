"use client"

import React, { useState, useTransition, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
    Bot,
    ChevronDown,
    ChevronRight,
    GripVertical,
    Info,
    Key,
    Plus,
    Trash2,
    Zap,
    ExternalLink,
    Loader2,
    Lock,
    Eye,
    EyeOff,
    Check
} from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/modules/infrastructure/utils/utils"
import {
    MasterKeyItem,
    addMasterAICredential,
    deleteMasterAICredential,
    updateMasterAIPriority,
    toggleMasterKeyStatus
} from "@/modules/core/admin/actions"

interface MasterAIEngineSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    masterKeys: MasterKeyItem[]
    onKeysChange: (keys: MasterKeyItem[]) => void
}

const PROVIDER_LOGOS: Record<string, string> = {
    openai: "https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg",
    anthropic: "https://upload.wikimedia.org/wikipedia/commons/7/78/Anthropic_logo.svg",
    groq: "https://groq.com/wp-content/uploads/2024/03/PBG-mark1-color.svg",
    google: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg"
}

const PROVIDER_GUIDES: Record<string, { title: string; url: string; steps: string[] }> = {
    openai: {
        title: "Obtener API Key de OpenAI",
        url: "https://platform.openai.com/api-keys",
        steps: [
            "Inicia sesión en OpenAI Platform",
            "Ve a Dashboard > API Keys",
            "Haz clic en 'Create new secret key'"
        ]
    },
    anthropic: {
        title: "Obtener API Key de Anthropic",
        url: "https://console.anthropic.com/settings/keys",
        steps: [
            "Inicia sesión en Anthropic Console",
            "Navega a Settings > API Keys",
            "Haz clic en 'Create Key'"
        ]
    },
    groq: {
        title: "Obtener API Key de Groq",
        url: "https://console.groq.com/keys",
        steps: [
            "Inicia sesión en Groq Console",
            "Ve a la sección API Keys",
            "Genera una nueva API Key"
        ]
    },
    google: {
        title: "Obtener API Key de Gemini",
        url: "https://aistudio.google.com/app/apikey",
        steps: [
            "Ve a Google AI Studio",
            "Haz clic en 'Get API key'",
            "Crea una key en un proyecto nuevo o existente"
        ]
    }
}

export function MasterAIEngineSheet({
    open,
    onOpenChange,
    masterKeys,
    onKeysChange
}: MasterAIEngineSheetProps) {
    const [isPending, startTransition] = useTransition()
    const [items, setItems] = useState<MasterKeyItem[]>(masterKeys)
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [selectedProvider, setSelectedProvider] = useState<string>("openai")
    const [labelInput, setLabelInput] = useState("")
    const [apiKeyInput, setApiKeyInput] = useState("")
    const [showKeyInput, setShowKeyInput] = useState(false)

    useEffect(() => {
        setItems(masterKeys)
    }, [masterKeys])

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return

        let reordered: MasterKeyItem[] = []

        setItems(prev => {
            const oldIndex = prev.findIndex(item => item.id === active.id)
            const newIndex = prev.findIndex(item => item.id === over.id)
            reordered = arrayMove(prev, oldIndex, newIndex).map((item, idx) => ({
                ...item,
                priority: idx + 1
            }))
            return reordered
        })

        onKeysChange(reordered)

        const updates = reordered
            .filter(i => i.source === "vault")
            .map((item, index) => ({
                id: item.id,
                priority: index + 1
            }))

        if (updates.length > 0) {
            try {
                await updateMasterAIPriority(updates)
                toast.success("Prioridad global de inferencia actualizada.")
            } catch (err: any) {
                toast.error("Error al guardar prioridad.")
            }
        }
    }

    const handleAddKey = () => {
        if (!apiKeyInput.trim()) {
            toast.error("Ingresa una clave de API válida.")
            return
        }

        startTransition(async () => {
            try {
                const res = await addMasterAICredential(selectedProvider, apiKeyInput.trim(), labelInput.trim() || undefined)
                const providerName =
                    selectedProvider === "openai" ? "OpenAI" :
                    selectedProvider === "anthropic" ? "Anthropic Claude" :
                    selectedProvider === "google" ? "Google Gemini" : "Groq (Llama)"

                const newKeyItem: MasterKeyItem = {
                    id: res.id,
                    providerId: selectedProvider as any,
                    providerName,
                    label: labelInput.trim() || `${providerName} Clave`,
                    apiKeyMasked: "●●●●●●●● (Master Vault DB)",
                    priority: items.length + 1,
                    status: "active",
                    source: "vault",
                    createdAt: new Date().toISOString(),
                    models: []
                }

                const updated = [...items, newKeyItem]
                setItems(updated)
                onKeysChange(updated)

                toast.success(`Clave maestra para ${providerName} añadida con éxito y encriptada (AES-256).`)
                setIsAddDialogOpen(false)
                setApiKeyInput("")
                setLabelInput("")
            } catch (err: any) {
                toast.error(err.message || "Error al agregar clave maestra.")
            }
        })
    }

    const handleDeleteKey = (keyId: string, providerName: string) => {
        if (!confirm(`¿Eliminar esta clave maestra de ${providerName}?`)) return

        startTransition(async () => {
            try {
                await deleteMasterAICredential(keyId)
                const updated = items.filter(i => i.id !== keyId).map((item, idx) => ({
                    ...item,
                    priority: idx + 1
                }))
                setItems(updated)
                onKeysChange(updated)
                toast.success("Clave maestra eliminada de la bóveda.")
            } catch (err: any) {
                toast.error(err.message || "Error al eliminar clave.")
            }
        })
    }

    const handleToggleStatus = (keyId: string, currentStatus: "active" | "inactive") => {
        const nextStatus: "active" | "inactive" = currentStatus === "active" ? "inactive" : "active"
        startTransition(async () => {
            try {
                await toggleMasterKeyStatus(keyId, nextStatus)
                const updated: MasterKeyItem[] = items.map(item =>
                    item.id === keyId ? { ...item, status: nextStatus } : item
                )
                setItems(updated)
                onKeysChange(updated)
                toast.success(nextStatus === "active" ? "Clave activada." : "Clave pausada.")
            } catch (err: any) {
                toast.error(err.message || "Error al cambiar estado.")
            }
        })
    }

    const activeCount = items.filter(i => i.status === "active").length

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side="right"
                    className="
                        sm:max-w-[720px] w-full p-0 gap-0 border-none shadow-2xl
                        mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                        data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                        bg-transparent
                    "
                >
                    <div className="flex flex-col h-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl">
                        {/* Premium Header */}
                        <SheetHeader className="p-6 pb-4 border-b bg-white/50 dark:bg-zinc-900/50 border-border/40 space-y-2">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/25">
                                    <Bot className="h-6 w-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <SheetTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 dark:from-indigo-400 dark:to-purple-400">
                                            Centro de Comando AI
                                        </SheetTitle>
                                        <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[10px] uppercase tracking-wider font-bold">
                                            Master Vault
                                        </Badge>
                                    </div>
                                    <SheetDescription className="text-xs font-medium text-muted-foreground/80 mt-0.5">
                                        Bóveda central de claves maestras. Soporta múltiples API keys por proveedor con rotación automática y failover.
                                    </SheetDescription>
                                </div>
                                <div className="flex flex-col items-end shrink-0">
                                    <Badge variant="outline" className="font-mono text-xs gap-1.5 py-1.5 px-3 border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 rounded-full">
                                        <Zap className="h-3.5 w-3.5 fill-indigo-500 text-indigo-500" />
                                        {activeCount} Clave{activeCount === 1 ? "" : "s"} Activa{activeCount === 1 ? "" : "s"}
                                    </Badge>
                                </div>
                            </div>

                            {/* Action Bar inside Header */}
                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Info className="h-3.5 w-3.5 text-indigo-500" />
                                    <span>Arrastra para definir el orden de prioridad de inferencia</span>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => setIsAddDialogOpen(true)}
                                    className="h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Nueva Clave Maestra
                                </Button>
                            </div>
                        </SheetHeader>

                        {/* Content Area */}
                        <div className="flex-1 overflow-hidden relative">
                            <div className="absolute inset-0 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-100 dark:scrollbar-thumb-indigo-900">
                                <div className="space-y-4 max-w-2xl mx-auto">
                                    {items.length === 0 ? (
                                        <div className="p-12 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                                            <Key className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                                            <h3 className="text-sm font-semibold text-foreground">No hay claves maestras configuradas</h3>
                                            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                                Añade claves maestras para OpenAI, Anthropic, Gemini o Groq para alimentar los tenants en modo SaaS Gestionado.
                                            </p>
                                            <Button
                                                size="sm"
                                                onClick={() => setIsAddDialogOpen(true)}
                                                className="mt-4 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                                            >
                                                <Plus className="h-3.5 w-3.5" /> Añadir Primera Clave
                                            </Button>
                                        </div>
                                    ) : (
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
                                                    {items.map(item => (
                                                        <MasterKeyCard
                                                            key={item.id}
                                                            item={item}
                                                            onDelete={() => handleDeleteKey(item.id, item.providerName)}
                                                            onToggleStatus={() => handleToggleStatus(item.id, item.status)}
                                                        />
                                                    ))}
                                                </div>
                                            </SortableContext>
                                        </DndContext>
                                    )}

                                    {/* Unconfigured Quick Add Catalog */}
                                    <div className="pt-4 border-t">
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                            Proveedores Disponibles en el SaaS
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.entries(PROVIDER_GUIDES).map(([pId, guide]) => {
                                                const countForProvider = items.filter(i => i.providerId === pId).length
                                                const pName =
                                                    pId === "openai" ? "OpenAI" :
                                                    pId === "anthropic" ? "Anthropic Claude" :
                                                    pId === "google" ? "Google Gemini" : "Groq (Llama)"

                                                return (
                                                    <div
                                                        key={pId}
                                                        className="flex items-center justify-between p-2.5 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="h-7 w-7 rounded-lg bg-white dark:bg-zinc-800 border p-1 flex items-center justify-center shrink-0">
                                                                {PROVIDER_LOGOS[pId] ? (
                                                                    <img src={PROVIDER_LOGOS[pId]} alt={pName} className="w-full h-full object-contain" />
                                                                ) : (
                                                                    <Bot className="h-4 w-4 text-muted-foreground" />
                                                                )}
                                                            </div>
                                                            <div className="truncate">
                                                                <div className="text-xs font-medium text-foreground">{pName}</div>
                                                                <div className="text-[10px] text-muted-foreground">
                                                                    {countForProvider > 0 ? `${countForProvider} key(s) en pool` : "Sin configurar"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 px-2 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                                                            onClick={() => {
                                                                setSelectedProvider(pId)
                                                                setIsAddDialogOpen(true)
                                                            }}
                                                        >
                                                            <Plus className="h-3 w-3 mr-0.5" /> Slot
                                                        </Button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t bg-white dark:bg-zinc-900 text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1.5">
                            <Lock className="h-3 w-3 text-emerald-500" />
                            <span>Bóveda protegida por cifrado simétrico AES-256-CBC en reposo. Cero exposición en respuestas de API.</span>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* MODAL: AÑADIR NUEVA CLAVE MAESTRA */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Key className="h-5 w-5 text-indigo-600" />
                            Añadir Clave Maestra al Pool de Inferencia
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Puedes configurar múltiples claves del mismo proveedor. Si una clave llega a límite de cuota o rate limit, el motor rota automáticamente a la siguiente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Proveedor de IA</Label>
                            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                                <SelectTrigger className="text-xs h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="openai">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">OpenAI</span>
                                            <span className="text-muted-foreground text-[10px]">(GPT-4o, Embeddings)</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="anthropic">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">Anthropic Claude</span>
                                            <span className="text-muted-foreground text-[10px]">(Claude 3.5 Sonnet / Haiku)</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="google">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">Google Gemini</span>
                                            <span className="text-muted-foreground text-[10px]">(Gemini 1.5 Flash / Pro)</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="groq">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">Groq (Llama)</span>
                                            <span className="text-muted-foreground text-[10px]">(Llama 3.3 70B, Mixtral)</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Etiqueta / Alias (Opcional)</Label>
                            <Input
                                placeholder="ej. OpenAI Cuenta Principal Tier 5, Respaldo Emergencia..."
                                value={labelInput}
                                onChange={e => setLabelInput(e.target.value)}
                                className="text-xs h-9"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">API Key Secreta</Label>
                            <div className="relative">
                                <Input
                                    type={showKeyInput ? "text" : "password"}
                                    placeholder="sk-..."
                                    value={apiKeyInput}
                                    onChange={e => setApiKeyInput(e.target.value)}
                                    className="pr-10 text-xs font-mono h-9"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1 h-7 w-7 text-muted-foreground"
                                    onClick={() => setShowKeyInput(!showKeyInput)}
                                >
                                    {showKeyInput ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </Button>
                            </div>
                        </div>

                        <div className="p-3 bg-muted/40 rounded-xl border text-[11px] text-muted-foreground space-y-1">
                            <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                <Lock className="h-3.5 w-3.5 text-indigo-500" />
                                Seguridad de Grado Bancario
                            </div>
                            <p>
                                La clave se cifra inmediatamente con tu clave simétrica del entorno antes de ser guardada. pixy nunca expone las credenciales maestras.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button size="sm" onClick={handleAddKey} disabled={isPending || !apiKeyInput.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                            Guardar en Bóveda
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

function MasterKeyCard({
    item,
    onDelete,
    onToggleStatus
}: {
    item: MasterKeyItem
    onDelete: () => void
    onToggleStatus: () => void
}) {
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
        zIndex: isDragging ? 50 : "auto",
        opacity: isDragging ? 0.75 : 1
    }

    const isVault = item.source === "vault"
    const isActive = item.status === "active"
    const guide = PROVIDER_GUIDES[item.providerId]

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm transition-all overflow-hidden",
                isActive
                    ? "border-indigo-100 dark:border-indigo-900/50 shadow-indigo-500/5"
                    : "border-border/50 opacity-60 bg-muted/10"
            )}
        >
            <div className="flex items-center gap-3 p-3.5">
                {/* Drag Handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab hover:text-foreground text-muted-foreground/40 transition-colors shrink-0"
                    title="Arrastrar para cambiar prioridad"
                >
                    <GripVertical className="h-5 w-5" />
                </div>

                {/* Provider Logo */}
                <div className="h-10 w-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 border p-2 flex items-center justify-center shrink-0">
                    {PROVIDER_LOGOS[item.providerId] ? (
                        <img src={PROVIDER_LOGOS[item.providerId]} alt={item.providerName} className="w-full h-full object-contain" />
                    ) : (
                        <Bot className="h-5 w-5 text-muted-foreground" />
                    )}
                </div>

                {/* Key Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{item.label || item.providerName}</span>
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[10px] h-4 px-1.5 font-mono font-bold",
                                item.priority === 1
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300"
                                    : "bg-muted text-muted-foreground border-border"
                            )}
                        >
                            #{item.priority} {item.priority === 1 ? "Principal" : "Fallback"}
                        </Badge>
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[10px] h-4 px-1.5 font-semibold",
                                isVault
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                            )}
                        >
                            {isVault ? "Vault DB" : "ENV Fallback"}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground font-mono">
                            {item.apiKeyMasked}
                        </span>
                        <span className="text-[11px] text-muted-foreground/60">•</span>
                        <span className="text-[11px] text-muted-foreground">
                            {item.providerName}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Status Toggle */}
                    {isVault && (
                        <div className="flex items-center gap-1.5 pr-1">
                            <Switch
                                checked={isActive}
                                onCheckedChange={onToggleStatus}
                                className="scale-75"
                                title={isActive ? "Pausar clave" : "Activar clave"}
                            />
                        </div>
                    )}

                    {/* Guide Modal */}
                    {guide && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-indigo-600">
                                    <Info className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <Key className="h-4 w-4 text-indigo-600" /> {guide.title}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs">
                                        Sigue estos pasos para obtener o regenerar credenciales de {item.providerName}.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-2">
                                    <div className="space-y-2">
                                        {guide.steps.map((step, i) => (
                                            <div key={i} className="flex items-start gap-2.5 text-xs">
                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 font-bold text-[10px] shrink-0">
                                                    {i + 1}
                                                </span>
                                                <span className="text-muted-foreground pt-0.5">{step}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <Button variant="outline" size="sm" className="w-full gap-2 text-xs" asChild>
                                        <a href={guide.url} target="_blank" rel="noopener noreferrer">
                                            Abrir Consola Oficial <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}

                    {/* Delete Button */}
                    {isVault && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onDelete}
                            className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Eliminar de la bóveda"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
