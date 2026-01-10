'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Bell, Check, CheckCheck, MessageSquare, UserPlus, TrendingUp,
    AlertCircle, Clock, Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface Notification {
    id: string
    type: 'message' | 'lead' | 'task' | 'deal' | 'system'
    title: string
    description: string
    read: boolean
    created_at: string
    link?: string
}

// Mock notifications for now - later connect to real notification system
const mockNotifications: Notification[] = [
    {
        id: '1',
        type: 'message',
        title: 'Nuevo mensaje',
        description: 'Juan García respondió a tu mensaje',
        read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        link: '/crm/inbox'
    },
    {
        id: '2',
        type: 'lead',
        title: 'Nuevo lead',
        description: 'María López se registró desde el formulario web',
        read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        link: '/crm'
    },
    {
        id: '3',
        type: 'task',
        title: 'Tarea vencida',
        description: 'Llamar a Pedro Ramírez venció hace 2 horas',
        read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        link: '/crm/tasks'
    },
    {
        id: '4',
        type: 'deal',
        title: 'Deal cerrado',
        description: 'Propuesta #2847 fue aceptada - $5,000,000',
        read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        link: '/crm'
    }
]

export function NotificationCenter() {
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
    const [open, setOpen] = useState(false)

    const unreadCount = notifications.filter(n => !n.read).length

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        )
    }

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    const typeIcons: Record<string, React.ReactNode> = {
        message: <MessageSquare className="w-4 h-4 text-blue-500" />,
        lead: <UserPlus className="w-4 h-4 text-green-500" />,
        task: <Clock className="w-4 h-4 text-orange-500" />,
        deal: <TrendingUp className="w-4 h-4 text-purple-500" />,
        system: <AlertCircle className="w-4 h-4 text-gray-500" />
    }

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        <span className="font-semibold">Notificaciones</span>
                        {unreadCount > 0 && (
                            <Badge variant="secondary" className="h-5 px-1.5">
                                {unreadCount}
                            </Badge>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
                            <CheckCheck className="w-3 h-3 mr-1" />
                            Marcar todo
                        </Button>
                    )}
                </div>

                {/* Notifications List */}
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Bell className="w-10 h-10 text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground">Sin notificaciones</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer relative group",
                                        !notification.read && "bg-blue-50/50 dark:bg-blue-900/10"
                                    )}
                                    onClick={() => {
                                        markAsRead(notification.id)
                                        if (notification.link) {
                                            window.location.href = notification.link
                                        }
                                    }}
                                >
                                    <div className={cn(
                                        "p-2 rounded-full shrink-0",
                                        !notification.read ? "bg-blue-100 dark:bg-blue-900/30" : "bg-muted"
                                    )}>
                                        {typeIcons[notification.type]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "text-sm truncate",
                                            !notification.read && "font-medium"
                                        )}>
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {notification.description}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
                                        </p>
                                    </div>
                                    {/* Actions */}
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                        {!notification.read && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => markAsRead(notification.id)}>
                                                <Check className="w-3 h-3" />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => deleteNotification(notification.id)}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                    {/* Unread Indicator */}
                                    {!notification.read && (
                                        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer */}
                <div className="p-3 border-t">
                    <Button variant="outline" className="w-full text-sm" size="sm">
                        Ver todas las notificaciones
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
