"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Lead, Emitter } from "@/types"
import { convertLeadToClientAction as convertLeadToClient, getLeadsAction as getLeads, updateContactStatusAction as updateLeadStatus, getPipelineStagesAction as getPipelineStages, getLeadsCountAction as getLeadsCount } from "../crm-actions"
import { PipelineStage } from "../types"
import { getEmitters } from "@/modules/core/settings/emitters-actions"
import { getChannels } from "@/modules/features/channels/actions"
import { getCurrentUserPermissions } from "@/modules/core/settings/actions/team"
import { evaluateInboxPermissions } from "@/modules/core/iam/utils/inbox-permissions"
import { Channel } from "@/modules/features/channels/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TagsManagerSheet } from "./tags/tags-manager-sheet"
import { Plus, Users, XCircle, Settings, Trophy, BarChart3, Upload, TrendingUp, CheckCircle2, ZoomIn, ZoomOut, Mail, Tag, Wrench, Database, Kanban, MessageSquare, AlertTriangle, PlusCircle } from "lucide-react"
import { SectionHeader } from "@/components/layout/section-header"
import { cn } from "@/modules/infrastructure/utils/utils"
import { toast } from "sonner"
import { CreateLeadSheet } from "./create-lead-sheet"
import { EditLeadSheet } from "./edit-lead-sheet"
import { LeadFilters } from "./lead-filters"
import { useLeadFilters } from "./hooks/use-lead-filters"
import { PipelineAnalyticsSheet } from "./pipeline-analytics-sheet"
import { PipelineSettingsSheet } from "./pipeline-settings-sheet"
import { LeadManagementSheet } from "./lead-management-sheet"
import { useLeadInspector } from "./lead-inspector-context"
import { AssignLeadSheet } from "./assign-lead-sheet"
import { ImportLeadsSheet } from "./import-leads-sheet"
import { UnifiedCommunicationModal } from "@/modules/infrastructure/communication/components/unified-communication-modal"
import { useRouter, useSearchParams } from "next/navigation"
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { LeadCard } from "./lead-card"
import { DroppableStage } from "./droppable-stage"
import { SplitText } from "@/components/ui/split-text"
import { CreateQuoteSheet } from "@/modules/features/quotes/components/create-quote-sheet"
import { QuoteShareSheet } from "@/modules/features/quotes/components/quote-share-sheet"

// Icon mapping
const ICON_MAP: Record<string, any> = {
    plus: Plus,
    mail: Mail,
    'check-circle': CheckCircle2,
    'file-text': TrendingUp,
    users: Users,
    trophy: Trophy,
    'x-circle': XCircle,
}

// ... imports

interface CRMDashboardProps {
    initialLeads: Lead[]
    initialStages: PipelineStage[]
    initialEmitters: Emitter[]
    initialCount: number
}

export function CRMDashboard({
    initialLeads,
    initialStages,
    initialEmitters,
    initialCount
}: CRMDashboardProps) {
    const [tagsSheetOpen, setTagsSheetOpen] = useState(false)

    // Initialize from Server Props
    const [leads, setLeads] = useState<Lead[]>(Array.isArray(initialLeads) ? initialLeads : [])
    const [stages, setStages] = useState<PipelineStage[]>(Array.isArray(initialStages) ? initialStages : [])
    // const [isLoading, setIsLoading] = useState(true) // No longer needed

    // Sync with Server Refresh (e.g. router.refresh())
    useEffect(() => {
        setLeads(Array.isArray(initialLeads) ? initialLeads : [])
        setStages(Array.isArray(initialStages) ? initialStages : [])
        setEmitters(Array.isArray(initialEmitters) ? initialEmitters : [])
        setTotalLeadsCount(initialCount || 0)
    }, [initialLeads, initialStages, initialEmitters, initialCount])

    const [createSheetOpen, setCreateSheetOpen] = useState(false)
    const [editSheetOpen, setEditSheetOpen] = useState(false)
    const [editingLead, setEditingLead] = useState<Lead | null>(null)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [analyticsSheetOpen, setAnalyticsSheetOpen] = useState(false)

    // Advanced Features State
    const [assignSheetOpen, setAssignSheetOpen] = useState(false)
    const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null)
    const [importSheetOpen, setImportSheetOpen] = useState(false)
    const [settingsSheetOpen, setSettingsSheetOpen] = useState(false)
    const [columnZoom, setColumnZoom] = useState(100)
    const [emitters, setEmitters] = useState<Emitter[]>(initialEmitters)
    const [manageSheetOpen, setManageSheetOpen] = useState(false)
    const [totalLeadsCount, setTotalLeadsCount] = useState(initialCount)

    // Quote creation from lead
    const [quoteSheetOpen, setQuoteSheetOpen] = useState(false)
    const [quoteLeadId, setQuoteLeadId] = useState<string | undefined>()
    const [quoteLeadName, setQuoteLeadName] = useState<string | undefined>()
    const [quoteLeadEmail, setQuoteLeadEmail] = useState<string | undefined>()
    const [quoteLeadPhone, setQuoteLeadPhone] = useState<string | undefined>()

    // Quote Sharing
    const [shareQuoteId, setShareQuoteId] = useState<string | null>(null)

    // Communication Modal
    const [comModalOpen, setComModalOpen] = useState(false)
    const [comLead, setComLead] = useState<Lead | null>(null)

    const router = useRouter()
    const searchParams = useSearchParams()
    const { openInspector } = useLeadInspector()

    // --- Channel Filtering State ---
    const currentChannelId = searchParams.get('channel') || 'all'
    const [availableChannels, setAvailableChannels] = useState<Channel[]>([])

    useEffect(() => {
        const fetchChannelsData = async () => {
            const data = await getChannels()
            const perms = await getCurrentUserPermissions()
            const { hasGlobalView, authorizedChannels } = evaluateInboxPermissions(perms)
            const isRestricted = !hasGlobalView

            if (isRestricted) {
                setAvailableChannels(data.filter(c => authorizedChannels.includes(c.id)))
            } else {
                setAvailableChannels(data)
            }
        }
        fetchChannelsData()
    }, [])

    const handleChannelChange = useCallback((val: string) => {
        const url = new URL(window.location.href)
        if (val === 'all') {
            url.searchParams.delete('channel')
        } else {
            url.searchParams.set('channel', val)
        }
        router.push(url.pathname + url.search)
    }, [router])
    // -------------------------------

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    // Legacy loadData -> Now just refreshes via Router
    const loadData = useCallback(async () => {
        console.log("Refetching via Router...")
        router.refresh()
    }, [router])

    const handleShareQuote = useCallback((lead: Lead) => {
        // Find the most recent active quote
        const latestQuote = lead.quotes?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

        if (latestQuote) {
            setShareQuoteId(latestQuote.id)
        } else {
            toast.error("Este lead no tiene una cotizaciÃ³n vinculada")
        }
    }, [])

    // Removed initial load useEffect


    // Use filters hook
    const {
        filters,
        filteredLeads,
        updateFilter,
        resetFilters,
        activeFilterCount,
    } = useLeadFilters(leads)

    const handleConvertToClient = useCallback(async (leadId: string) => {
        const confirmed = confirm("Â¿Convertir este lead a cliente activo?")
        if (!confirmed) return

        const res = await convertLeadToClient(leadId)
        if (res.success) {
            toast.success("Lead convertido a contacto exitosamente")
            loadData()
            router.push('/clients')
        } else {
            toast.error(res.error || "Error al convertir lead")
        }
    }, [loadData, router])

    const handleMarkLost = useCallback(async (leadId: string) => {
        const confirmed = confirm("Â¿Marcar este lead como perdido?")
        if (!confirmed) return

        const res = await updateLeadStatus(leadId, 'lost')
        if (res.success) {
            toast.success("Lead marcado como perdido")
            loadData()
        } else {
            toast.error(res.error || "Error al actualizar lead")
        }
    }, [loadData])

    const handleEditLead = useCallback((lead: Lead) => {
        setEditingLead(lead)
        setEditSheetOpen(true)
    }, [])

    const handleViewLead = useCallback((lead: Lead) => {
        openInspector(lead.id)
    }, [openInspector])

    const handleAssignLead = useCallback((lead: Lead) => {
        setAssigningLeadId(lead.id)
        setAssignSheetOpen(true)
    }, [])

    const handleMessageLead = useCallback((lead: Lead) => {
        // Redirect to inbox instead of opening modal
        const contactParam = lead.phone || lead.email
        if (contactParam) {
            router.push(`/crm/inbox?contact=${encodeURIComponent(contactParam)}`)
        } else {
            router.push(`/crm/inbox?leadId=${lead.id}`)
        }
    }, [router])

    const handleQuoteLead = useCallback((lead: Lead) => {
        // Open quote builder sheet pre-filled with lead info
        setQuoteLeadId(lead.id)
        setQuoteLeadName(lead.name)
        setQuoteLeadEmail(lead.email)
        setQuoteLeadPhone(lead.phone)
        setQuoteSheetOpen(true)
    }, [])

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }, [])

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        const leadId = active.id as string
        let newStatus = over.id as string

        // If dropped over another lead, use that lead's status
        // Note: leads depends on state closure. Logic is fine as long as leads is fresh.
        // DndContext should trigger re-render if leads changes?
        // Actually this handler closes over the 'leads' at the time of render.
        // It should be fine as drag interaction is short.

        // We need access to current leads state.
        // To be perfectly safe, we'll traverse 'leads' in dependency.

    }, [leads])

    // Wait, if I put [leads] in dependency, handleDragEnd changes every render.
    // DndContext might unmount/remount sensors if handlers change? 
    // Usually DndKit handles this.
    // Let's implement the logic inside.

    // Actually, to avoid stale state in closure, using a ref for leads is sometimes better,
    // but [leads] dependency is standard React.

    const onDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        const leadId = active.id as string
        let newStatus = over.id as string

        // If dropped over another lead, use that lead's status
        const overLead = leads.find(l => l.id === newStatus)
        if (overLead) {
            newStatus = overLead.status
        }

        // Find the lead being moved
        const lead = leads.find(l => l.id === leadId)
        // If no change in status, return
        if (!lead || lead.status === newStatus) return

        // Optimistic update
        setLeads(prev => prev.map(l =>
            l.id === leadId ? { ...l, status: newStatus } as Lead : l
        ))

        // Server update
        const res = await updateLeadStatus(leadId, newStatus)
        if (!res.success) {
            toast.error("Error al mover lead")
            // Revert on error by reloading
            loadData()
        } else {
            toast.success("Lead actualizado")
            // Refresh guarantees consistency
            loadData()
        }
    }, [leads, loadData])

    const getLeadsByStage = useCallback((statusKey: string, isFirstStage: boolean) => {
        const stageKeys = stages.map(s => s.status_key)
        return filteredLeads.filter(lead => {
            const status = lead.status || 'new'
            if (isFirstStage) {
                // If the lead's status is completely unrecognized by the current stages,
                // fall back to dropping it in the first column so it doesn't vanish.
                return status === statusKey || !stageKeys.includes(status)
            }
            return status === statusKey
        })
    }, [filteredLeads, stages])

    const stats = useMemo(() => ({
        total: leads.length,
        open: leads.filter(l => l.status === 'open').length,
        won: leads.filter(l => l.status === 'won').length,
        lost: leads.filter(l => l.status === 'lost').length,
    }), [leads])

    const activeLead = useMemo(() =>
        activeId ? leads.find(l => l.id === activeId) : null
        , [activeId, leads])

    // if (isLoading) {
    //    return <div className="h-full flex items-center justify-center text-muted-foreground animate-pulse">Cargando pipeline...</div>
    // }

    if (stages.length === 0) {
        return (
            <>
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <p className="text-muted-foreground mb-4">No hay etapas configuradas para tu pipeline.</p>
                    <Button onClick={() => setSettingsSheetOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Configurar Etapas
                    </Button>
                </div>
                <PipelineSettingsSheet
                    open={settingsSheetOpen}
                    onOpenChange={setSettingsSheetOpen}
                    onStagesChange={loadData}
                />
            </>
        )
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
        >
        <div className="h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
            {/* Compact Header - Fixed height/shrink-0 */}
            <div className="shrink-0 mb-4 space-y-4">
                    {/* Standardized Header */}
                    <SectionHeader
                        title="Pipeline"
                        subtitle="GestiÃ³n de prospectos y ciclo de ventas"
                        icon={Kanban}
                        action={
                            <div className="flex items-center gap-2">
                                {/* Channel Filter Selector */}
                                {availableChannels.length > 0 && (
                                    <Select value={currentChannelId} onValueChange={handleChannelChange}>
                                        <SelectTrigger className="w-[180px] xl:w-[220px] h-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-1 focus:ring-brand-pink/50">
                                            <div className="flex items-center gap-2 truncate">
                                                <MessageSquare className="h-4 w-4 text-brand-pink shrink-0" />
                                                <span className="truncate">
                                                    {currentChannelId === 'all'
                                                        ? "Todos los canales"
                                                        : availableChannels.find(c => c.id === currentChannelId)?.connection_name || "Canal Desconocido"}
                                                </span>
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                <div className="flex items-center gap-2">
                                                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    Todos los canales
                                                </div>
                                            </SelectItem>
                                            {availableChannels.map(c => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{c.connection_name}</span>
                                                        <span className="text-[10px] text-muted-foreground">{c.metadata?.display_phone_number || c.metadata?.phone_number || "WhatsApp"}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}

                                {/* Inline Mini Stats - Preserved in Action Area for now */}
                                <div className="hidden xl:flex items-center gap-2 mr-4 border-r border-border pr-4">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-transparent dark:border-white/10">
                                        <Database className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                                        <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{totalLeadsCount} Total</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-transparent dark:border-white/10">
                                        <Users className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                                        <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{stats.total} en Vista</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-500/10 border border-transparent dark:border-green-500/20">
                                        <Trophy className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                        <span className="font-semibold text-sm text-green-700 dark:text-green-400">{stats.won}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-500/10 border border-transparent dark:border-red-500/20">
                                        <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                        <span className="font-semibold text-sm text-red-700 dark:text-red-400">{stats.lost}</span>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setAnalyticsSheetOpen(true)}
                                    title="Ver AnalÃ­tica"
                                    className="h-9 w-9"
                                >
                                    <BarChart3 className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setImportSheetOpen(true)} title="Importar Leads" className="h-9 w-9">
                                    <Upload className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setTagsSheetOpen(true)} title="Gestionar Etiquetas" className="h-9 w-9">
                                    <Tag className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setSettingsSheetOpen(true)} title="Configurar Pipeline" className="h-9 w-9">
                                    <Settings className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setManageSheetOpen(true)} title="GestiÃ³n de Leads" className="h-9 w-9 text-slate-600 dark:text-slate-300">
                                    <Wrench className="h-4 w-4" />
                                </Button>
                                <Button onClick={() => setCreateSheetOpen(true)} size="sm" className="h-9 bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md shadow-pink-500/20">
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    Nuevo Lead
                                </Button>
                            </div>
                        }
                    />

                    {/* Filters Row */}
                    <LeadFilters
                        searchText={filters.searchText}
                        onSearchChange={(value) => updateFilter('searchText', value)}
                        selectedStages={filters.stages}
                        onStagesChange={(stages) => updateFilter('stages', stages)}
                        dateFrom={filters.dateFrom}
                        dateTo={filters.dateTo}
                        onDateFromChange={(date) => updateFilter('dateFrom', date)}
                        onDateToChange={(date) => updateFilter('dateTo', date)}
                        onReset={resetFilters}
                        activeFilterCount={activeFilterCount}
                        stages={stages}
                        totalLeads={leads.length}
                        filteredCount={filteredLeads.length}
                    />
                </div>

                {/* Kanban Board - THE CORE CONTAINER - Flex-1 fill remaining space */}
                <div className="flex-1 min-h-0 w-full overflow-hidden">
                    {/* Columns Horizontal Container - h-full items-stretch */}
                    <div className="h-full flex overflow-x-auto scrollbar-modern gap-3 px-1 pb-4 items-stretch">
                        {stages.map((stage, index) => {
                            const isFirstStage = index === 0
                            const stageLeads = getLeadsByStage(stage.status_key, isFirstStage)
                            const columnWidth = Math.round(280 * (columnZoom / 100))

                            return (
                                <SortableContext
                                    key={stage.id}
                                    id={stage.status_key}
                                    items={stageLeads.map(l => l.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div
                                        className="flex flex-col shrink-0 h-full min-h-0 transition-all duration-300 ease-out"
                                        style={{
                                            width: `${columnWidth}px`,
                                            minWidth: `${columnWidth}px`,
                                        }}
                                    >
                                        {/* Stage Header */}
                                        <div className="flex items-center gap-2 mb-2 px-1 shrink-0">
                                            <div className={cn("w-2 h-2 rounded-full", stage.color)} />
                                            <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wide truncate">
                                                {stage.name}
                                            </h3>
                                            <div className="ml-auto flex items-center gap-1">
                                                {stageLeads.length > 20 && !stage.is_final && (
                                                    <div className="flex items-center text-[10px] text-red-500 font-bold animate-pulse" title="Cuello de botella detectado">
                                                        <AlertTriangle className="h-3 w-3 mr-0.5" />
                                                        {stageLeads.length}
                                                    </div>
                                                )}
                                                <Badge variant="secondary" className="h-4 px-1 text-[10px] shrink-0">
                                                    {stageLeads.length}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Droppable Column - Flex-1 to fill remaining height with internal scroll */}
                                        <DroppableStage id={stage.status_key}>
                                            <div
                                                className="flex-1 flex flex-col gap-1.5 p-1.5 bg-slate-100/60 dark:bg-white/5 rounded-lg border border-slate-200/30 dark:border-white/5 overflow-y-auto scrollbar-modern backdrop-blur-sm"
                                            >
                                                {stageLeads.length === 0 ? (
                                                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/40 text-[10px] p-6 border-2 border-dashed border-slate-200/50 dark:border-white/5 rounded-xl m-1">
                                                        <PlusCircle className="h-4 w-4 mb-1 opacity-20" />
                                                        Sin leads
                                                    </div>
                                                ) : (
                                                    stageLeads.map((lead) => (
                                                        <LeadCard
                                                            key={lead.id}
                                                            lead={lead}
                                                            onConvert={handleConvertToClient}
                                                            onMarkLost={handleMarkLost}
                                                            onEdit={handleEditLead}
                                                            onView={handleViewLead}
                                                            onAssign={handleAssignLead}
                                                            onMessage={handleMessageLead}
                                                            onQuote={handleQuoteLead}
                                                            onShareQuote={handleShareQuote}
                                                            isDragging={lead.id === activeId}
                                                        />
                                                    ))
                                                )}
                                            </div>
                                        </DroppableStage>
                                    </div>
                                </SortableContext>
                            )
                        })}
                    </div>

                    {/* Bottom Bar: Horizontal Scrollbar lives above, Zoom Controls fixed right */}
                    <div className="flex items-center justify-end gap-1 pt-1 px-1 shrink-0">
                        <button
                            onClick={() => setColumnZoom(prev => Math.max(50, prev - 25))}
                            disabled={columnZoom <= 50}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                            title="Reducir"
                        >
                            <ZoomOut className="h-3 w-3 text-slate-400" />
                        </button>
                        <button
                            onClick={() => setColumnZoom(prev => Math.min(150, prev + 25))}
                            disabled={columnZoom >= 150}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                            title="Ampliar"
                        >
                            <ZoomIn className="h-3 w-3 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeLead ? (
                        <Card className="p-4 cursor-grabbing opacity-90 shadow-xl rotate-3">
                            <div className="font-semibold">{activeLead.name}</div>
                            {activeLead.company_name && (
                                <p className="text-xs text-muted-foreground truncate">{activeLead.company_name}</p>
                            )}
                        </Card>
                    ) : null}
                </DragOverlay>

                {/* Create Lead Sheet */}
                <CreateLeadSheet
                    open={createSheetOpen}
                    onOpenChange={setCreateSheetOpen}
                    onSuccess={loadData}
                />

                {/* Edit Lead Sheet - Legacy but kept for quick edit logic if needed */}
                <EditLeadSheet
                    open={editSheetOpen}
                    onOpenChange={setEditSheetOpen}
                    lead={editingLead}
                    onSuccess={loadData}
                />

                {/* Lead Inspector now handled globally via context */}

                <AssignLeadSheet
                    open={assignSheetOpen}
                    onClose={() => setAssignSheetOpen(false)}
                    leadIds={assigningLeadId ? [assigningLeadId] : []}
                    onSuccess={loadData}
                />

                <ImportLeadsSheet
                    open={importSheetOpen}
                    onOpenChange={setImportSheetOpen}
                    onSuccess={loadData}
                />

                {/* Analytics Sheet */}
                <PipelineAnalyticsSheet
                    open={analyticsSheetOpen}
                    onOpenChange={setAnalyticsSheetOpen}
                    leads={filteredLeads}
                    stages={stages}
                />

                {/* Settings Sheet */}
                <PipelineSettingsSheet
                    open={settingsSheetOpen}
                    onOpenChange={setSettingsSheetOpen}
                    onStagesChange={loadData}
                />

                {/* Tags Manager Sheet */}
                <TagsManagerSheet
                    open={tagsSheetOpen}
                    onOpenChange={setTagsSheetOpen}
                />

                {/* Quote Creation Sheet - from pipeline lead */}
                <CreateQuoteSheet
                    open={quoteSheetOpen}
                    onOpenChange={(open) => {
                        setQuoteSheetOpen(open)
                        if (!open) {
                            setQuoteLeadId(undefined)
                            setQuoteLeadName(undefined)
                            setQuoteLeadEmail(undefined)
                            setQuoteLeadPhone(undefined)
                        }
                    }}
                    emitters={emitters}
                    leadId={quoteLeadId}
                    leadName={quoteLeadName}
                    leadEmail={quoteLeadEmail}
                    leadPhone={quoteLeadPhone}
                    onSuccess={() => {
                        loadData()
                        setQuoteSheetOpen(false)
                        toast.success('CotizaciÃ³n creada y vinculada al lead')
                    }}
                />

                <QuoteShareSheet
                    quoteId={shareQuoteId || undefined}
                    open={!!shareQuoteId}
                    onOpenChange={(open) => !open && setShareQuoteId(null)}
                />

                <LeadManagementSheet
                    open={manageSheetOpen}
                    onOpenChange={setManageSheetOpen}
                    leads={leads}
                    stages={stages}
                    onSuccess={loadData}
                />

                {comLead && (
                    <UnifiedCommunicationModal
                        isOpen={comModalOpen}
                        onOpenChange={setComModalOpen}
                        client={{
                            id: comLead.id,
                            name: comLead.name,
                            email: comLead.email || undefined,
                            phone: comLead.phone || undefined,
                            company_name: comLead.company_name || undefined
                        }}
                        context={{ type: 'general' }}
                    // We need to pass settings if we want the agency name, but we don't have it in state here easily without context.
                    // However, the modal falls back to 'Agencia' gracefully.
                    // Ideally we fetch settings in loadData or use a context.
                    // For now we rely on the component's internal fallback or props if we had them.
                    // Note: The original `ClientManagementSheet` fetched settings. We might want to fetch them here too.
                    />
                )}
            </div>
        </DndContext >
    )
}
