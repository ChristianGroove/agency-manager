"use client"

import { ClientEvent } from "@/types"
import { CheckCircle2, Clock, FileText, DollarSign, MessageSquare, AlertCircle } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"

interface PortalTimelineProps {
    events: ClientEvent[]
}

import { useTranslation } from "@/modules/core/i18n/use-translation"

export function PortalTimeline({ events }: PortalTimelineProps) {
    const { t: originalT } = useTranslation()
    const t = (key: any) => originalT(key)
    const getIcon = (type: string) => {
        switch (type) {
            case 'invoice_created':
            case 'invoice': return DollarSign
            case 'payment_received':
            case 'payment': return CheckCircle2
            case 'quote_sent':
            case 'quote': return FileText
            case 'briefing_assigned':
            case 'briefing': return MessageSquare
            case 'project_update': return Clock
            default: return AlertCircle
        }
    }

    const getColor = (type: string) => {
        switch (type) {
            case 'invoice_created':
            case 'invoice': return "text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/50 dark:border-amber-800/50"
            case 'payment_received':
            case 'payment': return "text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border-green-200/50 dark:border-green-800/50"
            case 'quote_sent':
            case 'quote': return "text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200/50 dark:border-blue-800/50"
            case 'briefing_assigned':
            case 'briefing': return "text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200/50 dark:border-purple-800/50"
            default: return "text-gray-500 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-800 border-gray-200/50 dark:border-white/10"
        }
    }

    if (events.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-zinc-400 text-sm">
                {t('portal.timeline.no_activity')}
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
                            <div className="absolute left-[19px] top-10 bottom-[-24px] w-px bg-gray-200 dark:bg-zinc-800" />
                        )}

                        <div className={cn(
                            "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm",
                            getColor(event.type)
                        )}>
                            <Icon className="h-5 w-5" />
                        </div>

                        <div className="flex flex-col pt-1 pb-6">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{event.title}</p>
                            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">{event.description}</p>
                            <span className="text-xs text-gray-400 dark:text-zinc-500 mt-2">
                                {new Date(event.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
