"use client"

import { Kanban, Circle, ArrowRight, CheckCircle2, Eye, AlertTriangle, ListChecks, Inbox } from "lucide-react"
import { useRouter } from "next/navigation"

interface SprintBoardMiniProps {
    statusCounts?: {
        backlog?: number
        todo?: number
        in_progress?: number
        in_review?: number
        done?: number
        blocked?: number
    }
    sprintProgress?: number
}

const SPRINT_COLUMNS = [
    { key: "todo", label: "Por Hacer", icon: Circle, dotColor: "bg-zinc-400 dark:bg-zinc-500" },
    { key: "in_progress", label: "En Curso", icon: ArrowRight, dotColor: "bg-blue-500" },
    { key: "in_review", label: "Revisión", icon: Eye, dotColor: "bg-amber-500" },
    { key: "blocked", label: "Bloqueadas", icon: AlertTriangle, dotColor: "bg-red-500" },
    { key: "done", label: "Hecho", icon: CheckCircle2, dotColor: "bg-emerald-500" },
] as const

export function SprintBoardMini({ statusCounts, sprintProgress }: SprintBoardMiniProps) {
    const router = useRouter()

    const todo = statusCounts?.todo || 0
    const inProgress = statusCounts?.in_progress || 0
    const inReview = statusCounts?.in_review || 0
    const blocked = statusCounts?.blocked || 0
    const done = statusCounts?.done || 0
    const backlog = statusCounts?.backlog || 0

    // Sprint scope: strictly excludes backlog!
    const sprintTotal = todo + inProgress + inReview + blocked + done
    const totalAll = sprintTotal + backlog

    // Sprint progress: use backend weighted progress if provided, otherwise fallback to done/sprintTotal
    const calculatedProgress = sprintProgress !== undefined
        ? sprintProgress
        : (sprintTotal > 0 ? Math.round((done / sprintTotal) * 100) : 0)

    // Empty state 1 — no tasks exist anywhere in the organization
    if (totalAll === 0) {
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

    // Empty state 2 — tasks exist only in Backlog (no sprint currently active)
    if (sprintTotal === 0 && backlog > 0) {
        return (
            <div
                className="bg-card border border-zinc-200/80 dark:border-white/10 rounded-xl px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors"
                onClick={() => router.push("/operations/tasks")}
            >
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-zinc-100 dark:bg-white/[0.06]">
                        <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">Sin Sprint Activo</p>
                            <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-white/10 text-muted-foreground">
                                {backlog} en backlog
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Tienes {backlog} tarea(s) en reserva. Pasa requerimientos a "Por Hacer" para iniciar el sprint</p>
                    </div>
                </div>
                <span className="text-xs text-[var(--brand-pink)] font-medium shrink-0">Planificar Sprint →</span>
            </div>
        )
    }

    const countsMap: Record<string, number> = {
        todo,
        in_progress: inProgress,
        in_review: inReview,
        blocked,
        done
    }

    // Stacked bar segments (strictly within sprint, proportional to sprintTotal)
    const segments = SPRINT_COLUMNS.map(col => ({
        ...col,
        count: countsMap[col.key] || 0,
        pct: sprintTotal > 0 ? ((countsMap[col.key] || 0) / sprintTotal) * 100 : 0
    }))

    return (
        <div
            className="bg-card border border-zinc-200/80 dark:border-white/10 rounded-xl px-5 py-3.5 cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition-colors"
            onClick={() => router.push("/operations/tasks")}
        >
            {/* Responsive layout: row on sm+, stacked or wrapped when compact */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                {/* Icon + Title + Sprint Progress % */}
                <div className="flex items-center gap-2 shrink-0">
                    <Kanban className="h-4 w-4 text-[var(--brand-pink)]" />
                    <span className="text-sm font-semibold text-foreground">Sprint</span>
                    <span className="text-xs font-bold font-mono px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-white/10 text-foreground">
                        {calculatedProgress}%
                    </span>
                </div>

                {/* Stacked progress bar */}
                <div className="flex-1 flex items-center gap-3 min-w-[120px]">
                    <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-white/[0.06] overflow-hidden flex">
                        {segments.map(seg => seg.pct > 0 && (
                            <div
                                key={seg.key}
                                className={`h-full ${seg.dotColor} first:rounded-l-full last:rounded-r-full transition-all duration-500`}
                                style={{ width: `${Math.max(seg.pct, 2)}%` }}
                                title={`${seg.label}: ${seg.count} (${Math.round(seg.pct)}%)`}
                            />
                        ))}
                    </div>
                </div>

                {/* Inline stat pills */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-3.5 shrink-0">
                    {/* Primary sprint columns: Todo, In Progress, Review, Done */}
                    {segments.filter(s => s.key !== "blocked").map(seg => (
                        <div key={seg.key} className="flex items-center gap-1.5" title={`${seg.label}: ${seg.count}`}>
                            <span className={`h-2 w-2 rounded-full ${seg.dotColor}`} />
                            <span className="text-xs font-medium text-foreground tabular-nums">{seg.count}</span>
                            <span className="text-xs text-muted-foreground hidden md:inline">{seg.label}</span>
                        </div>
                    ))}

                    {/* Blocked Alert Pill (if any blocked in sprint) */}
                    {blocked > 0 && (
                        <div className="flex items-center gap-1 text-red-500" title={`Bloqueadas: ${blocked}`}>
                            <AlertTriangle className="h-3 w-3" />
                            <span className="text-xs font-bold tabular-nums">{blocked}</span>
                            <span className="text-xs text-red-500/80 hidden md:inline">Bloqueadas</span>
                        </div>
                    )}

                    {/* Isolated Backlog Counter */}
                    {backlog > 0 && (
                        <div className="flex items-center gap-1.5 pl-2 sm:pl-3 border-l border-zinc-200/80 dark:border-white/10 text-muted-foreground" title={`Tareas en reserva fuera del sprint: ${backlog}`}>
                            <Inbox className="h-3 w-3 text-zinc-400" />
                            <span className="text-xs font-medium tabular-nums text-foreground">{backlog}</span>
                            <span className="text-xs text-muted-foreground hidden md:inline">Backlog</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
