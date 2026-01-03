'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    User,
    Settings,
    MessageSquare,
    Mail,
    Phone,
    Calendar,
    CheckCircle,
    FileText,
    ArrowRight,
    Star,
    Tag
} from 'lucide-react'
import type { LeadActivity, ActivityType } from '@/types/crm-advanced'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ScrollArea } from '@/components/ui/scroll-area'

interface LeadTimelineTabProps {
    activities: LeadActivity[]
}

function getActivityIcon(type: ActivityType) {
    switch (type) {
        case 'status_change': return <ArrowRight className="h-4 w-4 text-blue-500" />
        case 'assigned': return <User className="h-4 w-4 text-purple-500" />
        case 'note_added': return <MessageSquare className="h-4 w-4 text-yellow-500" />
        case 'email_sent': return <Mail className="h-4 w-4 text-gray-500" />
        case 'call_made': return <Phone className="h-4 w-4 text-green-500" />
        case 'task_completed': return <CheckCircle className="h-4 w-4 text-green-600" />
        case 'task_created': return <CheckCircle className="h-4 w-4 text-gray-400" />
        case 'score_updated': return <Star className="h-4 w-4 text-orange-500" />
        default: return <Settings className="h-4 w-4 text-gray-400" />
    }
}

function getActivityLabel(type: ActivityType) {
    switch (type) {
        case 'status_change': return 'Cambio de Estado'
        case 'assigned': return 'Asignación'
        case 'note_added': return 'Nota Agregada'
        case 'email_sent': return 'Email Enviado'
        case 'call_made': return 'Llamada'
        case 'task_completed': return 'Tarea Completada'
        case 'task_created': return 'Tarea Creada'
        case 'score_updated': return 'Score Actualizado'
        case 'created': return 'Lead Creado'
        default: return 'Actividad'
    }
}

export function LeadTimelineTab({ activities }: LeadTimelineTabProps) {
    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Settings className="h-8 w-8 mb-2 opacity-20" />
                <p>No hay actividad registrada aún</p>
            </div>
        )
    }

    return (
        <Card className="h-full border-none shadow-none">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg">Historial de Actividad</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
                <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-8 pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-2">
                        {activities.map((activity) => (
                            <div key={activity.id} className="relative">
                                {/* Icon Bubble */}
                                <div className="absolute -left-[25px] top-0 bg-white dark:bg-slate-950 p-1 rounded-full border border-slate-200 dark:border-slate-800">
                                    {getActivityIcon(activity.activity_type)}
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">
                                            {getActivityLabel(activity.activity_type)}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: es })}
                                        </span>
                                    </div>

                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        {activity.description}
                                    </p>

                                    {/* Metadata Rendering */}
                                    {activity.metadata && (
                                        <div className="mt-2 text-xs bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800 max-w-md">
                                            {activity.activity_type === 'status_change' && (
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">{activity.metadata.old_status || 'None'}</Badge>
                                                    <ArrowRight className="h-3 w-3" />
                                                    <Badge variant="default">{activity.metadata.new_status}</Badge>
                                                </div>
                                            )}

                                            {activity.activity_type === 'score_updated' && (
                                                <div className="flex items-center gap-2">
                                                    <span>Score: {activity.metadata.new_score}</span>
                                                    {activity.metadata.factors && (
                                                        <span className="text-muted-foreground">
                                                            ({Object.keys(activity.metadata.factors).filter(k => activity.metadata.factors[k]).length} factores)
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="text-xs text-muted-foreground pt-1">
                                        {format(new Date(activity.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                                        {activity.performed_by_user && (
                                            <span className="ml-1">
                                                · por {activity.performed_by_user.full_name || activity.performed_by_user.email}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
