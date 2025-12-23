"use client"

import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import {
    Clock,
    DollarSign,
    FileText,
    CheckCircle2,
    XCircle,
    Heart,
    Bell,
    Briefing,
    FileCheck,
    FileX
} from "lucide-react"

type NotificationItemProps = {
    notification: any
    onClick: () => void
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
    const isUnread = !notification.read

    const getIcon = (type: string) => {
        switch (type) {
            case 'payment_reminder':
                return { icon: Clock, color: "text-amber-600", bg: "bg-amber-100" }
            case 'payment_due':
                return { icon: DollarSign, color: "text-red-600", bg: "bg-red-100" }
            case 'invoice_generated':
                return { icon: FileText, color: "text-blue-600", bg: "bg-blue-100" }
            case 'quote_accepted':
                return { icon: FileCheck, color: "text-green-600", bg: "bg-green-100" }
            case 'quote_rejected':
                return { icon: FileX, color: "text-red-600", bg: "bg-red-100" }
            case 'service_interest':
                return { icon: Heart, color: "text-pink-600", bg: "bg-pink-100" }
            case 'briefing_submitted':
                return { icon: FileText, color: "text-purple-600", bg: "bg-purple-100" }
            default:
                return { icon: Bell, color: "text-gray-600", bg: "bg-gray-100" }
        }
    }

    const { icon: Icon, color, bg } = getIcon(notification.type)

    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative flex gap-4 p-4 cursor-pointer transition-all duration-200",
                "hover:bg-gray-50 border-b border-gray-100 last:border-0",
                isUnread ? "bg-indigo-50/30" : "bg-white"
            )}
        >
            {/* Unread Indicator */}
            {isUnread && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full" />
            )}

            {/* Icon */}
            <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                bg,
                color
            )}>
                <Icon className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex justify-between items-start gap-2">
                    <h4 className={cn(
                        "text-sm font-medium leading-none",
                        isUnread ? "text-gray-900" : "text-gray-700"
                    )}>
                        {notification.title}
                    </h4>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
                    </span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                    {notification.message}
                </p>
            </div>
        </div>
    )
}
