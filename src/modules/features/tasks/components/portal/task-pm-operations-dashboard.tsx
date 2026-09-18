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
import {
  Tooltip as UiTooltip,
  TooltipTrigger as UiTooltipTrigger,
  TooltipContent as UiTooltipContent,
  TooltipProvider as UiTooltipProvider,
} from "@/components/ui/tooltip"
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
  Kanban,
  AlertCircle,
  Inbox,
  CheckSquare
} from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import type { TaskItem, TaskPriority, TaskStatus, TaskWorkspace } from "../../types"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"
import {
  ResponsiveContainer,
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
import { format, subDays, isAfter, parseISO } from "date-fns"
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
  in_progress: "En Curso",
  in_review: "Revisión QA",
  todo: "Por Iniciar",
  blocked: "Bloqueadas",
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

  // Period filter (defaults to "all" which represents the full active sprint)
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodPreset>("all")
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all")
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>("all")
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Interactive triage deck state
  const [activeTriageTab, setActiveTriageTab] = useState<"critical" | "qa" | "done" | "backlog">("critical")

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setLastRefreshedAt(new Date())
      setIsRefreshing(false)
    }, 400)
  }

  // 1. Filter tasks by scope (project / workspace / member / period)
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
      // Date filter for historical completed tasks (active tasks always remain visible in the sprint)
      if (cutoffDate && selectedPeriod !== "all") {
        const taskDate = t.updated_at
          ? parseISO(t.updated_at)
          : t.created_at
          ? parseISO(t.created_at)
          : null
        if (taskDate && !isAfter(taskDate, cutoffDate) && t.status === "done") {
          return false
        }
      }
      return true
    })
  }, [tasks, selectedPeriod, selectedProjectFilter, selectedMemberFilter, projects])

  // 2. Sprint Segregation: Sprint Tasks vs Backlog (strictly isolated!)
  const backlogTasks = useMemo(() => filteredTasks.filter((t) => t.status === "backlog"), [filteredTasks])
  const sprintTasks = useMemo(() => filteredTasks.filter((t) => t.status !== "backlog"), [filteredTasks])

  // Status breakdown within the Sprint (never counting backlog as todo!)
  const completedTasks = useMemo(() => sprintTasks.filter((t) => t.status === "done"), [sprintTasks])
  const inProgressTasks = useMemo(() => sprintTasks.filter((t) => t.status === "in_progress"), [sprintTasks])
  const qaQueueTasks = useMemo(() => sprintTasks.filter((t) => t.status === "in_review"), [sprintTasks])
  const blockedTasks = useMemo(() => sprintTasks.filter((t) => t.status === "blocked"), [sprintTasks])
  const todoTasks = useMemo(() => sprintTasks.filter((t) => t.status === "todo"), [sprintTasks])
  const activeTasks = useMemo(
    () => sprintTasks.filter((t) => t.status === "todo" || t.status === "in_progress" || t.status === "in_review" || t.status === "blocked"),
    [sprintTasks]
  )

  // Real Sprint Progress (Weighted: done = 100%, in_progress = slider%, todo = 0%)
  const sprintProgress = useMemo(() => {
    if (sprintTasks.length === 0) return 0
    const totalPercentage = sprintTasks.reduce((acc, t) => acc + (t.progress_percentage || 0), 0)
    return Math.round(totalPercentage / sprintTasks.length)
  }, [sprintTasks])

  // Active workload average progress (for tasks currently in flight)
  const activeProgress = useMemo(() => {
    if (activeTasks.length === 0) return completedTasks.length > 0 ? 100 : 0
    const totalPercentage = activeTasks.reduce((acc, t) => acc + (t.progress_percentage || 0), 0)
    return Math.round(totalPercentage / activeTasks.length)
  }, [activeTasks, completedTasks.length])

  // Hours budget metrics
  const totalEstimatedHours = useMemo(
    () => sprintTasks.reduce((acc, t) => acc + (Number(t.estimated_hours) || 0), 0),
    [sprintTasks]
  )
  const totalActualHours = useMemo(
    () => sprintTasks.reduce((acc, t) => acc + (Number(t.actual_hours) || 0), 0),
    [sprintTasks]
  )
  const hoursBurnRate =
    totalEstimatedHours > 0
      ? Math.round((totalActualHours / totalEstimatedHours) * 100)
      : 0
  const hoursEfficiencyDelta = totalEstimatedHours - totalActualHours

  // Overdue / Stalled Risk (strictly within Sprint, never backlog!)
  const now = new Date()
  const overdueTasks = useMemo(
    () =>
      sprintTasks.filter((t) => {
        if (t.status === "done") return false
        if (!t.due_date) return false
        return new Date(t.due_date) < now
      }),
    [sprintTasks]
  )
  const stalledTasks = useMemo(
    () =>
      sprintTasks.filter((t) => {
        if (t.status === "done" || t.status === "todo") return false
        if (!t.updated_at) return false
        const diffHours = (now.getTime() - new Date(t.updated_at).getTime()) / (1000 * 60 * 60)
        return diffHours > 48 // 48h without movement
      }),
    [sprintTasks]
  )
  const criticalRiskCount = overdueTasks.length + blockedTasks.length

  // Active contributors count
  const activeMembersSet = useMemo(
    () =>
      new Set(
        sprintTasks
          .map((t) => t.assigned_staff_id)
          .filter((id): id is string => Boolean(id))
      ),
    [sprintTasks]
  )
  const activeCollaboratorsCount = activeMembersSet.size

  // 3. Status Donut Chart Data (Pure Sprint Workflow)
  const statusPieData = useMemo(() => {
    const data = [
      { name: "Finalizadas", status: "done", value: completedTasks.length, color: STATUS_COLORS.done },
      { name: "En Curso", status: "in_progress", value: inProgressTasks.length, color: STATUS_COLORS.in_progress },
      { name: "Revisión QA", status: "in_review", value: qaQueueTasks.length, color: STATUS_COLORS.in_review },
      { name: "Bloqueadas", status: "blocked", value: blockedTasks.length, color: STATUS_COLORS.blocked },
      { name: "Por Iniciar", status: "todo", value: todoTasks.length, color: STATUS_COLORS.todo },
    ]
    return data.filter((item) => item.value > 0)
  }, [completedTasks.length, inProgressTasks.length, qaQueueTasks.length, blockedTasks.length, todoTasks.length])

  // 4. Workload & Member Performance (Active vs Done per collaborator)
  const memberPerformanceData = useMemo(() => {
    return teamMembers
      .map((member) => {
        const mTasks = sprintTasks.filter((t) => t.assigned_staff_id === member.id)
        const mActive = mTasks.filter((t) => t.status !== "done").length
        const mCompleted = mTasks.filter((t) => t.status === "done").length
        const mEstimated = mTasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || 0), 0)
        const mActual = mTasks.reduce((sum, t) => sum + (Number(t.actual_hours) || 0), 0)
        const mProgress =
          mTasks.length > 0
            ? Math.round(
                mTasks.reduce((sum, t) => sum + (t.progress_percentage || 0), 0) /
                  mTasks.length
              )
            : 0

        return {
          id: member.id,
          name: `${member.first_name} ${member.last_name[0]}.`,
          fullName: `${member.first_name} ${member.last_name}`,
          total: mTasks.length,
          activas: mActive,
          completadas: mCompleted,
          estimadas: mEstimated,
          reales: mActual,
          progreso: mProgress,
          photoUrl: member.photo_url,
        }
      })
      .filter((m) => m.total > 0)
      .sort((a, b) => b.activas - a.activas)
  }, [teamMembers, sprintTasks])

  // 5. Triage Tasks Selection for Actionable Deck
  const triageTasks = useMemo(() => {
    if (activeTriageTab === "critical") {
      const set = new Set<string>()
      const list: TaskItem[] = []
      for (const t of [...blockedTasks, ...overdueTasks]) {
        if (!set.has(t.id)) {
          set.add(t.id)
          list.push(t)
        }
      }
      return list
    }
    if (activeTriageTab === "qa") {
      return qaQueueTasks
    }
    if (activeTriageTab === "done") {
      return completedTasks
    }
    return backlogTasks
  }, [activeTriageTab, blockedTasks, overdueTasks, qaQueueTasks, completedTasks, backlogTasks])

  const projectMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color?: string }>()
    for (const p of projects) {
      map.set(p.id, p)
    }
    return map
  }, [projects])

  const memberMap = useMemo(() => {
    const map = new Map<string, StaffMember>()
    for (const m of teamMembers) {
      map.set(m.id, m)
    }
    return map
  }, [teamMembers])

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
          <UiTooltipProvider delayDuration={150}>
            <UiTooltip>
              <UiTooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  className="h-8 w-8 rounded-xl border-zinc-200/80 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer"
                  aria-label="Actualizar telemetría"
                >
                  <RefreshCw
                    className={cn("w-3.5 h-3.5 text-muted-foreground", isRefreshing && "animate-spin text-primary")}
                  />
                </Button>
              </UiTooltipTrigger>
              <UiTooltipContent className="rounded-xl text-xs">
                Actualizar telemetría
              </UiTooltipContent>
            </UiTooltip>
          </UiTooltipProvider>
        </div>
      </div>

      {/* 4 Balanced High-Value KPI Cards - Low Profile Compact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Salud del Sprint */}
        <Card className="p-4 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-card to-card dark:from-blue-500/20 relative overflow-hidden group shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Salud del Sprint
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <Rocket className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1">
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-2xl font-black text-foreground font-mono tracking-tight">
                {sprintProgress}%
              </h3>
              <span className="text-[11px] font-semibold text-muted-foreground font-mono">
                ({completedTasks.length}/{sprintTasks.length})
              </span>
            </div>
            {backlogTasks.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-muted-foreground font-mono">
                {backlogTasks.length} backlog
              </span>
            )}
          </div>
          <div className="mt-2.5 w-full bg-zinc-200/60 dark:bg-white/10 rounded-full h-1 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${sprintProgress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-blue-500" />
              <span>Avance activo: <strong>{activeProgress}%</strong></span>
            </span>
            <span>{sprintTasks.length - completedTasks.length} pendientes</span>
          </div>
        </Card>

        {/* KPI 2: Pipeline de Calidad & QA */}
        <Card className="p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-card dark:from-amber-500/20 relative overflow-hidden group shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Cola de QA & Validación
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1">
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-2xl font-black text-foreground font-mono tracking-tight">
                {qaQueueTasks.length}
              </h3>
              <span className="text-[11px] font-medium text-muted-foreground">
                en revisión
              </span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">
              {inProgressTasks.length} en curso · {todoTasks.length} por iniciar
            </span>
          </div>
          <div className="mt-2.5 w-full bg-zinc-200/60 dark:bg-white/10 rounded-full h-1 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                qaQueueTasks.length > 0 ? "bg-amber-500" : "bg-emerald-500"
              )}
              style={{
                width: `${sprintTasks.length > 0 ? Math.min(100, Math.round((qaQueueTasks.length / sprintTasks.length) * 100)) : 0}%`,
              }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-medium">
            {qaQueueTasks.length === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> QA al día
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3 h-3" /> Validación requerida
              </span>
            )}
            <span className="text-muted-foreground font-mono">
              {sprintTasks.length > 0 ? Math.round((qaQueueTasks.length / sprintTasks.length) * 100) : 0}% del sprint
            </span>
          </div>
        </Card>

        {/* KPI 3: Presupuesto y Horas / Capacidad */}
        <Card className="p-4 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-card to-card dark:from-violet-500/20 relative overflow-hidden group shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              {totalEstimatedHours > 0 ? "Horas & Presupuesto" : "Volumen de Entrega"}
            </span>
            <div className="p-1.5 rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          {totalEstimatedHours > 0 ? (
            <>
              <div className="flex items-baseline justify-between gap-2 mt-1">
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-2xl font-black text-foreground font-mono tracking-tight">
                    {totalActualHours}h
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    / {totalEstimatedHours}h est.
                  </span>
                </div>
                <span className={cn(
                  "text-[10px] font-bold font-mono",
                  hoursEfficiencyDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                )}>
                  {hoursEfficiencyDelta >= 0 ? `+${hoursEfficiencyDelta}h` : `${hoursEfficiencyDelta}h`}
                </span>
              </div>
              <div className="mt-2.5 w-full bg-zinc-200/60 dark:bg-white/10 rounded-full h-1 overflow-hidden">
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
              <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                <span>{hoursBurnRate}% de ejecución</span>
                <span>{hoursEfficiencyDelta >= 0 ? "Bajo presupuesto" : "Sobreestimado"}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-2 mt-1">
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-2xl font-black text-foreground font-mono tracking-tight">
                    {completedTasks.length}
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    / {sprintTasks.length} listas
                  </span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {activeTasks.length} en curso
                </span>
              </div>
              <div className="mt-2.5 w-full bg-zinc-200/60 dark:bg-white/10 rounded-full h-1 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-500"
                  style={{ width: `${sprintProgress}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                <span>{activeTasks.length} en ejecución</span>
                <span>{sprintProgress}% sprint</span>
              </div>
            </>
          )}
        </Card>

        {/* KPI 4: Radar de Riesgos */}
        <Card className="p-4 rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-card to-card dark:from-rose-500/20 relative overflow-hidden group shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Radar de Riesgos
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1">
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
                {criticalRiskCount}
              </h3>
              <span className="text-[11px] font-medium text-muted-foreground">
                críticas
              </span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">
              {blockedTasks.length} bloq. · {overdueTasks.length} venc.
            </span>
          </div>
          <div className="mt-2.5 w-full bg-zinc-200/60 dark:bg-white/10 rounded-full h-1 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                criticalRiskCount > 0 ? "bg-rose-500" : "bg-emerald-500"
              )}
              style={{
                width: `${criticalRiskCount === 0 ? 100 : Math.min(100, (criticalRiskCount / (sprintTasks.length || 1)) * 100)}%`,
              }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-medium">
            {criticalRiskCount === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3 h-3" /> Sin riesgos
              </span>
            ) : (
              <span className="text-rose-500 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Atención requerida
              </span>
            )}
            <span className="text-muted-foreground font-mono">
              {criticalRiskCount === 0 ? "0 impedimentos" : `${criticalRiskCount} por destrabar`}
            </span>
          </div>
        </Card>
      </div>

      {/* 2 Clean High-Density Operational Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Carga y Rendimiento por Especialista (BarChart) */}
        <Card className="lg:col-span-2 p-6 rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-card/60 backdrop-blur-xl shadow-xl shadow-black/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <h3 className="text-lg font-bold text-foreground">
                  Carga Operativa por Especialista
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Distribución real de tickets activos en desarrollo vs tareas completadas
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 font-medium">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Activas ({activeTasks.length})</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Finalizadas ({completedTasks.length})</span>
              </div>
            </div>
          </div>

          {memberPerformanceData.length === 0 ? (
            <div className="h-[260px] flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
              <Users className="w-8 h-8 opacity-30" />
              <span>No hay tareas asignadas en este período o filtro</span>
            </div>
          ) : (
            <div className="h-[270px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart
                  data={memberPerformanceData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                >
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
                    allowDecimals={false}
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
                    cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                  />
                  <Bar dataKey="activas" name="Tickets Activos" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={18} />
                  <Bar dataKey="completadas" name="Completadas" fill="#10b981" radius={[6, 6, 0, 0]} barSize={18} />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Chart 2: Estado Puro del Sprint (RePieChart Donut) */}
        <Card className="p-6 rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-card/60 backdrop-blur-xl shadow-xl shadow-black/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PieChartIcon className="w-4 h-4 text-violet-500" />
              <h3 className="text-lg font-bold text-foreground">
                Estado del Sprint
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Desglose porcentual del ciclo de entrega activo
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
            {/* Center Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black font-mono text-foreground tracking-tight">
                {sprintTasks.length}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Sprint
              </span>
            </div>
          </div>

          {/* Clean Legend */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200/70 dark:border-white/5">
            {statusPieData.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-white/5">
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

      {/* Actionable PM Triage Deck */}
      <Card className="p-6 sm:p-7 rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-card/60 backdrop-blur-xl shadow-xl shadow-black/5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/60 dark:border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Centro de Triage Operativo
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Inspecciona cuellos de botella, valida entregables de QA o revisa el backlog directamente
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={onSwitchToGestion}
              variant="outline"
              size="sm"
              className="gap-2 text-xs font-semibold rounded-xl border-zinc-200/80 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Ver Tablero Completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Triage Deck Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTriageTab("critical")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border",
              activeTriageTab === "critical"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-xs"
                : "bg-zinc-100/70 dark:bg-white/5 border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>Críticas & Riesgo</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                criticalRiskCount > 0
                  ? "bg-rose-500 text-white font-bold"
                  : "bg-zinc-200 dark:bg-zinc-800 text-muted-foreground"
              )}
            >
              {criticalRiskCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTriageTab("qa")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border",
              activeTriageTab === "qa"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-xs"
                : "bg-zinc-100/70 dark:bg-white/5 border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span>Cola de QA</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                qaQueueTasks.length > 0
                  ? "bg-amber-500 text-white font-bold"
                  : "bg-zinc-200 dark:bg-zinc-800 text-muted-foreground"
              )}
            >
              {qaQueueTasks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTriageTab("done")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border",
              activeTriageTab === "done"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "bg-zinc-100/70 dark:bg-white/5 border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Finalizadas Recientes</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-zinc-200 dark:bg-zinc-800 text-muted-foreground">
              {completedTasks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTriageTab("backlog")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border",
              activeTriageTab === "backlog"
                ? "bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-white/20 text-foreground shadow-xs"
                : "bg-zinc-100/70 dark:bg-white/5 border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Inbox className="w-3.5 h-3.5 text-zinc-500" />
            <span>Backlog Reserva</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-zinc-200 dark:bg-zinc-800 text-muted-foreground">
              {backlogTasks.length}
            </span>
          </button>
        </div>

        {/* Task Cards Deck List */}
        {triageTasks.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {activeTriageTab === "critical"
                  ? "No hay tickets en riesgo ni bloqueos activos"
                  : activeTriageTab === "qa"
                  ? "No hay tickets pendientes de revisión técnica en QA"
                  : activeTriageTab === "done"
                  ? "No hay entregas registradas en este período"
                  : "El backlog está vacío"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeTriageTab === "critical"
                  ? "Excelente: el sprint fluye sin retrasos críticos"
                  : "Todos los flujos de trabajo se encuentran sincronizados"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {triageTasks.slice(0, 5).map((task) => {
              const project = projectMap.get(task.project_id)
              const member = task.assigned_staff_id ? memberMap.get(task.assigned_staff_id) : null
              const isOverdue = task.status !== "done" && task.due_date && new Date(task.due_date) < now

              return (
                <div
                  key={task.id}
                  onClick={() => onSelectTask?.(task)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-zinc-50/80 dark:bg-white/[0.03] border border-zinc-200/70 dark:border-white/5 hover:border-primary/40 hover:bg-zinc-100/80 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    {/* Status Dot / Badge */}
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 sm:mt-0"
                      style={{ backgroundColor: STATUS_COLORS[task.status] || "#94a3b8" }}
                      aria-label={STATUS_LABELS[task.status] || task.status}
                    />

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {task.title}
                        </span>
                        {task.ticket_code && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {task.ticket_code}
                          </span>
                        )}
                        {project && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-zinc-200/60 dark:bg-white/10 font-medium text-muted-foreground">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: project.color || "#8ec045" }}
                            />
                            <span className="truncate max-w-[120px]">{project.name}</span>
                          </span>
                        )}
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-md font-medium capitalize"
                          style={{
                            backgroundColor: `${STATUS_COLORS[task.status]}15`,
                            color: STATUS_COLORS[task.status],
                          }}
                        >
                          {STATUS_LABELS[task.status] || task.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Assignee, Due Date & Progress */}
                  <div className="flex items-center gap-4 sm:gap-6 shrink-0 self-end sm:self-center">
                    {member && (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6 border border-background shadow-xs" style={{ backgroundColor: brandColor }}>
                          <AvatarImage src={getCollaboratorAvatar(member.photo_url, member.first_name)} className="object-cover" />
                          <AvatarFallback className="text-[9px] font-bold text-white" style={{ backgroundColor: brandColor }}>
                            {member.first_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-muted-foreground hidden md:inline">
                          {member.first_name} {member.last_name[0]}.
                        </span>
                      </div>
                    )}

                    {task.due_date && (
                      <UiTooltip>
                        <UiTooltipTrigger asChild>
                          <div
                            className={cn(
                              "flex items-center gap-1 text-[11px] font-mono font-medium cursor-help",
                              isOverdue
                                ? "text-rose-600 dark:text-rose-400 font-bold"
                                : "text-muted-foreground"
                            )}
                          >
                            {isOverdue && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                            <span>{format(parseISO(task.due_date), "d MMM", { locale: es })}</span>
                          </div>
                        </UiTooltipTrigger>
                        <UiTooltipContent side="top">
                          <span>{isOverdue ? "Entrega atrasada" : "Fecha límite pactada"}</span>
                        </UiTooltipContent>
                      </UiTooltip>
                    )}

                    {/* Mini progress bar */}
                    <div className="flex items-center gap-2 w-20 sm:w-24">
                      <div className="flex-1 bg-zinc-200/80 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${task.progress_percentage || 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground w-7 text-right">
                        {task.progress_percentage || 0}%
                      </span>
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              )
            })}

            {triageTasks.length > 5 && (
              <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>
                  Mostrando 5 de <strong>{triageTasks.length}</strong> tickets en esta categoría
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSwitchToGestion}
                  className="h-7 text-xs font-bold text-primary hover:text-primary gap-1 cursor-pointer"
                >
                  <span>Ver todas en Gestión</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
