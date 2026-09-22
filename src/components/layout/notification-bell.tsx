"use client"

import { useState, useEffect, useRef } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu"
import { supabase } from "@/modules/core/database/supabase"
import { realtimeManager } from "@/modules/core/database/supabase-realtime-manager"
import { NotificationList } from "./notification-list"
// import { checkUpcomingPayments } from "@/modules/infrastructure/notifications/services/notifications"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

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
    organization_id?: string
}

interface NotificationBellProps {
    trigger?: React.ReactNode
}

export function NotificationBell({ trigger }: NotificationBellProps) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [isMounted, setIsMounted] = useState(false)
    const lastFetchRef = useRef<number>(Date.now())
    const orgIdRef = useRef<string | null>(null)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const fetchNotifications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // CRITICAL: Get current organization to filter notifications
            const orgId = await getCurrentOrganizationId()
            orgIdRef.current = orgId
            if (!orgId) {
                setNotifications([])
                setUnreadCount(0)
                setLoading(false)
                return
            }

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .eq('organization_id', orgId) // STRICT FILTERING BY ORGANIZATION
                .order('created_at', { ascending: false })
                .limit(10)

            if (error) throw error

            setNotifications(data || [])
            setUnreadCount(data?.filter(n => !n.read).length || 0)
            lastFetchRef.current = Date.now()
        } catch (error) {
            console.error('Error fetching notifications:', error)
        } finally {
            setLoading(false)
        }
    }

    const markAsRead = async (notificationId: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId)

            if (error) throw error

            // Update local state
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (error) {
            console.error('Error marking notification as read:', error)
        }
    }

    const markAllAsRead = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // CRITICAL: Get current organization to only mark this org's notifications
            const orgId = await getCurrentOrganizationId()
            if (!orgId) return

            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('organization_id', orgId) // STRICT FILTERING BY ORGANIZATION
                .eq('read', false)

            if (error) throw error

            // Update local state
            setNotifications(prev => prev.map(n => ({ ...n, read: true })))
            setUnreadCount(0)
        } catch (error) {
            console.error('Error marking all as read:', error)
        }
    }

    useEffect(() => {
        fetchNotifications()

        let channelName = ''

        // Realtime Subscription via singleton manager
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            channelName = `notifications_user_${user.id}`

            realtimeManager.getOrCreateChannel(channelName, (channel) => {
                channel.on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        const currentOrg = orgIdRef.current
                        if (payload.eventType === 'INSERT') {
                            const newNotif = payload.new as Notification
                            if (!currentOrg || !newNotif.organization_id || newNotif.organization_id === currentOrg) {
                                setNotifications((prev) => {
                                    if (prev.some((n) => n.id === newNotif.id)) return prev
                                    return [newNotif, ...prev].slice(0, 15)
                                })
                                if (!newNotif.read) {
                                    setUnreadCount((prev) => prev + 1)
                                }
                            }
                        } else if (payload.eventType === 'UPDATE') {
                            const updated = payload.new as Notification
                            setNotifications((prev) =>
                                prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
                            )
                            if (updated.read) {
                                setUnreadCount((prev) => Math.max(0, prev - 1))
                            }
                        } else if (payload.eventType === 'DELETE') {
                            const deletedId = (payload.old as any)?.id
                            if (deletedId) {
                                setNotifications((prev) => prev.filter((n) => n.id !== deletedId))
                            }
                        }
                    }
                )
            })
        })

        // Liveness fallback: Re-sync if tab was hidden/inactive for > 2 minutes
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const elapsed = Date.now() - lastFetchRef.current
                if (elapsed > 2 * 60 * 1000) {
                    fetchNotifications()
                }
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleVisibilityChange)

        return () => {
            if (channelName) {
                realtimeManager.releaseChannel(channelName)
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleVisibilityChange)
        }
    }, [])

    if (!isMounted) {
        return null
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {trigger ? (
                    <div className="cursor-pointer relative">
                        {trigger}
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                        )}
                    </div>
                ) : (
                    <TooltipProvider delayDuration={150}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-900 transition-colors cursor-pointer" aria-label="Notificaciones">
                                    <Bell className="h-5 w-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <span>{unreadCount > 0 ? `Notificaciones (${unreadCount} pendientes)` : "Notificaciones al día"}</span>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="p-0 border-0 shadow-xl rounded-xl overflow-hidden md:w-[400px] w-[350px]">
                <NotificationList
                    notifications={notifications}
                    loading={loading}
                    onMarkAsRead={markAsRead}
                    onMarkAllAsRead={markAllAsRead}
                    onRefresh={fetchNotifications}
                />
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

