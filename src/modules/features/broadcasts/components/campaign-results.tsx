'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Users, CheckCheck, Eye, AlertCircle, RefreshCw, ShieldCheck, Activity } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
const CampaignHistory = dynamic(() => import('./campaign-history').then(module => module.CampaignHistory))
import type { CampaignMetrics } from '../marketing-metrics'
import { refreshMarketingChannelHealth, acknowledgeMarketingHold } from '../marketing-health-actions'

export function CampaignResults({ campaignId, connectionId, metrics, canExecute, onRefresh }: {
    campaignId: string; connectionId: string; metrics: CampaignMetrics | null; canExecute: boolean; onRefresh: () => Promise<void>;
}) {
    const [busy, setBusy] = useState(false), [reviewed, setReviewed] = useState(false), [error, setError] = useState('')
    const [historyOpen, setHistoryOpen] = useState(false)
    const mutation = useRef(false)
    const health = metrics?.channelHealth
    const processed = metrics ? metrics.stats.completed + metrics.stats.failed + metrics.stats.cancelled : 0
    const progress = metrics?.stats.total ? Math.min(100, Math.round(processed / metrics.stats.total * 100)) : 0
    async function healthAction(acknowledge: boolean) {
        if (mutation.current) return
        mutation.current = true; setBusy(true); setError('')
        try {
            const result = acknowledge && health?.holdAt
                ? await acknowledgeMarketingHold({ connectionId, holdAt: health.holdAt, reviewed })
                : await refreshMarketingChannelHealth(connectionId)
            if (!result.success) setError(result.error)
            else setReviewed(false)
            await onRefresh()
        } catch { setError('No se confirmó la revisión del canal. Actualiza antes de reintentar.') }
        finally { mutation.current = false; setBusy(false) }
    }
    return <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
            <div><h3 className="text-sm font-semibold">Actividad de la campaña</h3><p className="mt-1 text-xs text-muted-foreground">Entrega real y avance de los destinatarios.</p></div>
            <Button size="icon" aria-label="Actualizar resultados" title="Actualizar resultados" className="h-8 w-8 rounded-lg" variant="outline" disabled={busy} onClick={() => void onRefresh()}><RefreshCw className="h-3.5 w-3.5" /></Button>
        </div>
        {metrics ? <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { label: 'Destinatarios', count: metrics.stats.total, icon: Users, color: 'text-primary bg-primary/5' },
                    { label: 'Mensajes entregados', count: metrics.delivery.delivered, icon: CheckCheck, color: 'text-emerald-600 bg-emerald-500/10' },
                    { label: 'Mensajes leídos', count: metrics.delivery.read, icon: Eye, color: 'text-blue-600 bg-blue-500/10' },
                    { label: 'Mensajes fallidos', count: metrics.delivery.failed, icon: AlertCircle, color: 'text-rose-600 bg-rose-500/10' },
                ].map(item => <div key={item.label} className="rounded-xl border border-border/60 bg-background p-4 shadow-xs">
                    <span className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${item.color}`}><item.icon className="h-4 w-4" /></span>
                    <dd className="text-2xl font-semibold tracking-tight">{item.count}</dd><dt className="mt-1 text-[11px] text-muted-foreground">{item.label}</dt>
                </div>)}
            </dl>
            <div className="space-y-3 rounded-xl border border-border/60 bg-background p-4">
                <div className="flex justify-between gap-2 text-xs"><span className="font-medium">Procesamiento de destinatarios</span><span className="text-muted-foreground">{processed} de {metrics.stats.total} · {progress}%</span></div>
                <Progress value={progress} className="h-1.5" />
                <p className="text-[11px] text-muted-foreground">{metrics.stats.active} pendientes · {metrics.stats.completed} completados · {metrics.stats.failed} fallidos · {metrics.stats.cancelled} cancelados</p>
                <p className="border-t border-border/50 pt-3 text-[11px] leading-relaxed text-muted-foreground">{metrics.delivery.accepted} mensajes aceptados por Meta · {metrics.delivery.queued + metrics.delivery.sending} en cola o envío. Procesado no significa entregado; entregados incluye leídos.</p>
            </div>
            {!!metrics.delivery.unknown && <p role="alert" className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200"><AlertCircle className="h-4 w-4 shrink-0" />{metrics.delivery.unknown} envíos sin resultado confirmado. Requieren revisión; no se reenvían automáticamente y mantienen la campaña abierta.</p>}
            {health?.holdCode != null && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">Canal restringido por Meta: {health.holdCode}. {health.holdUntil ? `Vigente hasta ${new Date(health.holdUntil).toLocaleString()}.` : 'Requiere revisión antes de continuar.'}</p>}
            <details className="rounded-xl border border-border/60 bg-background">
                <summary className="cursor-pointer px-4 py-3 text-xs font-medium">Salud del canal y diagnóstico</summary>
                <div className="space-y-3 border-t border-border/50 p-4 text-xs">
                    <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />{health?.ready ? 'El canal pasó la última revisión de salud.' : 'No hay una revisión vigente que permita enviar.'} Calidad: {health?.quality || 'Sin verificar'}.</p>
                    <p className="text-[11px] text-muted-foreground">Revisado: {health?.checkedAt ? new Date(health.checkedAt).toLocaleString() : 'Sin revisión'}. La salud y las restricciones se comprueban antes de enviar.</p>
                    {canExecute && connectionId && <Button size="sm" variant="outline" disabled={busy} onClick={() => void healthAction(false)}>Actualizar salud del canal</Button>}
                    {canExecute && health?.holdAt && !health.holdUntil && <div className="space-y-2">
                        <label className="flex gap-2"><input type="checkbox" checked={reviewed} disabled={busy} onChange={event => setReviewed(event.target.checked)} />Revisé y resolví la causa de la restricción en Meta.</label>
                        <Button size="sm" variant="outline" disabled={busy || !reviewed} onClick={() => void healthAction(true)}>Registrar revisión de la restricción</Button>
                        <p className="text-[11px] text-muted-foreground">No reenvía mensajes fallidos ni garantiza que Meta permita nuevos envíos.</p>
                    </div>}
                    <p className="flex items-start gap-2"><Activity className="h-4 w-4 shrink-0 text-muted-foreground" />{!metrics.runtime ? 'Sin ejecuciones registradas del motor. Comprueba el programador antes de habilitar campañas.' : `Última ejecución: ${new Date(metrics.runtime.finishedAt || metrics.runtime.startedAt).toLocaleString()} · ${metrics.runtime.status}.`}</p>
                    {metrics.runtime && Date.now() - Date.parse(metrics.runtime.finishedAt || metrics.runtime.startedAt) > 180000 && <p className="text-amber-700 dark:text-amber-300">Sin actividad reciente del motor. Revisa el programador.</p>}
                    <dl className="grid grid-cols-2 gap-2 border-t border-border/50 pt-3 text-muted-foreground">{Object.entries({ 'En cola': metrics.delivery.queued, 'En envío': metrics.delivery.sending, 'Aceptados por Meta': metrics.delivery.accepted, 'Sin confirmar': metrics.delivery.unknown }).map(([label, count]) => <div key={label} className="flex justify-between gap-2"><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
                    {error && <p role="alert" className="text-destructive">{error}</p>}
                </div>
            </details>
        </> : <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">No se pudieron consultar los resultados. Actualiza para reintentar.</p>}
        <details open={historyOpen} onToggle={event => setHistoryOpen(event.currentTarget.open)} className="rounded-xl border border-border/60 bg-background">
            <summary className="cursor-pointer px-4 py-3 text-xs font-medium">Historial de destinatarios y exportación</summary>
            {historyOpen && <div className="border-t border-border/50 p-4"><CampaignHistory campaignId={campaignId} /></div>}
        </details>
    </div>
}
