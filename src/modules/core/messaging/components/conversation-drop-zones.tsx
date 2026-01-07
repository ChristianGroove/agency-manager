"use client"

import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { CheckCircle2, Archive, Clock, RotateCcw } from "lucide-react"

interface DropZone {
    id: string
    label: string
    icon: any
    color: string
    bgColor: string
}

const DROP_ZONES: DropZone[] = [
    {
        id: 'resolved',
        label: 'Resolver',
        icon: CheckCircle2,
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700'
    },
    {
        id: 'archived',
        label: 'Archivar',
        icon: Archive,
        color: 'text-slate-600 dark:text-slate-400',
        bgColor: 'bg-slate-100 dark:bg-slate-900/30 border-slate-300 dark:border-slate-700'
    },
    {
        id: 'snoozed',
        label: 'Posponer',
        icon: Clock,
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700'
    },
    {
        id: 'open',
        label: 'Reabrir',
        icon: RotateCcw,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
    },
]

function DroppableZone({ zone }: { zone: DropZone }) {
    const { isOver, setNodeRef } = useDroppable({
        id: zone.id,
    })

    const Icon = zone.icon

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition-all duration-200",
                zone.bgColor,
                isOver && "scale-105 border-solid ring-2 ring-offset-2",
                isOver && zone.id === 'resolved' && "ring-emerald-500",
                isOver && zone.id === 'archived' && "ring-slate-500",
                isOver && zone.id === 'snoozed' && "ring-amber-500",
                isOver && zone.id === 'open' && "ring-blue-500"
            )}
        >
            <Icon className={cn("h-6 w-6 mb-2", zone.color)} />
            <span className={cn("text-sm font-medium", zone.color)}>{zone.label}</span>
        </div>
    )
}

interface ConversationDropZonesProps {
    visible: boolean
}

export function ConversationDropZones({ visible }: ConversationDropZonesProps) {
    if (!visible) return null

    return (
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-background via-background to-transparent z-10 animate-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-4 gap-3">
                {DROP_ZONES.map((zone) => (
                    <DroppableZone key={zone.id} zone={zone} />
                ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-3">
                Suelta la conversación en una zona para cambiar su estado
            </p>
        </div>
    )
}
