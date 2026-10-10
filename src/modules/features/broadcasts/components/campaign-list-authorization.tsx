'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { prepareMarketingListAuthorization, confirmMarketingListAuthorization, type ListAuthorizationReview } from '../marketing-review-actions'

export function CampaignListAuthorization({ listId, onClose, onSaved }: { listId: string; onClose: () => void; onSaved: (count: number) => void }) {
    const [review, setReview] = useState<ListAuthorizationReview | null>(null), [error, setError] = useState('')
    const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false)
    const [confirmed, setConfirmed] = useState(false), [reference, setReference] = useState(''), [revision, setRevision] = useState(0)
    const current = useRef(true), mutation = useRef(false)
    useEffect(() => {
        current.current = true
        return () => { current.current = false }
    }, [])
    useEffect(() => {
        let active = true
        setLoading(true); setError(''); setReview(null); setConfirmed(false)
        void prepareMarketingListAuthorization(listId).then(result => {
            if (!active) return
            if (result.success) setReview(result.review); else setError(result.error)
        }).catch(() => { if (active) setError('No se pudo revisar la lista.') }).finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [listId, revision])
    async function save() {
        if (!review || !confirmed || !review.toAuthorize || mutation.current) return
        mutation.current = true; setSaving(true); setError('')
        try {
            const response = await confirmMarketingListAuthorization({ token: review.token, confirmed: true, reference })
            if (!current.current) return
            if (!response.success) { setError(response.error); setConfirmed(false); return }
            onSaved(response.result.authorized)
        } catch { if (current.current) { setError('No se pudo confirmar el resultado. Reintenta con la misma declaración: no se duplicará.'); setConfirmed(false) } }
        finally { mutation.current = false; if (current.current) setSaving(false) }
    }
    return <Dialog open onOpenChange={open => { if (!open && !mutation.current) onClose() }}>
        <DialogContent className="max-w-lg rounded-2xl bg-card"><DialogHeader>
            <DialogTitle>Autorización externa de la lista</DialogTitle>
            <DialogDescription>Registra en un solo paso el permiso que tu empresa obtuvo fuera de Pixy. Esta declaración no envía mensajes ni revierte bajas.</DialogDescription>
        </DialogHeader>
            <div className="space-y-4 text-sm">
                {loading && <p role="status">Consultando destinatarios…</p>}
                {review && <><div className="rounded-xl border border-primary/15 bg-primary/5 p-4"><p className="font-semibold">{review.listName}</p><p className="mt-1">{review.toAuthorize} contactos pendientes de registrar</p><p className="mt-2 text-xs text-muted-foreground">{review.contacts} contactos revisados. Fuera de esta declaración: {review.excluded} ya autorizados, bajas o datos no aptos.</p></div>
                    <Label htmlFor="list-authorization-reference">Referencia interna · opcional</Label>
                    <Textarea id="list-authorization-reference" disabled={saving} maxLength={1600} value={reference} onChange={event => { setReference(event.target.value); setConfirmed(false) }} placeholder="Ej. Inscripción a promociones en nuestra tienda" />
                    <label className="flex items-start gap-2 leading-relaxed"><input type="checkbox" className="mt-1" disabled={saving || !review.toAuthorize} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Declaro que los contactos incluidos autorizaron a nuestra empresa a enviarles comunicaciones comerciales.</label>
                    <p className="text-xs text-muted-foreground">Se registra quién declara y cuándo. Pixy no comprueba automáticamente el permiso externo. Revisión válida hasta {new Date(review.expiresAt).toLocaleTimeString()}.</p>
                </>}
                {error && <p role="alert" className="text-destructive">{error}</p>}
                <div className="flex flex-wrap justify-end gap-2"><Button variant="ghost" disabled={saving || loading} onClick={() => setRevision(n => n + 1)}>Actualizar revisión</Button><Button variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button><Button disabled={saving || loading || !confirmed || !review?.toAuthorize} onClick={() => void save()}>{saving ? 'Registrando…' : 'Registrar declaración'}</Button></div>
            </div>
        </DialogContent>
    </Dialog>
}
