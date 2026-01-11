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
    Activity,
    Target,
    ChevronRight,
    ExternalLink,
    Zap,
    Loader2,
    CheckCircle2,
    Clock,
    Plus,
    Calendar,
    Trash2,
    AlertCircle
} from 'lucide-react'
import { useLeadInspector } from './lead-inspector-context'
import { getLeadWithRelations } from '../crm-advanced-actions'
import type { LeadWithRelations } from '@/types/crm-advanced'
import { getScoreTier } from '@/types/crm-advanced'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'
import { getActiveWorkflows, triggerWorkflowForLead } from '@/modules/core/automation/actions'
import { CreateOrganizationSheet } from '@/components/organizations/create-organization-sheet'
import { createTask, completeTask, deleteTask, getTasksForLead, type Task } from '../task-actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

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

// Info Tab - Compact lead information
function InfoTab({ lead }: { lead: LeadWithRelations }) {
    const scoreTier = lead.score ? getScoreTier(lead.score) : null

    return (
        <div className="space-y-4">
            {/* Header with Score */}
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

            {/* Stage Badge */}
            <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">
                    {lead.status}
                </Badge>
                {/* Stage Badge logic removed due to build error */}
            </div>

            {/* Contact Info */}
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                {lead.email && (
                    <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${lead.email}`} className="hover:underline">
                            {lead.email}
                        </a>
                    </div>
                )}
                {lead.phone && (
                    <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${lead.phone}`} className="hover:underline">
                            {lead.phone}
                        </a>
                    </div>
                )}
                {lead.assignee && (
                    <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{lead.assignee.full_name || lead.assignee.email}</span>
                    </div>
                )}
            </div>

            {/* Quick Stats */}
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

            {/* Meta */}
            <p className="text-xs text-muted-foreground text-center">
                Creado {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: es })}
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/crm/inbox?contact=${lead.phone || lead.email}`}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Mensaje
                    </Link>
                </Button>
                <TriggerAutomationButton leadId={lead.id} />
            </div>

            <div className="pt-4 border-t border-dashed">
                <PromoteToTenantButton lead={lead} />
            </div>
        </div>
    )
}

function PromoteToTenantButton({ lead }: { lead: LeadWithRelations }) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button
                variant="secondary"
                className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                onClick={() => setOpen(true)}
            >
                <Building2 className="h-4 w-4 mr-2" />
                Convertir a Organización (Tenant)
            </Button>

            <CreateOrganizationSheet
                open={open}
                onOpenChange={setOpen}
                initialData={{
                    name: lead.company_name || lead.name,
                    email: lead.email || undefined
                }}
                onSuccess={() => {
                    // Optional: Mark lead as 'converted' via action
                    // updateLeadStatus(lead.id, 'won')
                }}
            />
        </>
    )
}

// Chat Tab - Mini conversation view
function ChatTab({ lead }: { lead: LeadWithRelations }) {
    const [messages, setMessages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [conversationId, setConversationId] = useState<string | null>(null)

    useEffect(() => {
        async function loadPreview() {
            setLoading(true)
            // Dynamically import to avoid server-action build issues in client component if direct import fails
            const { getLeadConversationPreview } = await import('@/modules/core/messaging/conversation-actions')
            const res = await getLeadConversationPreview(lead.id)
            if (res.success && res.messages) {
                setMessages(res.messages)
                setConversationId(res.conversationId || null)
            } else {
                setMessages([])
            }
            setLoading(false)
        }
        loadPreview()
    }, [lead.id])

    const chatLink = conversationId
        ? `/crm/inbox?conversationId=${conversationId}`
        : `/crm/inbox?contact=${encodeURIComponent(lead.phone || lead.email || '')}`

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-12 flex-1 rounded-lg" />
                    </div>
                ))}
            </div>
        )
    }

    if (messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl m-1">
                <MessageSquare className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No hay mensajes recientes</p>
                <p className="text-xs text-muted-foreground mb-4">Inicia una conversación ahora</p>
                <Button variant="default" size="sm" asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Link href={chatLink}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Iniciar Conversación
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="h-[350px] flex flex-col">
            <ScrollArea className="flex-1 pr-4 -mr-4">
                <div className="space-y-4 pr-4 pb-4">
                    <div className="text-center">
                        <span className="text-[10px] font-medium text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                            Últimos 3 mensajes
                        </span>
                    </div>
                    {messages.map((msg, idx) => {
                        const isOutbound = msg.direction === 'outbound' || msg.sender_id !== lead.phone // Simple heuristic or check direction column
                        return (
                            <div
                                key={idx}
                                className={cn(
                                    "flex flex-col max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                                    isOutbound
                                        ? "bg-blue-600 text-white ml-auto rounded-br-none"
                                        : "bg-white dark:bg-slate-800 border mr-auto rounded-bl-none"
                                )}
                            >
                                <p>{typeof msg.content === 'string' ? msg.content : (msg.content?.text || msg.content?.body || 'Mensaje multimedia')}</p>
                                <span className={cn(
                                    "text-[10px] mt-1 opacity-70",
                                    isOutbound ? "text-blue-100" : "text-muted-foreground"
                                )}>
                                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: es })}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>

            <div className="pt-4 border-t mt-2">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" asChild>
                    <Link href={chatLink}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Ir a la Conversación
                    </Link>
                </Button>
            </div>
        </div>
    )
}

// Activity Tab - Automation execution logs
function ActivityTab({ lead }: { lead: LeadWithRelations }) {
    const [executions, setExecutions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false)
            setExecutions([])
        }, 500)
        return () => clearTimeout(timer)
    }, [lead.id])

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
            </div>
        )
    }

    if (executions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <Zap className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">Sin actividad de automatizaciones</p>
                <p className="text-xs text-muted-foreground mt-1">
                    Las ejecuciones de workflows aparecerán aquí
                </p>
            </div>
        )
    }

    return (
        <ScrollArea className="h-[300px]">
            <div className="space-y-2 pr-4">
                {executions.map((exec, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className={cn(
                            "p-1.5 rounded-full",
                            exec.status === 'success' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        )}>
                            <Zap className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium">{exec.workflow?.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(exec.completed_at), { addSuffix: true, locale: es })}
                            </p>
                        </div>
                        <Badge variant={exec.status === 'success' ? 'default' : 'destructive'}>
                            {exec.status}
                        </Badge>
                    </div>
                ))}
            </div>
        </ScrollArea>
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

    const priorityColors: Record<string, string> = {
        low: 'text-gray-500',
        medium: 'text-blue-500',
        high: 'text-orange-500',
        urgent: 'text-red-500'
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
            {/* Create Task Button */}
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

            {/* Task List */}
            <ScrollArea className="h-[250px]">
                <div className="space-y-2 pr-4">
                    {tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <CheckCircle2 className="h-10 w-10 text-muted-foreground/50 mb-3" />
                            <p className="text-sm text-muted-foreground">Sin tareas pendientes</p>
                            <p className="text-xs text-muted-foreground mt-1">Crea una tarea para dar seguimiento</p>
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
                                            {isOverdue && <AlertCircle className="h-3 w-3 text-red-500" />}
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

    useEffect(() => {
        if (leadId && isOpen) {
            loadLead()
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
            <SheetContent
                side="right"
                className="
                    sm:max-w-[450px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <SheetHeader className="hidden">
                    <SheetTitle>Lead Inspector</SheetTitle>
                    <SheetDescription>Ver información del lead</SheetDescription>
                </SheetHeader>

                <div className="flex flex-col h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center gap-3 px-6 py-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-b border-black/5 dark:border-white/5">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600">
                            <User className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold tracking-tight">Lead Inspector</h2>
                            <p className="text-xs text-muted-foreground">
                                {lead?.name || 'Cargando...'}
                            </p>
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
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
                            <TabsList className="mx-6 mt-4 p-1 bg-muted/50 rounded-xl">
                                <TabsTrigger value="info" className="flex-1 gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <User className="h-4 w-4" />
                                    Info
                                </TabsTrigger>
                                <TabsTrigger value="tasks" className="flex-1 gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Tareas
                                </TabsTrigger>
                                <TabsTrigger value="chat" className="flex-1 gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <MessageSquare className="h-4 w-4" />
                                    Chat
                                </TabsTrigger>
                                <TabsTrigger value="activity" className="flex-1 gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <Activity className="h-4 w-4" />
                                    Activity
                                </TabsTrigger>
                            </TabsList>

                            <ScrollArea className="flex-1 px-6 py-4">
                                <TabsContent value="info" className="mt-0">
                                    <InfoTab lead={lead} />
                                </TabsContent>
                                <TabsContent value="tasks" className="mt-0">
                                    <TasksTab lead={lead} onUpdate={loadLead} />
                                </TabsContent>
                                <TabsContent value="chat" className="mt-0">
                                    <ChatTab lead={lead} />
                                </TabsContent>
                                <TabsContent value="activity" className="mt-0">
                                    <ActivityTab lead={lead} />
                                </TabsContent>
                            </ScrollArea>
                        </Tabs>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
