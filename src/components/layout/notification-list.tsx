"use client"

import { useRouter } from "next/navigation"
import { Bell, CheckCheck, Clock, DollarSign, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type Notification = {
    id: string
    type: string
    title: string
    message: string
    read: boolean
    created_at: string
    action_url?: string
    client_id?: string
    subscription_id?: string
}

type NotificationListProps = {
    notifications: Notification[]
    loading: boolean
    onMarkAsRead: (id: string) => void
    onMarkAllAsRead: () => void
    onRefresh: () => void
}

export function NotificationList({
    notifications,
    loading,
    onMarkAsRead,
    onMarkAllAsRead,
    onRefresh
}: NotificationListProps) {
    const router = useRouter()

    const getIcon = (type: string) => {
        switch (type) {
            case 'payment_reminder':
                return <Clock className="h-5 w-5 text-amber-600" />
            case 'payment_due':
                return <DollarSign className="h-5 w-5 text-red-600" />
            case 'invoice_generated':
                return <FileText className="h-5 w-5 text-green-600" />
            default:
                return <Bell className="h-5 w-5 text-gray-600" />
        }
    }

    const formatTime = (date: string) => {
        const now = new Date()
        const notif = new Date(date)
        const diff = now.getTime() - notif.getTime()
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)

        if (days > 0) return `Hace ${days}d`
        if (hours > 0) return `Hace ${hours}h`
        if (minutes > 0) return `Hace ${minutes}m`
        return 'Ahora'
    }

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            onMarkAsRead(notification.id)
        }

        if (notification.action_url) {
            router.push(notification.action_url)
        } else if (notification.client_id) {
            router.push(`/clients/${notification.client_id}`)
        }
    }

    if (loading) {
        return (
            <div className="w-96 p-8 text-center">
                <p className="text-sm text-gray-500">Cargando notificaciones...</p>
            </div>
        )
    }

    return (
        <div className="w-96">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-gray-900">Notificaciones</h3>
                {notifications.some(n => !n.read) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onMarkAllAsRead}
                        className="text-xs text-indigo-600 hover:text-indigo-700"
                    >
                        <CheckCheck className="h-4 w-4 mr-1" />
                        Marcar todas
                    </Button>
                )}
            </div>

            {/* Notification List */}
            <ScrollArea className="max-h-[400px]">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                        <Bell className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500">No hay notificaciones</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={cn(
                                    "p-4 cursor-pointer transition-colors hover:bg-gray-50",
                                    !notification.read && "bg-indigo-50/50"
                                )}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 mt-1">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={cn(
                                                "text-sm font-medium",
                                                !notification.read ? "text-gray-900" : "text-gray-600"
                                            )}>
                                                {notification.title}
                                            </p>
                                            <span className="text-xs text-gray-500 flex-shrink-0">
                                                {formatTime(notification.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {notification.message}
                                        </p>
                                        {!notification.read && (
                                            <div className="mt-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
