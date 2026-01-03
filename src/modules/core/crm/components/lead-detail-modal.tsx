'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
    User,
    Building2,
    Mail,
    Phone,
    Calendar,
    Target,
    Edit,
    Trash,
    UserPlus,
    CheckCircle,
    Clock,
    FileText,
    MessageSquare,
    Paperclip,
    TrendingUp,
    X
} from 'lucide-react'
import { getLeadWithRelations, calculateLeadScore } from '../crm-advanced-actions'
import type { LeadWithRelations } from '@/types/crm-advanced'
import { getScoreTier } from '@/types/crm-advanced'
import { LeadOverviewTab } from './lead-detail-tabs/overview-tab'
import { LeadTimelineTab } from './lead-detail-tabs/timeline-tab'
import { LeadTasksTab } from './lead-detail-tabs/tasks-tab'
import { LeadNotesTab } from './lead-detail-tabs/notes-tab'
import { LeadDocumentsTab } from './lead-detail-tabs/documents-tab'
import { LeadEmailsTab } from './lead-detail-tabs/emails-tab'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

interface LeadDetailModalProps {
    leadId: string | null
    open: boolean
    onClose: () => void
    onUpdate?: () => void
}

export function LeadDetailModal({ leadId, open, onClose, onUpdate }: LeadDetailModalProps) {
    const [lead, setLead] = useState<LeadWithRelations | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('overview')

    useEffect(() => {
        if (leadId && open) {
            loadLead()
        }
    }, [leadId, open])

    async function loadLead() {
        if (!leadId) return

        setLoading(true)
        try {
            const data = await getLeadWithRelations(leadId)
            setLead(data)
        } catch (error) {
            console.error('Error loading lead:', error)
            toast.error('Error al cargar el lead')
        } finally {
            setLoading(false)
        }
    }

    async function handleRecalculateScore() {
        if (!leadId) return

        try {
            const result = await calculateLeadScore(leadId)
            if (result.success) {
                toast.success('Score actualizado')
                loadLead() // Refresh
            } else {
                toast.error(result.error || 'Error al calcular score')
            }
        } catch (error) {
            console.error('Error calculating score:', error)
            toast.error('Error al calcular score')
        }
    }

    if (!leadId || !open) return null

    const scoreTier = lead?.score ? getScoreTier(lead.score) : null

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl h-[90vh] p-0">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : !lead ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Lead no encontrado</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="p-6 border-b">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <DialogTitle className="text-2xl font-bold">{lead.name}</DialogTitle>
                                        {scoreTier && (
                                            <Badge
                                                variant="outline"
                                                className="border-2"
                                                style={{ borderColor: scoreTier.color }}
                                            >
                                                {scoreTier.icon} {lead.score}/100
                                            </Badge>
                                        )}
                                        <Badge variant="secondary">{lead.status}</Badge>
                                    </div>

                                    {/* Quick Info */}
                                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                        {lead.company_name && (
                                            <div className="flex items-center gap-1">
                                                <Building2 className="h-4 w-4" />
                                                <span>{lead.company_name}</span>
                                            </div>
                                        )}
                                        {lead.email && (
                                            <div className="flex items-center gap-1">
                                                <Mail className="h-4 w-4" />
                                                <span>{lead.email}</span>
                                            </div>
                                        )}
                                        {lead.phone && (
                                            <div className="flex items-center gap-1">
                                                <Phone className="h-4 w-4" />
                                                <span>{lead.phone}</span>
                                            </div>
                                        )}
                                        {lead.assignee && (
                                            <div className="flex items-center gap-1">
                                                <User className="h-4 w-4" />
                                                <span>{lead.assignee.full_name || lead.assignee.email}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <div className="flex gap-6 mt-4">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">
                                                Creado {formatDistanceToNow(new Date(lead.created_at), {
                                                    addSuffix: true,
                                                    locale: es
                                                })}
                                            </span>
                                        </div>
                                        {lead.tasks && lead.tasks.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                                <span className="text-sm">
                                                    {lead.tasks.filter(t => t.status === 'completed').length}/
                                                    {lead.tasks.length} tareas
                                                </span>
                                            </div>
                                        )}
                                        {lead.note_entries && lead.note_entries.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4 text-blue-600" />
                                                <span className="text-sm">{lead.note_entries.length} notas</span>
                                            </div>
                                        )}
                                        {lead.documents && lead.documents.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <Paperclip className="h-4 w-4 text-purple-600" />
                                                <span className="text-sm">{lead.documents.length} archivos</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex items-center gap-2">
                                    {lead.score !== undefined && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleRecalculateScore}
                                        >
                                            <TrendingUp className="h-4 w-4 mr-2" />
                                            Recalcular Score
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => window.open(`/dashboard/inbox?leadId=${lead.id}`, '_self')}
                                    >
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Enviar Mensaje
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onClose}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-6 pt-4">
                                <TabsList className="grid w-full grid-cols-6">
                                    <TabsTrigger value="overview" className="gap-2">
                                        <FileText className="h-4 w-4" />
                                        Vista General
                                    </TabsTrigger>
                                    <TabsTrigger value="timeline" className="gap-2">
                                        <Clock className="h-4 w-4" />
                                        Timeline
                                        {lead.activities && lead.activities.length > 0 && (
                                            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                                                {lead.activities.length}
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="tasks" className="gap-2">
                                        <CheckCircle className="h-4 w-4" />
                                        Tareas
                                        {lead.tasks && lead.tasks.filter(t => t.status === 'pending').length > 0 && (
                                            <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                                                {lead.tasks.filter(t => t.status === 'pending').length}
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="notes" className="gap-2">
                                        <MessageSquare className="h-4 w-4" />
                                        Notas
                                        {lead.note_entries && lead.note_entries.length > 0 && (
                                            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                                                {lead.note_entries.length}
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="documents" className="gap-2">
                                        <Paperclip className="h-4 w-4" />
                                        Archivos
                                        {lead.documents && lead.documents.length > 0 && (
                                            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                                                {lead.documents.length}
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="emails" className="gap-2">
                                        <Mail className="h-4 w-4" />
                                        Correos
                                        {lead.emails && lead.emails.length > 0 && (
                                            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                                                {lead.emails.length}
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="flex-1 overflow-auto p-6">
                                <TabsContent value="overview" className="mt-0">
                                    <LeadOverviewTab lead={lead} onUpdate={loadLead} />
                                </TabsContent>

                                <TabsContent value="timeline" className="mt-0">
                                    <LeadTimelineTab activities={lead.activities || []} />
                                </TabsContent>

                                <TabsContent value="tasks" className="mt-0">
                                    <LeadTasksTab leadId={lead.id} tasks={lead.tasks || []} onUpdate={loadLead} />
                                </TabsContent>

                                <TabsContent value="notes" className="mt-0">
                                    <LeadNotesTab leadId={lead.id} notes={lead.note_entries || []} onUpdate={loadLead} />
                                </TabsContent>

                                <TabsContent value="documents" className="mt-0">
                                    <LeadDocumentsTab leadId={lead.id} documents={lead.documents || []} onUpdate={loadLead} />
                                </TabsContent>

                                <TabsContent value="emails" className="mt-0 h-full">
                                    <LeadEmailsTab
                                        leadId={lead.id}
                                        leadEmail={lead.email}
                                        emails={lead.emails || []}
                                        onUpdate={loadLead}
                                    />
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
