"use client"

import { useEffect, useState } from "react"
import { Lead } from "@/types"
import { convertLeadToClient, getLeads, updateLeadStatus } from "../leads-actions"
import { getPipelineStages, PipelineStage } from "../pipeline-actions"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, TrendingUp, CheckCircle2, XCircle, MoreHorizontal, ArrowRight, Mail, Phone, GripVertical, Settings, Trophy, Edit, ChevronDown, ChevronUp, BarChart3, UserPlus, Eye, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { CreateLeadSheet } from "./create-lead-sheet"
import { EditLeadSheet } from "./edit-lead-sheet"
import { LeadFilters } from "./lead-filters"
import { useLeadFilters } from "./hooks/use-lead-filters"
import { PipelineAnalytics } from "./pipeline-analytics"
import { LeadDetailModal } from "./lead-detail-modal"
import { AssignLeadSheet } from "./assign-lead-sheet"
import { ImportLeadsSheet } from "./import-leads-sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCorners, useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

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

// Draggable Lead Card Component
function LeadCard({ lead, onConvert, onMarkLost, onEdit, onView, onAssign, isDragging }: {
    lead: Lead;
    onConvert: (id: string) => void;
    onMarkLost: (id: string) => void;
    onEdit: (lead: Lead) => void;
    onView: (lead: Lead) => void;
    onAssign: (lead: Lead) => void;
    isDragging?: boolean
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: lead.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <Card
            ref={setNodeRef}
            style={style}
            onClick={() => !isDragging && onView(lead)}
            className={cn(
                "p-4 hover:shadow-md transition-all cursor-move group relative border-l-4",
                isDragging && "opacity-50 scale-95",
                // Score-based border colors or status colors could be added here
                lead.score && lead.score > 80 ? "border-l-purple-500" :
                    lead.score && lead.score > 60 ? "border-l-green-500" :
                        lead.score && lead.score > 30 ? "border-l-yellow-500" : "border-l-transparent"
            )}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing mt-1 p-1 hover:bg-slate-100 rounded"
                        onClick={(e) => e.stopPropagation()} // Prevent card click
                    >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{lead.name}</h4>
                        {lead.company_name && (
                            <p className="text-xs text-muted-foreground truncate">{lead.company_name}</p>
                        )}
                    </div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onView(lead)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalle Completo
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAssign(lead)}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Asignar Lead
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(lead)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar Rápido
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onConvert(lead.id)}>
                                <ArrowRight className="mr-2 h-4 w-4" />
                                Convertir a Cliente
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => onMarkLost(lead.id)}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Marcar como Perdido
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
                {lead.email && (
                    <div className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{lead.email}</span>
                    </div>
                )}
                {lead.phone && (
                    <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span>{lead.phone}</span>
                    </div>
                )}

                {/* Score and Task info */}
                {(lead.score || 0) > 0 && (
                    <div className="flex items-center gap-2 pt-2">
                        <Badge variant="outline" className={cn(
                            "text-[10px] h-5 px-1 border",
                            lead.score && lead.score > 80 ? "border-purple-200 bg-purple-50 text-purple-700" :
                                lead.score && lead.score > 60 ? "border-green-200 bg-green-50 text-green-700" :
                                    lead.score && lead.score > 30 ? "border-yellow-200 bg-yellow-50 text-yellow-700" : "border-slate-200 bg-slate-50"
                        )}>
                            Score: {lead.score}
                        </Badge>
                    </div>
                )}
            </div>
        </Card>
    )
}

// Droppable Stage Column
function DroppableStage({ id, children }: { id: string; children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
    })

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex-1 min-h-[200px] rounded-lg transition-colors",
                isOver && "bg-blue-50 ring-2 ring-blue-300"
            )}
        >
            {children}
        </div>
    )
}

export function CRMDashboard() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [stages, setStages] = useState<PipelineStage[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [createSheetOpen, setCreateSheetOpen] = useState(false)
    const [editSheetOpen, setEditSheetOpen] = useState(false)
    const [editingLead, setEditingLead] = useState<Lead | null>(null)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [showAnalytics, setShowAnalytics] = useState(false)

    // Advanced Features State
    const [detailModalOpen, setDetailModalOpen] = useState(false)
    const [viewingLeadId, setViewingLeadId] = useState<string | null>(null)
    const [assignSheetOpen, setAssignSheetOpen] = useState(false)
    const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null)
    const [importSheetOpen, setImportSheetOpen] = useState(false)

    const router = useRouter()

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        // Don't set loading to true to avoid full re-render on updates
        try {
            const [leadsData, stagesData] = await Promise.all([
                getLeads(),
                getPipelineStages()
            ])
            setLeads(leadsData)
            setStages(stagesData)
        } catch (error) {
            console.error(error)
            toast.error("Error cargando CRM")
        } finally {
            setIsLoading(false)
        }
    }

    // Use filters hook
    const {
        filters,
        filteredLeads,
        updateFilter,
        resetFilters,
        activeFilterCount,
    } = useLeadFilters(leads)

    async function handleConvertToClient(leadId: string) {
        const confirmed = confirm("¿Convertir este lead a cliente activo?")
        if (!confirmed) return

        const res = await convertLeadToClient(leadId)
        if (res.success) {
            toast.success("Lead convertido a cliente exitosamente")
            loadData()
            router.push('/clients')
        } else {
            toast.error(res.error || "Error al convertir lead")
        }
    }

    async function handleMarkLost(leadId: string) {
        const confirmed = confirm("¿Marcar este lead como perdido?")
        if (!confirmed) return

        const res = await updateLeadStatus(leadId, 'lost')
        if (res.success) {
            toast.success("Lead marcado como perdido")
            loadData()
        } else {
            toast.error(res.error || "Error al actualizar lead")
        }
    }

    function handleEditLead(lead: Lead) {
        setEditingLead(lead)
        setEditSheetOpen(true)
    }

    function handleViewLead(lead: Lead) {
        setViewingLeadId(lead.id)
        setDetailModalOpen(true)
    }

    function handleAssignLead(lead: Lead) {
        setAssigningLeadId(lead.id)
        setAssignSheetOpen(true)
    }

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string)
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        const leadId = active.id as string
        const newStatus = over.id as string

        // Find the lead being moved
        const lead = leads.find(l => l.id === leadId)
        if (!lead || lead.status === newStatus) return

        // Optimistic update
        setLeads(prev => prev.map(l =>
            l.id === leadId ? { ...l, status: newStatus } as Lead : l
        ))

        // Server update
        const res = await updateLeadStatus(leadId, newStatus)
        if (!res.success) {
            toast.error("Error al mover lead")
            // Revert on error
            loadData()
        } else {
            toast.success("Lead actualizado")
        }
    }

    const getLeadsByStage = (statusKey: string) => {
        return filteredLeads.filter(lead => lead.status === statusKey)
    }

    const stats = {
        total: leads.length,
        open: leads.filter(l => l.status === 'open').length,
        won: leads.filter(l => l.status === 'won').length,
        lost: leads.filter(l => l.status === 'lost').length,
    }

    const activeLead = activeId ? leads.find(l => l.id === activeId) : null

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando pipeline...</div>
    }

    if (stages.length === 0) {
        return (
            <div className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No hay etapas configuradas para tu pipeline.</p>
                <Button onClick={() => router.push('/crm/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configurar Etapas
                </Button>
            </div>
        )
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="shrink-0 space-y-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">CRM & Leads</h1>
                            <p className="text-muted-foreground">
                                Arrastra leads entre etapas para actualizar su estado.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="icon" onClick={() => setImportSheetOpen(true)} title="Importar Leads">
                                <Upload className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" onClick={() => router.push('/crm/settings')}>
                                <Settings className="mr-2 h-4 w-4" />
                                Configurar Pipeline
                            </Button>
                            <Button onClick={() => setCreateSheetOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo Lead
                            </Button>
                        </div>
                    </div>

                    {/* Filters */}
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

                    {/* Stats Cards */}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Leads</p>
                                    <p className="text-2xl font-bold">{stats.total}</p>
                                </div>
                                <Users className="h-8 w-8 text-blue-500 opacity-50" />
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Activos</p>
                                    <p className="text-2xl font-bold">{stats.open}</p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-blue-500 opacity-50" />
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Ganados</p>
                                    <p className="text-2xl font-bold">{stats.won}</p>
                                </div>
                                <Trophy className="h-8 w-8 text-green-500 opacity-50" />
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Perdidos</p>
                                    <p className="text-2xl font-bold">{stats.lost}</p>
                                </div>
                                <XCircle className="h-8 w-8 text-red-500 opacity-50" />
                            </div>
                        </Card>
                    </div>

                    {/* Analytics Toggle */}
                    <Button
                        variant="outline"
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        className="w-full"
                    >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        {showAnalytics ? 'Ocultar' : 'Ver'} Analítica del Pipeline
                        {showAnalytics ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                    </Button>

                    {/* Analytics Section */}
                    {showAnalytics && (
                        <PipelineAnalytics leads={filteredLeads} stages={stages} />
                    )}
                </div>

                {/* Kanban Board */}
                <div className="flex-1 overflow-x-auto">
                    <div className="inline-flex gap-4 h-full min-w-full pb-4">
                        {stages.map((stage) => {
                            const stageLeads = getLeadsByStage(stage.status_key)

                            return (
                                <SortableContext
                                    key={stage.id}
                                    id={stage.status_key}
                                    items={stageLeads.map(l => l.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="flex-1 min-w-[280px] flex flex-col">
                                        {/* Stage Header */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className={cn("w-3 h-3 rounded-full", stage.color)} />
                                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                                                {stage.name}
                                            </h3>
                                            <Badge variant="secondary" className="ml-auto">
                                                {stageLeads.length}
                                            </Badge>
                                        </div>

                                        {/* Droppable Stage Area */}
                                        <DroppableStage id={stage.status_key}>
                                            <div
                                                className="flex-1 flex flex-col gap-2 p-2 bg-gray-50 rounded-lg min-h-[200px]"
                                            >
                                                {stageLeads.length === 0 ? (
                                                    <div className="rounded-lg p-8 text-center text-muted-foreground text-sm bg-gray-50/50">
                                                        Arrastra leads aquí
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

                {/* Advanced Features Modals */}
                <LeadDetailModal
                    leadId={viewingLeadId}
                    open={detailModalOpen}
                    onClose={() => setDetailModalOpen(false)}
                    onUpdate={loadData}
                />

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
            </div>
        </DndContext>
    )
}
