'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
    User,
    Building2,
    Mail,
    Phone,
    MessageSquare,
    Target,
    Zap,
    Loader2,
    CheckCircle2,
    Clock,
    Plus,
    Trash2,
    AlertCircle,
    ArrowRight
} from 'lucide-react'
import { useLeadInspector } from './lead-inspector-context'
import { CopilotWidget } from './copilot-widget'
import { getLeadAnalysis } from '@/modules/core/ai/actions'
import { AnalysisRecommendation } from '@/modules/core/ai/analysis-service'
import { getLeadWithRelations } from '../crm-advanced-actions'
import type { LeadWithRelations } from '@/types/crm-advanced'
import { getScoreTier } from '@/types/crm-advanced'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'
import { getActiveWorkflows, triggerWorkflowForLead } from '@/modules/core/automation/actions'
import { convertLeadToClient } from '../leads-actions'
import { createTask, completeTask, deleteTask, getTasksForLead, type Task } from '../task-actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProcessStateCard } from './process/process-state-card'

// Trigger Automation Button with Workflow Selector
function TriggerAutomationButton({ leadId }: { leadId: string }) {
    const [workflows, setWorkflows] = useState<{ id: string; name: string }[]>([])
    const [loading, setLoading] = useState(false)
    const [triggering, setTriggering] = useState(false)
    const [open, setOpen] = useState(false)

    const loadWorkflows = async () => {
        setLoading(true)
        const result = await getActiveWorkflows()
        if (result.success) {
            setWorkflows(result.workflows)
        }
        setLoading(false)
    }

    const handleTrigger = async (workflowId: string) => {
        setTriggering(true)
        const result = await triggerWorkflowForLead(workflowId, leadId)
        if (result.success) {
            toast.success(result.message)
        } else {
            toast.error(result.error || 'Error al ejecutar workflow')
        }
        setTriggering(false)
        setOpen(false)
    }

    return (
        <DropdownMenu open={open} onOpenChange={(o) => {
            setOpen(o)
            if (o && workflows.length === 0) loadWorkflows()
        }}>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1" disabled={triggering}>
                    {triggering ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Zap className="h-4 w-4 mr-2" />
                    )}
                    Automation
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Ejecutar Workflow</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {loading ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                        Cargando...
                    </div>
                ) : workflows.length === 0 ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                        No hay workflows activos
                    </div>
                ) : (
                    workflows.map((wf) => (
                        <DropdownMenuItem key={wf.id} onClick={() => handleTrigger(wf.id)}>
                            <Zap className="h-4 w-4 mr-2" />
                            {wf.name}
                        </DropdownMenuItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

// Removed PromoteToTenantButton as per user request

function LeadActionBar({ lead }: { lead: LeadWithRelations }) {
    const { closeInspector } = useLeadInspector()

    const handleConvert = async () => {
        const confirmed = confirm("¿Convertir este lead a contacto?")
        if (!confirmed) return

        const res = await convertLeadToClient(lead.id)
        if (res.success) {
            toast.success("Lead convertido a contacto")
            closeInspector()
            window.location.href = '/clients'
        } else {
            toast.error(res.error || "Error al convertir")
        }
    }

    return (
        <div className="flex flex-wrap gap-2 px-6 py-3 border-b bg-slate-50/50 dark:bg-slate-900/20">
            <Button variant="outline" size="sm" className="h-9 text-xs flex-1 min-w-[100px]" asChild>
                <Link href={`/crm/inbox?${(lead.phone || lead.email) ? `contact=${encodeURIComponent(lead.phone || lead.email || '')}` : `leadId=${lead.id}`}`}>
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                    Mensaje
                </Link>
            </Button>
            <TriggerAutomationButton leadId={lead.id} />
             <Button variant="outline" size="sm" className="h-9 text-xs flex-1 min-w-[100px]">
                <User className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
                Asignar
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                className="h-9 text-xs flex-1 min-w-[100px] bg-green-50/50 hover:bg-green-100/50 border-green-200 text-green-700" 
                onClick={handleConvert}
            >
                <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                Convertir
            </Button>
        </div>
    )
}

// Info Tab - Compact lead information
function InfoTab({ lead }: { lead: LeadWithRelations }) {
    const scoreTier = lead.score ? getScoreTier(lead.score) : null

    return (
        <div className="space-y-4">
            <ProcessStateCard leadId={lead.id} />

            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-lg">{lead.name}</h3>
                    {lead.company_name && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {lead.company_name}
                        </p>
                    )}
                </div>
                {scoreTier && (
                    <div
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium"
                        style={{ backgroundColor: `${scoreTier.color}20`, color: scoreTier.color }}
                    >
                        {scoreTier.icon} {lead.score}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">{lead.status}</Badge>
            </div>

            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                {lead.email && (
                    <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a>
                    </div>
                )}
                {lead.phone && (
                    <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a>
                    </div>
                )}
                {lead.assignee && (
                    <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{lead.assignee.full_name || lead.assignee.email}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <p className="text-lg font-semibold text-blue-600">{lead.tasks?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Tareas</p>
                </div>
                <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <p className="text-lg font-semibold text-green-600">{lead.note_entries?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Notas</p>
                </div>
                <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <p className="text-lg font-semibold text-purple-600">{lead.documents?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Archivos</p>
                </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
                Creado {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: es })}
            </p>
        </div>
    )
}

// Tasks Tab - Task management for lead
function TasksTab({ lead, onUpdate }: { lead: LeadWithRelations, onUpdate?: () => void }) {
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [newTask, setNewTask] = useState({ title: '', due_date: '' })
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        loadTasks()
    }, [lead.id])

    async function loadTasks() {
        setLoading(true)
        const result = await getTasksForLead(lead.id)
        if (result.success) {
            setTasks(result.tasks || [])
        }
        setLoading(false)
    }

    async function handleCreate() {
        if (!newTask.title || !newTask.due_date) {
            toast.error('Título y fecha requeridos')
            return
        }
        setSubmitting(true)
        const result = await createTask({
            lead_id: lead.id,
            title: newTask.title,
            due_date: new Date(newTask.due_date).toISOString()
        })
        if (result.success) {
            toast.success('Tarea creada')
            setNewTask({ title: '', due_date: '' })
            setShowCreate(false)
            loadTasks()
            onUpdate?.()
        } else {
            toast.error(result.error)
        }
        setSubmitting(false)
    }

    async function handleComplete(taskId: string) {
        const result = await completeTask(taskId)
        if (result.success) {
            toast.success('Tarea completada')
            loadTasks()
            onUpdate?.()
        } else {
            toast.error(result.error)
        }
    }

    async function handleDelete(taskId: string) {
        if (!confirm('¿Eliminar esta tarea?')) return
        const result = await deleteTask(taskId)
        if (result.success) {
            toast.success('Tarea eliminada')
            loadTasks()
            onUpdate?.()
        } else {
            toast.error(result.error)
        }
    }

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {!showCreate ? (
                <Button variant="outline" className="w-full" onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Tarea
                </Button>
            ) : (
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div>
                        <Label>Título</Label>
                        <Input
                            placeholder="Ej: Llamar para seguimiento"
                            value={newTask.title}
                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label>Fecha límite</Label>
                        <Input
                            type="datetime-local"
                            value={newTask.due_date}
                            onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleCreate} disabled={submitting}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
                    </div>
                </div>
            )}

            <ScrollArea className="h-[250px]">
                <div className="space-y-2 pr-4">
                    {tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <CheckCircle2 className="h-10 w-10 text-muted-foreground/50 mb-3" />
                            <p className="text-sm text-muted-foreground">Sin tareas pendientes</p>
                        </div>
                    ) : (
                        tasks.map((task) => {
                            const isOverdue = new Date(task.due_date) < new Date() && task.status !== 'completed'
                            return (
                                <div
                                    key={task.id}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                                        task.status === 'completed' ? "bg-green-50 border-green-200" :
                                            isOverdue ? "bg-red-50 border-red-200" : "bg-white border-gray-200"
                                    )}
                                >
                                    <button
                                        onClick={() => task.status !== 'completed' && handleComplete(task.id)}
                                        className={cn(
                                            "p-1 rounded-full transition-colors",
                                            task.status === 'completed' ? "bg-green-500 text-white" : "border-2 border-gray-300 hover:border-green-500"
                                        )}
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "text-sm font-medium truncate",
                                            task.status === 'completed' && "line-through text-muted-foreground"
                                        )}>
                                            {task.title}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                                                {formatDistanceToNow(new Date(task.due_date), { addSuffix: true, locale: es })}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(task.id)}
                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            )
                        })
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}

// Main Panel Component
export function LeadInspectorPanel() {
    const { isOpen, leadId, defaultTab, closeInspector } = useLeadInspector()
    const [lead, setLead] = useState<LeadWithRelations | null>(null)
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState(defaultTab)
    const [recommendations, setRecommendations] = useState<AnalysisRecommendation[]>([])

    useEffect(() => {
        if (leadId && isOpen) {
            loadLead()
        } else {
            setRecommendations([])
        }
    }, [leadId, isOpen])

    useEffect(() => {
        setActiveTab(defaultTab)
    }, [defaultTab])

    async function loadLead() {
        if (!leadId) return
        setLoading(true)
        try {
            const data = await getLeadWithRelations(leadId)
            setLead(data)
        } catch (error) {
            console.error('Error loading lead:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={isOpen} onOpenChange={closeInspector}>
            {isOpen && leadId && recommendations.length > 0 && (
                <CopilotWidget
                    recommendations={recommendations}
                    onAction={(rec) => {
                        toast.info(`Acción seleccionada: ${rec.action_label}`)
                    }}
                />
            )}

            <SheetContent
                side="right"
                className="
                    sm:max-w-[450px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
                    <div className="sticky top-0 z-20 flex items-center gap-3 px-6 py-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-b border-black/5 dark:border-white/5">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600">
                            <User className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold tracking-tight">Lead Inspector</h2>
                            <p className="text-xs text-muted-foreground">{lead?.name || 'Cargando...'}</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-6 space-y-4">
                            <Skeleton className="h-8 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    ) : !lead ? (
                        <div className="flex items-center justify-center h-64">
                            <p className="text-muted-foreground">Lead no encontrado</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0">
                            <LeadActionBar lead={lead} />
                            
                            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col min-h-0">
                                <TabsList className="mx-6 mt-4 p-1 bg-muted/50 rounded-xl">
                                    <TabsTrigger value="info" className="flex-1 gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                        <User className="h-4 w-4" />
                                        Info
                                    </TabsTrigger>
                                    <TabsTrigger value="tasks" className="flex-1 gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Tareas
                                    </TabsTrigger>
                                </TabsList>

                                <ScrollArea className="flex-1 px-6 py-4">
                                    <TabsContent value="info" className="mt-0 outline-none">
                                        <InfoTab lead={lead} />
                                    </TabsContent>
                                    <TabsContent value="tasks" className="mt-0 outline-none">
                                        <TasksTab lead={lead} onUpdate={loadLead} />
                                    </TabsContent>
                                </ScrollArea>
                            </Tabs>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
