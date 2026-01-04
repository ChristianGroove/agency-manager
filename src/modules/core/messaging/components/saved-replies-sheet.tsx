"use client"

import { useEffect, useState } from "react"
import { SavedReply, getSavedReplies, createSavedReply, updateSavedReply, deleteSavedReply } from "../template-actions"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Star, Trash2, Edit2, Save, X, Smile, Reply, ArrowLeft, Zap, MessageSquare } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"
import { Label } from "@/components/ui/label"
import { refineDraftContent } from "../ai/smart-replies"

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

interface SavedRepliesSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelect?: (content: string) => void
}

export function SavedRepliesSheet({ open, onOpenChange, onSelect }: SavedRepliesSheetProps) {
    const [replies, setReplies] = useState<SavedReply[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [editingReply, setEditingReply] = useState<Partial<SavedReply> | null>(null)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isRefining, setIsRefining] = useState(false)

    useEffect(() => {
        if (open) {
            refreshReplies()
        }
    }, [open])

    const refreshReplies = () => {
        setIsLoading(true)
        getSavedReplies().then(data => {
            setReplies(data)
            setIsLoading(false)
        })
    }

    const handleRefine = async () => {
        if (!editingReply?.content || editingReply.content.length < 5) {
            toast.error("Enter at least a few words first.")
            return
        }

        setIsRefining(true)
        try {
            const result = await refineDraftContent(editingReply.content)
            if (result.success && result.refined) {
                setEditingReply(prev => ({ ...prev, content: result.refined }))
                toast.success("Polished by AI! ✨")
            } else {
                toast.error("Could not refine: " + result.error)
            }
        } catch (error) {
            toast.error("AI Error")
        } finally {
            setIsRefining(false)
        }
    }

    const handleSave = async () => {
        if (!editingReply?.title || !editingReply?.content) {
            toast.error("Please fill in title and content")
            return
        }

        const promise = editingReply.id
            ? updateSavedReply(editingReply.id, editingReply)
            : createSavedReply(editingReply)

        toast.promise(promise, {
            loading: 'Saving...',
            success: () => {
                refreshReplies()
                setEditingReply(null)
                setIsCreating(false)
                return 'Saved successfully!'
            },
            error: 'Failed to save'
        })
    }

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this template?")) {
            await deleteSavedReply(id)
            refreshReplies()
            toast.success("Deleted")
            if (editingReply?.id === id) {
                setEditingReply(null)
                setIsCreating(false)
            }
        }
    }

    const filteredReplies = replies.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.content.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // View Mode
    const isEditorOpen = isCreating || !!editingReply

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-[600px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <SheetHeader className="hidden">
                    <SheetTitle>Smart Responses</SheetTitle>
                    <SheetDescription>Manage saved replies</SheetDescription>
                </SheetHeader>

                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">

                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            {isEditorOpen ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="-ml-2 text-gray-500 hover:text-gray-900"
                                    onClick={() => { setEditingReply(null); setIsCreating(false); }}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            ) : (
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                    <Zap className="h-5 w-5" />
                                </div>
                            )}

                            <div>
                                <h2 className="text-lg font-bold text-gray-900 tracking-tight leading-none">
                                    {isEditorOpen ? (editingReply?.id ? 'Editar Respuesta' : 'Nueva Respuesta') : 'Smart Responses'}
                                </h2>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {isEditorOpen ? 'Configura el contenido y atajos.' : 'Gestiona tus plantillas de respuesta.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden relative">
                        {isEditorOpen ? (
                            // EDITOR VIEW
                            <ScrollArea className="h-full p-6">
                                <div className="space-y-6 max-w-lg mx-auto">
                                    {/* Icon & Title */}
                                    <div className="flex gap-4">
                                        <div className="space-y-2">
                                            <Label>Icono</Label>
                                            <div className="relative">
                                                <Button
                                                    variant="outline"
                                                    className="h-12 w-12 text-2xl bg-gray-50/50"
                                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                >
                                                    {editingReply?.icon || "📝"}
                                                </Button>
                                                {showEmojiPicker && (
                                                    <div className="absolute top-14 left-0 z-50 shadow-xl rounded-xl overflow-hidden border">
                                                        <div className="flex justify-end bg-white p-1 border-b">
                                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowEmojiPicker(false)}>
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                        <EmojiPicker onEmojiClick={(e) => {
                                                            setEditingReply(prev => ({ ...prev, icon: e.emoji }));
                                                            setShowEmojiPicker(false)
                                                        }} height={350} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            <Label>Título (Atajo)</Label>
                                            <Input
                                                placeholder="Ej: Bienvenida Cliente"
                                                className="h-12 text-lg font-medium"
                                                value={editingReply?.title || ""}
                                                onChange={e => setEditingReply(prev => ({ ...prev, title: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="space-y-2">
                                        <Label>Contenido del Mensaje</Label>
                                        <div className="relative">
                                            <Textarea
                                                placeholder="Escribe el mensaje aquí..."
                                                className="min-h-[200px] resize-none text-base leading-relaxed p-4 bg-gray-50/30 focus:bg-white transition-colors"
                                                value={editingReply?.content || ""}
                                                onChange={e => setEditingReply(prev => ({ ...prev, content: e.target.value }))}
                                                disabled={isRefining}
                                            />
                                            <div className="absolute bottom-2 right-2 flex gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 px-2 text-[10px] text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                    onClick={handleRefine}
                                                    disabled={isRefining}
                                                >
                                                    {isRefining ? 'Polishing...' : 'AI Improve ✨'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Options Card */}
                                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2 rounded-lg transition-colors", editingReply?.is_favorite ? "bg-yellow-100 text-yellow-600" : "bg-gray-100 text-gray-500")}>
                                                    <Star className={cn("h-5 w-5", editingReply?.is_favorite && "fill-current")} />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-sm text-gray-900">Acceso Rápido</h4>
                                                    <p className="text-xs text-muted-foreground">Mostrar en el menú ⚡</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant={editingReply?.is_favorite ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setEditingReply(prev => ({ ...prev, is_favorite: !prev?.is_favorite }))}
                                                className={cn(editingReply?.is_favorite && "bg-yellow-500 hover:bg-yellow-600 border-transparent text-white")}
                                            >
                                                {editingReply?.is_favorite ? "Activado" : "Activar"}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Delete Zone */}
                                    {editingReply?.id && (
                                        <div className="pt-8 border-t flex justify-center">
                                            <Button
                                                variant="ghost"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDelete(editingReply.id!)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Eliminar Plantilla
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        ) : (
                            // LIST VIEW
                            <div className="flex flex-col h-full">
                                {/* Search Bar */}
                                <div className="px-6 pb-4 bg-white/50 backdrop-blur-sm z-10">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar respuestas..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-xl"
                                        />
                                    </div>
                                </div>

                                <ScrollArea className="flex-1 px-6 pb-6">
                                    <div className="grid gap-3 pb-20">
                                        {/* Create New Button (Inline) */}
                                        <button
                                            onClick={() => { setIsCreating(true); setEditingReply({}); }}
                                            className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group w-full text-left"
                                        >
                                            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-gray-50 group-hover:bg-indigo-100 text-gray-400 group-hover:text-indigo-600 transition-colors">
                                                <Plus className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm text-gray-900 group-hover:text-indigo-700">Crear Nueva Respuesta</h4>
                                                <p className="text-xs text-muted-foreground">Añade una nueva plantilla a tu colección.</p>
                                            </div>
                                        </button>

                                        {filteredReplies.map(reply => (
                                            <div
                                                key={reply.id}
                                                onClick={() => isEditorOpen ? null : onSelect?.(reply.content)}
                                                className="group relative flex flex-col gap-3 p-4 rounded-xl border bg-white border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all cursor-pointer"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl bg-gray-50 p-2 rounded-lg h-10 w-10 flex items-center justify-center border border-gray-100">
                                                            {reply.icon || "📄"}
                                                        </span>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-semibold text-sm text-gray-900">{reply.title}</h4>
                                                                {reply.is_favorite && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                                                            </div>
                                                            <div className="flex gap-2 mt-0.5">
                                                                <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md">
                                                                    {reply.category || 'General'}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400 flex items-center">
                                                                    <MessageSquare className="h-2.5 w-2.5 mr-1" />
                                                                    {reply.usage_count} usos
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => { e.stopPropagation(); setEditingReply(reply); }}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <div className="bg-gray-50/50 p-2.5 rounded-lg border border-gray-100/50">
                                                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                                                        {reply.content}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                    </div>

                    {/* Footer - Only visible in Editor mode usually, or global actions */}
                    {isEditorOpen && (
                        <div className="sticky bottom-0 bg-white/80 backdrop-blur-md p-6 border-t border-gray-100 flex items-center justify-end z-20 gap-3">
                            <Button variant="ghost" onClick={() => { setEditingReply(null); setIsCreating(false); }}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                                <Save className="mr-2 h-4 w-4" />
                                Guardar Cambios
                            </Button>
                        </div>
                    )}

                    <div className="absolute top-1/2 left-0 -translate-x-full">
                        {/* Close X outside if needed, but Sheet handles overlay click */}
                    </div>

                </div>
            </SheetContent>
        </Sheet>
    )
}
