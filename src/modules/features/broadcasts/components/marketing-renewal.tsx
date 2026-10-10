'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { prepareMarketingRenewal, confirmMarketingRenewal } from '../marketing-review-actions'

export function MarketingRenewal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [phone, setPhone] = useState('')
    const [review, setReview] = useState<{ token: string; expiresAt: string; after: string } | null>(null)
    const [form, setForm] = useState({ source: '', evidence: '', date: '', confirmed: false })
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    async function check() {
        setBusy(true); setReview(null); setError(''); setForm({ source: '', evidence: '', date: '', confirmed: false })
        try { const result = await prepareMarketingRenewal(phone); if (result.success) setReview(result.review); else setError(result.error) }
        catch { setError('No se pudo revisar la baja.') } finally { setBusy(false) }
    }
    async function save() {
        if (!review || !form.date || !form.confirmed) return
        setBusy(true); setError('')
        try {
            const result = await confirmMarketingRenewal({ token: review.token, source: form.source, evidence: form.evidence, occurredAt: new Date(form.date).toISOString(), confirmed: form.confirmed })
            if (!result.success) { setError(result.error); return }
            onSaved()
        } catch { setError('No se pudo confirmar la renovación. Reintenta con la misma evidencia.') } finally { setBusy(false) }
    }
    return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}><DialogContent aria-labelledby="renewal-review-title" aria-describedby="renewal-review-description"><DialogHeader>
        <DialogTitle id="renewal-review-title">Renovar autorización después de una baja</DialogTitle><DialogDescription id="renewal-review-description">Solo con una nueva autorización expresa del destinatario, obtenida después de su baja. Se conserva el historial de evidencias; las campañas canceladas no se reanudan.</DialogDescription>
    </DialogHeader><div className="space-y-3 text-sm">
        <label htmlFor="renew-phone">Teléfono internacional</label><Input id="renew-phone" disabled={busy} value={phone} onChange={event => { setPhone(event.target.value); setReview(null); setForm({ ...form, confirmed: false }) }} />
        <Button variant="outline" disabled={busy || !phone.trim()} onClick={check}>Revisar baja</Button>
        {error && <p role="alert" className="text-red-600">{error}</p>}
        {review && <><p>La nueva autorización debe ser posterior a {new Date(review.after).toLocaleString()}. Revisión válida hasta {new Date(review.expiresAt).toLocaleTimeString()}.</p>
            <label htmlFor="renew-source">Origen de la nueva autorización</label><Input id="renew-source" disabled={busy} maxLength={120} value={form.source} onChange={event => setForm({ ...form, source: event.target.value, confirmed: false })} />
            <label htmlFor="renew-evidence">Evidencia nueva o referencia verificable</label><Textarea id="renew-evidence" disabled={busy} maxLength={2000} value={form.evidence} onChange={event => setForm({ ...form, evidence: event.target.value, confirmed: false })} />
            <label htmlFor="renew-date">Fecha de obtención · hora local</label><Input id="renew-date" disabled={busy} type="datetime-local" step="1" value={form.date} onChange={event => setForm({ ...form, date: event.target.value, confirmed: false })} />
            <label className="flex gap-2"><input type="checkbox" disabled={busy} checked={form.confirmed} onChange={event => setForm({ ...form, confirmed: event.target.checked })} />Confirmo que el destinatario volvió a autorizar expresamente el marketing de nuestra empresa después de su baja.</label>
            <Button disabled={busy || !form.confirmed || !form.source.trim() || !form.evidence.trim() || !form.date} onClick={save}>Registrar nueva autorización</Button></>}
        <Button variant="outline" disabled={busy} onClick={onClose}>Cerrar</Button>
    </div></DialogContent></Dialog>
}
