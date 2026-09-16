"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    StickyNote,
    Pin,
    Trash2,
    Phone,
    Users,
    Mail,
    Send,
    MoreHorizontal,
    Loader2,
    ShieldCheck,
    Clock,
    Sparkles,
    Check
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/modules/infrastructure/utils/utils"
import {
    getLeadNotes,
    createLeadNote,
    updateLeadNote,
    deleteLeadNote,
    updateLead
} from "../../services/logic/crm-advanced-actions"
import { supabase } from "@/modules/core/database/supabase"
import type { LeadNote, NoteType } from "@/types/crm-advanced"

interface QuickNotesModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    client: {
        id: string
        name: string
        company_name?: string
        email?: string
        notes?: string
        logo_url?: string
        contact_type?: string
    } | null
    onSuccess?: (newNotes?: string) => void
}

export function QuickNotesModal({ isOpen, onOpenChange, client, onSuccess }: QuickNotesModalProps) {
    const [activeTab, setActiveTab] = useState<"card_note" | "timeline">("card_note")

    // State for Card Note (leads.notes)
    const [cardNote, setCardNote] = useState("")
    const [savingCardNote, setSavingCardNote] = useState(false)
    const [cardNoteDirty, setCardNoteDirty] = useState(false)

    // State for Structured Timeline Notes (lead_notes)
    const [notesList, setNotesList] = useState<LeadNote[]>([])
    const [loadingNotes, setLoadingNotes] = useState(false)
    const [newNoteContent, setNewNoteContent] = useState("")
    const [newNoteType, setNewNoteType] = useState<NoteType>("general")
    const [savingStructuredNote, setSavingStructuredNote] = useState(false)

    // Sync client notes when modal opens or client changes
    useEffect(() => {
        if (client && isOpen) {
            setCardNote(client.notes || "")
            setCardNoteDirty(false)
            fetchStructuredNotes(client.id)
        }
    }, [client?.id, isOpen])

    const fetchStructuredNotes = useCallback(async (clientId: string) => {
        if (!clientId) return
        setLoadingNotes(true)
        try {
            // First attempt with server action
            const data = await getLeadNotes(clientId)
            if (Array.isArray(data)) {
                setNotesList(data)
            } else {
                // Client fallback query
                const { data: directNotes } = await supabase
                    .from("lead_notes")
                    .select("*")
                    .eq("lead_id", clientId)
                    .order("is_pinned", { ascending: false })
                    .order("created_at", { ascending: false })
                setNotesList(directNotes || [])
            }
        } catch (error) {
            console.error("[QuickNotesModal] Error fetching notes:", error)
        } finally {
            setLoadingNotes(false)
        }
    }, [])

    // Save Card Note (leads.notes)
    const handleSaveCardNote = async () => {
        if (!client?.id) return
        setSavingCardNote(true)
        try {
            // Update via action
            const res = await updateLead(client.id, { notes: cardNote })
            
            // Direct fallback if action failed
            if (!res?.success) {
                const { error } = await supabase
                    .from("leads")
                    .update({ notes: cardNote })
                    .eq("id", client.id)
                if (error) throw error
            }

            toast.success("Nota de la tarjeta actualizada")
            setCardNoteDirty(false)
            if (onSuccess) onSuccess(cardNote)
        } catch (error: any) {
            console.error("[QuickNotesModal] Error saving card note:", error)
            toast.error("Error al guardar la nota: " + (error.message || "desconocido"))
        } finally {
            setSavingCardNote(false)
        }
    }

    // Add Structured Note to Timeline (lead_notes)
    const handleAddStructuredNote = async () => {
        if (!client?.id || !newNoteContent.trim()) return
        setSavingStructuredNote(true)
        try {
            const res = await createLeadNote({
                lead_id: client.id,
                content: newNoteContent.trim(),
                note_type: newNoteType,
                is_pinned: false
            })

            if (res.success) {
                toast.success("Nota añadida a la bitácora")
                setNewNoteContent("")
                setNewNoteType("general")
                fetchStructuredNotes(client.id)
            } else {
                // Client-side fallback insert
                const { data: { user } } = await supabase.auth.getUser()
                const { error } = await supabase
                    .from("lead_notes")
                    .insert({
                        lead_id: client.id,
                        organization_id: (client as any).organization_id || undefined,
                        content: newNoteContent.trim(),
                        note_type: newNoteType,
                        is_pinned: false,
                        created_by: user?.id || null
                    })
                if (error) throw error

                toast.success("Nota añadida a la bitácora")
                setNewNoteContent("")
                setNewNoteType("general")
                fetchStructuredNotes(client.id)
            }
        } catch (error: any) {
            console.error("[QuickNotesModal] Error adding structured note:", error)
            toast.error("Error al registrar nota: " + (error.message || "desconocido"))
        } finally {
            setSavingStructuredNote(false)
        }
    }

    // Toggle Pin on Structured Note
    const handleTogglePin = async (note: LeadNote) => {
        try {
            const nextPinned = !note.is_pinned
            const res = await updateLeadNote(note.id, note.content, nextPinned)
            if (!res.success) {
                await supabase
                    .from("lead_notes")
                    .update({ is_pinned: nextPinned })
                    .eq("id", note.id)
            }
            toast.success(nextPinned ? "Nota fijada" : "Nota desfijada")
            if (client?.id) fetchStructuredNotes(client.id)
        } catch (error) {
            console.error("[QuickNotesModal] Error pinning note:", error)
        }
    }

    // Delete Structured Note
    const handleDeleteNote = async (noteId: string) => {
        try {
            const res = await deleteLeadNote(noteId)
            if (!res.success) {
                await supabase
                    .from("lead_notes")
                    .delete()
                    .eq("id", noteId)
            }
            toast.success("Nota eliminada")
            if (client?.id) fetchStructuredNotes(client.id)
        } catch (error) {
            console.error("[QuickNotesModal] Error deleting note:", error)
            toast.error("Error al eliminar nota")
        }
    }

    const getNoteTypeIcon = (type: NoteType | string) => {
        switch (type) {
            case "call":
                return <Phone className="h-3 w-3 text-emerald-500" />
            case "meeting":
                return <Users className="h-3 w-3 text-blue-500" />
            case "email":
                return <Mail className="h-3 w-3 text-purple-500" />
            default:
                return <StickyNote className="h-3 w-3 text-amber-500" />
        }
    }

    const getNoteTypeLabel = (type: NoteType | string) => {
        switch (type) {
            case "call":
                return "Llamada"
            case "meeting":
                return "Reunión"
            case "email":
                return "Correo"
            default:
                return "General"
        }
    }

    if (!client) return null

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[620px] p-0 overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 shadow-2xl rounded-2xl gap-0">
                {/* Header */}
                <div className="px-6 py-5 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/70 dark:bg-zinc-900/40">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-11 w-11 border border-zinc-200 dark:border-white/10 shadow-sm">
                                {client.logo_url && <AvatarImage src={client.logo_url} alt={client.name} />}
                                <AvatarFallback className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold text-sm">
                                    {client.name?.slice(0, 2).toUpperCase() || "CT"}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="flex items-center gap-2">
                                    <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                                        {client.name}
                                    </DialogTitle>
                                </div>
                                <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                    {client.company_name || client.email || "Notas y acuerdos"}
                                </DialogDescription>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-4 w-full">
                        <TabsList className="grid grid-cols-2 h-9 p-1 bg-zinc-200/60 dark:bg-white/5 rounded-xl">
                            <TabsTrigger
                                value="card_note"
                                className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 rounded-lg transition-all"
                            >
                                <StickyNote className="h-3.5 w-3.5" />
                                Nota Principal (Card)
                            </TabsTrigger>
                            <TabsTrigger
                                value="timeline"
                                className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 rounded-lg transition-all"
                            >
                                <Clock className="h-3.5 w-3.5" />
                                Bitácora ({notesList.length})
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Tab 1: Card Note (leads.notes) */}
                {activeTab === "card_note" && (
                    <div className="p-6 space-y-4">
                        <div className="rounded-xl p-3 bg-amber-500/5 border border-amber-500/15 flex items-start gap-2.5">
                            <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                                Esta nota aparece visible directamente en la tarjeta de contacto en el CRM. Anota detalles clave, acuerdos o preferencias importantes.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                                <span>Texto de la nota</span>
                                <span className={cn(cardNote.length > 250 && "text-amber-600 dark:text-amber-400 font-medium")}>
                                    {cardNote.length} caracteres
                                </span>
                            </div>
                            <Textarea
                                value={cardNote}
                                onChange={(e) => {
                                    setCardNote(e.target.value)
                                    setCardNoteDirty(true)
                                }}
                                placeholder="Escribe aquí acuerdos importantes, requerimientos clave, horarios de contacto o notas sobre este cliente..."
                                className="min-h-[160px] resize-none text-sm bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-white/10 focus-visible:ring-amber-500/30 rounded-xl leading-relaxed"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                                <StickyNote className="h-3.5 w-3.5 text-amber-500" />
                                Visible en la tarjeta del contacto
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onOpenChange(false)}
                                    className="rounded-xl h-9 text-xs border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5"
                                >
                                    Cerrar
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSaveCardNote}
                                    disabled={savingCardNote || !cardNoteDirty}
                                    className="rounded-xl h-9 px-4 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm border-0 transition-all active:scale-95"
                                >
                                    {savingCardNote ? (
                                        <>
                                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="mr-1.5 h-3.5 w-3.5" />
                                            Guardar Nota
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab 2: Structured Timeline (lead_notes) */}
                {activeTab === "timeline" && (
                    <div className="p-6 flex flex-col gap-4 max-h-[500px] overflow-y-auto">
                        {/* New Note Composer */}
                        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-3">
                            <Textarea
                                value={newNoteContent}
                                onChange={(e) => setNewNoteContent(e.target.value)}
                                placeholder="Registrar una llamada, acuerdo de reunión o actualización..."
                                className="min-h-[75px] resize-none text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 focus-visible:ring-amber-500/30 rounded-lg"
                            />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Select value={newNoteType} onValueChange={(v) => setNewNoteType(v as NoteType)}>
                                        <SelectTrigger className="h-8 w-[130px] text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 rounded-lg">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="dark:bg-zinc-900 dark:border-white/10">
                                            <SelectItem value="general">📝 General</SelectItem>
                                            <SelectItem value="call">📞 Llamada</SelectItem>
                                            <SelectItem value="meeting">👥 Reunión</SelectItem>
                                            <SelectItem value="email">✉️ Correo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={handleAddStructuredNote}
                                    disabled={!newNoteContent.trim() || savingStructuredNote}
                                    className="h-8 px-3 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm border-0 transition-all"
                                >
                                    {savingStructuredNote ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <>
                                            <Send className="h-3 w-3 mr-1.5" />
                                            Registrar
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Notes List */}
                        <div className="space-y-2.5">
                            {loadingNotes ? (
                                <div className="py-8 flex flex-col items-center justify-center text-zinc-400 gap-2">
                                    <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                                    <span className="text-xs">Cargando bitácora de notas...</span>
                                </div>
                            ) : notesList.length === 0 ? (
                                <div className="py-10 text-center rounded-xl border border-dashed border-zinc-200 dark:border-white/10">
                                    <StickyNote className="h-8 w-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                        No hay entradas en la bitácora aún.
                                    </p>
                                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                                        Agrega notas de llamadas, reuniones o seguimientos arriba.
                                    </p>
                                </div>
                            ) : (
                                notesList.map((note) => (
                                    <div
                                        key={note.id}
                                        className={cn(
                                            "group relative p-3.5 rounded-xl border transition-all",
                                            note.is_pinned
                                                ? "bg-amber-500/5 border-amber-500/30 dark:bg-amber-500/10 dark:border-amber-500/20"
                                                : "bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/15"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] font-semibold gap-1 px-1.5 py-0.5 bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10"
                                                >
                                                    {getNoteTypeIcon(note.note_type)}
                                                    {getNoteTypeLabel(note.note_type)}
                                                </Badge>
                                                {note.is_pinned && (
                                                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                                        <Pin className="h-2.5 w-2.5 fill-current" />
                                                        Fijada
                                                    </span>
                                                )}
                                                <span className="text-[11px] text-zinc-400">
                                                    {formatDistanceToNow(new Date(note.created_at), {
                                                        addSuffix: true,
                                                        locale: es
                                                    })}
                                                </span>
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 opacity-60 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="dark:bg-zinc-900 dark:border-white/10 text-xs">
                                                    <DropdownMenuItem onClick={() => handleTogglePin(note)} className="gap-2 text-xs">
                                                        <Pin className="h-3.5 w-3.5" />
                                                        {note.is_pinned ? "Desfijar" : "Fijar al inicio"}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteNote(note.id)}
                                                        className="gap-2 text-xs text-rose-600 focus:text-rose-600"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                            {note.content}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
