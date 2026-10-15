'use client'

import { useMarketingApi } from '../marketing-client-api'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './campaign-dialog'
import type { CampaignPreflight } from '../marketing-preflight-actions'
import { toast } from 'sonner'

import { MarketingRenewal } from './marketing-renewal'

export function CampaignReadiness({ campaignId, revision, canExecute = false, permissionsOnly = false, onChanged, channel = 'whatsapp' }: { channel?: 'whatsapp' | 'email'; campaignId: string; revision: number; canExecute?: boolean; permissionsOnly?: boolean; onChanged?: () => void }) {
    const { recordMarketingPermission, reviewCampaign, recordEmailPermission } = useMarketingApi()
    const [review, setReview] = useState<CampaignPreflight | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [renewalOpen, setRenewalOpen] = useState(false)
    const [form, setForm] = useState({ phone: '', source: '', evidence: '', date: '', confirmed: false })
    const requestEpoch = useRef(0)
    useEffect(() => {
        requestEpoch.current++; setReview(null); setError(''); setLoading(false)
        return () => { requestEpoch.current++ }
    }, [campaignId, revision])
    async function check() {
        const epoch = ++requestEpoch.current
        setLoading(true); setError(''); setReview(null)
        try {
            const result = await reviewCampaign(campaignId)
            if (epoch !== requestEpoch.current) return
            if (result.success) setReview(result.review)
            else setError(result.error)
        } catch { if (epoch === requestEpoch.current) setError('No se pudo revisar la campaña.') }
        finally { if (epoch === requestEpoch.current) setLoading(false) }
    }
    async function savePermission() {
        if (!form.date) { toast.error('Indica cuándo se obtuvo la autorización.'); return }
        setSaving(true)
        try {
            const result = await (channel === 'email' ? recordEmailPermission : recordMarketingPermission)({ phone: form.phone, source: form.source, evidence: form.evidence,
                occurredAt: new Date(form.date).toISOString(), confirmed: form.confirmed })
            if (!result.success) { toast.error(result.error); return }
            toast.success('Autorización registrada con evidencia.'); setOpen(false)
            setForm({ phone: '', source: '', evidence: '', date: '', confirmed: false }); onChanged?.()
            if (!permissionsOnly) await check()
        } catch { toast.error('No se pudo registrar la autorización.') }
        finally { setSaving(false) }
    }
    return <section className="rounded-xl border p-5 space-y-4 bg-white dark:bg-zinc-900">
        <div className="flex flex-wrap justify-between gap-3">
            <div><h4 className="font-semibold">{permissionsOnly ? 'Autorizaciones de contactos' : 'Revisión previa de campaña'}</h4><p className="text-xs text-muted-foreground">{permissionsOnly ? 'Registra evidencia de autorización para el canal de la campaña. No envía mensajes.' : 'Guarda primero tus cambios. Esta revisión no inscribe contactos ni envía mensajes.'}</p></div>
            <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!canExecute} onClick={() => setOpen(true)}>Registrar autorización</Button>{channel === 'whatsapp' && <Button variant="outline" disabled={!canExecute} onClick={() => setRenewalOpen(true)}>Renovar después de una baja</Button>}{!permissionsOnly && <Button onClick={check} disabled={loading}>{loading ? 'Revisando…' : 'Revisar campaña'}</Button>}</div>
        </div>
        {renewalOpen && <MarketingRenewal onClose={() => setRenewalOpen(false)} onSaved={() => { setRenewalOpen(false); toast.success('Nueva autorización registrada.'); onChanged?.(); if (!permissionsOnly) void check() }} />}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {review?.audience && <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {Object.entries({ 'Contactos del filtro': review.audience.matched, 'Destinatarios con autorización': review.audience.eligible,
                'Duplicados excluidos': review.audience.duplicates, 'Bajas excluidas': review.audience.optedOut,
                'Sin autorización vigente': review.audience.missingConsent, [channel === 'email' ? 'Email sin formato utilizable' : 'Teléfono sin formato utilizable']: review.audience.invalidFormat }).map(([label, count]) =>
                <div key={label} className="rounded-lg bg-slate-50 dark:bg-zinc-800 p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-lg font-semibold">{count}</dd></div>)}
        </dl>}
        {review && <div className="text-sm space-y-2" role="status">
            {review.issues.length ? <ul className="list-disc pl-5 space-y-1">{review.issues.map(issue => <li key={issue}>{issue}</li>)}</ul> : <p>El diseño guardado pasó esta revisión. Falta validar el motor de ejecución antes de habilitar envíos.</p>}
            <p className="text-xs text-muted-foreground">Revisado: {new Date(review.checkedAt).toLocaleString()}. El estado y la autorización deben comprobarse nuevamente al activar y enviar.</p>
        </div>}
        <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value) }}><DialogContent><DialogHeader>
            <DialogTitle>Registrar autorización de marketing</DialogTitle><DialogDescription>Para un contacto existente. Tener sus datos no equivale a permiso para promociones. No se sobrescriben bajas.</DialogDescription>
        </DialogHeader><div className="space-y-3">
            <Label htmlFor="consent-phone">{channel === 'email' ? 'Email del contacto' : 'Teléfono con código de país'}</Label><Input id="consent-phone" type={channel === 'email' ? 'email' : 'tel'} value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder={channel === 'email' ? 'contacto@empresa.com' : '+57…'} />
            <Label htmlFor="consent-source">Origen de la autorización</Label><Input id="consent-source" value={form.source} onChange={event => setForm({ ...form, source: event.target.value })} maxLength={120} placeholder="Formulario, contrato, solicitud del contacto…" />
            <Label htmlFor="consent-date">Fecha de obtención · hora local</Label><Input id="consent-date" type="datetime-local" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} />
            <Label htmlFor="consent-evidence">Evidencia o referencia verificable</Label><Textarea id="consent-evidence" value={form.evidence} onChange={event => setForm({ ...form, evidence: event.target.value })} maxLength={2000} placeholder="Referencia del registro y texto de autorización aceptado por el contacto" />
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={form.confirmed} onChange={event => setForm({ ...form, confirmed: event.target.checked })} />Confirmo que esta evidencia acredita permiso para recibir marketing de nuestra empresa.</label>
            <Button onClick={savePermission} disabled={saving || !form.confirmed || !form.phone.trim() || !form.source.trim() || !form.evidence.trim() || !form.date}>{saving ? 'Registrando…' : 'Guardar autorización'}</Button>
        </div></DialogContent></Dialog>
    </section>
}
