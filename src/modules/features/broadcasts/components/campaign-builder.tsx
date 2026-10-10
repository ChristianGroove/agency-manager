'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { getCampaign, getSequences, getCampaignStats, updateCampaign, createSequence, setPrincipalSequence, addStepToSequence, updateStep, deleteStep, Sequence, MarketingStep } from '../marketing-actions'
import { getCampaignAudience, saveCampaignAudience, reorderCampaignSteps } from '../marketing-workspace-actions'
import { adjacentStepOrder } from '../marketing-editor-utils'
import { getMarketingSetup, MarketingChannel } from '../marketing-preflight-actions'
import { campaignStateLabels } from '../marketing-workspace'
import type { CampaignMetrics } from '../marketing-metrics'
import type { DeliveryConfig } from '../marketing-utils'
import type { TemplateSelection } from '../marketing-template-contract'
import { MarketingTemplateEditor } from './marketing-template-editor'
import { CampaignRecipientFilters, RecipientFilters } from './campaign-recipient-filters'
import { CampaignReadiness } from './campaign-readiness'
import { toast } from 'sonner'

const CampaignImport = dynamic(() => import('./campaign-import').then(module => module.CampaignImport))
const CampaignActivationReview = dynamic(() => import('./campaign-activation-review').then(module => module.CampaignActivationReview))
const CampaignResults = dynamic(() => import('./campaign-results').then(module => module.CampaignResults))
const CampaignSavedSegments = dynamic(() => import('./campaign-saved-segments').then(module => module.CampaignSavedSegments))
const defaultDelivery: DeliveryConfig = { mode: 'growth', humanize: true, timezone: 'America/Bogota', schedule_window: { start: 9, end: 18 } }
const localInput = (iso: string | null) => iso ? new Date(Date.parse(iso) - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
const emptyStep = { id: null as string | null, type: 'whatsapp', name: '', delay: '1', unit: 'days' }
type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'
type Stage = 'recipients' | 'message' | 'schedule' | 'review' | 'results'

export function CampaignBuilder(props: { campaignId: string; campaignName: string }) {
    // A route change gets its own form and ignores outstanding requests from the previous campaign.
    return <CampaignEditor key={props.campaignId} {...props} />
}

function CampaignEditor({ campaignId, campaignName }: { campaignId: string; campaignName: string }) {
    const [tab, setTab] = useState<Stage>('recipients')
    const [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false)
    const [status, setStatus] = useState<CampaignStatus>('draft'), [executionEnabled, setExecutionEnabled] = useState(false)
    const [canManage, setCanManage] = useState(false), [canExecute, setCanExecute] = useState(false), [canImport, setCanImport] = useState(false)
    const [channels, setChannels] = useState<MarketingChannel[]>([]), [connectionId, setConnectionId] = useState('')
    const [filters, setFilters] = useState<RecipientFilters>({ has_phone: true }), [savedFilters, setSavedFilters] = useState(''), [hasAudience, setHasAudience] = useState(false)
    const [delivery, setDelivery] = useState<DeliveryConfig>(defaultDelivery), [scheduledFor, setScheduledFor] = useState('')
    const [savedConfig, setSavedConfig] = useState(''), [savedConnection, setSavedConnection] = useState('')
    const savedSchedule = useRef<{ input: string; iso: string | null }>({ input: '', iso: null })
    const [sequences, setSequences] = useState<Sequence[]>([]), [sequenceId, setSequenceId] = useState('')
    const [step, setStep] = useState(emptyStep), [stepOpen, setStepOpen] = useState(false), [template, setTemplate] = useState<TemplateSelection | null>(null)
    const [followup, setFollowup] = useState(false), [importOpen, setImportOpen] = useState(false), [activationOpen, setActivationOpen] = useState(false)
    const [metrics, setMetrics] = useState<CampaignMetrics | null>(null), [revision, setRevision] = useState(0)
    const [segmentsOpen, setSegmentsOpen] = useState(false)
    const request = useRef(0), resultsRequest = useRef(0), mounted = useRef(true), mutation = useRef(false)
    const sequence = sequences.find(item => item.id === sequenceId)
    const steps = sequence?.steps || []
    const config = JSON.stringify({ connectionId, scheduledFor, delivery })
    const audienceDirty = !hasAudience || JSON.stringify(filters) !== savedFilters
    const configDirty = config !== savedConfig
    const editable = status === 'draft' && canManage && !loading && !busy && !error

    useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; request.current++ } }, [])
    async function load() {
        const epoch = ++request.current
        resultsRequest.current++
        setLoading(true); setError('')
        try {
            const [campaign, flows, audience, results, setup] = await Promise.all([
                getCampaign(campaignId), getSequences(campaignId), getCampaignAudience(campaignId), getCampaignStats(campaignId), getMarketingSetup(),
            ])
            if (!mounted.current || epoch !== request.current) return
            if (!campaign.success || !campaign.campaign || !flows.success || !audience.success || !setup.success) {
                throw new Error('No se pudo cargar toda la campaña. Reintenta antes de editar.')
            }
            const stored = campaign.campaign
            setStatus(stored.status); setExecutionEnabled(campaign.executionEnabled === true)
            if (stored.status !== 'draft') setTab('results')
            setCanManage(setup.canManage); setCanExecute(setup.canExecute); setCanImport(setup.canImport); setChannels(setup.channels)
            const emitter = stored.connection_id || '', date = localInput(stored.scheduled_for || null)
            const storedDelivery = stored.delivery_config
            const config: DeliveryConfig = storedDelivery ? { mode: storedDelivery.mode || defaultDelivery.mode, humanize: storedDelivery.humanize ?? defaultDelivery.humanize, timezone: storedDelivery.timezone || 'America/Bogota', schedule_window: storedDelivery.schedule_window } : defaultDelivery
            setConnectionId(emitter); setSavedConnection(emitter); setDelivery(config); setScheduledFor(date)
            savedSchedule.current = { input: date, iso: stored.scheduled_for || null }
            setSavedConfig(JSON.stringify({ connectionId: emitter, scheduledFor: date, delivery: config }))
            const recipientFilters = audience.audience?.filters || { has_phone: true }
            setFilters(recipientFilters); setSavedFilters(JSON.stringify(recipientFilters)); setHasAudience(!!audience.audience)
            setSequences(flows.sequences || []); setSequenceId(flows.sequences?.find(item => item.is_active)?.id || flows.sequences?.[0]?.id || '')
            setMetrics(results.success ? results : null); setRevision(value => value + 1)
        } catch (failure) { if (mounted.current && epoch === request.current) setError(failure instanceof Error ? failure.message : 'No se pudo cargar la campaña.') }
        finally { if (mounted.current && epoch === request.current) setLoading(false) }
    }
    async function refreshResults() {
        const epoch = ++resultsRequest.current
        try {
            const [result, campaign] = await Promise.all([getCampaignStats(campaignId), getCampaign(campaignId)])
            if (!mounted.current || epoch !== resultsRequest.current) return
            if (result.success) setMetrics(result); else { setMetrics(null); toast.error(result.error) }
            if (campaign.success && campaign.campaign) { setStatus(campaign.campaign.status); setExecutionEnabled(campaign.executionEnabled === true) }
        } catch { if (mounted.current && epoch === resultsRequest.current) toast.error('No se pudieron actualizar los resultados.') }
    }
    useEffect(() => {
        if (tab !== 'results' || status === 'draft' || status === 'archived' || busy) return
        const timer = setInterval(() => { if (document.visibilityState === 'visible') void refreshResults() }, 20000)
        return () => clearInterval(timer)
    }, [tab, status, busy])
    async function edit(operation: () => Promise<void>) {
        if (mutation.current || loading || error) return
        mutation.current = true; setBusy(true)
        try { await operation() }
        catch (failure) { if (mounted.current) toast.error(failure instanceof Error ? failure.message : 'No se pudo guardar. Actualiza antes de reintentar.') }
        finally { mutation.current = false; if (mounted.current) setBusy(false) }
    }
    async function refreshSteps() {
        const result = await getSequences(campaignId)
        if (!result.success) { if (mounted.current) setError('No se pudo actualizar el diseño. Recarga antes de seguir editando.'); throw new Error(result.error) }
        if (mounted.current) { setSequences(result.sequences || []); setRevision(value => value + 1) }
    }
    async function moveStep(index: number, direction: -1 | 1) {
        const expected = steps.map(item => item.id)
        const order = adjacentStepOrder(expected, index, direction)
        if (!order) return
        const result = await reorderCampaignSteps({ campaignId, sequenceId, expected, order })
        if (!result.success) throw new Error(result.error)
        if (!mounted.current) return
        await refreshSteps(); toast.success('Orden guardado. Revisa la secuencia antes de activar.')
    }
    async function saveEmitter() {
        if (!connectionId) throw new Error('Elige un número emisor.')
        const result = await updateCampaign(campaignId, { connection_id: connectionId })
        if (!result.success) throw new Error(result.error)
        if (!mounted.current) return
        setSavedConnection(connectionId)
        setSavedConfig(previous => JSON.stringify({ ...JSON.parse(previous), connectionId }))
        setRevision(value => value + 1); toast.success('Emisor guardado. Revisa las plantillas si cambiaste de número.')
    }
    async function saveRecipients() {
        const cleaned = { ...filters, tags: filters.tags?.map(value => value.trim()).filter(Boolean) }
        const result = await saveCampaignAudience(campaignId, cleaned)
        if (!result.success) throw new Error(result.error)
        if (!mounted.current) return
        setFilters(cleaned); setSavedFilters(JSON.stringify(cleaned)); setHasAudience(true); setRevision(value => value + 1)
        toast.success('Destinatarios guardados. No se inscribió ni envió ningún mensaje.')
    }
    function openStep(type: string, existing?: MarketingStep) {
        if (!editable) return
        setStep(existing ? { id: existing.id, type: existing.type, name: existing.name, delay: String(existing.delay_config?.value ?? existing.delay_config?.duration ?? 1), unit: existing.delay_config?.unit || 'days' } : { ...emptyStep, type })
        setTemplate(existing?.content?.template_id ? existing.content : null); setStepOpen(true)
    }
    async function saveStep() {
        if (step.type === 'whatsapp' && (!template || !savedConnection || connectionId !== savedConnection)) throw new Error('Selecciona y guarda el emisor antes de configurar el mensaje.')
        let target = sequenceId
        if (!target) {
            const created = await createSequence({ name: 'Mensajes de campaña', campaign_id: campaignId, trigger_type: 'manual' })
            if (!created.success || !created.sequence) throw new Error(created.error || 'No se pudo preparar el mensaje.')
            target = created.sequence.id
            if (mounted.current) { setSequenceId(target); setSequences([created.sequence]) }
        }
        const data = {
            type: step.type, name: step.name.trim() || (step.type === 'delay' ? 'Esperar' : `Mensaje ${steps.filter(item => item.type === 'whatsapp').length + 1}`),
            content: step.type === 'delay' ? {} : template!, delay_config: step.type === 'delay' ? { value: Number(step.delay), unit: step.unit } : undefined
        }
        const result = step.id ? await updateStep(step.id, data) : await addStepToSequence(target, data)
        if (!result.success) throw new Error(result.error)
        if (!mounted.current) return
        setStepOpen(false); await refreshSteps(); toast.success('Contenido guardado.')
    }
    async function saveSchedule() {
        const iso = scheduledFor === savedSchedule.current.input ? savedSchedule.current.iso : scheduledFor ? new Date(scheduledFor).toISOString() : null
        if (scheduledFor !== savedSchedule.current.input && iso && Date.parse(iso) <= Date.now()) throw new Error('Elige una fecha futura o empieza al confirmar.')
        const result = await updateCampaign(campaignId, { delivery_config: delivery, scheduled_for: iso })
        if (!result.success) throw new Error(result.error)
        if (!mounted.current) return
        savedSchedule.current = { input: scheduledFor, iso }
        setSavedConfig(previous => JSON.stringify({ ...JSON.parse(previous), scheduledFor, delivery }))
        setRevision(value => value + 1); toast.success('Programación guardada.')
    }
    const closeStep = () => { if (!busy) setStepOpen(false) }
    return <div className="mx-auto max-w-5xl space-y-5 pb-12">
        <div className="flex flex-wrap justify-between items-start gap-3"><div><Link href="/crm/marketing" className="text-xs text-muted-foreground hover:underline">← Campañas WhatsApp</Link><h2 className="text-xl font-semibold mt-1">{campaignName}</h2><Badge variant={status === 'active' ? 'default' : 'secondary'}>{campaignStateLabels[status]}</Badge></div>
            <div className="flex gap-2">{canExecute && (status === 'active' || status === 'paused') && <Button disabled={busy || loading || !!error} variant="outline" onClick={() => status === 'paused' ? setActivationOpen(true) : void edit(async () => { const result = await updateCampaign(campaignId, { status: 'paused' }); if (!result.success) throw new Error(result.error); await refreshResults() })}>{status === 'active' ? 'Pausar campaña' : 'Revisar reanudación'}</Button>}
                <Button variant="outline" disabled={busy || loading} onClick={() => { if (status !== 'draft' || !(audienceDirty || configDirty) || window.confirm('Hay cambios sin guardar. ¿Descartarlos y cargar el diseño guardado?')) void load() }}>Recargar diseño</Button></div>
        </div>
        {loading && <p role="status">Cargando campaña…</p>}{error && <p role="alert" className="text-sm text-red-600">{error} <button className="underline" onClick={() => void load()}>Reintentar</button></p>}
        {!loading && status === 'draft' && <p className="text-sm text-muted-foreground">Un mensaje por defecto; puedes añadir seguimiento. Guardar no envía mensajes.{!executionEnabled && ' Los envíos masivos están deshabilitados en este entorno.'}</p>}
        <Tabs value={tab} onValueChange={value => setTab(value as Stage)}>
            <TabsList className="h-auto flex flex-wrap justify-start gap-1 bg-muted/50"><TabsTrigger value="recipients">1. Destinatarios</TabsTrigger><TabsTrigger value="message">2. Mensaje</TabsTrigger><TabsTrigger value="schedule">3. Programación</TabsTrigger><TabsTrigger value="review">4. Revisión</TabsTrigger><TabsTrigger value="results">Resultados</TabsTrigger></TabsList>
            <TabsContent value="recipients" className="space-y-5 mt-5">
                <section className="rounded-xl border bg-white dark:bg-zinc-900 p-5 space-y-3"><Label>Número emisor de WhatsApp</Label><Select value={connectionId} disabled={!editable} onValueChange={setConnectionId}><SelectTrigger aria-label="Número emisor de campaña"><SelectValue placeholder="Selecciona un canal conectado" /></SelectTrigger><SelectContent>{channels.map(channel => <SelectItem key={channel.id} value={channel.id}>{channel.name}</SelectItem>)}</SelectContent></Select>
                    {!channels.length && !loading && <p className="text-sm text-muted-foreground">No hay números activos disponibles. Revisa <Link href="/crm/settings/channels" className="underline">Canales</Link>.</p>}
                    {savedConnection && !channels.some(channel => channel.id === savedConnection) && <p role="alert" className="text-sm text-amber-700">El emisor guardado ya no está disponible. El diseño se conserva; revisa la conexión.</p>}
                    <Button disabled={!editable || !connectionId || connectionId === savedConnection} variant="outline" onClick={() => void edit(saveEmitter)}>Guardar emisor</Button>
                </section>
                <section className="rounded-xl border bg-white dark:bg-zinc-900 p-5 space-y-4"><div className="flex flex-wrap justify-between items-center gap-2"><h3 className="font-semibold">Destinatarios del CRM</h3><Button variant="outline" disabled={!canImport || loading || busy || !!error} onClick={() => setImportOpen(true)}>Importar contactos con autorización</Button></div>
                    <CampaignRecipientFilters value={filters} onChange={setFilters} disabled={!editable} refresh={revision} />
                    <details className="rounded-lg border p-3" open={segmentsOpen} onToggle={event => setSegmentsOpen(event.currentTarget.open)}><summary className="cursor-pointer text-sm">Segmentos reutilizables · opcional</summary>{segmentsOpen && <CampaignSavedSegments disabled={!editable} filters={filters} onApply={setFilters} />}</details>
                    <p className="text-xs text-muted-foreground">Los filtros adicionales de campañas existentes se conservan. Importar contactos no los inscribe ni cambia estos filtros.</p>
                    <div className="flex justify-between gap-2"><Button disabled={!editable || !audienceDirty} onClick={() => void edit(saveRecipients)}>Guardar destinatarios</Button><Button variant="outline" onClick={() => setTab('message')}>Continuar a mensaje →</Button></div>
                </section>
            </TabsContent>
            <TabsContent value="message" className="space-y-4 mt-5">
                {sequences.length > 1 && <details className="rounded-lg border p-4"><summary className="cursor-pointer text-sm">Secuencias existentes · avanzado</summary><div className="space-y-3 pt-3"><p className="text-xs text-muted-foreground">Solo se ejecuta la secuencia principal. Las otras se conservan.</p><Select value={sequenceId} onValueChange={setSequenceId}><SelectTrigger aria-label="Secuencia existente"><SelectValue /></SelectTrigger><SelectContent>{sequences.map(item => <SelectItem key={item.id} value={item.id}>{item.name}{item.is_active ? ' · principal' : ''}</SelectItem>)}</SelectContent></Select>{sequence && !sequence.is_active && <Button disabled={!editable} variant="outline" onClick={() => void edit(async () => { const r = await setPrincipalSequence(campaignId, sequenceId); if (!r.success) throw new Error(r.error); await refreshSteps() })}>Usar como principal</Button>}</div></details>}
                {sequence && !sequence.is_active && <p role="alert" className="text-sm text-amber-700">Estás viendo una secuencia que no se ejecutará. La revisión final usa la principal.</p>}
                {!savedConnection || savedConnection !== connectionId ? <p role="alert" className="rounded-lg border p-4 text-sm">Selecciona y guarda el emisor en Destinatarios antes de configurar plantillas.</p> : <>
                    {!steps.length && <div className="rounded-xl border p-8 text-center space-y-3"><h3 className="font-semibold">¿Qué mensaje recibirán?</h3><p className="text-sm text-muted-foreground">Selecciona una plantilla aprobada y completa sus variables.</p><Button disabled={!editable} onClick={() => openStep('whatsapp')}>Configurar mensaje</Button></div>}
                    <ol className="space-y-3">{steps.map((item, index) => <li key={item.id} className="rounded-xl border bg-white dark:bg-zinc-900 p-4"><div className="flex flex-wrap justify-between gap-3"><div><h4 className="font-medium">{index + 1}. {item.type === 'delay' ? 'Esperar' : item.name}</h4><p className="text-sm text-muted-foreground mt-1">{item.type === 'delay' ? `${item.delay_config?.value ?? item.delay_config?.duration} ${({ minutes: 'minutos', hours: 'horas', days: 'días' } as Record<string, string>)[item.delay_config?.unit] || item.delay_config?.unit}` : item.content?.template_name || 'Plantilla pendiente de configurar'}</p></div><div className="flex flex-wrap gap-2">
                        <Button disabled={!editable || index === 0} aria-label={`Subir paso ${index + 1}`} variant="ghost" size="sm" onClick={() => void edit(() => moveStep(index, -1))}>Subir</Button>
                        <Button disabled={!editable || index === steps.length - 1} aria-label={`Bajar paso ${index + 1}`} variant="ghost" size="sm" onClick={() => void edit(() => moveStep(index, 1))}>Bajar</Button>
                        <Button disabled={!editable} variant="outline" size="sm" onClick={() => openStep(item.type, item)}>Editar</Button><Button disabled={!editable} variant="ghost" size="sm" onClick={() => { if (window.confirm('¿Eliminar este paso del borrador?')) void edit(async () => { const r = await deleteStep(item.id); if (!r.success) throw new Error(r.error); await refreshSteps() }) }}>Eliminar</Button></div></div></li>)}</ol>
                    {!!steps.length && <details open={followup || steps.length > 1} onToggle={event => setFollowup(event.currentTarget.open)} className="rounded-lg border p-4"><summary className="cursor-pointer font-medium">Añadir seguimiento opcional</summary><p className="text-xs text-muted-foreground mt-2">La secuencia es lineal. Añade una espera antes de un mensaje posterior si quieres separarlos en el tiempo.</p><div className="flex gap-2 mt-3"><Button disabled={!editable} variant="outline" onClick={() => openStep('delay')}>Añadir espera</Button><Button disabled={!editable} variant="outline" onClick={() => openStep('whatsapp')}>Añadir mensaje</Button></div></details>}
                </>}
                <div className="flex justify-between"><Button variant="outline" onClick={() => setTab('recipients')}>← Destinatarios</Button><Button variant="outline" onClick={() => setTab('schedule')}>Continuar a programación →</Button></div>
            </TabsContent>
            <TabsContent value="schedule" className="space-y-4 mt-5">
                <section className="rounded-xl border bg-white dark:bg-zinc-900 p-5 space-y-4"><h3 className="font-semibold">Cuándo enviar</h3><p className="text-sm text-muted-foreground">Sin fecha, comienza después de la confirmación, dentro de la ventana permitida.</p>
                    <Label htmlFor="campaign-date">Fecha de inicio · hora local del navegador</Label><Input id="campaign-date" type="datetime-local" disabled={!editable} value={scheduledFor} onChange={event => setScheduledFor(event.target.value)} />
                    <Button disabled={!editable || !scheduledFor} variant="ghost" size="sm" onClick={() => setScheduledFor('')}>Empezar al confirmar</Button>
                    <Label htmlFor="campaign-timezone">Zona horaria de la ventana</Label><Input id="campaign-timezone" disabled={!editable} value={delivery.timezone || 'America/Bogota'} onChange={event => setDelivery({ ...delivery, timezone: event.target.value })} />
                    <label className="flex gap-2 text-sm"><input type="checkbox" disabled={!editable} checked={!!delivery.schedule_window} onChange={event => setDelivery({ ...delivery, schedule_window: event.target.checked ? { start: 9, end: 18 } : undefined })} />Limitar a una ventana diaria</label>
                    {delivery.schedule_window && <div className="flex gap-3"><div><Label htmlFor="campaign-window-start">Desde · hora 0–23</Label><Input id="campaign-window-start" type="number" min={0} max={23} disabled={!editable} value={delivery.schedule_window.start} onChange={event => setDelivery({ ...delivery, schedule_window: { ...delivery.schedule_window!, start: Number(event.target.value) } })} /></div><div><Label htmlFor="campaign-window-end">Hasta · hora 1–24</Label><Input id="campaign-window-end" type="number" min={1} max={24} disabled={!editable} value={delivery.schedule_window.end} onChange={event => setDelivery({ ...delivery, schedule_window: { ...delivery.schedule_window!, end: Number(event.target.value) } })} /></div></div>}
                    <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm">Ritmo de envío · avanzado</summary><div className="space-y-3 pt-3"><Label>Intervalo mínimo del mismo número</Label><Select value={delivery.mode} disabled={!editable} onValueChange={mode => setDelivery({ ...delivery, mode: mode as DeliveryConfig['mode'] })}><SelectTrigger aria-label="Intervalo de envío"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="stealth">180 segundos</SelectItem><SelectItem value="growth">30 segundos</SelectItem><SelectItem value="turbo">5 segundos · requiere capacidad validada</SelectItem></SelectContent></Select><label className="flex gap-2 text-sm"><input type="checkbox" disabled={!editable} checked={delivery.humanize} onChange={event => setDelivery({ ...delivery, humanize: event.target.checked })} />Añadir variación al intervalo</label><p className="text-xs text-muted-foreground">El ritmo se comparte entre campañas del número. No garantiza entrega ni evita restricciones de Meta. La salud y los permisos se validan antes de enviar.</p></div></details>
                    <div className="flex justify-between"><Button disabled={!editable || !configDirty} onClick={() => void edit(saveSchedule)}>Guardar programación</Button><Button variant="outline" onClick={() => setTab('review')}>Continuar a revisión →</Button></div>
                </section>
            </TabsContent>
            <TabsContent value="review" className="space-y-4 mt-5">
                {(audienceDirty || configDirty) && status === 'draft' && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Hay cambios sin guardar. Guarda destinatarios, emisor y programación antes de la revisión final.</p>}
                <CampaignReadiness campaignId={campaignId} revision={revision} canExecute={canExecute} />
                <Button disabled={!canExecute || busy || loading || !!error || !['draft', 'paused'].includes(status) || (status === 'draft' && (audienceDirty || configDirty))} onClick={() => setActivationOpen(true)}>{status === 'paused' ? 'Abrir revisión de reanudación' : 'Abrir revisión final'}</Button>
            </TabsContent>
            <TabsContent value="results" className="mt-5"><CampaignResults key={`${campaignId}:${metrics?.channelHealth?.holdAt || ''}`} campaignId={campaignId} connectionId={savedConnection} metrics={metrics} canExecute={canExecute} onRefresh={refreshResults} /></TabsContent>
        </Tabs>
        {importOpen && <CampaignImport onClose={() => { setImportOpen(false); setRevision(value => value + 1) }} />}
        {activationOpen && <CampaignActivationReview key={`${campaignId}:${revision}`} campaignId={campaignId} onClose={() => setActivationOpen(false)} onActivated={() => { setActivationOpen(false); setTab('results'); void refreshResults() }} />}
        <Dialog open={stepOpen} onOpenChange={open => { if (!open) closeStep() }}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{step.type === 'delay' ? 'Espera entre mensajes' : 'Configurar mensaje'}</DialogTitle><DialogDescription>Se guarda en el borrador. La revisión final valida nuevamente su disponibilidad y las variables.</DialogDescription></DialogHeader>
            <fieldset disabled={busy} className="space-y-4">{step.type === 'delay' ? <><Label htmlFor="step-delay">Tiempo de espera</Label><Input id="step-delay" type="number" min={1} max={365} value={step.delay} onChange={event => setStep({ ...step, delay: event.target.value })} /><Select disabled={busy} value={step.unit} onValueChange={unit => setStep({ ...step, unit })}><SelectTrigger aria-label="Unidad de espera"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="minutes">Minutos</SelectItem><SelectItem value="hours">Horas</SelectItem><SelectItem value="days">Días</SelectItem></SelectContent></Select></> : <MarketingTemplateEditor disabled={busy} connectionId={savedConnection} value={template} onChange={setTemplate} />}
                <details><summary className="cursor-pointer text-sm">Nombre interno · opcional</summary><Label htmlFor="step-name">Nombre</Label><Input id="step-name" maxLength={160} value={step.name} onChange={event => setStep({ ...step, name: event.target.value })} /></details>
            </fieldset><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={closeStep}>Cancelar</Button><Button disabled={!editable || (step.type === 'whatsapp' && !template)} onClick={() => void edit(saveStep)}>{busy ? 'Guardando…' : 'Guardar contenido'}</Button></div>
        </DialogContent></Dialog>
    </div>
}
