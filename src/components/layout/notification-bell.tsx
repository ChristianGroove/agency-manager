"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu"
import { supabase } from "@/lib/supabase"
import { NotificationList } from "./notification-list"
import { checkUpcomingPayments } from "@/lib/notifications"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

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

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const fetchNotifications = async () => {
        try {
            // Check for upcoming payments and generate notifications/invoices if needed
            await checkUpcomingPayments()

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // CRITICAL: Get current organization to filter notifications
            const orgId = await getCurrentOrganizationId()
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

        // Poll for new notifications every 60 seconds
        // const interval = setInterval(fetchNotifications, 60000)
        // return () => clearInterval(interval)
    }, [])

    if (!isMounted) {
        return null
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-900 transition-colors">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                    )}
                </Button>
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
