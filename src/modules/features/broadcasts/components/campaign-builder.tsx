'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CalendarClock, MessageSquare, Users, Megaphone, ShieldCheck, X, RefreshCw, Save, Send, ArrowUp, ArrowDown, Timer, Plus, Pencil, Trash2, Mail, Smartphone } from 'lucide-react'
import { MarketingEmailEditor } from './marketing-email-editor'
import { getMarketingEmailSenders, saveCampaignSender } from '../marketing-email-actions'
import { emailContentSchema } from '../marketing-email-contracts'
import { CampaignPacing } from './campaign-pacing'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { getCampaign, createCampaign, getSequences, getCampaignStats, updateCampaign, createSequence, setPrincipalSequence, addStepToSequence, updateStep, deleteStep, Sequence, MarketingStep } from '../marketing-actions'
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
import { cn } from '@/modules/infrastructure/utils/utils'

const CampaignImport = dynamic(() => import('./campaign-import').then(module => module.CampaignImport))
const CampaignActivationReview = dynamic(() => import('./campaign-activation-review').then(module => module.CampaignActivationReview))
const CampaignResults = dynamic(() => import('./campaign-results').then(module => module.CampaignResults))
const CampaignContactLists = dynamic(() => import('./campaign-contact-lists').then(module => module.CampaignContactLists))
const CampaignSavedSegments = dynamic(() => import('./campaign-saved-segments').then(module => module.CampaignSavedSegments))
const defaultDelivery: DeliveryConfig = { mode: 'growth', humanize: true, timezone: 'America/Bogota', recipient_cooldown_hours: 24, schedule_window: { start: 9, end: 18 } }
const localInput = (iso: string | null) => iso ? new Date(Date.parse(iso) - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
const emptyStep = { id: null as string | null, type: 'whatsapp', name: '', delay: '1', unit: 'days' }
type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'
type Stage = 'configuration' | 'results'
type EditorProps = {
    campaignId?: string | null;
    campaignName?: string;
    initialChannel?: 'whatsapp' | 'email';
    initialChannels?: MarketingChannel[];
    initialCanManage?: boolean;
    initialCanExecute?: boolean;
    onClose?: () => void;
    onCreated?: (id: string) => void;
    onDirtyChange?: (dirty: boolean) => void;
    onBusyChange?: (busy: boolean) => void;
    onMutated?: () => void;
}
function CampaignSection({ title, icon, children, action }: { title: string; icon: ReactNode; children: ReactNode; action?: ReactNode }) {
    return <section className="overflow-hidden rounded-xl border border-border/60 bg-background shadow-xs">
        <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-muted/20 px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">{icon}{title}</h3>{action}
        </div>
        <div className="space-y-3 p-4">{children}</div>
    </section>
}

export function CampaignBuilder(props: EditorProps) {
    // A route change gets its own form and ignores outstanding requests from the previous campaign.
    return <CampaignEditor key={props.campaignId || `new-${props.initialChannel || 'whatsapp'}`} {...props} />
}

function CampaignEditor({ campaignId, campaignName, initialChannel, initialChannels, initialCanManage, initialCanExecute, onClose, onCreated, onDirtyChange, onBusyChange, onMutated }: EditorProps) {
    const [currentId, setCurrentId] = useState<string | null>(campaignId || null)
    const isNew = !currentId
    const [title, setTitle] = useState(campaignName || '')
    const savedTitle = useRef(campaignName || '')
    const [tab, setTab] = useState<Stage>('configuration')

    const hasInitialChannels = !!(initialChannels && initialChannels.length > 0)
    const [channels, setChannels] = useState<MarketingChannel[]>(initialChannels || [])
    const [canManage, setCanManage] = useState(initialCanManage ?? false)
    const [canExecute, setCanExecute] = useState(initialCanExecute ?? false)
    const [canImport, setCanImport] = useState(false)
    const [executionEnabled, setExecutionEnabled] = useState(initialCanExecute ?? false)

    const initialEmitter = () => {
        if (!initialChannels || !initialChannels.length) return ''
        if (initialChannel === 'email') {
            const firstEmail = initialChannels.find(c => c.id.startsWith('smtp:'))?.id
            return firstEmail || initialChannels[0]?.id || ''
        } else {
            const firstWa = initialChannels.find(c => !c.id.startsWith('smtp:'))?.id
            return firstWa || initialChannels[0]?.id || ''
        }
    }
    const [connectionId, setConnectionId] = useState(initialEmitter)
    const [loading, setLoading] = useState(isNew ? !hasInitialChannels : true)
    const [error, setError] = useState(''), [busy, setBusy] = useState(false)
    const [status, setStatus] = useState<CampaignStatus>('draft')
    const [filters, setFilters] = useState<RecipientFilters>(initialChannel === 'email' ? { has_email: true } : { has_phone: true }), [savedFilters, setSavedFilters] = useState(''), [hasAudience, setHasAudience] = useState(false)
    const [delivery, setDelivery] = useState<DeliveryConfig>(defaultDelivery), [scheduledFor, setScheduledFor] = useState('')
    const [savedConfig, setSavedConfig] = useState(''), [savedConnection, setSavedConnection] = useState('')
    const savedSchedule = useRef<{ input: string; iso: string | null }>({ input: '', iso: null })
    const [sequences, setSequences] = useState<Sequence[]>([]), [sequenceId, setSequenceId] = useState('')
    const [step, setStep] = useState(emptyStep), [stepOpen, setStepOpen] = useState(false), [template, setTemplate] = useState<TemplateSelection | null>(null)
    const [followup, setFollowup] = useState(false), [importOpen, setImportOpen] = useState(false), [activationOpen, setActivationOpen] = useState(false)
    const [metrics, setMetrics] = useState<CampaignMetrics | null>(null), [revision, setRevision] = useState(0)
    const [emailContent, setEmailContent] = useState({ subject: '', body: '' })
    const email = connectionId ? connectionId.startsWith('smtp:') : (initialChannel === 'email')
    const baseFilters = email ? { has_email: true } : { has_phone: true }
    const [segmentsOpen, setSegmentsOpen] = useState(false)
    const request = useRef(0), resultsRequest = useRef(0), mounted = useRef(true), mutation = useRef(false)
    const sequence = sequences.find(item => item.id === sequenceId)
    const steps = sequence?.steps || []
    const config = JSON.stringify({ connectionId, scheduledFor, delivery })
    const audienceDirty = !hasAudience || JSON.stringify(filters) !== savedFilters
    const configDirty = config !== savedConfig
    const editable = status === 'draft' && canManage && !loading && !busy && !error

    const unsaved = !loading && status === 'draft' && (
        isNew
            ? (!!title.trim() || !!connectionId)
            : (!!savedConfig && (configDirty || JSON.stringify(filters) !== savedFilters))
    )
    useEffect(() => { onDirtyChange?.(unsaved) }, [unsaved, onDirtyChange])
    useEffect(() => { onBusyChange?.(busy) }, [busy, onBusyChange])
    useEffect(() => {
        if (!unsaved) return
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
        window.addEventListener('beforeunload', warn)
        return () => window.removeEventListener('beforeunload', warn)
    }, [unsaved])

    useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; request.current++ } }, [])
    async function load() {
        if (!currentId && hasInitialChannels) {
            // Synchronous instant-open in creation mode using dashboard preloaded channels
            return
        }
        const epoch = ++request.current
        resultsRequest.current++
        setLoading(true); setError('')
        try {
            if (!currentId) {
                const [setup, emailSetup] = await Promise.all([
                    getMarketingSetup(), getMarketingEmailSenders(),
                ])
                if (!mounted.current || epoch !== request.current) return
                if (!setup.success) {
                    throw new Error('No se pudo cargar la configuración de canales.')
                }
                setCanManage(setup.canManage); setCanExecute(setup.canExecute); setCanImport(setup.canImport); setExecutionEnabled(setup.canExecute)
                const allChannels = [...setup.channels, ...(emailSetup.success ? emailSetup.channels : [])]
                setChannels(allChannels)
                if (!emailSetup.success) toast.error(emailSetup.error)

                let selectedEmitter = ''
                if (initialChannel === 'email') {
                    selectedEmitter = (emailSetup.success && emailSetup.channels[0]?.id) || ''
                } else {
                    selectedEmitter = setup.channels[0]?.id || ''
                }
                if (!selectedEmitter && allChannels.length > 0) {
                    selectedEmitter = allChannels[0].id
                }

                setConnectionId(selectedEmitter); setSavedConnection('')
                setDelivery(defaultDelivery); setScheduledFor('')
                savedSchedule.current = { input: '', iso: null }
                const initialFilters = (selectedEmitter ? selectedEmitter.startsWith('smtp:') : initialChannel === 'email')
                    ? { has_email: true }
                    : { has_phone: true }
                setFilters(initialFilters); setSavedFilters(JSON.stringify(initialFilters))
                setHasAudience(false)
                setSavedConfig(JSON.stringify({ connectionId: '', scheduledFor: '', delivery: defaultDelivery }))
                setSequences([]); setSequenceId('')
                setMetrics(null); setStatus('draft')
                return
            }

            const [campaign, flows, audience, results, setup, emailSetup] = await Promise.all([
                getCampaign(currentId), getSequences(currentId), getCampaignAudience(currentId), getCampaignStats(currentId), getMarketingSetup(), getMarketingEmailSenders(),
            ])
            if (!mounted.current || epoch !== request.current) return
            if (!campaign.success || !campaign.campaign || !flows.success || !audience.success || !setup.success) {
                throw new Error('No se pudo cargar toda la campaña. Reintenta antes de editar.')
            }
            const stored = campaign.campaign
            if (stored.name) { setTitle(stored.name); savedTitle.current = stored.name }
            setStatus(stored.status); setExecutionEnabled(campaign.executionEnabled === true)
            if (stored.status !== 'draft') setTab('results')
            setCanManage(setup.canManage); setCanExecute(setup.canExecute); setCanImport(setup.canImport); setChannels([...setup.channels, ...(emailSetup.success ? emailSetup.channels : [])])
            if (!emailSetup.success) toast.error(emailSetup.error)
            const emitter = stored.channel === 'email' && stored.smtp_config_id ? `smtp:${stored.smtp_config_id}` : stored.connection_id || '', date = localInput(stored.scheduled_for || null)
            const storedDelivery = stored.delivery_config
            const config: DeliveryConfig = storedDelivery ? { mode: storedDelivery.mode || defaultDelivery.mode, humanize: storedDelivery.humanize ?? defaultDelivery.humanize, timezone: storedDelivery.timezone || 'America/Bogota', recipient_cooldown_hours: storedDelivery.recipient_cooldown_hours, schedule_window: storedDelivery.schedule_window } : defaultDelivery
            setConnectionId(emitter); setSavedConnection(emitter); setDelivery(config); setScheduledFor(date)
            savedSchedule.current = { input: date, iso: stored.scheduled_for || null }
            setSavedConfig(JSON.stringify({ connectionId: emitter, scheduledFor: date, delivery: config }))
            const recipientFilters = audience.audience?.filters || (stored.channel === 'email' ? { has_email: true } : { has_phone: true })
            setFilters(recipientFilters); setSavedFilters(JSON.stringify(recipientFilters)); setHasAudience(!!audience.audience)
            setSequences(flows.sequences || []); setSequenceId(flows.sequences?.find(item => item.is_active)?.id || flows.sequences?.[0]?.id || '')
            setMetrics(results.success ? results : null); setRevision(value => value + 1)
        } catch (failure) { if (mounted.current && epoch === request.current) setError(failure instanceof Error ? failure.message : 'No se pudo cargar la campaña.') }
        finally { if (mounted.current && epoch === request.current) setLoading(false) }
    }
    async function refreshResults() {
        if (!currentId) return
        const epoch = ++resultsRequest.current
        try {
            const [result, campaign] = await Promise.all([getCampaignStats(currentId), getCampaign(currentId)])
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
        try { await operation(); onMutated?.() }
        catch (failure) { if (mounted.current) toast.error(failure instanceof Error ? failure.message : 'No se pudo guardar. Actualiza antes de reintentar.') }
        finally { mutation.current = false; if (mounted.current) setBusy(false) }
    }
    async function refreshSteps() {
        if (!currentId) return
        const result = await getSequences(currentId)
        if (!result.success) { if (mounted.current) setError('No se pudo actualizar el diseño. Recarga antes de seguir editando.'); throw new Error(result.error) }
        if (mounted.current) { setSequences(result.sequences || []); setRevision(value => value + 1) }
    }
    async function moveStep(index: number, direction: -1 | 1) {
        if (!currentId) return
        const expected = steps.map(item => item.id)
        const order = adjacentStepOrder(expected, index, direction)
        if (!order) return
        const result = await reorderCampaignSteps({ campaignId: currentId, sequenceId, expected, order })
        if (!result.success) throw new Error(result.error)
        if (!mounted.current) return
        await refreshSteps(); toast.success('Orden guardado. Revisa la secuencia antes de activar.')
    }
    async function saveEmitter(notify = true) {
        if (!currentId) return
        if (!connectionId) throw new Error('Elige un número emisor.')
        const result = await saveCampaignSender(currentId, connectionId)
        if (!result.success) throw new Error(result.error)
        if (!mounted.current) return
        setSavedConnection(connectionId)
        setSavedConfig(previous => JSON.stringify({ ...JSON.parse(previous), connectionId }))
        setRevision(value => value + 1); if (notify) toast.success('Emisor guardado. Revisa el mensaje antes de activar.')
    }
    async function saveRecipients(notify = true) {
        if (!currentId) return
        const cleaned = { ...filters, tags: filters.tags?.map(value => value.trim()).filter(Boolean) }
        const result = await saveCampaignAudience(currentId, cleaned)
        if (!result.success) throw new Error(result.error)
        if (!mounted.current) return
        setFilters(cleaned); setSavedFilters(JSON.stringify(cleaned)); setHasAudience(true); setRevision(value => value + 1)
        if (notify) toast.success('Destinatarios guardados. No se inscribió ni envió ningún mensaje.')
    }
    function openStep(type: string, existing?: MarketingStep) {
        if (!editable) return
        setStep(existing ? { id: existing.id, type: existing.type, name: existing.name, delay: String(existing.delay_config?.value ?? existing.delay_config?.duration ?? 1), unit: existing.delay_config?.unit || 'days' } : { ...emptyStep, type })
        setTemplate(existing?.content?.template_id ? existing.content : null); setEmailContent(existing?.type === 'email' ? { subject: existing.content.subject || '', body: existing.content.body || '' } : { subject: '', body: '' }); setStepOpen(true)
    }
    async function saveStep() {
        if (!currentId) return
        if (step.type === 'whatsapp' && (!template || !savedConnection || connectionId !== savedConnection)) throw new Error('Selecciona y guarda el emisor antes de configurar el mensaje.')
        if (step.type === 'email') { if (!email || connectionId !== savedConnection) throw new Error('Guarda el emisor de email antes de configurar el mensaje.'); emailContentSchema.parse(emailContent) }
        let target = sequenceId
        if (!target) {
            const created = await createSequence({ name: 'Mensajes de campaña', campaign_id: currentId, trigger_type: 'manual' })
            if (!created.success || !created.sequence) throw new Error(created.error || 'No se pudo preparar el mensaje.')
            target = created.sequence.id
            if (mounted.current) { setSequenceId(target); setSequences([created.sequence]) }
        }
        const data = {
            type: step.type, name: step.name.trim() || (step.type === 'delay' ? 'Esperar' : `Mensaje ${steps.filter(item => item.type !== 'delay').length + 1}`),
            content: step.type === 'delay' ? {} : step.type === 'email' ? emailContent : template!, delay_config: step.type === 'delay' ? { value: Number(step.delay), unit: step.unit } : undefined
        }
        const result = step.id ? await updateStep(step.id, data) : await addStepToSequence(target, data)
        if (!result.success) throw new Error(result.error)
        if (!mounted.current) return
        setStepOpen(false); await refreshSteps(); toast.success('Contenido guardado.')
    }
    async function saveSchedule(notify = true) {
        if (!currentId) return
        const iso = scheduledFor === savedSchedule.current.input ? savedSchedule.current.iso : scheduledFor ? new Date(scheduledFor).toISOString() : null
        if (scheduledFor !== savedSchedule.current.input && iso && Date.parse(iso) <= Date.now()) throw new Error('Elige una fecha futura o empieza al confirmar.')
        const result = await updateCampaign(currentId, { delivery_config: delivery, scheduled_for: iso })
        if (!result.success) throw new Error(result.error)
        if (!mounted.current) return
        savedSchedule.current = { input: scheduledFor, iso }
        setSavedConfig(previous => JSON.stringify({ ...JSON.parse(previous), scheduledFor, delivery }))
        setRevision(value => value + 1); if (notify) toast.success('Programación guardada.')
    }
    async function createAndSaveCampaign(autoOpenStep = false) {
        const trimmedTitle = title.trim()
        if (!trimmedTitle) throw new Error('Escribe un nombre para la campaña antes de continuar.')
        if (!connectionId) throw new Error('Selecciona un canal emisor para la campaña.')
        const iso = scheduledFor ? new Date(scheduledFor).toISOString() : null
        if (iso && Date.parse(iso) <= Date.now()) throw new Error('Elige una fecha futura o empieza al confirmar.')
        const isEmail = connectionId.startsWith('smtp:')
        const created = await createCampaign({
            name: trimmedTitle,
            channel: isEmail ? 'email' : 'whatsapp',
            connection_id: isEmail ? undefined : connectionId,
            smtp_config_id: isEmail ? connectionId.replace('smtp:', '') : undefined,
            delivery_mode: delivery.mode || 'growth',
        })
        if (!created.success || !created.campaign) throw new Error(created.error || 'No se pudo crear la campaña.')
        const newId = created.campaign.id
        savedTitle.current = trimmedTitle
        setCurrentId(newId)
        onCreated?.(newId)

        const cleanedFilters = { ...filters, tags: filters.tags?.map(v => v.trim()).filter(Boolean) }
        const [audienceResult, scheduleResult] = await Promise.all([
            saveCampaignAudience(newId, cleanedFilters),
            updateCampaign(newId, { delivery_config: delivery, scheduled_for: iso }),
        ])

        if (mounted.current) {
            setSavedConnection(connectionId)
            if (scheduleResult.success) {
                savedSchedule.current = { input: scheduledFor, iso }
                setSavedConfig(JSON.stringify({ connectionId, scheduledFor, delivery }))
            } else {
                setSavedConfig(JSON.stringify({ connectionId, scheduledFor: '', delivery: defaultDelivery }))
            }
            if (audienceResult.success) {
                setSavedFilters(JSON.stringify(cleanedFilters))
                setHasAudience(true)
            }
            setRevision(v => v + 1)
        }
        if (!audienceResult.success || !scheduleResult.success) {
            toast.error('Campaña creada, pero parte de la configuración no se guardó. Revisa y pulsa «Guardar configuración».')
        } else {
            toast.success('Campaña creada. Aún no se envían mensajes.')
        }
        if (autoOpenStep && mounted.current) {
            // openStep() checks `editable`, which is false while this save is in flight.
            setStep({ ...emptyStep, type: isEmail ? 'email' : 'whatsapp' })
            setTemplate(null); setEmailContent({ subject: '', body: '' }); setStepOpen(true)
        }
    }
    async function saveConfiguration() {
        if (!currentId) {
            await createAndSaveCampaign(false)
            return
        }
        if (connectionId !== savedConnection) await saveEmitter(false)
        if (audienceDirty) await saveRecipients(false)
        const previous = JSON.parse(savedConfig)
        if (scheduledFor !== previous.scheduledFor || JSON.stringify(delivery) !== JSON.stringify(previous.delivery)) await saveSchedule(false)
        if (mounted.current) toast.success('Configuración guardada. Aún no se envían mensajes.')
    }
    const closeStep = () => { if (!busy) setStepOpen(false) }
    return <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-5 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
                <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                    email
                        ? "border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                )}>
                    {email ? <Mail className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Campañas masivas · {email ? 'Email' : 'WhatsApp'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <h2 className="max-w-[480px] truncate text-base font-bold tracking-tight text-foreground">
                            {title.trim() || (isNew ? (email ? 'Nueva campaña de Email' : 'Nueva campaña de WhatsApp') : 'Campaña sin nombre')}
                        </h2>
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[11px] font-semibold",
                                isNew
                                    ? "border-primary/25 bg-primary/10 text-primary"
                                    : status === 'active'
                                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                    : "bg-muted/40 text-muted-foreground"
                            )}
                        >
                            {isNew ? 'Borrador' : campaignStateLabels[status]}
                        </Badge>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1.5">
                {!isNew && canExecute && (status === 'active' || status === 'paused') && (
                    <Button
                        size="sm"
                        disabled={busy || loading || !!error}
                        variant="outline"
                        className="rounded-lg h-8 text-xs font-semibold"
                        onClick={() => status === 'paused' ? setActivationOpen(true) : void edit(async () => { const result = await updateCampaign(currentId!, { status: 'paused' }); if (!result.success) throw new Error(result.error); await refreshResults() })}
                    >
                        {status === 'active' ? 'Pausar campaña' : 'Revisar reanudación'}
                    </Button>
                )}
                {!isNew && (
                    <Button
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        aria-label="Recargar diseño"
                        title="Recargar diseño"
                        variant="ghost"
                        disabled={busy || loading}
                        onClick={() => { if (!unsaved || window.confirm('Hay cambios sin guardar. ¿Descartarlos y cargar el diseño guardado?')) void load() }}
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                )}
                {onClose ? (
                    <Button
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        aria-label="Cerrar campaña"
                        variant="ghost"
                        disabled={busy}
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button size="sm" variant="outline" asChild>
                        <Link href="/crm/marketing">Campañas masivas</Link>
                    </Button>
                )}
            </div>
        </header>
        <Tabs value={tab} onValueChange={value => setTab(value as Stage)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-5 py-2">
                <TabsList className="h-9 gap-1 rounded-xl bg-muted/50 p-1">
                    <TabsTrigger value="configuration" className="gap-2 rounded-lg px-4 text-xs font-semibold"><Pencil className="h-3.5 w-3.5" />Preparación</TabsTrigger>
                    <TabsTrigger value="results" className="gap-2 rounded-lg px-4 text-xs font-semibold" disabled={isNew}><MessageSquare className="h-3.5 w-3.5" />Actividad</TabsTrigger>
                </TabsList>
                <span className="text-[11px] text-muted-foreground">{loading ? 'Cargando datos…' : busy ? 'Guardando…' : isNew ? 'Modo creación' : unsaved ? 'Cambios sin guardar' : 'Diseño guardado'}</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/10 p-4 sm:p-5">
                {loading && <p role="status">Cargando campaña…</p>}
                {error && <p role="alert" className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error} <button className="underline" onClick={() => void load()}>Reintentar</button></p>}
                <TabsContent value="configuration" className="mt-0 space-y-4">
                    {!loading && status === 'draft' && !executionEnabled && <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">Los envíos masivos están deshabilitados en este entorno. Puedes preparar y guardar el borrador.</p>}
                    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="min-w-0 space-y-4">
                            <CampaignSection title="1. Canal" icon={<Users className="h-4 w-4 text-primary" />}>
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="campaign-name-input" className="text-xs font-semibold text-foreground">Nombre de la campaña *</Label>
                                        <Input
                                            id="campaign-name-input"
                                            aria-label="Nombre de la campaña"
                                            placeholder={email ? "Ej: Newsletter Clientes VIP / Promoción Mensual" : "Ej: Lanzamiento Exclusivo WhatsApp 2026"}
                                            value={title}
                                            disabled={!editable}
                                            onChange={e => setTitle(e.target.value)}
                                            onBlur={() => {
                                                const trimmed = title.trim()
                                                if (!currentId) return
                                                if (!trimmed) { setTitle(savedTitle.current); return }
                                                if (trimmed === savedTitle.current) return
                                                void edit(async () => {
                                                    const result = await updateCampaign(currentId, { name: trimmed })
                                                    if (!result.success) throw new Error(result.error || 'No se pudo renombrar la campaña.')
                                                    savedTitle.current = trimmed
                                                    if (mounted.current) setTitle(trimmed)
                                                })
                                            }}
                                            className="h-9 rounded-xl bg-background text-xs font-medium"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-foreground">{email ? 'Servidor SMTP emisor' : 'Número emisor de WhatsApp'} *</Label>
                                        <Select value={connectionId} disabled={!editable} onValueChange={id => { setConnectionId(id); if (id.startsWith('smtp:') !== email) setFilters({ ...(id.startsWith('smtp:') ? { has_email: true } : { has_phone: true }), ...(filters.list_id ? { list_id: filters.list_id } : {}) }) }}>
                                            <SelectTrigger aria-label="Número emisor de campaña" className="h-9 rounded-xl bg-background text-xs"><SelectValue placeholder="Selecciona un canal conectado" /></SelectTrigger>
                                            <SelectContent>{channels.map(channel => <SelectItem key={channel.id} value={channel.id}>{channel.id.startsWith('smtp:') ? 'Email · ' : 'WhatsApp · '}{channel.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                        {!channels.length && !loading && <p className="text-xs text-muted-foreground">No hay canales activos disponibles. Revisa <Link href="/crm/settings/channels" className="underline">Canales</Link>.</p>}
                                        {savedConnection && !channels.some(channel => channel.id === savedConnection) && <p role="alert" className="text-xs text-amber-700">El emisor guardado ya no está disponible. Revisa su conexión.</p>}
                                    </div>
                                </div>
                            </CampaignSection>
                            <CampaignSection title="2. Mensaje" icon={<MessageSquare className="h-4 w-4 text-primary" />}>
                                {isNew ? (
                                    <div className="flex flex-col items-center rounded-xl border border-dashed border-primary/25 bg-primary/[0.03] px-4 py-6 text-center">
                                        <div className={cn(
                                            "mb-3 flex h-10 w-10 items-center justify-center rounded-xl",
                                            email ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        )}>
                                            {email ? <Mail className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                                        </div>
                                        <h4 className="text-sm font-semibold text-foreground">Tu mensaje empieza aquí</h4>
                                        <p className="mb-4 mt-1 text-xs text-muted-foreground max-w-md">
                                            {email
                                                ? 'Escribe el asunto y el cuerpo del correo corporativo. Pixy incluirá el pie legal y enlace de baja automáticamente.'
                                                : 'Elige una plantilla aprobada por Meta y personaliza sus variables con datos de cada contacto.'}
                                        </p>
                                        <Button
                                            size="sm"
                                            className="rounded-xl px-4 font-semibold"
                                            disabled={busy || !title.trim() || !connectionId}
                                            onClick={() => void edit(() => createAndSaveCampaign(true))}
                                        >
                                            <Plus className="mr-2 h-3.5 w-3.5" />
                                            Configurar mensaje
                                        </Button>
                                        {(!title.trim() || !connectionId) && (
                                            <p className="mt-2 text-[10px] text-muted-foreground">
                                                Escribe el nombre y confirma el canal emisor arriba para configurar el mensaje.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        {sequences.length > 1 && <details className="rounded-xl border border-border/60 p-3">
                                            <summary className="cursor-pointer text-xs">Secuencias existentes · avanzado</summary>
                                            <div className="space-y-3 pt-3">
                                                <p className="text-xs text-muted-foreground">Solo se ejecuta la secuencia principal. Las otras se conservan.</p>
                                                <Select value={sequenceId} onValueChange={setSequenceId}><SelectTrigger aria-label="Secuencia existente"><SelectValue /></SelectTrigger><SelectContent>{sequences.map(item => <SelectItem key={item.id} value={item.id}>{item.name}{item.is_active ? ' · principal' : ''}</SelectItem>)}</SelectContent></Select>
                                                {sequence && !sequence.is_active && <Button disabled={!editable} variant="outline" onClick={() => void edit(async () => { const r = await setPrincipalSequence(currentId!, sequenceId); if (!r.success) throw new Error(r.error); await refreshSteps() })}>Usar como principal</Button>}
                                            </div>
                                        </details>}
                                        {sequence && !sequence.is_active && <p role="alert" className="text-xs text-amber-700">Esta secuencia no es la principal. La revisión final usa la principal.</p>}
                                        {!savedConnection || savedConnection !== connectionId ? <p role="alert" className="rounded-xl bg-muted/40 p-3 text-xs">Cambiaste el emisor. Pulsa «Guardar configuración» para seguir editando el mensaje.</p> : <>
                                            {!steps.length && <div className="flex flex-col items-center rounded-xl border border-dashed border-primary/25 bg-primary/[0.03] px-4 py-6 text-center">
                                                <MessageSquare className="mb-3 h-7 w-7 text-primary/60" />
                                                <h4 className="text-sm font-semibold">Tu mensaje empieza aquí</h4>
                                                <p className="mb-4 mt-1 text-xs text-muted-foreground">{email ? 'Escribe el asunto y el mensaje. Pixy incluirá el enlace de baja.' : 'Elige una plantilla aprobada y personaliza sus variables.'}</p>
                                                <Button size="sm" disabled={!editable} onClick={() => openStep(email ? 'email' : 'whatsapp')}><Plus className="mr-2 h-3.5 w-3.5" />Configurar mensaje</Button>
                                            </div>}
                                            <ol className="space-y-2">{steps.map((item, index) => <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-primary shadow-xs">{item.type === 'delay' ? <Timer className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}</span>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-xs font-semibold">{index + 1}. {item.type === 'delay' ? 'Esperar' : item.name}</h4>
                                                    <p className="mt-0.5 text-[11px] text-muted-foreground">{item.type === 'delay' ? `${item.delay_config?.value ?? item.delay_config?.duration} ${({ minutes: 'minutos', hours: 'horas', days: 'días' } as Record<string, string>)[item.delay_config?.unit] || item.delay_config?.unit}` : item.type === 'email' ? item.content?.subject || 'Asunto pendiente' : item.content?.template_name || 'Plantilla pendiente de configurar'}</p>
                                                </div>
                                                <div className="flex items-center gap-0.5">
                                                    <Button disabled={!editable || index === 0} aria-label={`Subir paso ${index + 1}`} title="Subir" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void edit(() => moveStep(index, -1))}><ArrowUp className="h-3.5 w-3.5" /></Button>
                                                    <Button disabled={!editable || index === steps.length - 1} aria-label={`Bajar paso ${index + 1}`} title="Bajar" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void edit(() => moveStep(index, 1))}><ArrowDown className="h-3.5 w-3.5" /></Button>
                                                    <Button disabled={!editable} aria-label="Editar" title="Editar" variant="ghost" size="icon" className="h-7 w-7" onClick={() => openStep(item.type, item)}><Pencil className="h-3.5 w-3.5" /></Button>
                                                    <Button disabled={!editable} aria-label="Eliminar paso" title="Eliminar paso" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => { if (window.confirm('¿Eliminar este paso del borrador?')) void edit(async () => { const r = await deleteStep(item.id); if (!r.success) throw new Error(r.error); await refreshSteps() }) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                                </div>
                                            </li>)}</ol>
                                            {!!steps.length && <details open={followup} onToggle={event => setFollowup(event.currentTarget.open)} className="pt-1">
                                                <summary className="cursor-pointer text-xs text-muted-foreground">Añadir seguimiento · opcional</summary>
                                                <p className="mt-2 text-[11px] text-muted-foreground">Añade una espera antes del siguiente mensaje para separarlos en el tiempo.</p>
                                                <div className="mt-2 flex gap-2"><Button size="sm" disabled={!editable} variant="outline" onClick={() => openStep('delay')}>Añadir espera</Button><Button size="sm" disabled={!editable} variant="outline" onClick={() => openStep(email ? 'email' : 'whatsapp')}>Añadir mensaje</Button></div>
                                            </details>}
                                        </>}
                                    </>
                                )}
                            </CampaignSection>
                            <CampaignSection title="3. Destinatarios" icon={<Users className="h-4 w-4 text-primary" />}
                                action={<Button className="h-7 text-[11px]" size="sm" variant="ghost" disabled={!editable || !canImport} onClick={() => setImportOpen(true)}>Importar lista</Button>}>
                                <CampaignContactLists channel={email ? 'email' : 'whatsapp'} value={filters.list_id} disabled={!editable} refresh={revision} canAuthorize={canExecute} onAuthorized={count => { setRevision(value => value + 1); toast.success(`Declaración registrada para ${count} contactos. Aún no se envían mensajes.`) }} onSelect={id => setFilters(id ? { ...baseFilters, list_id: id } : baseFilters)} />
                                <CampaignRecipientFilters channel={email ? 'email' : 'whatsapp'} value={filters} onChange={setFilters} disabled={!editable} refresh={revision} />
                                <details className="rounded-xl border border-border/60 bg-muted/20 p-3" open={segmentsOpen} onToggle={event => setSegmentsOpen(event.currentTarget.open)}>
                                    <summary className="cursor-pointer text-xs font-medium">Selecciones guardadas · opcional</summary>
                                    {segmentsOpen && <CampaignSavedSegments disabled={!editable} filters={filters} onApply={setFilters} />}
                                </details>
                                <p className="text-[11px] text-muted-foreground">Los contactos no se convierten en oportunidades automáticamente. Puedes elegir su etapa comercial en el CRM cuando corresponda.</p>
                            </CampaignSection>
                        </div>
                        <aside className="space-y-4">
                            <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                                <p className="text-sm font-semibold">4. Revisar y enviar</p>
                                <p className="mt-2 text-xs text-muted-foreground">{scheduledFor ? `Inicio: ${new Date(scheduledFor).toLocaleString()}` : 'Inicio al confirmar'}{delivery.schedule_window ? ` · ${delivery.schedule_window.start}:00–${delivery.schedule_window.end}:00 (${delivery.timezone})` : ' · Sin ventana diaria'}</p>
                                <p className="mt-2 text-xs text-muted-foreground">Guarda los cambios y abre la revisión final. Allí confirmarás destinatarios y mensaje antes de activar.</p>
                            </div>
                            <details className="space-y-3"><summary className="cursor-pointer text-xs font-medium">Programar envío · opcional</summary>
                            <CampaignSection title="Inicio y horario" icon={<CalendarClock className="h-4 w-4 text-primary" />}>
                                <div className="space-y-2">
                                    <Label htmlFor="campaign-date">Fecha de inicio · hora local del navegador</Label>
                                    <Input id="campaign-date" className="h-9 rounded-xl text-xs" type="datetime-local" disabled={!editable} value={scheduledFor} onChange={event => setScheduledFor(event.target.value)} />
                                    {scheduledFor ? <Button disabled={!editable} variant="ghost" size="sm" className="h-6 px-0 text-[11px]" onClick={() => setScheduledFor('')}>Empezar al confirmar</Button> : <p className="text-[11px] text-muted-foreground">Al confirmar, dentro del horario permitido.</p>}
                                </div>
                                <label className="flex gap-2 text-xs"><input type="checkbox" disabled={!editable} checked={!!delivery.schedule_window} onChange={event => setDelivery({ ...delivery, schedule_window: event.target.checked ? { start: 9, end: 18 } : undefined })} />Limitar a una ventana diaria</label>
                                <div className="space-y-2"><Label htmlFor="campaign-recipient-frequency">Espera entre campañas para un mismo contacto · horas</Label><Input id="campaign-recipient-frequency" type="number" min={0} max={720} step={1} disabled={!editable} value={delivery.recipient_cooldown_hours ?? 0} onChange={event => setDelivery({ ...delivery, recipient_cooldown_hours: Number(event.target.value) })} /><p className="text-[11px] text-muted-foreground">Compartida entre emisores del mismo canal en tu organización. Se respeta la mayor espera de ambas campañas. 0 desactiva la espera de esta campaña. {email ? 'Las bajas detienen sus siguientes envíos. Las respuestas llegan al buzón del emisor.' : 'Si el contacto responde, se detienen sus seguimientos pendientes.'}</p></div>
                                {delivery.schedule_window && <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1"><Label htmlFor="campaign-window-start">Desde · hora 0–23</Label><Input className="h-9 rounded-xl" id="campaign-window-start" type="number" min={0} max={23} disabled={!editable} value={delivery.schedule_window.start} onChange={event => setDelivery({ ...delivery, schedule_window: { ...delivery.schedule_window!, start: Number(event.target.value) } })} /></div>
                                    <div className="space-y-1"><Label htmlFor="campaign-window-end">Hasta · hora 1–24</Label><Input className="h-9 rounded-xl" id="campaign-window-end" type="number" min={1} max={24} disabled={!editable} value={delivery.schedule_window.end} onChange={event => setDelivery({ ...delivery, schedule_window: { ...delivery.schedule_window!, end: Number(event.target.value) } })} /></div>
                                </div>}
                                <div className="space-y-1"><Label htmlFor="campaign-timezone">Zona horaria de la ventana</Label><Input className="h-9 rounded-xl text-xs" id="campaign-timezone" disabled={!editable} value={delivery.timezone || 'America/Bogota'} onChange={event => setDelivery({ ...delivery, timezone: event.target.value })} /></div>
                            </CampaignSection>
                            </details>
                            <CampaignSection title="Ritmo de envío" icon={<Send className="h-4 w-4 text-primary" />}>
                                <CampaignPacing channel={email ? 'email' : 'whatsapp'} value={delivery} disabled={!editable} onChange={setDelivery} />
                            </CampaignSection>
                            <div className="flex gap-2 rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
                                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <p>Guardar no envía. Antes de activar se revisan destinatarios, bajas, mensaje y disponibilidad del canal.</p>
                            </div>
                        </aside>
                    </div>
                    {!isNew && currentId && (
                        <details className="rounded-xl border border-border/60 bg-background">
                            <summary className="cursor-pointer px-4 py-3 text-xs font-medium">Gestionar autorizaciones · opcional</summary>
                            <div className="border-t border-border/50 p-3"><CampaignReadiness channel={email ? 'email' : 'whatsapp'} permissionsOnly campaignId={currentId} revision={revision} canExecute={canExecute} onChanged={() => setRevision(value => value + 1)} /></div>
                        </details>
                    )}
                </TabsContent>
                <TabsContent value="results" className="mt-0">
                    {currentId && <CampaignResults key={`${currentId}:${metrics?.channelHealth?.holdAt || ''}`} campaignId={currentId} connectionId={savedConnection} metrics={metrics} canExecute={canExecute} onRefresh={refreshResults} />}
                </TabsContent>
            </div>
        </Tabs>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-card px-5 py-3">
            <p className="text-[11px] text-muted-foreground">
                {isNew
                    ? 'Guarda la campaña para registrar su borrador y proceder a configurar los mensajes.'
                    : status === 'draft'
                    ? 'El contenido se guarda al editarlo. La configuración se guarda aquí.'
                    : 'El diseño está protegido durante y después de la ejecución.'}
            </p>
            <div className="flex items-center gap-2">
                {isNew ? (
                    <Button
                        size="sm"
                        className="rounded-lg shadow-sm"
                        disabled={busy || loading || !title.trim() || !connectionId}
                        onClick={() => void edit(() => createAndSaveCampaign(false))}
                    >
                        <Save className="mr-2 h-3.5 w-3.5" />
                        Crear campaña
                    </Button>
                ) : (
                    <>
                        {status === 'draft' && (
                            <Button
                                size="sm"
                                className="rounded-lg"
                                variant="outline"
                                disabled={!editable || !(audienceDirty || configDirty)}
                                onClick={() => void edit(saveConfiguration)}
                            >
                                <Save className="mr-2 h-3.5 w-3.5" />
                                Guardar configuración
                            </Button>
                        )}
                        {['draft', 'paused'].includes(status) && (
                            <Button
                                size="sm"
                                className="rounded-lg"
                                disabled={!canExecute || busy || loading || !!error || (status === 'draft' && (audienceDirty || configDirty))}
                                onClick={() => setActivationOpen(true)}
                            >
                                <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                                {status === 'paused' ? 'Abrir revisión de reanudación' : 'Revisar y enviar'}
                            </Button>
                        )}
                    </>
                )}
            </div>
        </footer>
        {importOpen && <CampaignImport channel={email ? 'email' : 'whatsapp'} onImported={list => { setFilters({ ...baseFilters, list_id: list.id }); toast.success(`Lista seleccionada: ${list.name}. Guarda los destinatarios antes de revisar.`) }} onClose={() => { setImportOpen(false); setRevision(value => value + 1) }} />}
        {activationOpen && currentId && <CampaignActivationReview key={`${currentId}:${revision}`} campaignId={currentId} onClose={() => setActivationOpen(false)} onActivated={() => { setActivationOpen(false); setTab('results'); void refreshResults() }} />}
        <Dialog open={stepOpen} onOpenChange={open => { if (!open) closeStep() }}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-border bg-card"><DialogHeader><DialogTitle>{step.type === 'delay' ? 'Espera entre mensajes' : 'Configurar mensaje'}</DialogTitle><DialogDescription>Se guarda en el borrador. La revisión final valida nuevamente su disponibilidad y las variables.</DialogDescription></DialogHeader>
            <fieldset disabled={busy} className="space-y-4">{step.type === 'delay' ? <><Label htmlFor="step-delay">Tiempo de espera</Label><Input id="step-delay" type="number" min={1} max={365} value={step.delay} onChange={event => setStep({ ...step, delay: event.target.value })} /><Select disabled={busy} value={step.unit} onValueChange={unit => setStep({ ...step, unit })}><SelectTrigger aria-label="Unidad de espera"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="minutes">Minutos</SelectItem><SelectItem value="hours">Horas</SelectItem><SelectItem value="days">Días</SelectItem></SelectContent></Select></> : step.type === 'email' ? <MarketingEmailEditor disabled={busy} value={emailContent} onChange={setEmailContent} /> : <MarketingTemplateEditor disabled={busy} connectionId={savedConnection} value={template} onChange={setTemplate} />}
                <details><summary className="cursor-pointer text-sm">Nombre interno · opcional</summary><Label htmlFor="step-name">Nombre</Label><Input id="step-name" maxLength={160} value={step.name} onChange={event => setStep({ ...step, name: event.target.value })} /></details>
            </fieldset><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={closeStep}>Cancelar</Button><Button disabled={!editable || (step.type === 'whatsapp' && !template) || (step.type === 'email' && !emailContentSchema.safeParse(emailContent).success)} onClick={() => void edit(saveStep)}>{busy ? 'Guardando…' : 'Guardar contenido'}</Button></div>
        </DialogContent></Dialog>
    </div>
}
