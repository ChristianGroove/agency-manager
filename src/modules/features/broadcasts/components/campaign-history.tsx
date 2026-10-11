'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { getMarketingHistory, getMarketingStepHistory } from '../marketing-history-actions'
import { deliveryLabels, executionLabels, type HistoryFilters, type HistoryPage, type HistoryRecipient, type HistoryStep, type StepCursor } from '../marketing-history'

const defaults: HistoryFilters = { status: 'all', delivery: 'all', search: '' }
const formatDate = (date: string | null) => date ? new Date(date).toLocaleString() : '—'

export function CampaignHistory({ campaignId, email = false }: { campaignId: string; email?: boolean }) {
    const [draft, setDraft] = useState(defaults), [filters, setFilters] = useState(defaults)
    const [cursor, setCursor] = useState<string | null>(null), [previous, setPrevious] = useState<Array<string | null>>([])
    const [page, setPage] = useState<HistoryPage<HistoryRecipient, string> | null>(null)
    const [total, setTotal] = useState<number | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true)
    const [canExport, setCanExport] = useState(false), [exporting, setExporting] = useState(false), [revision, setRevision] = useState(0)
    const [selected, setSelected] = useState<HistoryRecipient | null>(null)
    useEffect(() => {
        let active = true
        setLoading(true); setError(''); setPage(null); setCanExport(false)
        if (!cursor) setTotal(null)
        getMarketingHistory({ campaignId, filters, cursor }).then(result => {
            if (!active) return
            if (!result.success) { setError(result.error); return }
            setPage(result.page); setCanExport(result.canExport)
            if (result.page.total != null) setTotal(result.page.total)
        }).catch(() => { if (active) setError('No se pudo consultar el historial. Reintenta.') })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [campaignId, filters, cursor, revision])

    async function download(kind: 'recipients' | 'steps') {
        setExporting(true)
        try {
            const query = new URLSearchParams({ ...filters, kind })
            const response = await fetch(`/api/marketing/campaigns/${campaignId}/export?${query}`, { cache: 'no-store', signal: AbortSignal.timeout(60000) })
            if (!response.ok || !response.headers.get('content-type')?.startsWith('text/csv')) throw new Error('Export unavailable')
            const blob = await response.blob() // Save only a fully received response, never a partial CSV.
            const url = URL.createObjectURL(blob), link = document.createElement('a')
            try { link.href = url; link.download = `campaña-${kind === 'steps' ? 'pasos' : 'destinatarios'}.csv`; link.click() }
            finally { setTimeout(() => URL.revokeObjectURL(url), 1000) }
            toast.success('Reporte descargado con los filtros aplicados.')
        } catch { toast.error('No se completó la exportación. Revisa permisos y filtra a menos de 50.000 filas; si persiste, reduce más el reporte.') }
        finally { setExporting(false) }
    }
    return <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h4 className="font-semibold">Historial de destinatarios y pasos</h4>
                <p className="text-sm text-muted-foreground">Consulta toda la audiencia inscrita. Procesamiento terminado no significa mensaje entregado. Cada operación aparece en su último estado confirmado.</p></div>
            <Button variant="outline" disabled={loading} onClick={() => setRevision(value => value + 1)}>Actualizar historial</Button>
        </div>
        <form className="flex flex-wrap items-end gap-3" onSubmit={event => {
            event.preventDefault(); setPrevious([]); setCursor(null); setSelected(null)
            setFilters({ ...draft, search: draft.search.trim() }); setRevision(value => value + 1)
        }}>
            <label className="space-y-1 text-sm flex-1 min-w-48">Nombre o teléfono
                <Input value={draft.search} maxLength={80} onChange={event => setDraft(value => ({ ...value, search: event.target.value }))} placeholder="Buscar destinatario" /></label>
            <label className="space-y-1 text-sm">Procesamiento
                <select className="block h-10 rounded-md border bg-background px-3" value={draft.status}
                    onChange={event => setDraft(value => ({ ...value, status: event.target.value as HistoryFilters['status'] }))}>
                    <option value="all">Todos</option>{Object.entries(executionLabels).map(([value, label]) => <option key={value} value={value}>{email && value === 'accepted' ? 'Aceptado por SMTP' : label}</option>)}
                </select></label>
            <label className="space-y-1 text-sm">Con mensajes en estado
                <select className="block h-10 rounded-md border bg-background px-3" value={draft.delivery}
                    onChange={event => setDraft(value => ({ ...value, delivery: event.target.value as HistoryFilters['delivery'] }))}>
                    <option value="all">Todos</option>{Object.entries(deliveryLabels).filter(([value]) => value !== 'not_started' && (!email || !['queued', 'delivered', 'read'].includes(value))).map(([value, label]) => <option key={value} value={value}>{email && value === 'accepted' ? 'Aceptado por SMTP' : label}</option>)}
                </select></label>
            <Button type="submit" disabled={loading}>Aplicar filtros</Button>
        </form>
        <div className="flex flex-wrap gap-2 items-center">
            <Button variant="outline" disabled={!canExport || exporting || loading || !!error} onClick={() => download('recipients')}>Exportar destinatarios CSV</Button>
            <Button variant="outline" disabled={!canExport || exporting || loading || !!error} onClick={() => download('steps')}>Exportar pasos CSV</Button>
            <span className="text-xs text-muted-foreground">Requiere permiso de exportación. Máximo 50.000 filas por archivo.</span>
            {exporting && <span role="status" className="text-sm">Preparando reporte… Se descarga cuando se recibe completo.</span>}
        </div>
        <div aria-live="polite">
            {loading ? <p className="text-sm">Consultando historial…</p> : error ? <p role="alert" className="text-sm text-destructive">{error}</p>
                : page && <><p className="text-sm text-muted-foreground">{total == null ? 'Total pendiente de consulta' : `${total} destinatarios con los filtros aplicados`}. Página {previous.length + 1} · Consultado: {formatDate(page.queriedAt)}.</p>
                    {!page.items.length ? <p className="py-4 text-sm">No hay destinatarios inscritos que coincidan. Una campaña en borrador puede no tener inscripciones todavía.</p>
                        : <div className="overflow-x-auto"><table className="w-full text-sm">
                            <caption className="sr-only">Destinatarios inscritos y sus resultados registrados</caption>
                            <thead><tr className="border-b text-left"><th className="p-2">Destinatario</th><th className="p-2">Procesamiento</th><th className="p-2">Mensajes registrados</th><th className="p-2">Último avance</th><th className="p-2">Detalle</th></tr></thead>
                            <tbody>{page.items.map(row => <tr key={row.id} className="border-b align-top">
                                <td className="p-2"><p className="font-medium break-words">{row.name}</p><p className="text-muted-foreground">{row.phone || 'Sin destinatario registrado'}</p></td>
                                <td className="p-2">{executionLabels[row.status] || row.status}{row.issue && <p className="text-xs text-muted-foreground max-w-52">{row.issue}</p>}
                                    {row.next_run_at && row.status === 'active' && <p className="text-xs text-muted-foreground">Próximo paso: {formatDate(row.next_run_at)}</p>}</td>
                                <td className="p-2"><p>{row.counts.total} operaciones</p><p className="text-xs text-muted-foreground">{email ? `${row.counts.accepted} aceptados por SMTP` : `${row.counts.delivered + row.counts.read} entregados · ${row.counts.read} leídos`} · {row.counts.failed} fallidos</p>
                                    {!!row.counts.unknown && <p className="text-xs text-amber-700">{row.counts.unknown} sin resultado confirmado</p>}</td>
                                <td className="p-2">{formatDate(row.last_run_at)}</td>
                                <td className="p-2"><Button variant="outline" size="sm" onClick={() => setSelected(row)} aria-label={`Ver pasos de ${row.name}`}>Ver pasos</Button></td>
                            </tr>)}</tbody></table></div>}
                    <div className="flex gap-2 items-center pt-3">
                        <Button variant="outline" disabled={!previous.length} onClick={() => { setCursor(previous.at(-1) || null); setPrevious(value => value.slice(0, -1)) }}>Anterior</Button>
                        <Button variant="outline" disabled={!page.hasMore || !page.nextCursor} onClick={() => { setPrevious(value => [...value, cursor]); setCursor(page.nextCursor) }}>Siguiente</Button>
                        <span className="text-xs text-muted-foreground">Hasta 25 destinatarios por página.</span>
                    </div>
                </>}
        </div>
        <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null) }}><DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Pasos de {selected?.name}</DialogTitle><DialogDescription>{email ? 'SMTP confirma aceptación del servidor, sin recibos de entrega ni lectura.' : 'Los recibos confirman entrega y lectura. El avance de la secuencia solo describe procesamiento.'}</DialogDescription></DialogHeader>
            {selected && <RecipientSteps email={email} key={selected.id} campaignId={campaignId} enrollmentId={selected.id} />}
        </DialogContent></Dialog>
    </Card>
}

function RecipientSteps({ campaignId, enrollmentId, email = false }: { campaignId: string; enrollmentId: string; email?: boolean }) {
    const [cursor, setCursor] = useState<StepCursor | null>(null), [previous, setPrevious] = useState<Array<StepCursor | null>>([])
    const [page, setPage] = useState<HistoryPage<HistoryStep, StepCursor> | null>(null), [error, setError] = useState('')
    const [loading, setLoading] = useState(true), [revision, setRevision] = useState(0)
    useEffect(() => {
        let active = true
        setLoading(true); setError(''); setPage(null)
        getMarketingStepHistory({ campaignId, enrollmentId, cursor }).then(result => {
            if (!active) return
            if (!result.success) setError(result.error)
            else setPage(result.page)
        }).catch(() => { if (active) setError('No se pudo consultar el detalle de pasos.') }).finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [campaignId, enrollmentId, cursor, revision])
    return <div className="space-y-3" aria-live="polite">
        <Button variant="outline" disabled={loading} onClick={() => setRevision(value => value + 1)}>Actualizar pasos</Button>
        {loading ? <p>Consultando pasos…</p> : error ? <p role="alert" className="text-destructive">{error}</p>
            : page && <><p className="text-xs text-muted-foreground">Página {previous.length + 1} · Consultado: {formatDate(page.queriedAt)}. Las fechas pertenecen al registro de la operación; no son la hora de lectura.</p>
                {!page.items.length && <p>No hay pasos registrados para esta inscripción.</p>}
                {page.items.map(row => <div key={row.step_id} className="rounded-md border p-3 space-y-1">
                    <p className="font-medium">{row.order_index + 1}. {row.step_name}</p>
                    <p className="text-sm text-muted-foreground">{row.type === 'delay' ? 'Pausa de secuencia' : `${email ? 'Asunto' : 'Plantilla'}: ${row.template_name || 'Sin nombre registrado'}`}
                        {' · '}{row.progress === 'advanced' ? 'Avance registrado' : row.progress === 'current' ? 'Paso actual' : 'No iniciado'}</p>
                    {row.type !== 'delay' && <p className="text-sm">Mensaje: {email && row.delivery === 'accepted' ? 'Aceptado por SMTP' : deliveryLabels[row.delivery] || row.delivery}</p>}
                    {!!row.error_code && <p className="text-sm text-amber-700">Código Meta: {row.error_code}. Requiere revisar la causa antes de otro envío.</p>}
                    {row.delivery === 'unknown' && <p className="text-sm text-amber-700">Puede haberse enviado. No se reenvía automáticamente.</p>}
                    {row.queued_at && <p className="text-xs text-muted-foreground">En cola: {formatDate(row.queued_at)} · Actualización: {formatDate(row.updated_at)}</p>}
                    {row.receipt_at && <p className="text-xs text-muted-foreground">Último evento de recibo: {formatDate(row.receipt_at)}</p>}
                </div>)}
                <div className="flex gap-2"><Button variant="outline" disabled={!previous.length} onClick={() => { setCursor(previous.at(-1) || null); setPrevious(value => value.slice(0, -1)) }}>Anterior</Button>
                    <Button variant="outline" disabled={!page.hasMore || !page.nextCursor} onClick={() => { setPrevious(value => [...value, cursor]); setCursor(page.nextCursor) }}>Siguiente</Button></div>
            </>}
    </div>
}
