'use client'
import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCampaign } from '../marketing-actions'
export function CreateCampaignDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
    const [name, setName] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''); const saving = useRef(false)
    async function save(event: React.FormEvent) {
        event.preventDefault(); if (saving.current || !name.trim()) return
        saving.current = true; setBusy(true); setError('')
        try { const result = await createCampaign({ name: name.trim() }); if (!result.success || !result.campaign) { setError(result.error || 'No se pudo crear el borrador.'); return } onCreated(result.campaign.id) }
        catch { setError('No se confirmó la creación. Actualiza la lista antes de volver a crearla.') }
        finally { saving.current = false; setBusy(false) }
    }
    return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}><DialogContent><DialogHeader><DialogTitle>Nueva campaña WhatsApp</DialogTitle><DialogDescription>Empezarás por los destinatarios. Crear este borrador no inscribe contactos ni envía mensajes.</DialogDescription></DialogHeader>
        <form onSubmit={save} className="space-y-4"><Label htmlFor="new-campaign-name">Nombre</Label><Input id="new-campaign-name" autoFocus maxLength={160} value={name} disabled={busy} onChange={e => setName(e.target.value)} placeholder="Ej. Promoción de octubre" />{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button disabled={busy || !name.trim()}>{busy ? 'Creando…' : 'Crear borrador'}</Button></div></form>
    </DialogContent></Dialog>
}
