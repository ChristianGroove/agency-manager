"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, StickyNote } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface NotesModalProps {
    clientId: string
    initialNotes: string
    isOpen: boolean
    onClose: () => void
    onSuccess: (newNotes: string) => void
}

export function NotesModal({ clientId, initialNotes, isOpen, onClose, onSuccess }: NotesModalProps) {
    const [notes, setNotes] = useState(initialNotes)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        setNotes(initialNotes)
    }, [initialNotes])

    const handleSave = async () => {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('clients')
                .update({ notes: notes })
                .eq('id', clientId)

            if (error) throw error
            onSuccess(notes)
            onClose()
        } catch (error) {
            console.error("Error saving notes:", error)
            alert("Error al guardar las notas")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <StickyNote className="h-5 w-5 text-amber-500" />
                        Notas del Cliente
                    </DialogTitle>
                    <DialogDescription>
                        Información interna relevante sobre este cliente.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Escribe aquí notas importantes, recordatorios o detalles de la cuenta..."
                        className="min-h-[200px] resize-none focus-visible:ring-amber-500"
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-amber-500 hover:bg-amber-600 text-white border-0"
                    >
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Guardar Notas
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
