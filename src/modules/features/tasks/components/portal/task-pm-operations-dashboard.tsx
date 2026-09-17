"use client"

import React, { useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Activity,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Rocket,
  Users,
  Calendar,
  Layers,
  Sparkles,
  Zap,
  ArrowUpRight,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw,
  Target,
  Flame,
  ChevronRight,
  ArrowRight,
  CircleDot,
  Kanban
} from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import type { TaskItem, TaskPriority, TaskStatus, TaskWorkspace } from "../../types"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart as ReBarChart,
  Bar,
  Legend
} from "recharts"
import { format, subDays, isAfter, parseISO, startOfDay } from "date-fns"
import { es } from "date-fns/locale"

export type PeriodPreset = "7d" | "30d" | "90d" | "1y" | "all"

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  photo_url?: string | null
  email?: string | null
  role?: string
}

interface TaskPmOperationsDashboardProps {
  tasks: TaskItem[]
  teamMembers: StaffMember[]
  projects: { id: string; name: string; color?: string; workspace_id?: string | null }[]
  workspaces?: TaskWorkspace[]
  organization?: { name?: string; logo_url?: string | null; primary_color?: string | null }
  brandColor?: string
  onSwitchToGestion?: () => void
  onSelectTask?: (task: TaskItem) => void
}

const STATUS_COLORS: Record<string, string> = {
  done: "#10b981", // Emerald
  in_progress: "#3b82f6", // Blue
  in_review: "#f59e0b", // Amber
  todo: "#94a3b8", // Slate
  blocked: "#ef4444", // Red
  backlog: "#64748b", // Slate darker
}

const STATUS_LABELS: Record<string, string> = {
  done: "Finalizadas",
  in_progress: "En Progreso",
  in_review: "Revisión QA",
  todo: "Por Iniciar",
  blocked: "Bloqueadas / Ajustes",
  backlog: "Backlog",
}

export function TaskPmOperationsDashboard({
  tasks,
  teamMembers,
  projects,
  workspaces = [],
  organization = { name: "Plataforma" },
  brandColor = organization?.primary_color || "#8ec045",
  onSwitchToGestion = () => {},
  onSelectTask,
}: TaskPmOperationsDashboardProps) {

  // Period filter
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodPreset>("30d")
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all")
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>("all")
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setLastRefreshedAt(new Date())
      setIsRefreshing(false)
    }, 400)
  }

  // 1. Filter tasks by period, project and member
  const filteredTasks = useMemo(() => {
    const now = new Date()
    let cutoffDate: Date | null = null

    if (selectedPeriod === "7d") cutoffDate = subDays(now, 7)
    else if (selectedPeriod === "30d") cutoffDate = subDays(now, 30)
    else if (selectedPeriod === "90d") cutoffDate = subDays(now, 90)
    else if (selectedPeriod === "1y") cutoffDate = subDays(now, 365)

    return tasks.filter((t) => {
      // Project / Workspace filter
      if (selectedProjectFilter !== "all") {
        if (selectedProjectFilter.startsWith("workspace:")) {
          const wsId = selectedProjectFilter.replace("workspace:", "")
          const wsProjectIds = new Set(projects.filter((p) => p.workspace_id === wsId).map((p) => p.id))
          if (!wsProjectIds.has(t.project_id)) return false
        } else if (t.project_id !== selectedProjectFilter) {
          return false
        }
      }
      // Member filter
      if (selectedMemberFilter !== "all" && t.assigned_staff_id !== selectedMemberFilter) {
        return false
      }
      // Date filter
      if (cutoffDate) {
        const taskDate = t.updated_at
          ? parseISO(t.updated_at)
          : t.created_at
          ? parseISO(t.created_at)
          : null
        if (taskDate && !isAfter(taskDate, cutoffDate)) {
          return false
        }
      }
      return true
    })
  }, [tasks, selectedPeriod, selectedProjectFilter, selectedMemberFilter, projects])

  // 2. High-Value KPI Calculations
  const totalTasks = filteredTasks.length
  const completedTasks = filteredTasks.filter((t) => t.status === "done").length
  const inProgressTasks = filteredTasks.filter((t) => t.status === "in_progress").length
  const qaQueueTasks = filteredTasks.filter((t) => t.status === "in_review").length
  const blockedTasks = filteredTasks.filter((t) => t.status === "blocked").length
  const todoTasks = filteredTasks.filter((t) => t.status === "todo" || t.status === "backlog").length

  // Global weighted progress
  const averageProgress =
    totalTasks > 0
      ? Math.round(
          filteredTasks.reduce((acc, t) => acc + (t.progress_percentage || 0), 0) /
            totalTasks
        )
      : 0

  // Hours budget metrics
  const totalEstimatedHours = filteredTasks.reduce(
    (acc, t) => acc + (Number(t.estimated_hours) || 0),
    0
  )
  const totalActualHours = filteredTasks.reduce(
    (acc, t) => acc + (Number(t.actual_hours) || 0),
    0
  )
  const hoursBurnRate =
    totalEstimatedHours > 0
      ? Math.round((totalActualHours / totalEstimatedHours) * 100)
      : 0
  const hoursEfficiencyDelta = totalEstimatedHours - totalActualHours

  // Overdue / Stalled Risk
  const now = new Date()
  const overdueTasks = filteredTasks.filter((t) => {
    if (t.status === "done") return false
    if (!t.due_date) return false
    return new Date(t.due_date) < now
  })
  const stalledTasks = filteredTasks.filter((t) => {
    if (t.status === "done" || t.status === "todo") return false
    if (!t.updated_at) return false
    const diffHours = (now.getTime() - new Date(t.updated_at).getTime()) / (1000 * 60 * 60)
    return diffHours > 48 // 48h without update
  })
  const riskIndexCount = overdueTasks.length + blockedTasks

  // Active contributors count
  const activeMembersSet = new Set(
    filteredTasks
      .map((t) => t.assigned_staff_id)
      .filter((id): id is string => Boolean(id))
  )
  const activeCollaboratorsCount = activeMembersSet.size

  // 3. Trend Chart Data (Progress & Task Cumulative Evolution)
  const trendData = useMemo(() => {
    const daysCount = selectedPeriod === "7d" ? 7 : selectedPeriod === "30d" ? 14 : 20
    const points = []
    const today = startOfDay(new Date())

    for (let i = daysCount - 1; i >= 0; i--) {
      const dayDate = subDays(today, i)
      const dayStr = format(dayDate, "yyyy-MM-dd")
      const label = format(dayDate, daysCount <= 7 ? "EEE d" : "d MMM", { locale: es })

      // Tasks completed on or before this day
      const completedUpToDay = filteredTasks.filter((t) => {
        if (t.status !== "done") return false
        const updateDate = t.updated_at ? parseISO(t.updated_at) : null
        return updateDate && updateDate <= dayDate
      }).length

      // Active in progress tasks up to this day
      const inProgressUpToDay = filteredTasks.filter((t) => {
        const createDate = t.created_at ? parseISO(t.created_at) : null
        return createDate && createDate <= dayDate && t.status !== "done"
      }).length

      // Simulated cumulative progress velocity
      const velocityIndex = Math.min(
        100,
        Math.round(
          (completedUpToDay / Math.max(1, totalTasks)) * 100 +
            (daysCount - i) * 1.5
        )
      )

      points.push({
        date: dayStr,
        label,
        completadas: completedUpToDay,
        enProgreso: inProgressUpToDay,
        velocidad: Math.min(100, velocityIndex),
      })
    }
    return points
  }, [filteredTasks, selectedPeriod, totalTasks])

  // 4. Status Donut Chart Data
  const statusPieData = useMemo(() => {
    const data = [
      { name: "Finalizadas", status: "done", value: completedTasks, color: STATUS_COLORS.done },
      { name: "En Progreso", status: "in_progress", value: inProgressTasks, color: STATUS_COLORS.in_progress },
      { name: "Revisión QA", status: "in_review", value: qaQueueTasks, color: STATUS_COLORS.in_review },
      { name: "Bloqueadas", status: "blocked", value: blockedTasks, color: STATUS_COLORS.blocked },
      { name: "Por Iniciar", status: "todo", value: todoTasks, color: STATUS_COLORS.todo },
    ]
    return data.filter((item) => item.value > 0)
  }, [completedTasks, inProgressTasks, qaQueueTasks, blockedTasks, todoTasks])

  // 5. Workload & Member Performance Bar Chart Data
  const memberPerformanceData = useMemo(() => {
    return teamMembers
      .map((member) => {
        const memberTasks = filteredTasks.filter((t) => t.assigned_staff_id === member.id)
        const memberCompleted = memberTasks.filter((t) => t.status === "done").length
        const memberEstimated = memberTasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || 0), 0)
        const memberActual = memberTasks.reduce((sum, t) => sum + (Number(t.actual_hours) || 0), 0)
        const memberProgress =
          memberTasks.length > 0
            ? Math.round(
                memberTasks.reduce((sum, t) => sum + (t.progress_percentage || 0), 0) /
                  memberTasks.length
              )
            : 0

        return {
          id: member.id,
          name: `${member.first_name} ${member.last_name[0]}.`,
          fullName: `${member.first_name} ${member.last_name}`,
          total: memberTasks.length,
          completadas: memberCompleted,
          enCurso: memberTasks.length - memberCompleted,
          estimadas: memberEstimated,
          reales: memberActual,
          progreso: memberProgress,
          photoUrl: member.photo_url,
        }
      })
      .filter((m) => m.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [teamMembers, filteredTasks])

  // 6. Priority Breakdown
  const priorityData = useMemo(() => {
    const counts = {
      urgent: filteredTasks.filter((t) => t.priority === "urgent").length,
      high: filteredTasks.filter((t) => t.priority === "high").length,
      medium: filteredTasks.filter((t) => t.priority === "medium").length,
      low: filteredTasks.filter((t) => t.priority === "low").length,
    }
    return [
      { name: "Urgente", count: counts.urgent, color: "#f43f5e" },
      { name: "Alta", count: counts.high, color: "#f97316" },
      { name: "Media", count: counts.medium, color: "#3b82f6" },
      { name: "Baja", count: counts.low, color: "#10b981" },
    ]
  }, [filteredTasks])

  return (
    <div className="space-y-8 pb-12">
      {/* Sleek Low-Profile Telemetry & Period Filter Bar - Al Aire (sin contenedor) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 py-1">
        {/* Left: Compact Section Title & Status Dot */}
        <div className="flex items-center gap-2.5 py-0.5">
          <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground leading-none">
              Rendimiento & Telemetría por Período
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5 mt-0.5">
              <CircleDot className="w-2 h-2 text-emerald-500 animate-pulse" />
              Sincronizado en vivo
            </span>
          </div>
        </div>

        {/* Right: Period Selector & Quick Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center bg-zinc-100/90 dark:bg-white/5 p-0.5 rounded-xl border border-zinc-200/80 dark:border-white/10 backdrop-blur-md">
            {[
              { id: "7d", label: "7 Días" },
              { id: "30d", label: "30 Días" },
              { id: "90d", label: "Trimestre" },
              { id: "1y", label: "Año" },
              { id: "all", label: "Sprint" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPeriod(p.id as PeriodPreset)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  selectedPeriod === p.id
                    ? "bg-white dark:bg-zinc-900 text-primary shadow-xs border border-zinc-200/60 dark:border-white/10"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Project / Workspace Filter */}
          {projects.length > 0 && (
            <Select
              value={selectedProjectFilter}
              onValueChange={setSelectedProjectFilter}
            >
              <SelectTrigger className="w-[175px] sm:w-[210px] h-8 text-xs rounded-xl bg-card border-zinc-200/80 dark:border-white/10 font-medium text-left">
                <div className="flex items-center truncate text-left flex-1 min-w-0">
                  <SelectValue placeholder="Todos los espacios" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-[320px]">
                <SelectItem value="all" className="text-xs font-medium">
                  <span className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Todos los espacios</span>
                  </span>
                </SelectItem>
                {workspaces.length > 0 ? (
                  <>
                    {workspaces.map((ws) => {
                      const wsProjects = projects.filter((p) => p.workspace_id === ws.id)
                      return (
                        <SelectGroup key={ws.id}>
                          <SelectSeparator className="my-1" />
                          <SelectItem
                            value={`workspace:${ws.id}`}
                            textValue={`${ws.name}${ws.key_prefix ? ` [${ws.key_prefix}]` : ""}`}
                            className="text-xs font-semibold text-foreground py-1.5 cursor-pointer pl-8"
                          >
                            <span className="flex items-center gap-2 w-full">
                              <span className="truncate">{ws.name}</span>
                              {ws.key_prefix && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-zinc-500 dark:text-zinc-400 font-normal">
                                  [{ws.key_prefix}]
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground font-normal ml-auto">
                                ({wsProjects.length})
                              </span>
                            </span>
                          </SelectItem>
                          {wsProjects.map((p) => (
                            <SelectItem
                              key={p.id}
                              value={p.id}
                              textValue={p.name}
                              className="text-xs pl-12 py-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: p.color }}
                                />
                                <span className="truncate">{p.name}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )
                    })}
                    {projects.filter((p) => !p.workspace_id || !workspaces.some((w) => w.id === p.workspace_id)).length > 0 && (
                      <SelectGroup>
                        <SelectSeparator className="my-1" />
                        <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-8 py-1">
                          Otros Proyectos
                        </SelectLabel>
                        {projects
                          .filter((p) => !p.workspace_id || !workspaces.some((w) => w.id === p.workspace_id))
                          .map((p) => (
                            <SelectItem
                              key={p.id}
                              value={p.id}
                              textValue={p.name}
                              className="text-xs pl-12 py-1.5"
                            >
                              <span className="flex items-center gap-2">
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: p.color }}
                                />
                                <span className="truncate">{p.name}</span>
                              </span>
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    )}
                  </>
                ) : (
                  projects.map((proj) => (
                    <SelectItem
                      key={proj.id}
                      value={proj.id}
                      textValue={proj.name}
                      className="text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: proj.color }}
                        />
                        <span className="truncate">{proj.name}</span>
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}

          {/* Member Filter */}
          <Select
            value={selectedMemberFilter}
            onValueChange={setSelectedMemberFilter}
          >
            <SelectTrigger className="w-[155px] sm:w-[185px] h-8 text-xs rounded-xl bg-card border-zinc-200/80 dark:border-white/10 font-medium text-left">
              <div className="flex items-center truncate text-left flex-1 min-w-0">
                <SelectValue placeholder="Todo el equipo" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl max-h-[300px]">
              <SelectItem value="all" className="text-xs">
                <span className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Todo el equipo</span>
                </span>
              </SelectItem>
              {teamMembers.map((m) => (
                <SelectItem
                  key={m.id}
                  value={m.id}
                  textValue={`${m.first_name} ${m.last_name}`}
                  className="text-xs"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">{m.first_name} {m.last_name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            className="h-8 w-8 rounded-xl border-zinc-200/80 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer"
            title="Actualizar telemetría"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5 text-muted-foreground", isRefreshing && "animate-spin text-primary")}
            />
          </Button>
        </div>
      </div>

      {/* Holographic KPI Cards Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
        {/* KPI 1: Velocidad y Avance */}
        <Card className="p-5 rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-card to-card dark:from-blue-500/20 relative overflow-hidden group shadow-lg shadow-blue-500/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Avance Ponderado
            </span>
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <Rocket className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-foreground font-mono tracking-tight">
              {averageProgress}%
            </h3>
            <span className="text-xs font-semibold text-muted-foreground">
              ({completedTasks}/{totalTasks})
            </span>
          </div>
          <div className="mt-3 w-full bg-zinc-200/60 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${averageProgress}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            <span>Ritmo constante de entrega</span>
          </p>
        </Card>

        {/* KPI 2: Presupuesto y Horas */}
        <Card className="p-5 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-card to-card dark:from-violet-500/20 relative overflow-hidden group shadow-lg shadow-violet-500/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Horas & Presupuesto
            </span>
            <div className="p-2 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-3xl font-black text-foreground font-mono tracking-tight">
              {totalActualHours}h
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              / {totalEstimatedHours}h est.
            </span>
          </div>
          <div className="mt-3 w-full bg-zinc-200/60 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                hoursBurnRate > 100
                  ? "bg-rose-500"
                  : "bg-gradient-to-r from-violet-500 to-purple-400"
              )}
              style={{ width: `${Math.min(100, hoursBurnRate)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 font-medium">
            {hoursEfficiencyDelta >= 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                +{hoursEfficiencyDelta}h de margen disponible
              </span>
            ) : (
              <span className="text-rose-500 font-bold">
                {Math.abs(hoursEfficiencyDelta)}h sobre lo estimado
              </span>
            )}
          </p>
        </Card>

        {/* KPI 3: Pipeline de Calidad & QA */}
        <Card className="p-5 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-card dark:from-amber-500/20 relative overflow-hidden group shadow-lg shadow-amber-500/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Cola de QA & Validación
            </span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-foreground font-mono tracking-tight">
              {qaQueueTasks}
            </h3>
            <span className="text-xs font-semibold text-muted-foreground">
              en revisión
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span>Bloqueadas: <strong className="text-foreground font-mono">{blockedTasks}</strong></span>
            <span>Aprobadas: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{completedTasks}</strong></span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 font-medium">
            {qaQueueTasks === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400">QA al día sin backlog</span>
            ) : (
              <span>Requiere atención de QA Lead</span>
            )}
          </p>
        </Card>

        {/* KPI 4: Radar de Riesgos */}
        <Card className="p-5 rounded-3xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-card to-card dark:from-rose-500/20 relative overflow-hidden group shadow-lg shadow-rose-500/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Radar de Riesgos
            </span>
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
              {riskIndexCount}
            </h3>
            <span className="text-xs font-semibold text-muted-foreground">
              críticas
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span>Vencidas: <strong className="text-foreground font-mono">{overdueTasks.length}</strong></span>
            <span>Estancadas: <strong className="text-foreground font-mono">{stalledTasks.length}</strong></span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 font-medium">
            {riskIndexCount === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400">0 bloqueos activos</span>
            ) : (
              <span className="text-rose-500 font-semibold">Priorizar desbloqueo en equipo</span>
            )}
          </p>
        </Card>

        {/* KPI 5: Fuerza de Trabajo Activa */}
        <Card className="p-5 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-card dark:from-emerald-500/20 relative overflow-hidden group shadow-lg shadow-emerald-500/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Equipo en Operación
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-foreground font-mono tracking-tight">
              {activeCollaboratorsCount}
            </h3>
            <span className="text-xs font-semibold text-muted-foreground">
              / {teamMembers.length} miembros
            </span>
          </div>
          <div className="mt-3 flex -space-x-2 overflow-hidden py-0.5">
            {teamMembers.slice(0, 5).map((m) => (
              <Avatar key={m.id} className="w-6 h-6 border-2 border-background shrink-0 shadow-xs" style={{ backgroundColor: brandColor }}>
                <AvatarImage src={getCollaboratorAvatar(m.photo_url, m.first_name)} className="object-cover" />
                <AvatarFallback className="text-[9px] font-bold text-white" style={{ backgroundColor: brandColor }}>
                  {m.first_name[0]}
                </AvatarFallback>
              </Avatar>
            ))}
            {teamMembers.length > 5 && (
              <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[9px] font-bold flex items-center justify-center border-2 border-background">
                +{teamMembers.length - 5}
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 font-medium">
            Capacidad operativa al{" "}
            <strong className="text-foreground font-mono">
              {teamMembers.length > 0
                ? Math.round((activeCollaboratorsCount / teamMembers.length) * 100)
                : 0}
              %
            </strong>
          </p>
        </Card>
      </div>

      {/* Futuristic Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Curva de Avance Temporal y Velocidad (AreaChart) */}
        <Card className="lg:col-span-2 p-6 rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-card/60 backdrop-blur-xl shadow-xl shadow-black/5 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <h3 className="text-lg font-bold text-foreground">
                  Curva de Velocidad y Entrega Acumulada
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Progresión de tareas finalizadas frente a la carga activa en el período
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 font-medium">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                <span>Completadas</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>En Progreso</span>
              </div>
            </div>
          </div>

          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-white/5" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  className="text-zinc-500 dark:text-zinc-400 font-mono"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  className="text-zinc-500 dark:text-zinc-400 font-mono"
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "rgba(18, 18, 23, 0.95)",
                    backdropFilter: "blur(12px)",
                    borderRadius: "16px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#fff",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
                    padding: "12px",
                  }}
                  itemStyle={{ fontSize: "12px", padding: "2px 0" }}
                  labelStyle={{ fontWeight: "bold", marginBottom: "6px", color: "#93c5fd" }}
                />
                <Area
                  type="monotone"
                  dataKey="completadas"
                  name="Entregables Listos"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#cyanGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="enProgreso"
                  name="En Curso"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#blueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: Donut de Distribución de Estado (RePieChart) */}
        <Card className="p-6 rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-card/60 backdrop-blur-xl shadow-xl shadow-black/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PieChartIcon className="w-4 h-4 text-violet-500" />
              <h3 className="text-lg font-bold text-foreground">
                Estado del Sprint
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Desglose porcentual del flujo de trabajo
            </p>
          </div>

          <div className="h-[210px] w-full relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "rgba(18, 18, 23, 0.95)",
                    backdropFilter: "blur(12px)",
                    borderRadius: "14px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </RePieChart>
            </ResponsiveContainer>
            {/* Holographic Center Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black font-mono text-foreground tracking-tight">
                {totalTasks}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Tickets
              </span>
            </div>
          </div>

          {/* Clean Legend */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200/70 dark:border-white/5">
            {statusPieData.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs px-2 py-1 rounded-xl bg-zinc-50 dark:bg-white/5">
                <div className="flex items-center gap-1.5 truncate">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="truncate text-muted-foreground">{s.name}</span>
                </div>
                <span className="font-mono font-bold text-foreground ml-1">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Second Charts Row: Workload by Member & Priority Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 3: Carga y Rendimiento por Colaborador */}
        <Card className="lg:col-span-2 p-6 rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-card/60 backdrop-blur-xl shadow-xl shadow-black/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <h3 className="text-lg font-bold text-foreground">
                  Distribución de Carga y Eficiencia por Miembro
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Comparativa de horas estimadas vs reportadas y volumen de tickets por especialista
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 font-medium">
                <div className="w-3 h-3 rounded-full bg-violet-500" />
                <span>Horas Est.</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Horas Reales</span>
              </div>
            </div>
          </div>

          {memberPerformanceData.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground italic">
              No hay tareas asignadas en este período
            </div>
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={memberPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-white/5" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    className="text-zinc-500 dark:text-zinc-400 font-medium"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    className="text-zinc-500 dark:text-zinc-400 font-mono"
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "rgba(18, 18, 23, 0.95)",
                      backdropFilter: "blur(12px)",
                      borderRadius: "16px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                      padding: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="estimadas" name="Horas Estimadas" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={16} />
                  <Bar dataKey="reales" name="Horas Reales" fill="#10b981" radius={[6, 6, 0, 0]} barSize={16} />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Chart 4: Prioridades y Bloqueadores */}
        <Card className="p-6 rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-card/60 backdrop-blur-xl shadow-xl shadow-black/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-rose-500" />
              <h3 className="text-lg font-bold text-foreground">
                Matriz de Prioridad & Foco
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Urgencia y criticidad de los entregables
            </p>
          </div>

          <div className="space-y-3.5 my-4">
            {priorityData.map((p) => {
              const pct = totalTasks > 0 ? Math.round((p.count / totalTasks) * 100) : 0
              return (
                <div key={p.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {p.count} tickets ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-white/5 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: p.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-100/80 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Tickets Urgentes / Alta:</span>
              <strong className="text-rose-500 font-mono font-bold">
                {priorityData[0].count + priorityData[1].count} activos
              </strong>
            </div>
          </div>
        </Card>
      </div>

      {/* Operational Insights & Quick Action Banner */}
      <div className="rounded-3xl p-6 sm:p-7 bg-card border border-zinc-200/80 dark:border-white/10 shadow-xs relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-white/10 flex items-center justify-center text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Diagnóstico Operacional Inteligente
            </span>
          </div>
          <h4 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
            {riskIndexCount === 0
              ? "Sprint en trayectoria verde y óptima ejecución"
              : `Se detectaron ${riskIndexCount} tickets que requieren intervención inmediata`}
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {riskIndexCount === 0
              ? `El equipo mantiene una eficiencia horaria del ${hoursBurnRate}% con un avance ponderado del ${averageProgress}%. No hay cuellos de botella en la fase de QA.`
              : `Revisa la vista de Gestión para reasignar tareas o destrabar los tickets marcados como bloqueados o con fechas próximas a vencer.`}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          <Button
            onClick={onSwitchToGestion}
            className="w-full sm:w-auto gap-2 font-semibold shadow-xs rounded-2xl px-5 h-10"
          >
            <Kanban className="w-4 h-4" />
            <span>Ir al Espacio de Gestión</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}
