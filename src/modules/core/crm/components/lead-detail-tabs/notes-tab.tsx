'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
    MessageSquare,
    Send,
    Pin,
    Trash2,
    MoreHorizontal
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { LeadNote, NoteType } from '@/types/crm-advanced'
import { createLeadNote, updateLeadNote, deleteLeadNote } from '../../crm-advanced-actions'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface LeadNotesTabProps {
    leadId: string
    notes: LeadNote[]
    onUpdate: () => void
}

export function LeadNotesTab({ leadId, notes, onUpdate }: LeadNotesTabProps) {
    const [content, setContent] = useState('')
    const [noteType, setNoteType] = useState<NoteType>('general')
    const [isTyping, setIsTyping] = useState(false)
    const [saving, setSaving] = useState(false)

    async function handleAddNote() {
        if (!content.trim()) return

        setSaving(true)
        try {
            const result = await createLeadNote({
                lead_id: leadId,
                content: content,
                note_type: noteType,
                is_pinned: false
            })

            if (result.success) {
                setContent('')
                setNoteType('general')
                setIsTyping(false)
                toast.success('Nota agregada')
                onUpdate()
            } else {
                toast.error('Error al agregar nota')
            }
        } catch (error) {
            console.error('Error adding note:', error)
        } finally {
            setSaving(false)
        }
    }

    async function handleTogglePin(note: LeadNote) {
        try {
            const result = await updateLeadNote(note.id, note.content, !note.is_pinned)
            if (result.success) {
                onUpdate()
            }
        } catch (error) {
            console.error('Error pinning note:', error)
        }
    }

    async function handleDelete(noteId: string) {
        if (!confirm('¿Eliminar esta nota?')) return
        try {
            const result = await deleteLeadNote(noteId)
            if (result.success) {
                toast.success('Nota eliminada')
                onUpdate()
            }
        } catch (error) {
            console.error('Error deleting note:', error)
        }
    }

    return (
        <div className="flex flex-col h-full gap-6">
            {/* Input Area */}
            <Card className="border-2 border-slate-100 dark:border-slate-800 shadow-sm">
                <CardContent className="p-3 space-y-3">
                    <Textarea
                        placeholder="Escribe una nota..."
                        value={content}
                        onChange={(e) => {
                            setContent(e.target.value)
                            if (!isTyping) setIsTyping(true)
                        }}
                        className="min-h-[80px] border-none resize-none focus-visible:ring-0 shadow-none px-2"
                        rows={isTyping ? 4 : 2}
                    />

                    <div className="flex justify-between items-center px-1">
                        <div className="flex gap-2">
                            <Select
                                value={noteType}
                                onValueChange={(v: NoteType) => setNoteType(v)}
                            >
                                <SelectTrigger className="h-8 w-[130px] text-xs">
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="call">Llamada</SelectItem>
                                    <SelectItem value="meeting">Reunión</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            size="sm"
                            onClick={handleAddNote}
                            disabled={!content.trim() || saving}
                            className="px-4"
                        >
                            <Send className="h-3 w-3 mr-2" />
                            Agregar Nota
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Notes List */}
            <div className="space-y-4">
                {notes.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p>No hay notas registradas</p>
                    </div>
                ) : (
                    notes.map(note => (
                        <div
                            key={note.id}
                            className={cn(
                                "group relative bg-card p-4 rounded-lg border transition-all hover:shadow-sm",
                                note.is_pinned && "border-primary/30 bg-primary/5"
                            )}
                        >
                            {note.is_pinned && (
                                <div className="absolute top-2 right-2">
                                    <Pin className="h-3 w-3 text-primary fill-current" />
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                            {note.author?.full_name?.[0] || 'U'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">
                                            {note.author?.full_name || note.author?.email || 'Usuario'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: es })}
                                        </p>
                                    </div>
                                </div>

                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleTogglePin(note)}>
                                                <Pin className="h-4 w-4 mr-2" />
                                                {note.is_pinned ? 'Desfijar' : 'Fijar'}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(note.id)}
                                                className="text-red-600 focus:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Eliminar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            <div className="pl-10">
                                <Badge variant="outline" className="mb-2 text-[10px] uppercase tracking-wider">
                                    {note.note_type}
                                </Badge>
                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                    {note.content}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
