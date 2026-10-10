'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CampaignHistory } from './campaign-history'
import type { CampaignMetrics } from '../marketing-metrics'
import { refreshMarketingChannelHealth, acknowledgeMarketingHold } from '../marketing-health-actions'

export function CampaignResults({ campaignId, connectionId, metrics, canExecute, onRefresh }: {
    campaignId: string; connectionId: string; metrics: CampaignMetrics | null; canExecute: boolean; onRefresh: () => Promise<void>;
}) {
    const [busy, setBusy] = useState(false), [reviewed, setReviewed] = useState(false), [error, setError] = useState('')
    const health = metrics?.channelHealth
    async function healthAction(acknowledge: boolean) {
        setBusy(true); setError('')
        try {
            const result = acknowledge && health?.holdAt
                ? await acknowledgeMarketingHold({ connectionId, holdAt: health.holdAt, reviewed })
                : await refreshMarketingChannelHealth(connectionId)
            if (!result.success) setError(result.error)
            else setReviewed(false)
            await onRefresh()
        } catch { setError('No se confirmó la revisión del canal. Actualiza antes de reintentar.') }
        finally { setBusy(false) }
    }
    return <div className="space-y-5">
        <div className="flex justify-between items-center"><h3 className="font-semibold">Resultados de la campaña</h3><Button variant="outline" disabled={busy} onClick={() => void onRefresh()}>Actualizar resultados</Button></div>
        {metrics ? <>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {Object.entries({
                    'Destinatarios inscritos': metrics.stats.total, 'Pendientes de procesar': metrics.stats.active,
                    'Procesados sin error': metrics.stats.completed, 'Destinatarios fallidos': metrics.stats.failed,
                    'Destinatarios cancelados': metrics.stats.cancelled, 'Mensajes aceptados': metrics.delivery.accepted,
                    'Mensajes entregados · incluye leídos': metrics.delivery.delivered, 'Mensajes leídos': metrics.delivery.read,
                    'Mensajes en cola': metrics.delivery.queued, 'Mensajes en envío': metrics.delivery.sending,
                    'Mensajes fallidos': metrics.delivery.failed, 'Resultado sin confirmar': metrics.delivery.unknown
                }).map(([label, count]) =>
                    <div key={label} className="rounded-lg border p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-xl font-semibold mt-1">{count}</dd></div>)}
            </dl>
            <p className="text-xs text-muted-foreground">Procesado significa que el destinatario terminó su secuencia. Aceptado por Meta no garantiza entrega. No se reenvían automáticamente resultados ambiguos.</p>
            {!!metrics.delivery.unknown && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Hay envíos sin resultado confirmado. Requieren revisión y mantienen la campaña abierta.</p>}
            <details className="rounded-lg border p-4"><summary className="cursor-pointer font-medium">Estado del canal y del motor</summary><div className="space-y-3 pt-3 text-sm">
                <p>{health?.ready ? 'El canal pasó la última revisión de salud.' : 'El canal no tiene una revisión vigente que permita enviar.'} Calidad: {health?.quality || 'Sin verificar'}.</p>
                <p className="text-xs text-muted-foreground">Revisado: {health?.checkedAt ? new Date(health.checkedAt).toLocaleString() : 'Sin revisión'}. La salud y las restricciones se comprueban antes de enviar.</p>
                {health?.holdCode != null && <p role="alert">Restricción Meta: {health.holdCode}. {health.holdUntil ? `Vigente hasta ${new Date(health.holdUntil).toLocaleString()}.` : 'Requiere revisión antes de continuar.'}</p>}
                {canExecute && connectionId && <Button variant="outline" disabled={busy} onClick={() => void healthAction(false)}>Actualizar salud del canal</Button>}
                {canExecute && health?.holdAt && !health.holdUntil && <div className="space-y-2"><label className="flex gap-2"><input type="checkbox" checked={reviewed} disabled={busy} onChange={event => setReviewed(event.target.checked)} />Revisé y resolví la causa de la restricción en Meta.</label><Button variant="outline" disabled={busy || !reviewed} onClick={() => void healthAction(true)}>Registrar revisión de la restricción</Button><p className="text-xs text-muted-foreground">No reenvía mensajes fallidos ni garantiza que Meta permita nuevos envíos.</p></div>}
                <p>{!metrics.runtime ? 'Sin ejecuciones registradas del motor. Comprueba el programador antes de habilitar campañas.'
                    : `Última ejecución: ${new Date(metrics.runtime.finishedAt || metrics.runtime.startedAt).toLocaleString()} · ${metrics.runtime.status}.`}</p>
                {metrics.runtime && Date.now() - Date.parse(metrics.runtime.finishedAt || metrics.runtime.startedAt) > 180000 && <p className="text-amber-700">Sin actividad reciente del motor. Revisa el programador.</p>}
                {error && <p role="alert" className="text-red-600">{error}</p>}
            </div></details>
        </> : <p role="alert">No se pudieron consultar los resultados. Actualiza para reintentar.</p>}
        <CampaignHistory campaignId={campaignId} />
    </div>
}
