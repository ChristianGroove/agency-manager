'use client'

import { useMarketingApi, useMarketingExample } from '../marketing-client-api'
import { CampaignDiscardDialog } from './campaign-discard-dialog'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CalendarClock, ChevronDown, MessageSquare, Users, X, RefreshCw, Save, Send, ArrowUp, ArrowDown, Timer, Plus, Pencil, Trash2, Mail, Smartphone, ArrowRight, Loader2 } from 'lucide-react'
import { MarketingEmailEditor } from './marketing-email-editor'

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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './campaign-dialog'
import type { Sequence, MarketingStep } from '../marketing-actions'

import { adjacentStepOrder } from '../marketing-editor-utils'
import type { MarketingChannel } from '../marketing-preflight-actions'
import { campaignStateLabels } from '../marketing-workspace'
import type { CampaignMetrics } from '../marketing-metrics'
import type { DeliveryConfig } from '../marketing-utils'
import type { CampaignTemplate, TemplateSelection } from '../marketing-template-contract'
import { previewMarketingTemplate } from '../marketing-template-preview'
import { MarketingTemplateEditor } from './marketing-template-editor'
import { CampaignRecipientFilters, RecipientFilters } from './campaign-recipient-filters'
import { CampaignReadiness } from './campaign-readiness'
import { toast } from 'sonner'
import { cn } from '@/modules/infrastructure/utils/utils'

const CampaignImport = dynamic(() => import('./campaign-import').then(module => module.CampaignImport))
const CampaignResults = dynamic(() => import('./campaign-results').then(module => module.CampaignResults))
const CampaignContactLists = dynamic(() => import('./campaign-contact-lists').then(module => module.CampaignContactLists))
const CampaignSavedSegments = dynamic(() => import('./campaign-saved-segments').then(module => module.CampaignSavedSegments))
const defaultDelivery: DeliveryConfig = { mode: 'growth', humanize: true, timezone: 'America/Bogota', recipient_cooldown_hours: 24, schedule_window: { start: 9, end: 18 } }
const localInput = (iso: string | null) => iso ? new Date(Date.parse(iso) - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
const emptyStep = { id: null as string | null, type: 'whatsapp', name: '', delay: '1', unit: 'days' }
type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'
type Stage = 'configuration' | 'results'
type PendingMessage = { type: 'email'; name: string; content: { subject: string; body: string } } | { type: 'whatsapp'; name: string; content: TemplateSelection }
type EditorProps = {
    campaignId?: string | null;
    campaignName?: string;
    initialChannel?: 'whatsapp' | 'email';
    initialChannels?: MarketingChannel[];
    initialCanManage?: boolean;
    initialCanExecute?: boolean;
    initialCanImport?: boolean;
    initialExecutionEnabled?: boolean;
    onClose?: () => void;
    onCreated?: (id: string) => void;
    onDirtyChange?: (dirty: boolean) => void;
    onBusyChange?: (busy: boolean) => void;
    onMutated?: () => void;
}
function CampaignSection({ title, icon, children, action, id, className }: { title?: string; icon?: ReactNode; children: ReactNode; action?: ReactNode; id?: string; className?: string }) {
    return <section id={id} className={cn('scroll-mt-4 overflow-hidden rounded-2xl border border-border/60 bg-card', className)}>
        {title && <div className="flex items-center justify-between gap-2 px-4 pb-0 pt-4 sm:px-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">{icon}{title}</h3>{action}
        </div>}
        <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </section>
}

export function CampaignBuilder(props: EditorProps) {
    // A route change gets its own form and ignores outstanding requests from the previous campaign.
    return <CampaignEditor key={props.campaignId || `new-${props.initialChannel || 'whatsapp'}`} {...props} />
}

function CampaignEditor({ campaignId, campaignName, initialChannel, initialChannels, initialCanManage, initialCanExecute, initialCanImport, initialExecutionEnabled, onClose, onCreated, onDirtyChange, onBusyChange, onMutated }: EditorProps) {
    const { getMarketingEmailSenders, saveCampaignSender, getCampaign, createCampaign, getSequences, getCampaignStats, updateCampaign, createSequence, setPrincipalSequence, addStepToSequence, updateStep, deleteStep, getCampaignAudience, saveCampaignAudience, reorderCampaignSteps, getMarketingSetup, prepareCampaignActivation, enrollAudienceInCampaign } = useMarketingApi()
    const [currentId, setCurrentId] = useState<string | null>(campaignId || null)
    const idRef = useRef(currentId)
    const example = useMarketingExample()
    const isNew = !currentId
    const [title, setTitle] = useState(campaignName || '')
    const savedTitle = useRef(campaignName || '')
    const [titleBaseline, setTitleBaseline] = useState(campaignName || '')
    const [tab, setTab] = useState<Stage>('configuration')

    const hasInitialChannels = initialChannels !== undefined && initialCanImport !== undefined && initialExecutionEnabled !== undefined
    const [channels, setChannels] = useState<MarketingChannel[]>(initialChannels || [])
    const [canManage, setCanManage] = useState(initialCanManage ?? false)
    const [canExecute, setCanExecute] = useState(initialCanExecute ?? false)
    const [canImport, setCanImport] = useState(initialCanImport ?? false)
    const [executionEnabled, setExecutionEnabled] = useState(initialExecutionEnabled ?? false)

    const initialEmitter = () => {
        if (!initialChannels || !initialChannels.length) return ''
        if (initialChannel === 'email') {
            const firstEmail = initialChannels.find(c => c.id.startsWith('smtp:'))?.id
            return firstEmail || ''
        } else {
            const firstWa = initialChannels.find(c => !c.id.startsWith('smtp:'))?.id
            return firstWa || ''
        }
    }
    const [connectionId, setConnectionId] = useState(initialEmitter)
    const [loading, setLoading] = useState(isNew ? !hasInitialChannels : true)
    const [error, setError] = useState(''), [busy, setBusy] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [activationError, setActivationError] = useState('')
    const [activationUncertain, setActivationUncertain] = useState(false)
    const [starting, setStarting] = useState(false)
    const [previewTemplates, setPreviewTemplates] = useState<CampaignTemplate[]>([])
    const [readiness, setReadiness] = useState<import('../marketing-preflight-actions').AudienceReadiness | null>(null)
    const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null)
    const [discardStep, setDiscardStep] = useState(false), [discardReload, setDiscardReload] = useState(false)
    const stepBaseline = useRef('')
    const [status, setStatus] = useState<CampaignStatus>('draft')
    const [filters, setFilters] = useState<RecipientFilters>(initialChannel === 'email' ? { has_email: true } : { has_phone: true }), [savedFilters, setSavedFilters] = useState(''), [hasAudience, setHasAudience] = useState(false)
    const [delivery, setDelivery] = useState<DeliveryConfig>(defaultDelivery), [scheduledFor, setScheduledFor] = useState('')
    const [savedConfig, setSavedConfig] = useState(''), [savedConnection, setSavedConnection] = useState('')
    const savedSchedule = useRef<{ input: string; iso: string | null }>({ input: '', iso: null })
    const [sequences, setSequences] = useState<Sequence[]>([]), [sequenceId, setSequenceId] = useState('')
    const [step, setStep] = useState(emptyStep), [stepOpen, setStepOpen] = useState(false), [template, setTemplate] = useState<TemplateSelection | null>(null)
    const [templateValid, setTemplateValid] = useState(false)
    const [followup, setFollowup] = useState(false), [importOpen, setImportOpen] = useState(false)
    const [metrics, setMetrics] = useState<CampaignMetrics | null>(null), [revision, setRevision] = useState(0)
    const [emailContent, setEmailContent] = useState({ subject: '', body: '' })
    const [storedChannel, setStoredChannel] = useState(initialChannel || 'whatsapp')
    const email = storedChannel === 'email'
    const availableChannels = channels.filter(channel => channel.id.startsWith('smtp:') === email)
    const senderAvailable = availableChannels.some(channel => channel.id === connectionId)
    const baseFilters = email ? { has_email: true } : { has_phone: true }
    const [segmentsOpen, setSegmentsOpen] = useState(false)
    const request = useRef(0), resultsRequest = useRef(0), mounted = useRef(true), mutation = useRef(false)
    const sequence = sequences.find(item => item.id === sequenceId)
    const steps = sequence?.steps || []
    const config = JSON.stringify({ connectionId, scheduledFor, delivery })
    const audienceDirty = JSON.stringify(filters) !== savedFilters
    const configDirty = config !== savedConfig
    const editable = status === 'draft' && canManage && !loading && !busy && !error
    const contentDirty = stepOpen && JSON.stringify({ step, template, emailContent }) !== stepBaseline.current
    const messageCount = steps.filter(item => item.type !== 'delay').length + (pendingMessage ? 1 : 0)

    const unsaved = !loading && status === 'draft' && (
        isNew
            ? (!!title.trim() || !!pendingMessage || contentDirty || scheduledFor !== '' || delivery !== defaultDelivery || JSON.stringify(filters) !== JSON.stringify(baseFilters))
            : (title.trim() !== titleBaseline || !!pendingMessage || contentDirty || audienceDirty || configDirty)
    )
    useEffect(() => { onDirtyChange?.(unsaved) }, [unsaved, onDirtyChange])
    useEffect(() => { onBusyChange?.(busy) }, [busy, onBusyChange])
    useEffect(() => {
        if (email || !connectionId) { setPreviewTemplates([]); return }
        let current = true
        setPreviewTemplates([])
        void getMarketingSetup(connectionId).then(result => {
            if (current && result.success) setPreviewTemplates(result.templates || [])
        }).catch(() => { /* The message editor provides an actionable retry if preview setup is unavailable. */ })
        return () => { current = false }
    }, [email, connectionId, getMarketingSetup, revision])
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
                setCanManage(setup.canManage); setCanExecute(setup.canExecute); setCanImport(setup.canImport); setExecutionEnabled(setup.executionEnabled === true)
                const allChannels = [...setup.channels, ...(emailSetup.success ? emailSetup.channels : [])]
                setChannels(allChannels)
                if (!emailSetup.success) toast.error(emailSetup.error)

                let selectedEmitter = ''
                if (initialChannel === 'email') {
                    selectedEmitter = (emailSetup.success && emailSetup.channels[0]?.id) || ''
                } else {
                    selectedEmitter = setup.channels[0]?.id || ''
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
            if (stored.name) { setTitle(stored.name); savedTitle.current = stored.name; setTitleBaseline(stored.name) }
            setStoredChannel(stored.channel === 'email' ? 'email' : 'whatsapp')
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
            setPendingMessage(null); setSaveError(''); setMetrics(results.success ? results : null); setRevision(value => value + 1)
        } catch (failure) { if (mounted.current && epoch === request.current) setError(failure instanceof Error ? failure.message : 'No se pudo cargar la campaña.') }
        finally { if (mounted.current && epoch === request.current) setLoading(false) }
    }
    async function refreshResults(id = currentId) {
        if (!id) return
        const epoch = ++resultsRequest.current
        try {
            const [result, campaign] = await Promise.all([getCampaignStats(id), getCampaign(id)])
            if (!mounted.current || epoch !== resultsRequest.current) return
            if (result.success) setMetrics(result); else { setMetrics(null); toast.error(result.error) }
            if (campaign.success && campaign.campaign) { setStatus(campaign.campaign.status); setExecutionEnabled(campaign.executionEnabled === true); if (activationUncertain) setActivationError(''); setActivationUncertain(false); return true }
            return false
        } catch { if (mounted.current && epoch === resultsRequest.current) toast.error('No se pudieron actualizar los resultados.') }
    }
    useEffect(() => {
        if (tab !== 'results' || status === 'draft' || status === 'archived' || busy) return
        const timer = setInterval(() => { if (document.visibilityState === 'visible') void refreshResults() }, 20000)
        return () => clearInterval(timer)
    }, [tab, status, busy])
    async function edit(operation: () => Promise<void>) {
        if (mutation.current || loading || error) return
        mutation.current = true; setBusy(true); setSaveError('')
        try { await operation(); onMutated?.() }
        catch (failure) { if (mounted.current) setSaveError(failure instanceof Error ? failure.message : 'No se confirmó el guardado. Tus cambios se conservan aquí; revisa antes de reintentar.') }
        finally { mutation.current = false; if (mounted.current) setBusy(false) }
    }
    async function refreshSteps(id = idRef.current || currentId) {
        if (!id) return
        const result = await getSequences(id)
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
        setSavedConfig(previous => JSON.stringify({ ...(previous ? JSON.parse(previous) : {}), connectionId }))
        onMutated?.()
        setRevision(value => value + 1); if (notify) toast.success('Emisor guardado. Revisa el mensaje antes de activar.')
    }
    async function saveRecipients(notify = true) {
        if (!currentId) return
        const cleaned = { ...filters, tags: filters.tags?.map(value => value.trim()).filter(Boolean) }
        const result = await saveCampaignAudience(currentId, cleaned)
        if (!result.success) throw new Error(result.error)
        if (!mounted.current) return
        setFilters(cleaned); setSavedFilters(JSON.stringify(cleaned)); setHasAudience(true); setRevision(value => value + 1)
        onMutated?.()
        if (notify) toast.success('Destinatarios guardados. No se inscribió ni envió ningún mensaje.')
    }
    function openStep(type: string, existing?: MarketingStep) {
        if (!editable) return
        const local = !existing ? pendingMessage : null
        const form = existing ? { id: existing.id, type: existing.type, name: existing.name, delay: String(existing.delay_config?.value ?? existing.delay_config?.duration ?? 1), unit: existing.delay_config?.unit || 'days' } : { ...emptyStep, type, name: local?.name || '' }
        const selection = existing?.content?.template_id ? existing.content : local?.type === 'whatsapp' ? local.content as TemplateSelection : null
        const content = existing?.type === 'email' ? { subject: existing.content.subject || '', body: existing.content.body || '' } : local?.type === 'email' ? { subject: local.content.subject || '', body: local.content.body || '' } : { subject: '', body: '' }
        setStep(form); setTemplate(selection); setEmailContent(content); stepBaseline.current = JSON.stringify({ step: form, template: selection, emailContent: content }); setSaveError(''); setStepOpen(true)
    }
    async function saveStep() {
        if (!currentId) {
            if (step.type === 'email') emailContentSchema.parse(emailContent)
            if (step.type === 'whatsapp' && (!template || !templateValid)) throw new Error('Selecciona una plantilla aprobada.')
            setPendingMessage(step.type === 'email' ? { type: 'email', name: step.name.trim() || 'Mensaje 1', content: emailContent } : { type: 'whatsapp', name: step.name.trim() || 'Mensaje 1', content: template! }); setStepOpen(false)
            return
        }
        if (connectionId && connectionId !== savedConnection) {
            await saveEmitter(false)
        }
        if (step.type === 'whatsapp' && (!template || !connectionId)) throw new Error('Selecciona una plantilla para el mensaje de WhatsApp.')
        if (step.type === 'email') { emailContentSchema.parse(emailContent) }
        let target = sequenceId
        if (!target) {
            const created = await createSequence({ name: 'Mensajes de campaña', campaign_id: currentId, trigger_type: 'manual' })
            if (!created.success || !created.sequence) throw new Error(created.error || 'No se pudo preparar el mensaje.')
            target = created.sequence.id
            onMutated?.()
            if (mounted.current) { setSequenceId(target); setSequences([created.sequence]) }
        }
        const data = {
            type: step.type, name: step.name.trim() || (step.type === 'delay' ? 'Esperar' : `Mensaje ${steps.filter(item => item.type !== 'delay').length + 1}`),
            content: step.type === 'delay' ? {} : step.type === 'email' ? emailContent : template!, delay_config: step.type === 'delay' ? { value: Number(step.delay), unit: step.unit } : undefined
        }
        const result = step.id ? await updateStep(step.id, data) : await addStepToSequence(target, data)
        if (!result.success) throw new Error(result.error)
        onMutated?.()
        if (!mounted.current) return
        setPendingMessage(null); setStepOpen(false); await refreshSteps(); toast.success('Contenido guardado.')
    }
    async function saveSchedule(notify = true) {
        if (!currentId) return
        const iso = scheduledFor === savedSchedule.current.input ? savedSchedule.current.iso : scheduledFor ? new Date(scheduledFor).toISOString() : null
        if (scheduledFor !== savedSchedule.current.input && iso && Date.parse(iso) <= Date.now()) throw new Error('Elige una fecha futura o empieza al confirmar.')
        const result = await updateCampaign(currentId, { delivery_config: delivery, scheduled_for: iso })
        if (!result.success) throw new Error(result.error)
        if (!mounted.current) return
        savedSchedule.current = { input: scheduledFor, iso }
        setSavedConfig(previous => JSON.stringify({ ...(previous ? JSON.parse(previous) : {}), scheduledFor, delivery }))
        onMutated?.()
        setRevision(value => value + 1); if (notify) toast.success('Programación guardada.')
    }
    async function persistPending(id: string) {
        if (!pendingMessage) return
        let target = sequenceId
        if (!target) {
            const created = await createSequence({ name: 'Mensajes de campaña', campaign_id: id, trigger_type: 'manual' })
            if (!created.success || !created.sequence) throw new Error(created.error || 'No se pudo preparar el mensaje.')
            target = created.sequence.id; setSequenceId(target); setSequences([created.sequence]); onMutated?.()
        }
        const result = await addStepToSequence(target, pendingMessage)
        if (!result.success) throw new Error(result.error)
        setPendingMessage(null); onMutated?.(); await refreshSteps(id)
    }
    async function createAndSaveCampaign() {
        const trimmedTitle = title.trim()
        if (!trimmedTitle) throw new Error('Escribe un nombre para la campaña antes de continuar.')
        if (!connectionId || !senderAvailable) throw new Error('Selecciona un emisor disponible para la campaña.')
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
        savedTitle.current = trimmedTitle; setTitleBaseline(trimmedTitle); setTitle(trimmedTitle)
        idRef.current = newId
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
                setSavedConfig('')
            }
            if (audienceResult.success) {
                setSavedFilters(JSON.stringify(cleanedFilters))
                setHasAudience(true)
            }
            setRevision(v => v + 1)
        }
        if (!audienceResult.success || !scheduleResult.success) {
            throw new Error('El borrador se creó, pero no se guardó toda la configuración. Revisa y vuelve a guardar; se conservará esta misma campaña.')
        }
        await persistPending(newId)
        return newId
    }
    async function saveConfiguration() {
        if (!currentId) {
            return createAndSaveCampaign()
        }
        const trimmedTitle = title.trim()
        if (!trimmedTitle || trimmedTitle.length > 160) throw new Error('Escribe un nombre de entre 1 y 160 caracteres.')
        if (!senderAvailable) throw new Error('Selecciona un emisor disponible.')
        if (trimmedTitle !== savedTitle.current) {
            const result = await updateCampaign(currentId, { name: trimmedTitle })
            if (!result.success) throw new Error(result.error || 'No se pudo guardar el nombre.')
            savedTitle.current = trimmedTitle; setTitleBaseline(trimmedTitle); setTitle(trimmedTitle); onMutated?.()
        }
        if (connectionId !== savedConnection) await saveEmitter(false)
        if (!hasAudience || audienceDirty) await saveRecipients(false)
        const previous = savedConfig ? JSON.parse(savedConfig) : null
        if (!previous || scheduledFor !== previous.scheduledFor || JSON.stringify(delivery) !== JSON.stringify(previous.delivery)) await saveSchedule(false)
        await persistPending(currentId)
        if (mounted.current) setSavedConfig(config)
        return currentId
    }
    const closeStep = () => { if (!busy) { if (contentDirty) setDiscardStep(true); else setStepOpen(false) } }
    const messageReady = messageCount > 0
    const startLabel = status === 'paused' ? 'Reanudar campaña' : scheduledFor ? 'Programar campaña' : 'Iniciar campaña'
    async function startCampaign() {
        if (mutation.current || loading || error || activationUncertain || !canExecute || !executionEnabled || !['draft', 'paused'].includes(status)) return
        if (status === 'draft' && (!canManage || !title.trim() || !senderAvailable || !messageReady || (sequence && !sequence.is_active))) return
        mutation.current = true; setBusy(true); setStarting(true); setSaveError(''); setActivationError('')
        let phase: 'save' | 'review' | 'activate' = 'save'
        try {
            const id = status === 'draft' ? await saveConfiguration() : currentId
            phase = 'review'
            if (!id || !mounted.current) return
            const prepared = await prepareCampaignActivation(id)
            if (!mounted.current) return
            if (!prepared.success) throw new Error(prepared.error)
            if (!prepared.review.enabled) throw new Error('Los envíos masivos están deshabilitados en este entorno.')
            if (prepared.review.issues.length) throw new Error(prepared.review.issues.join(' '))
            const expires = Date.parse(prepared.review.expiresAt)
            if (!Number.isFinite(expires) || expires <= Date.now()) throw new Error('La validación caducó. Vuelve a iniciar para revisar los datos actuales.')
            phase = 'activate'
            // The explicit start button expresses intent; the server still validates the saved design and audience ticket.
            const result = await enrollAudienceInCampaign(id, { token: prepared.review.token, confirmed: true })
            if (!mounted.current) return
            if (!result.success) { setActivationError(result.error || 'No se pudo iniciar la campaña.'); return }
            onMutated?.(); setStatus('active'); setTab('results')
            toast.success(status === 'paused' ? 'Campaña reanudada.' : scheduledFor ? 'Campaña programada.' : 'Campaña iniciada.')
            await refreshResults(id)
        } catch (failure) {
            if (mounted.current) {
                if (phase === 'save') setSaveError(failure instanceof Error ? failure.message : 'No se pudo guardar la campaña.')
                else {
                    if (phase === 'activate') setActivationUncertain(true)
                    setActivationError(phase === 'activate' ? 'No se pudo confirmar el inicio. Actualiza el estado antes de reintentar.' : failure instanceof Error ? failure.message : 'No se pudo validar la campaña.')
                }
            }
        } finally { mutation.current = false; if (mounted.current) { setStarting(false); setBusy(false) } }
    }
    function messagePreview(content: MarketingStep['content']) {
        if (email) return (content?.body || '').replace(/\{\{\s*(nombre|empresa|email)\s*\}\}/g, (_: string, key: string) => ({ nombre: 'María Ejemplo', empresa: 'Empresa de ejemplo', email: 'maria@example.com' })[key as 'nombre' | 'empresa' | 'email'])
        const template = previewTemplates.find(item => item.id === content?.template_id)
        return template ? previewMarketingTemplate(template, content as TemplateSelection).map(part => part.text).join('\n') : ''
    }
    return <div className="flex min-h-0 flex-1 flex-col">
        <header className="relative flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-4 py-3.5 pr-24 sm:flex-nowrap sm:px-5 sm:pr-14">
            <div className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-0">
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
                        {email ? 'Email' : 'WhatsApp'}
                    </p>
                    <div className="mt-0.5 flex min-w-0 items-center gap-2">
                        <h2 className="min-w-0 max-w-[480px] truncate text-base font-bold tracking-tight text-foreground">
                            {title.trim() || (isNew ? (email ? 'Nueva campaña de Email' : 'Nueva campaña de WhatsApp') : 'Campaña sin nombre')}
                        </h2>
                        <Badge
                            variant="outline"
                            className={cn(
                                "shrink-0 text-[11px] font-semibold",
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
            <div className="contents sm:ml-auto sm:flex sm:shrink-0 sm:items-center sm:gap-1.5">
                {!isNew && canExecute && status === 'active' && (
                    <Button
                        size="sm"
                        disabled={busy || loading || !!error}
                        variant="outline"
                        className="rounded-lg h-8 text-xs font-semibold"
                        onClick={() => void edit(async () => { const result = await updateCampaign(currentId!, { status: 'paused' }); if (!result.success) throw new Error(result.error); await refreshResults() })}
                    >
                        Pausar campaña
                    </Button>
                )}
                {!isNew && (tab === 'configuration' || activationUncertain) && (
                    <Button
                        size="icon"
                        className="absolute right-12 top-3.5 h-8 w-8 rounded-lg sm:static"
                        aria-label="Recargar diseño"
                        title="Recargar diseño"
                        variant="ghost"
                        disabled={busy || loading}
                        onClick={() => { if (unsaved) setDiscardReload(true); else void load() }}
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                )}
                {onClose ? (
                    <Button
                        size="icon"
                        className="absolute right-3 top-3.5 h-8 w-8 rounded-lg"
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
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/50 px-4 py-2 sm:px-5">
                <TabsList className="h-9 gap-1 rounded-xl bg-muted/50 p-1">
                    <TabsTrigger value="configuration" className="gap-2 rounded-lg px-4 text-xs font-semibold"><Pencil className="h-3.5 w-3.5" />Preparación</TabsTrigger>
                    <TabsTrigger value="results" className="gap-2 rounded-lg px-4 text-xs font-semibold" disabled={isNew}><MessageSquare className="h-3.5 w-3.5" />Actividad</TabsTrigger>
                </TabsList>
                {(tab === 'configuration' || status === 'draft' || busy) && <span className="text-[11px] text-muted-foreground" role="status">{loading ? 'Cargando datos…' : starting ? 'Validando e iniciando…' : busy ? 'Guardando…' : unsaved ? 'Cambios sin guardar' : isNew ? 'Nuevo borrador' : 'Todo guardado'}</span>}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/20 p-3 sm:p-5">
                {example && <p className="mb-4 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-800 dark:text-sky-200">Ejemplo interactivo · Datos ficticios. Sin envíos reales.</p>}
                {loading && <p role="status">Cargando campaña…</p>}
                {error && <p role="alert" className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error} <button className="underline" onClick={() => void load()}>Reintentar</button></p>}
                <TabsContent value="configuration" className="mt-0 space-y-4">
                    {!loading && !canManage && <p className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">Modo de consulta. Tu rol no permite modificar el contenido de esta campaña.</p>}
                    {!loading && status === 'draft' && !executionEnabled && <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">Los envíos masivos están deshabilitados en este entorno. Puedes preparar y guardar el borrador.</p>}
                    <div className="space-y-4">
                        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                            <CampaignSection id="campaign-channel" className="lg:col-span-2">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="campaign-name-input" className="text-xs font-semibold text-foreground">Nombre de la campaña *</Label>
                                        <Input
                                            id="campaign-name-input"
                                            aria-label="Nombre de la campaña"
                                            maxLength={160} required placeholder={email ? "Ej. Novedades de octubre · clientes" : "Ej. Lanzamiento de temporada · WhatsApp"}
                                            value={title}
                                            disabled={!editable}
                                            onChange={e => setTitle(e.target.value)}
                                            className="h-9 rounded-xl bg-background text-xs font-medium"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-foreground">{email ? 'Servidor SMTP emisor' : 'Número emisor de WhatsApp'} *</Label>
                                        <Select value={connectionId} disabled={!editable || !availableChannels.length} onValueChange={setConnectionId}>
                                            <SelectTrigger aria-label={email ? 'Servidor SMTP emisor' : 'Número emisor de campaña'} className="h-9 rounded-xl bg-background text-xs"><SelectValue placeholder="Selecciona un canal conectado" /></SelectTrigger>
                                            <SelectContent>{availableChannels.map(channel => <SelectItem key={channel.id} value={channel.id}>{channel.id.startsWith('smtp:') ? 'Email · ' : 'WhatsApp · '}{channel.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                        {!availableChannels.length && !loading && <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed"><p className="font-medium">{email ? 'Falta un SMTP verificado disponible' : 'Falta un número de WhatsApp disponible'}</p><p className="mt-1 text-muted-foreground">{email ? 'Verifica la conexión de correo de esta organización para continuar.' : 'Conecta un número o revisa tus permisos para usarlo.'}</p><Link href={email ? '/tools/email-engine' : '/crm/settings/channels'} className="mt-2 inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4">{email ? 'Configurar Motor de correos' : 'Revisar canales'}<ArrowRight className="h-3 w-3" /></Link></div>}
                                        {savedConnection && !channels.some(channel => channel.id === savedConnection) && <p role="alert" className="text-xs text-amber-700">El emisor guardado ya no está disponible. Revisa su conexión.</p>}
                                    </div>
                                </div>
                            </CampaignSection>
                            <CampaignSection id="campaign-message" title="Mensaje" icon={<MessageSquare className="h-4 w-4 text-primary" />}>
                                {isNew || pendingMessage ? (
                                    pendingMessage ? <div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-medium text-primary">Mensaje preparado · pendiente de guardar</p><h4 className="mt-1 text-sm font-semibold">{pendingMessage.type === 'email' ? pendingMessage.content.subject : pendingMessage.content.template_name}</h4>{messagePreview(pendingMessage.content) && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{messagePreview(pendingMessage.content)}</p>}</div><Button size="sm" variant="outline" disabled={!editable} onClick={() => openStep(email ? 'email' : 'whatsapp')}>Editar mensaje</Button></div></div> :
                                    <div className="rounded-xl border border-dashed border-border bg-muted/15 px-4 py-6 text-center">
                                        <p className="mb-4 text-xs text-muted-foreground">{email ? 'Escribe el asunto y el contenido.' : 'Elige una plantilla aprobada para este número.'}</p>
                                        <Button size="sm" disabled={!editable || !senderAvailable} onClick={() => openStep(email ? 'email' : 'whatsapp')}><Plus className="mr-2 h-3.5 w-3.5" />Configurar mensaje</Button>
                                        {!senderAvailable && <p className="mt-2 text-[11px] text-muted-foreground">Selecciona primero un emisor disponible.</p>}
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
                                        {sequence && !sequence.is_active && <p role="alert" className="text-xs text-amber-700">Esta secuencia no es la principal. Para iniciar, selecciona la principal o usa esta como principal.</p>}
                                        {savedConnection && connectionId !== savedConnection && (
                                            <p className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
                                                Emisor modificado. Se guardará junto con el mensaje o al pulsar «Guardar configuración».
                                            </p>
                                        )}
                                        <>
                                            {!steps.length && <div className="flex flex-col items-center rounded-xl border border-dashed border-primary/25 bg-primary/[0.03] px-4 py-6 text-center">
                                                <MessageSquare className="mb-3 h-7 w-7 text-primary/60" />
                                                <h4 className="text-sm font-semibold">Tu mensaje empieza aquí</h4>
                                                <p className="mb-4 mt-1 text-xs text-muted-foreground">{email ? 'Escribe el asunto y el mensaje. Pixy incluirá el enlace de baja.' : 'Elige una plantilla aprobada y personaliza sus variables.'}</p>
                                                <Button size="sm" disabled={!editable || !senderAvailable} onClick={() => openStep(email ? 'email' : 'whatsapp')}><Plus className="mr-2 h-3.5 w-3.5" />Configurar mensaje</Button>
                                            </div>}
                                            <ol className="space-y-3">{steps.map((item, index) => <li key={item.id} className="overflow-hidden rounded-xl border border-border/60">
                                                <div className="flex flex-wrap items-center gap-2 bg-muted/20 px-3 py-2.5">
                                                    {item.type === 'delay' && <Timer className="h-4 w-4 shrink-0 text-muted-foreground" />}
                                                    <div className="min-w-0 flex-1"><h4 className="break-words text-xs font-semibold">{steps.length > 1 ? `${index + 1}. ` : ''}{item.type === 'delay' ? 'Esperar' : item.type === 'email' ? item.content?.subject || 'Asunto pendiente' : item.content?.template_name || item.name}</h4>{item.type === 'delay' && <p className="mt-1 text-xs text-muted-foreground">{item.delay_config?.value ?? item.delay_config?.duration} {({ minutes: 'minutos', hours: 'horas', days: 'días' } as Record<string, string>)[item.delay_config?.unit] || item.delay_config?.unit}</p>}</div>
                                                    <div className="flex shrink-0 items-center gap-0.5">
                                                        {steps.length > 1 && <><Button disabled={!editable || index === 0} aria-label={`Subir paso ${index + 1}`} title="Subir" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void edit(() => moveStep(index, -1))}><ArrowUp className="h-3.5 w-3.5" /></Button><Button disabled={!editable || index === steps.length - 1} aria-label={`Bajar paso ${index + 1}`} title="Bajar" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void edit(() => moveStep(index, 1))}><ArrowDown className="h-3.5 w-3.5" /></Button></>}
                                                        <Button disabled={!editable} aria-label="Editar" title="Editar" variant="ghost" size="icon" className="h-7 w-7" onClick={() => openStep(item.type, item)}><Pencil className="h-3.5 w-3.5" /></Button>
                                                        <Button disabled={!editable} aria-label="Eliminar paso" title="Eliminar paso" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => { if (window.confirm('¿Eliminar este paso del borrador?')) void edit(async () => { const r = await deleteStep(item.id); if (!r.success) throw new Error(r.error); await refreshSteps() }) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                                    </div>
                                                </div>
                                                {item.type !== 'delay' && <div className="space-y-2 border-t px-4 py-3"><p className="text-[10px] text-muted-foreground">Vista previa · contacto de ejemplo</p>{messagePreview(item.content) ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{messagePreview(item.content)}</p> : <p className="text-xs text-muted-foreground">Abre el mensaje para consultar la plantilla y sus variables.</p>}</div>}
                                            </li>)}</ol>
                                            {!!steps.length && <details open={followup} onToggle={event => setFollowup(event.currentTarget.open)} className="pt-1">
                                                <summary className="cursor-pointer text-xs text-muted-foreground">Añadir seguimiento · opcional</summary>
                                                <p className="mt-2 text-[11px] text-muted-foreground">Añade una espera antes del siguiente mensaje para separarlos en el tiempo.</p>
                                                <div className="mt-2 flex gap-2"><Button size="sm" disabled={!editable} variant="outline" onClick={() => openStep('delay')}>Añadir espera</Button><Button size="sm" disabled={!editable} variant="outline" onClick={() => openStep(email ? 'email' : 'whatsapp')}>Añadir mensaje</Button></div>
                                            </details>}
                                        </>
                                    </>
                                )}
                            </CampaignSection>
                            <CampaignSection id="campaign-recipients" title="Destinatarios" icon={<Users className="h-4 w-4 text-primary" />}
                                action={<Button className="h-7 text-[11px]" size="sm" variant="ghost" disabled={!editable || !canImport} onClick={() => setImportOpen(true)}>Importar lista</Button>}>
                                <CampaignContactLists channel={email ? 'email' : 'whatsapp'} value={filters.list_id} disabled={!editable} refresh={revision} canAuthorize={canExecute && !!readiness?.missingConsent} onAuthorized={count => { setRevision(value => value + 1); toast.success(`Declaración registrada para ${count} contactos. Aún no se envían mensajes.`) }} onSelect={id => setFilters(id ? { ...baseFilters, list_id: id } : baseFilters)} />
                                <CampaignRecipientFilters channel={email ? 'email' : 'whatsapp'} value={filters} onChange={setFilters} disabled={!editable} refresh={revision} onReadinessChange={setReadiness} />
                                <details className="text-muted-foreground" open={segmentsOpen} onToggle={event => setSegmentsOpen(event.currentTarget.open)}>
                                    <summary className="cursor-pointer text-xs font-medium">Selecciones guardadas</summary>
                                    {segmentsOpen && <CampaignSavedSegments disabled={!editable} filters={filters} onApply={setFilters} />}
                                </details>
                            </CampaignSection>
                        </div>
                        <details className="group overflow-hidden rounded-2xl border border-border/60 bg-card">
                            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                                <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
                                <span className="text-sm font-semibold">Envío</span>
                                <span className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">{scheduledFor ? new Date(scheduledFor).toLocaleString() : 'Al iniciar'} · {delivery.schedule_window ? `${delivery.schedule_window.start}:00–${delivery.schedule_window.end}:00` : 'Todo el día'} · {delivery.timezone} · {({ stealth: '180 s', growth: '30 s', turbo: '5 s' } as Record<string, string>)[delivery.mode]} entre envíos</span>
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="grid gap-6 border-t p-5 md:grid-cols-2">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-semibold">Inicio y horario</h4>
                                    <div className="space-y-2"><Label htmlFor="campaign-date" className="text-xs">Fecha de inicio · hora local del navegador</Label><Input id="campaign-date" className="h-9 rounded-xl text-xs" type="datetime-local" disabled={!editable} value={scheduledFor} onChange={event => setScheduledFor(event.target.value)} />{scheduledFor ? <Button disabled={!editable} variant="ghost" size="sm" className="h-6 px-0 text-xs" onClick={() => setScheduledFor('')}>Empezar al iniciar</Button> : <p className="text-xs text-muted-foreground">Sin fecha: empieza al iniciar, dentro del horario permitido.</p>}</div>
                                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" className="h-4 w-4 accent-primary" disabled={!editable} checked={!!delivery.schedule_window} onChange={event => setDelivery({ ...delivery, schedule_window: event.target.checked ? { start: 9, end: 18 } : undefined })} />Limitar a una ventana diaria</label>
                                    {delivery.schedule_window && <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label className="text-xs" htmlFor="campaign-window-start">Desde · hora 0–23</Label><Input className="h-9 rounded-xl text-xs" id="campaign-window-start" type="number" min={0} max={23} disabled={!editable} value={delivery.schedule_window.start} onChange={event => setDelivery({ ...delivery, schedule_window: { ...delivery.schedule_window!, start: Number(event.target.value) } })} /></div><div className="space-y-1.5"><Label className="text-xs" htmlFor="campaign-window-end">Hasta · hora 1–24</Label><Input className="h-9 rounded-xl text-xs" id="campaign-window-end" type="number" min={1} max={24} disabled={!editable} value={delivery.schedule_window.end} onChange={event => setDelivery({ ...delivery, schedule_window: { ...delivery.schedule_window!, end: Number(event.target.value) } })} /></div></div>}
                                    <div className="space-y-1.5"><Label className="text-xs" htmlFor="campaign-timezone">Zona horaria de la ventana</Label><Input className="h-9 rounded-xl text-xs" id="campaign-timezone" disabled={!editable} value={delivery.timezone || 'America/Bogota'} onChange={event => setDelivery({ ...delivery, timezone: event.target.value })} /></div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-xs font-semibold">Ritmo de envío</h4>
                                    <CampaignPacing channel={email ? 'email' : 'whatsapp'} value={delivery} disabled={!editable} onChange={setDelivery} />
                                    <div className="space-y-1.5 border-t pt-4"><Label className="text-xs" htmlFor="campaign-recipient-frequency">Espera entre campañas para un mismo contacto · horas</Label><Input className="h-9 rounded-xl text-xs" id="campaign-recipient-frequency" type="number" min={0} max={720} step={1} disabled={!editable} value={delivery.recipient_cooldown_hours ?? 0} onChange={event => setDelivery({ ...delivery, recipient_cooldown_hours: Number(event.target.value) })} /><p className="text-[11px] leading-relaxed text-muted-foreground">Compartida por canal. Se respeta la mayor espera entre campañas; 0 desactiva la de esta campaña.</p></div>
                                </div>
                            </div>
                        </details>
                    </div>
                    {!isNew && currentId && (
                        <details className="rounded-xl border border-border/60 bg-background">
                            <summary className="cursor-pointer px-4 py-3 text-xs font-medium">Autorizaciones individuales y renovación</summary>
                            <div className="border-t border-border/50 p-3"><CampaignReadiness channel={email ? 'email' : 'whatsapp'} permissionsOnly campaignId={currentId} revision={revision} canExecute={canExecute} onChanged={() => setRevision(value => value + 1)} /></div>
                        </details>
                    )}
                </TabsContent>
                <TabsContent value="results" className="mt-0">
                    {currentId && <CampaignResults key={`${currentId}:${metrics?.channelHealth?.holdAt || ''}`} campaignId={currentId} connectionId={savedConnection} metrics={metrics} canExecute={canExecute} onRefresh={refreshResults} />}
                </TabsContent>
            </div>
        </Tabs>
        {saveError && <div role="alert" className="max-h-32 shrink-0 overflow-y-auto border-t border-destructive/15 bg-destructive/5 px-5 py-3 text-xs text-destructive"><p className="font-medium">No se completó el guardado</p><p className="mt-1 leading-relaxed">{saveError}</p></div>}
        {activationError && <div role="alert" className="max-h-32 shrink-0 overflow-y-auto border-t border-destructive/15 bg-destructive/5 px-5 py-3 text-xs text-destructive"><p className="font-medium">No se pudo {status === 'paused' ? 'reanudar' : 'iniciar'} la campaña</p><p className="mt-1 leading-relaxed">{activationError}</p>{activationUncertain && <Button size="sm" variant="outline" className="mt-2" disabled={busy} onClick={() => void refreshResults()}>Actualizar estado</Button>}</div>}
        {['draft', 'paused'].includes(status) && <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-card px-4 py-3 sm:px-5">
            <p className="text-[11px] text-muted-foreground">{!canExecute ? 'Tu rol no permite iniciar campañas.' : !executionEnabled ? 'Envíos deshabilitados en este entorno.' : status === 'paused' ? 'Se conservan los destinatarios y su avance.' : tab === 'results' ? 'La campaña aún no se ha iniciado.' : 'Guardar no envía. Iniciar activa el envío.'}</p>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                {status === 'draft' && tab === 'configuration' && <Button size="sm" variant="outline" className="rounded-xl" disabled={!editable || (!isNew && !unsaved) || !title.trim() || !senderAvailable} onClick={() => void edit(async () => { await saveConfiguration(); toast.success('Borrador guardado.') })}><Save className="mr-2 h-3.5 w-3.5" />{isNew ? 'Guardar borrador' : 'Guardar configuración'}</Button>}
                {status === 'draft' && tab === 'results' ? <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setTab('configuration')}>Ir a preparación<ArrowRight className="ml-2 h-3.5 w-3.5" /></Button> : <Button size="sm" className="rounded-xl" disabled={!canExecute || !executionEnabled || activationUncertain || busy || loading || !!error || (status === 'draft' && (!canManage || !title.trim() || !senderAvailable || !messageReady || !!(sequence && !sequence.is_active)))} onClick={() => void startCampaign()}>{starting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}{starting ? 'Iniciando…' : startLabel}</Button>}
            </div>
        </footer>}
        {importOpen && <CampaignImport channel={email ? 'email' : 'whatsapp'} onImported={list => { setFilters({ ...baseFilters, list_id: list.id }); toast.success(`Lista seleccionada: ${list.name}. Se guardará con la campaña.`) }} onClose={() => { setImportOpen(false); setRevision(value => value + 1) }} />}
        <Dialog open={stepOpen} onOpenChange={open => { if (!open) closeStep() }}><DialogContent onInteractOutside={event => event.preventDefault()} className="flex max-w-2xl max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 sm:p-0"><DialogHeader className="shrink-0 border-b px-5 py-4"><div className="flex items-start justify-between gap-3"><div><DialogTitle>{step.type === 'delay' ? 'Espera entre mensajes' : email ? 'Preparar correo' : 'Preparar mensaje de WhatsApp'}</DialogTitle><DialogDescription className="mt-1.5 text-xs">{isNew ? 'El contenido se guardará con la campaña.' : 'Guarda el contenido en el borrador. Esta acción no envía mensajes.'}</DialogDescription></div><Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Cerrar editor de mensaje" disabled={busy} onClick={closeStep}><X className="h-4 w-4" /></Button></div></DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{saveError && <p role="alert" className="text-xs text-destructive">{saveError}</p>}<fieldset disabled={busy} className="space-y-4">{step.type === 'delay' ? <><Label htmlFor="step-delay">Tiempo de espera</Label><Input id="step-delay" type="number" min={1} max={365} value={step.delay} onChange={event => setStep({ ...step, delay: event.target.value })} /><Select disabled={busy} value={step.unit} onValueChange={unit => setStep({ ...step, unit })}><SelectTrigger aria-label="Unidad de espera"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="minutes">Minutos</SelectItem><SelectItem value="hours">Horas</SelectItem><SelectItem value="days">Días</SelectItem></SelectContent></Select></> : step.type === 'email' ? <MarketingEmailEditor disabled={busy} value={emailContent} onChange={setEmailContent} /> : <MarketingTemplateEditor disabled={busy} connectionId={connectionId || savedConnection} value={template} onChange={setTemplate} onValidityChange={setTemplateValid} />}
                <details><summary className="cursor-pointer text-sm">Nombre interno · opcional</summary><Label htmlFor="step-name">Nombre</Label><Input id="step-name" maxLength={160} value={step.name} onChange={event => setStep({ ...step, name: event.target.value })} /></details>
            </fieldset></div><div className="flex shrink-0 justify-end gap-2 border-t bg-muted/15 px-5 py-3"><Button variant="outline" disabled={busy} onClick={closeStep}>Cancelar</Button><Button disabled={!editable || (step.type === 'whatsapp' && (!template || !templateValid)) || (step.type === 'email' && !emailContentSchema.safeParse(emailContent).success)} onClick={() => void edit(saveStep)}>{busy ? 'Guardando…' : isNew ? 'Usar este mensaje' : 'Guardar contenido'}</Button></div>
        </DialogContent></Dialog>
        <CampaignDiscardDialog open={discardStep} onCancel={() => setDiscardStep(false)} onDiscard={() => { setDiscardStep(false); setStepOpen(false) }} message="Los cambios de este mensaje no se han guardado. Puedes seguir editando o volver a la versión anterior." />
        <CampaignDiscardDialog open={discardReload} onCancel={() => setDiscardReload(false)} onDiscard={() => { setDiscardReload(false); void load() }} />
    </div>
}
