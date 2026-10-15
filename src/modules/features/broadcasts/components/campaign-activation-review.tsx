'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CalendarClock, Loader2, Mail, RefreshCw, ShieldCheck, Smartphone, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './campaign-dialog'
import { useMarketingApi } from '../marketing-client-api'
import type { ActivationReview } from '../marketing-review-actions'

const sample = (text: string) => text.replace(/\{\{\s*(nombre|empresa|telefono|email)\s*\}\}/g, (_, key: string) => ({ nombre: 'Andrea', empresa: 'Empresa de ejemplo', telefono: '+57 000 000 0000', email: 'andrea@example.com' })[key as 'nombre' | 'empresa' | 'telefono' | 'email'])
function previewStep(step: ActivationReview['steps'][number]) {
    return sample(step.text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (original, key: string) => step.bindings[`body.${key}`] || step.bindings[`header.${key}`] || original))
}
function variableLabel(key: string) {
    const [section, index] = key.split('.')
    return section === 'button' ? `Botón ${Number(index) + 1}` : index === 'media' ? 'Multimedia' : `${section === 'header' ? 'Encabezado' : 'Mensaje'} · variable ${index}`
}
function bindingLabel(value: string) {
    return value.replace(/\{\{\s*(nombre|empresa|telefono|email)\s*\}\}/g, (_, key: string) => ({ nombre: 'Nombre del contacto', empresa: 'Empresa del contacto', telefono: 'Teléfono del contacto', email: 'Email del contacto' })[key as 'nombre' | 'empresa' | 'telefono' | 'email'])
}

export function CampaignActivationReview({ campaignId, onClose, onActivated, onBusyChange }: {
    campaignId: string; onClose: () => void; onActivated: () => void; onBusyChange?: (busy: boolean) => void;
}) {
    const { prepareCampaignActivation, enrollAudienceInCampaign } = useMarketingApi()
    const [review, setReview] = useState<ActivationReview | null>(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [confirmed, setConfirmed] = useState(false)
    const [expired, setExpired] = useState(false)
    const epoch = useRef(0), activating = useRef(false)
    const invalidateReview = useCallback(() => { epoch.current++ }, [])
    const check = useCallback(async () => {
        const request = ++epoch.current
        setBusy(true); setError(''); setReview(null); setConfirmed(false)
        try {
            const response = await prepareCampaignActivation(campaignId)
            if (request !== epoch.current) return
            if (response.success) setReview(response.review); else setError(response.error)
        } catch { if (request === epoch.current) setError('No se pudo preparar la revisión final.') }
        finally { if (request === epoch.current) setBusy(false) }
    }, [campaignId, prepareCampaignActivation])
    useEffect(() => { void check(); return invalidateReview }, [check, invalidateReview])
    useEffect(() => {
        if (!review) return
        const expires = Date.parse(review.expiresAt)
        const update = () => setExpired(!Number.isFinite(expires) || Date.now() >= expires)
        update()
        const timer = setInterval(update, 1000)
        return () => clearInterval(timer)
    }, [review])
    async function activate() {
        if (!review || !confirmed || expired || activating.current) return
        activating.current = true; onBusyChange?.(true); setBusy(true); setError('')
        try {
            const response = await enrollAudienceInCampaign(campaignId, { token: review.token, confirmed })
            if (!response.success) { setError(response.error || 'No se pudo activar.'); return }
            onActivated()
        } catch { setError('No se pudo confirmar la activación. Actualiza la campaña antes de reintentar.') }
        finally { activating.current = false; onBusyChange?.(false); setBusy(false) }
    }
    const blocked = busy || expired || !review?.enabled || !!review?.issues.length
    const email = review?.channel === 'email'
    return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}><DialogContent onInteractOutside={event => event.preventDefault()} className="flex max-h-[92dvh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:p-0">
        <DialogHeader className="shrink-0 px-6 pb-5 pt-6 text-left"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></span><div><DialogTitle>Revisión final de la campaña</DialogTitle><DialogDescription className="mt-1 text-xs">{review?.resume ? 'Revisa los detalles para retomar el envío.' : 'Comprueba los detalles antes de activar.'}</DialogDescription></div></div><Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 rounded-full" aria-label="Cerrar revisión" disabled={busy} onClick={onClose}><X className="h-4 w-4" /></Button></div></DialogHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-6">
            {busy && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />{activating.current ? 'Confirmando la operación…' : 'Revisando…'}</p>}
            {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
            {review && <>
                {review.audience && !review.resume && <section className="rounded-2xl bg-primary/[0.04] p-4"><div className="flex items-center gap-3"><Users className="h-5 w-5 shrink-0 text-primary" /><div className="flex-1"><p className="text-2xl font-semibold tracking-tight tabular-nums">{review.audience.eligible}<span className="ml-2 text-sm font-normal tracking-normal text-muted-foreground">destinatarios</span></p><p className="mt-0.5 text-xs text-muted-foreground">Con autorización vigente · {review.audience.matched} contactos revisados</p></div></div>{(review.audience.optedOut + review.audience.missingConsent + review.audience.invalidFormat + review.audience.duplicates) > 0 && <details className="mt-3 border-t border-primary/10 pt-3 text-xs text-muted-foreground"><summary className="cursor-pointer">Ver contactos excluidos</summary><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1"><span>{review.audience.optedOut} bajas</span><span>{review.audience.missingConsent} sin permiso</span><span>{review.audience.invalidFormat} datos inválidos</span><span>{review.audience.duplicates} duplicados</span></div></details>}</section>}
                <dl className="grid gap-4 sm:grid-cols-2"><div className="flex items-start gap-2.5">{email ? <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> : <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}<div className="min-w-0"><dt className="text-xs text-muted-foreground">Emisor · {email ? 'Email' : 'WhatsApp'}</dt><dd className="mt-1 break-words text-sm font-medium">{review.channelName || 'Sin emisor disponible'}</dd></div></div><div className="flex items-start gap-2.5"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div><dt className="text-xs text-muted-foreground">Inicio</dt><dd className="mt-1 text-sm font-medium">{review.scheduledFor ? new Date(review.scheduledFor).toLocaleString() : 'Al confirmar'}</dd><p className="mt-1 text-xs text-muted-foreground">{review.window ? `${review.window.start}:00–${review.window.end}:00` : 'Todo el día'} · {review.timezone}</p></div></div></dl>
                <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{review.steps.length > 1 ? 'Secuencia de mensajes' : 'Mensaje que recibirán'}</h3><span className="text-[11px] text-muted-foreground">Contacto de ejemplo</span></div><ol className="space-y-3">{review.steps.map((step, index) => <li key={step.id} className={`overflow-hidden rounded-2xl ${step.type === 'delay' ? 'border border-dashed px-4 py-3' : 'border bg-muted/20'}`}>
                    {step.type === 'delay' ? <p className="text-xs text-muted-foreground">Espera: {String((step.delay as { value?: number; duration?: number })?.value ?? (step.delay as { duration?: number })?.duration ?? '')} {({ minutes: 'minutos', hours: 'horas', days: 'días' } as Record<string, string>)[(step.delay as { unit?: string })?.unit || ''] || ''}</p> : <><div className="flex items-center justify-between gap-2 border-b px-4 py-2.5 text-[11px] text-muted-foreground"><span>{review.steps.length > 1 ? `${index + 1}. ` : ''}{step.name}</span>{step.language && <span className="shrink-0 uppercase">{step.language}</span>}</div><div className="space-y-2 bg-background px-4 py-4">{step.template && <p className="break-words text-sm font-semibold">{sample(step.template)}</p>}<p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{previewStep(step)}</p></div>{Object.keys(step.bindings).length > 0 && <details className="border-t px-4 py-2.5 text-xs text-muted-foreground"><summary className="cursor-pointer">Personalización del mensaje</summary><dl className="mt-3 space-y-2">{Object.entries(step.bindings).map(([key, value]) => <div key={key} className="flex flex-wrap justify-between gap-2"><dt>{variableLabel(key)}</dt><dd className="break-all font-medium">{bindingLabel(value)}</dd></div>)}</dl></details>}</>}
                </li>)}</ol></section>
                <details className="rounded-xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground"><summary className="cursor-pointer font-medium">Ritmo de envío y seguimiento</summary><div className="mt-3 space-y-2 leading-relaxed"><p>Separación mínima: {({ stealth: '180 segundos', growth: '30 segundos', turbo: '5 segundos' } as Record<string, string>)[review.mode] || 'Sin configurar'}, compartida por emisor. Espera entre campañas: {review.recipientCooldownHours || 0} horas por contacto.</p><p>{email ? 'Las bajas detienen los siguientes correos. Las respuestas llegan al buzón del emisor. SMTP confirma aceptación, no entrega ni lectura.' : 'Los seguimientos se detienen si el contacto responde o solicita la baja.'}</p>{review.resume && <p>Se conservan los destinatarios originales y su avance.</p>}</div></details>
                {review.issues.length > 0 && <div role="alert" className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"><p className="mb-2 text-xs font-semibold">Antes de continuar</p><ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed">{review.issues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}
                {!review.enabled && <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs">Los envíos masivos están deshabilitados en este entorno.</p>}
                {expired && <p role="alert" className="text-xs text-amber-700">Esta revisión caducó. Pulsa «Revisar de nuevo» para confirmar con datos actuales.</p>}
            </>}
        </div>
        <footer className="shrink-0 space-y-4 border-t bg-muted/20 px-6 py-4">
            {review && <label className="flex items-start gap-3 text-xs leading-relaxed"><input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-primary" disabled={blocked} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Confirmo el emisor, los destinatarios, el mensaje y el horario.</label>}
            <div className="flex flex-wrap items-center justify-between gap-3"><Button size="sm" variant="ghost" className="text-xs text-muted-foreground" disabled={busy} onClick={check}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Revisar de nuevo</Button><div className="ml-auto flex gap-2"><Button size="sm" variant="ghost" disabled={busy} onClick={onClose}>Cerrar</Button>{review && <Button size="sm" className="rounded-xl" disabled={blocked || !confirmed} onClick={activate}>{busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-2 h-3.5 w-3.5" />}{review.resume ? 'Confirmar reanudación' : 'Confirmar activación'}</Button>}</div></div>
            {review && <p className="text-[10px] text-muted-foreground">{expired ? 'Revisión caducada' : `Revisión válida hasta ${new Date(review.expiresAt).toLocaleTimeString()}`}</p>}
        </footer>
    </DialogContent></Dialog>
}
