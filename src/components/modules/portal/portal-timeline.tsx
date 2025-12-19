"use client"

import { ClientEvent } from "@/types"
import { CheckCircle2, Clock, FileText, DollarSign, MessageSquare, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface PortalTimelineProps {
    events: ClientEvent[]
}

export function PortalTimeline({ events }: PortalTimelineProps) {
    const getIcon = (type: string) => {
        switch (type) {
            case 'invoice_created': return DollarSign
            case 'payment_received': return CheckCircle2
            case 'quote_sent': return FileText
            case 'briefing_assigned': return MessageSquare
            case 'project_update': return Clock
            default: return AlertCircle
        }
    }

    const getColor = (type: string) => {
        switch (type) {
            case 'invoice_created': return "text-amber-500 bg-amber-50"
            case 'payment_received': return "text-green-500 bg-green-50"
            case 'quote_sent': return "text-blue-500 bg-blue-50"
            case 'briefing_assigned': return "text-purple-500 bg-purple-50"
            default: return "text-gray-500 bg-gray-50"
        }
    }

    if (events.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 text-sm">
                No hay actividad reciente.
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {events.map((event, index) => {
                const Icon = getIcon(event.type)
                const isLast = index === events.length - 1

                return (
                    <div
                        key={event.id}
                        className="relative flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        {!isLast && (
                            <div className="absolute left-[19px] top-10 bottom-[-24px] w-px bg-gray-200" />
                        )}

                        <div className={cn(
                            "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-100 shadow-sm",
                            getColor(event.type)
                        )}>
                            <Icon className="h-5 w-5" />
                        </div>

                        <div className="flex flex-col pt-1 pb-6">
                            <p className="text-sm font-medium text-gray-900">{event.title}</p>
                            <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                            <span className="text-xs text-gray-400 mt-2">
                                {new Date(event.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
