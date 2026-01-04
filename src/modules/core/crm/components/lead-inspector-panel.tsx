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
    Loader2
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
                <Badge variant="outline" className="capitalize">
                    {lead.status}
                </Badge>
                {lead.stage && (
                    <>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="secondary" className="capitalize">
                            {lead.stage.name}
                        </Badge>
                    </>
                )}
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
        </div>
    )
}

// Chat Tab - Mini conversation view
function ChatTab({ lead }: { lead: LeadWithRelations }) {
    const [messages, setMessages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false)
            setMessages([])
        }, 500)
        return () => clearTimeout(timer)
    }, [lead.id])

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
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No hay mensajes con este contacto</p>
                <Button variant="outline" size="sm" className="mt-3">
                    Iniciar Conversación
                </Button>
            </div>
        )
    }

    return (
        <ScrollArea className="h-[300px]">
            <div className="space-y-3 pr-4">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "p-3 rounded-lg text-sm",
                            msg.direction === 'outbound'
                                ? "bg-primary text-primary-foreground ml-8"
                                : "bg-muted mr-8"
                        )}
                    >
                        {msg.content}
                    </div>
                ))}
            </div>
        </ScrollArea>
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
