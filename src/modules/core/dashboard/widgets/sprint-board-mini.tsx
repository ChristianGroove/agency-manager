"use client"

import { Kanban, Circle, ArrowRight, CheckCircle2, Eye, AlertTriangle, ListChecks } from "lucide-react"
import { useRouter } from "next/navigation"

interface SprintBoardMiniProps {
    statusCounts: {
        backlog: number
        todo: number
        in_progress: number
        in_review: number
        done: number
        blocked: number
    }
}

const COLUMNS = [
    { key: "todo", label: "Por Hacer", icon: Circle, dotColor: "bg-zinc-400" },
    { key: "in_progress", label: "En Curso", icon: ArrowRight, dotColor: "bg-blue-500" },
    { key: "in_review", label: "Revisión", icon: Eye, dotColor: "bg-amber-500" },
    { key: "done", label: "Hecho", icon: CheckCircle2, dotColor: "bg-emerald-500" },
] as const

export function SprintBoardMini({ statusCounts }: SprintBoardMiniProps) {
    const router = useRouter()

    // Include backlog in "todo" count for a cleaner 4-column view
    const adjustedCounts = {
        ...statusCounts,
        todo: (statusCounts.todo || 0) + (statusCounts.backlog || 0)
    }

    const total = adjustedCounts.todo + adjustedCounts.in_progress + adjustedCounts.in_review + adjustedCounts.done
    const blockedCount = statusCounts.blocked || 0

    // Empty state — no tasks exist at all
    if (total === 0 && blockedCount === 0) {
        return (
            <div
                className="bg-card border border-zinc-200/80 dark:border-white/10 rounded-xl px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors"
                onClick={() => router.push("/operations/tasks")}
            >
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-zinc-100 dark:bg-white/[0.06]">
                        <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">Tablero de Tareas</p>
                        <p className="text-xs text-muted-foreground">Crea tu primera tarea para ver el progreso del equipo aquí</p>
                    </div>
                </div>
                <span className="text-xs text-[var(--brand-pink)] font-medium shrink-0">Ir a Tareas →</span>
            </div>
        )
    }

    // Stacked bar segments
    const segments = COLUMNS.map(col => ({
        ...col,
        count: adjustedCounts[col.key] || 0,
        pct: total > 0 ? ((adjustedCounts[col.key] || 0) / total) * 100 : 0
    }))

    return (
        <div
            className="bg-card border border-zinc-200/80 dark:border-white/10 rounded-xl px-5 py-3.5 cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition-colors"
            onClick={() => router.push("/operations/tasks")}
        >
            {/* Single-row compact layout */}
            <div className="flex items-center gap-4">
                {/* Icon + Title */}
                <div className="flex items-center gap-2 shrink-0">
                    <Kanban className="h-4 w-4 text-[var(--brand-pink)]" />
                    <span className="text-sm font-semibold text-foreground hidden sm:inline">Sprint</span>
                </div>

                {/* Stacked progress bar */}
                <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-white/[0.06] overflow-hidden flex">
                        {segments.map(seg => seg.pct > 0 && (
                            <div
                                key={seg.key}
                                className={`h-full ${seg.dotColor} first:rounded-l-full last:rounded-r-full transition-all duration-500`}
                                style={{ width: `${Math.max(seg.pct, 2)}%` }}
                            />
                        ))}
                    </div>
                </div>

                {/* Inline stat pills */}
                <div className="flex items-center gap-4 shrink-0">
                    {segments.map(seg => (
                        <div key={seg.key} className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${seg.dotColor}`} />
                            <span className="text-xs font-medium text-foreground tabular-nums">{seg.count}</span>
                            <span className="text-xs text-muted-foreground">{seg.label}</span>
                        </div>
                    ))}
                    {blockedCount > 0 && (
                        <div className="flex items-center gap-1 ml-1">
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                            <span className="text-xs font-medium text-red-500 tabular-nums">{blockedCount}</span>
                            <span className="text-xs text-red-500/70">Bloqueadas</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
