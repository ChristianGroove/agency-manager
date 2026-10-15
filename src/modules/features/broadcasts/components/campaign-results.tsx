'use client'

import { useMarketingApi } from '../marketing-client-api'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Users, CheckCheck, Eye, AlertCircle, RefreshCw, ShieldCheck, Activity } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
const CampaignHistory = dynamic(() => import('./campaign-history').then(module => module.CampaignHistory))
import type { CampaignMetrics } from '../marketing-metrics'


export function CampaignResults({ campaignId, connectionId, metrics, canExecute, onRefresh }: {
    campaignId: string; connectionId: string; metrics: CampaignMetrics | null; canExecute: boolean; onRefresh: () => Promise<unknown>;
}) {
    const { refreshMarketingChannelHealth, acknowledgeMarketingHold } = useMarketingApi()
    const [busy, setBusy] = useState(false), [reviewed, setReviewed] = useState(false), [error, setError] = useState('')
    const [historyDelivery, setHistoryDelivery] = useState<'all' | 'unknown'>('all')
    const mutation = useRef(false)
    const email = metrics?.channel === 'email' || connectionId.startsWith('smtp:')
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
    const runtimeStale = !!metrics?.runtime && Date.now() - Date.parse(metrics.runtime.finishedAt || metrics.runtime.startedAt) > 180000
    const runtimeIssue = metrics?.runtimeUnavailable ? 'No se pudo consultar el motor.' : !metrics?.runtime ? 'No hay ejecuciones del motor registradas.' : metrics.runtime.status === 'failed' ? 'El último ciclo del motor requiere revisión.' : runtimeStale ? 'El motor no registra actividad reciente.' : ''
    return <div className="space-y-4">
        <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Actividad de la campaña</h3><Button size="sm" className="h-8 rounded-xl text-xs" variant="ghost" disabled={busy} onClick={() => void onRefresh()}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Actualizar resultados</Button></div>
        {metrics ? <>
            <section className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                <dl className="grid grid-cols-2 divide-x divide-border/40 sm:grid-cols-4">
                    {[
                        { label: 'Destinatarios', count: metrics.stats.total, icon: Users, color: 'text-primary' },
                        { label: email ? 'Correos aceptados' : 'Mensajes entregados', count: email ? metrics.delivery.accepted : metrics.delivery.delivered, icon: CheckCheck, color: 'text-emerald-600' },
                        { label: email ? 'Destinatarios pendientes' : 'Mensajes leídos', count: email ? metrics.stats.active : metrics.delivery.read, icon: Eye, color: 'text-blue-600' },
                        { label: 'Mensajes fallidos', count: metrics.delivery.failed, icon: AlertCircle, color: metrics.delivery.failed ? 'text-destructive' : 'text-muted-foreground' },
                    ].map(item => <div key={item.label} className="px-4 py-4 sm:px-5"><div className="flex items-center justify-between gap-2"><dd className="text-2xl font-semibold tracking-tight tabular-nums">{item.count}</dd><item.icon className={`h-4 w-4 shrink-0 ${item.color}`} /></div><dt className="mt-1 text-[11px] text-muted-foreground">{item.label}</dt></div>)}
                </dl>
                <div className="space-y-2 border-t bg-muted/15 px-4 py-4 sm:px-5"><div className="flex flex-wrap justify-between gap-2 text-xs"><span className="font-medium">Destinatarios procesados</span><span className="tabular-nums text-muted-foreground">{processed} de {metrics.stats.total} · {progress}%</span></div><Progress value={progress} className="h-1.5" /><p className="text-[11px] text-muted-foreground">{metrics.stats.active} pendientes · {metrics.stats.completed} completados · {metrics.stats.failed} fallidos · {metrics.stats.cancelled} cancelados</p></div>
            </section>
            <p className="px-1 text-[11px] text-muted-foreground">{email ? 'SMTP confirma aceptación, no entrega ni lectura.' : `${metrics.delivery.accepted} aceptados por Meta. Entregados incluye leídos; procesado no equivale a entregado.`}{metrics.delivery.queued + metrics.delivery.sending > 0 ? ` ${metrics.delivery.queued + metrics.delivery.sending} en cola o envío.` : ''}</p>
            {!!metrics.delivery.unknown && <div role="alert" className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"><div className="min-w-0 flex-1"><p className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-200"><AlertCircle className="h-4 w-4 shrink-0" />{metrics.delivery.unknown} envíos sin resultado confirmado</p><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">Pueden haberse enviado; no se reenvían automáticamente. Contrasta el historial con el registro del proveedor.</p></div><Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => { setHistoryDelivery('unknown'); document.getElementById('campaign-recipient-history')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }) }}>Revisar envíos sin confirmar</Button></div>}
            {health?.holdCode != null && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">Canal restringido por Meta: {health.holdCode}. {health.holdUntil ? `Hasta ${new Date(health.holdUntil).toLocaleString()}.` : 'Revisa la causa antes de continuar.'}</p>}
            {runtimeIssue && metrics.stats.active > 0 && <p role="status" className="rounded-xl bg-amber-500/5 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">{runtimeIssue} Consulta el diagnóstico de envío.</p>}
            {metrics.stats.total > 0 ? <div id="campaign-recipient-history" className="scroll-mt-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-5"><CampaignHistory key={historyDelivery} initialDelivery={historyDelivery} refresh={metrics} email={email} campaignId={campaignId} /></div> : <div className="rounded-2xl border border-dashed px-5 py-8 text-center"><Users className="mx-auto mb-3 h-6 w-6 text-muted-foreground/50" /><p className="text-sm font-medium">Todavía no hay actividad</p><p className="mt-1 text-xs text-muted-foreground">Los destinatarios y sus resultados aparecerán al iniciar la campaña.</p></div>}
            <details className="rounded-xl border border-border/60 bg-card">
                <summary className="cursor-pointer px-4 py-3 text-xs font-medium">Diagnóstico de envío</summary>
                <div className="space-y-4 border-t p-4 text-xs">
                    <div><p className="flex items-center gap-2 font-medium"><Activity className="h-4 w-4 text-primary" />Estado del motor de campañas</p><p className="mt-2 leading-relaxed text-muted-foreground">{runtimeIssue || 'El motor registra actividad reciente.'}{metrics.runtime ? ` Último ciclo: ${new Date(metrics.runtime.finishedAt || metrics.runtime.startedAt).toLocaleString()} · ${{ running: 'En proceso', success: 'Correcto', failed: 'Requiere revisión' }[metrics.runtime.status]}.` : ' Actualiza para volver a consultar.'}</p>{metrics.stats.active > 0 && <p className="mt-2 text-muted-foreground">Los pendientes respetan el inicio, horario, ritmo y espera entre campañas. Consulta su próxima ejecución en el historial.</p>}</div>
                    {!email && <div className="space-y-3 border-t pt-4"><p className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-primary" />Salud del canal</p><p className="text-muted-foreground">{health?.ready ? 'Última revisión correcta.' : 'Sin revisión vigente que permita enviar.'} Calidad: {health?.quality || 'Sin verificar'} · {health?.checkedAt ? new Date(health.checkedAt).toLocaleString() : 'Sin revisión'}.</p>{canExecute && connectionId && <Button size="sm" variant="outline" disabled={busy} onClick={() => void healthAction(false)}>Actualizar salud del canal</Button>}{canExecute && health?.holdAt && !health.holdUntil && <div className="space-y-2"><label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-primary" checked={reviewed} disabled={busy} onChange={event => setReviewed(event.target.checked)} />Revisé y resolví la causa de la restricción en Meta.</label><Button size="sm" variant="outline" disabled={busy || !reviewed} onClick={() => void healthAction(true)}>Registrar revisión de la restricción</Button><p className="text-[11px] text-muted-foreground">No reenvía fallos ni garantiza nuevos envíos.</p></div>}</div>}
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-t pt-4 text-muted-foreground">{Object.entries({ 'En cola': metrics.delivery.queued, 'En envío': metrics.delivery.sending, [email ? 'Aceptados por SMTP' : 'Aceptados por Meta']: metrics.delivery.accepted, 'Sin confirmar': metrics.delivery.unknown }).map(([label, count]) => <div key={label} className="flex justify-between gap-2"><dt>{label}</dt><dd className="tabular-nums">{count}</dd></div>)}</dl>
                    {error && <p role="alert" className="text-destructive">{error}</p>}
                </div>
            </details>
        </> : <p role="alert" className="rounded-xl bg-destructive/5 p-3 text-xs text-destructive">No se pudieron consultar los resultados. Actualiza para reintentar.</p>}
    </div>
}
