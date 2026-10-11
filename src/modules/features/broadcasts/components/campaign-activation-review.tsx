'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ActivationReview, prepareCampaignActivation } from '../marketing-review-actions'
import { enrollAudienceInCampaign } from '../marketing-actions'

export function CampaignActivationReview({ campaignId, onClose, onActivated }: {
    campaignId: string; onClose: () => void; onActivated: () => void;
}) {
    const [review, setReview] = useState<ActivationReview | null>(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [confirmed, setConfirmed] = useState(false)
    const epoch = useRef(0)
    useEffect(() => { void check(); return () => { epoch.current++ } }, [campaignId])
    async function check() {
        const request = ++epoch.current
        setBusy(true); setError(''); setReview(null); setConfirmed(false)
        try {
            const response = await prepareCampaignActivation(campaignId)
            if (request !== epoch.current) return
            if (response.success) setReview(response.review); else setError(response.error)
        } catch { if (request === epoch.current) setError('No se pudo preparar la revisión final.') }
        finally { if (request === epoch.current) setBusy(false) }
    }
    async function activate() {
        if (!review || !confirmed) return
        setBusy(true); setError('')
        try {
            const response = await enrollAudienceInCampaign(campaignId, { token: review.token, confirmed })
            if (!response.success) { setError(response.error || 'No se pudo activar.'); return }
            onActivated()
        } catch { setError('No se pudo confirmar la activación. Actualiza la campaña antes de reintentar.') }
        finally { setBusy(false) }
    }
    return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}><DialogContent aria-labelledby="activation-review-title" aria-describedby="activation-review-description" className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle id="activation-review-title">Revisión final del diseño guardado</DialogTitle><DialogDescription id="activation-review-description">La confirmación caduca en diez minutos y se invalida si cambia el diseño o los destinatarios de un borrador. Al activar y antes de cada envío se revisan de nuevo las autorizaciones y las restricciones del canal.</DialogDescription></DialogHeader>
        {busy && <p role="status">Revisando…</p>}{error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
        {review && <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-3"><div><dt>Emisor</dt><dd>{review.channelName || review.connectionId || 'Sin canal'}</dd></div>
                <div><dt>Inicio</dt><dd>{review.scheduledFor ? new Date(review.scheduledFor).toLocaleString() : 'Al activar, dentro del horario'}</dd></div>
                <div><dt>Horario</dt><dd>{review.window ? `${review.window.start}:00–${review.window.end}:00` : 'Todo el día'} · {review.timezone}</dd></div>
                <div><dt>Intervalo mínimo</dt><dd>{({ stealth: '180 segundos', growth: '30 segundos', turbo: '5 segundos' } as Record<string, string>)[review.mode] || 'Sin configurar'} entre envíos del mismo emisor; sujeto al motor y al proveedor.</dd></div></dl>
            {review.resume ? <p>Se reanudarán los destinatarios originales. Las bajas y los fallos definitivos permanecen excluidos.</p> : review.audience && <p>{review.audience.eligible} destinatarios únicos autorizados de {review.audience.matched} contactos del filtro. Excluidos: {review.audience.optedOut} bajas, {review.audience.missingConsent} sin permiso, {review.audience.invalidFormat} direcciones inválidas y {review.audience.duplicates} duplicados. Si cambian los destinatarios elegibles, necesitarás otra revisión.</p>}
            <p className="text-xs text-muted-foreground">Espera entre campañas para un mismo contacto: {review.recipientCooldownHours || 0} horas. Se respeta también la espera de la campaña anterior. {review.channel === 'email' ? 'Las bajas detienen los siguientes correos. Las respuestas llegan al buzón del emisor.' : 'Los seguimientos pendientes se detienen si el contacto responde.'}</p>
            <ol className="list-decimal pl-5 space-y-2">{review.steps.map(step => <li key={step.id}><strong>{step.name}</strong> · {step.template ? `${step.template}${step.language ? ` (${step.language})` : ''}` : step.type === 'delay' ? `Espera: ${JSON.stringify(step.delay)}` : step.type}
                {step.text && <p className="whitespace-pre-wrap rounded bg-muted p-2 my-1">{step.text}</p>}
                {Object.keys(step.bindings).length > 0 && <p className="text-xs break-all">Variables: {JSON.stringify(step.bindings)}</p>}</li>)}</ol>
            {review.issues.length > 0 && <ul role="alert" className="list-disc pl-5 text-amber-700">{review.issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
            {!review.enabled && <p>Los envíos masivos están deshabilitados en este entorno. Puedes revisar el diseño; no activarlo.</p>}
            <p className="text-xs text-muted-foreground">Esta revisión no calcula cobros ni garantiza la entrega. El proveedor aplica sus condiciones de uso. Válida hasta {new Date(review.expiresAt).toLocaleTimeString()}.</p>
            <label className="flex gap-2"><input type="checkbox" disabled={busy || !review.enabled || !!review.issues.length} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Confirmo el emisor, los destinatarios, el mensaje y el horario del diseño guardado.</label>
            <Button disabled={busy || !confirmed || !review.enabled || !!review.issues.length} onClick={activate}>{review.resume ? 'Confirmar reanudación' : 'Confirmar activación'}</Button>
        </div>}
        <div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={check}>Revisar de nuevo</Button><Button variant="outline" disabled={busy} onClick={onClose}>Cerrar</Button></div>
    </DialogContent></Dialog>
}
