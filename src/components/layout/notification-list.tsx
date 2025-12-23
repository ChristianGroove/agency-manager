"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, Loader2, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NotificationItem } from "./notification-item"

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
    const [activeTab, setActiveTab] = useState("all")

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            onMarkAsRead(notification.id)
        }

        if (notification.action_url) {
            router.push(notification.action_url)
        } else if (notification.client_id) {
            router.push(`/dashboard/clients/${notification.client_id}`)
        }
    }

    const filteredNotifications = activeTab === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications

    const unreadCount = notifications.filter(n => !n.read).length

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4 gap-3 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-sm">Cargando notificaciones...</p>
            </div>
        )
    }

    return (
        <div className="w-[400px] flex flex-col h-[500px]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white shrink-0 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg text-gray-900">Notificaciones</h3>
                    {unreadCount > 0 && (
                        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onMarkAllAsRead}
                        className="text-xs h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                    >
                        <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                        Marcar leídas
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="all" className="w-full flex-1 flex flex-col" onValueChange={setActiveTab}>
                <div className="px-4 py-3 border-b shrink-0 bg-white">
                    <TabsList className="w-full grid grid-cols-2 h-9 p-1 bg-gray-100 rounded-lg">
                        <TabsTrigger
                            value="all"
                            className="text-xs font-medium rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 transition-all"
                        >
                            Todas
                        </TabsTrigger>
                        <TabsTrigger
                            value="unread"
                            className="text-xs font-medium rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 transition-all"
                        >
                            No leídas
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 relative bg-white">
                    <ScrollArea className="h-full absolute inset-0">
                        {filteredNotifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[300px] text-center p-8">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <Inbox className="h-8 w-8 text-gray-300" />
                                </div>
                                <h4 className="text-gray-900 font-medium mb-1">Sin notificaciones</h4>
                                <p className="text-sm text-gray-500">
                                    {activeTab === 'unread'
                                        ? "¡Estás al día! No tienes notificaciones pendientes."
                                        : "No hay notificaciones para mostrar."}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {filteredNotifications.map((notification) => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onClick={() => handleNotificationClick(notification)}
                                    />
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </Tabs>
        </div>
    )
}
