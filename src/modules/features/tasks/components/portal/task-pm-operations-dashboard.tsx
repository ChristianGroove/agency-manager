"use client"

import React, { useState, useMemo, useEffect } from "react"
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
  CheckSquare,
  Timer,
  RotateCw,
  PlusCircle,
  Plus,
  Settings,
  Play
} from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import type { TaskItem, TaskPriority, TaskStatus, TaskWorkspace, TaskSprint } from "../../types"
import { getTaskMemberHours, parseTaskChecklist } from "../../types"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"
import { TaskSprintModal } from "../modals/task-sprint-modal"
import { startSprint } from "../../actions/task-sprint-actions"
import { toast } from "sonner"
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
  sprints?: TaskSprint[]
  activeSprint?: TaskSprint | null
  token?: string
  onSprintCreated?: (sprint: TaskSprint) => void
  onSprintUpdated?: (sprint: TaskSprint) => void
  onSprintCompleted?: (completedSprintId: string, nextSprint?: TaskSprint) => void
  onSprintDeleted?: (deletedSprintId: string) => void
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
  sprints = [],
  activeSprint = null,
  token,
  onSprintCreated,
  onSprintUpdated,
  onSprintCompleted,
  onSprintDeleted,
  onSwitchToGestion = () => {},
  onSelectTask,
}: TaskPmOperationsDashboardProps) {

  // Sprint modal state
  const [sprintModalState, setSprintModalState] = useState<{
    isOpen: boolean
    mode: "create" | "edit" | "complete"
    sprint?: TaskSprint | null
  }>({
    isOpen: false,
    mode: "create",
    sprint: null,
  })

  // Group sprints by lifecycle status
  const activeSprintObj = useMemo(() => {
    return sprints.find((s) => s.status === "active") || activeSprint || null
  }, [sprints, activeSprint])

  const planningSprints = useMemo(() => {
    return sprints.filter((s) => s.status === "planning")
  }, [sprints])

  const completedSprints = useMemo(() => {
    return sprints.filter((s) => s.status === "completed")
  }, [sprints])

  // Selected Sprint: Always default to "all" (Todos los tickets) upon load/reload
  const [selectedSprintId, setSelectedSprintId] = useState<string>("all")

  // Keep selectedSprintId resilient when sprints list changes
  useEffect(() => {
    if (selectedSprintId !== "all" && !sprints.some((s) => s.id === selectedSprintId)) {
      setSelectedSprintId("all")
    }
  }, [sprints, selectedSprintId])

  // Current targeted sprint object
  const currentSprint = useMemo(() => {
    if (selectedSprintId === "all") return null
    return sprints.find((s) => s.id === selectedSprintId) || null
  }, [selectedSprintId, sprints])

  const handleStartPlanningSprint = async (sprintToStart: TaskSprint) => {
    if (activeSprintObj && activeSprintObj.id !== sprintToStart.id) {
      const ok = confirm(
        `Actualmente el "${activeSprintObj.name}" está activo.\n\nAl iniciar "${sprintToStart.name}", el "${activeSprintObj.name}" pasará a completado. ¿Deseas iniciar "${sprintToStart.name}" ahora?`
      )
      if (!ok) return
    }

    try {
      const res = await startSprint({ sprintId: sprintToStart.id, token })
      if (res.success) {
        toast.success(`Sprint "${sprintToStart.name}" iniciado correctamente`)
        const updated: TaskSprint = { ...sprintToStart, status: "active" as const }
        onSprintUpdated?.(updated)
        setSelectedSprintId(updated.id)
      } else {
        toast.error(res.error || "No se pudo iniciar el sprint")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al iniciar el sprint")
    }
  }

  const sprintDaysRemaining = useMemo(() => {
    if (!currentSprint) return null
    const end = parseISO(currentSprint.end_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffTime = end.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }, [currentSprint])

  // Period filter (defaults to "all" which represents the full active sprint or total history)
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodPreset>("all")
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all")
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>("all")
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Workload chart mode: tickets volume vs hours incurred
  const [workloadChartMode, setWorkloadChartMode] = useState<"tickets" | "hours">("tickets")

  // Interactive triage deck state
  const [activeTriageTab, setActiveTriageTab] = useState<"critical" | "overbudget" | "qa" | "done" | "backlog">("critical")

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
      if (selectedMemberFilter !== "all") {
        const isAssigned =
          t.assigned_staff_id === selectedMemberFilter ||
          (Array.isArray(t.checklist) && t.checklist.some((c: any) => c.assigned_staff_id === selectedMemberFilter))
        if (!isAssigned) return false
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

  // 2. Sprint Segregation: Sprint Tasks vs Backlog
  const { sprintTasks, backlogTasks } = useMemo(() => {
    if (currentSprint) {
      // Formal Sprint Mode: Tasks assigned to currentSprint belong to the sprint
      const inSprint = filteredTasks.filter((t) => t.sprint_id === currentSprint.id && t.status !== "backlog")
      const inBacklog = filteredTasks.filter((t) => !t.sprint_id || t.sprint_id !== currentSprint.id || t.status === "backlog")
      return { sprintTasks: inSprint, backlogTasks: inBacklog }
    } else {
      // Global / No sprint filter Mode: All tasks
      const inSprint = filteredTasks.filter((t) => t.status !== "backlog")
      const inBacklog = filteredTasks.filter((t) => t.status === "backlog")
      return { sprintTasks: inSprint, backlogTasks: inBacklog }
    }
  }, [filteredTasks, currentSprint])

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

  // Overbudget Risk Tasks (actual_hours > estimated_hours while not done)
  const overbudgetTasks = useMemo(
    () =>
      sprintTasks.filter((t) => {
        if (t.status === "done") return false
        const est = Number(t.estimated_hours) || 0
        const act = Number(t.actual_hours) || 0
        return est > 0 && act > est
      }),
    [sprintTasks]
  )

  // Active contributors count
  const activeMembersSet = useMemo(() => {
    const set = new Set<string>()
    for (const t of sprintTasks) {
      if (t.assigned_staff_id) set.add(t.assigned_staff_id)
      if (Array.isArray(t.checklist)) {
        for (const c of t.checklist) {
          if (c.assigned_staff_id) set.add(c.assigned_staff_id)
        }
      }
    }
    return set
  }, [sprintTasks])
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

  // 4. Workload & Member Performance (Active vs Done per collaborator with clean subtask attribution)
  const memberPerformanceData = useMemo(() => {
    return teamMembers
      .map((member) => {
        const mTasks = sprintTasks.filter(
          (t) =>
            t.assigned_staff_id === member.id ||
            (Array.isArray(t.checklist) && t.checklist.some((c: any) => c.assigned_staff_id === member.id))
        )
        const mActive = mTasks.filter((t) => t.status !== "done").length
        const mCompleted = mTasks.filter((t) => t.status === "done").length

        let mEstimated = 0
        let mActual = 0
        for (const t of mTasks) {
          const hours = getTaskMemberHours(t, member.id)
          mEstimated += hours.estimated
          mActual += hours.actual
        }
        mEstimated = Math.round(mEstimated * 10) / 10
        mActual = Math.round(mActual * 10) / 10

        const mProgress =
          mTasks.length > 0
            ? Math.round(
                mTasks.reduce((sum, t) => sum + (t.progress_percentage || 0), 0) /
                  mTasks.length
              )
            : 0

        const delta = Math.round((mEstimated - mActual) * 10) / 10
        const burnRate = mEstimated > 0 ? Math.round((mActual / mEstimated) * 100) : (mActual > 0 ? 100 : 0)

        return {
          id: member.id,
          name: `${member.first_name} ${member.last_name[0]}.`,
          fullName: `${member.first_name} ${member.last_name}`,
          role: member.role || "Especialista",
          total: mTasks.length,
          activas: mActive,
          completadas: mCompleted,
          estimadas: mEstimated,
          reales: mActual,
          delta,
          burnRate,
          progreso: mProgress,
          photoUrl: member.photo_url,
        }
      })
      .filter((m) => m.total > 0 || m.estimadas > 0 || m.reales > 0)
      .sort((a, b) => (workloadChartMode === "hours" ? b.reales - a.reales : b.activas - a.activas))
  }, [teamMembers, sprintTasks, workloadChartMode])

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
    if (activeTriageTab === "overbudget") {
      return overbudgetTasks
    }
    if (activeTriageTab === "qa") {
      return qaQueueTasks
    }
    if (activeTriageTab === "done") {
      return completedTasks
    }
    return backlogTasks
  }, [activeTriageTab, blockedTasks, overdueTasks, overbudgetTasks, qaQueueTasks, completedTasks, backlogTasks])

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
              { id: "all", label: "Histórico" },
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

      {/* Dedicated Sprint / Cycle Control Bar (Linear / Jira Style) */}
      <div className="p-2.5 sm:p-3 rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-card shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4">
          {/* Left: Categorized Sprint Selector & Real-Time Contextual Badges */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
            {/* Sprint Dropdown Selector */}
            <Select
              value={selectedSprintId}
              onValueChange={(val) => {
                if (val === "__create__") {
                  setSprintModalState({ isOpen: true, mode: "create", sprint: null })
                  return
                }
                setSelectedSprintId(val)
              }}
            >
              <SelectTrigger className="h-8 px-2.5 py-1 text-sm font-bold text-foreground bg-zinc-100/80 hover:bg-zinc-200/70 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl gap-2 cursor-pointer transition-colors shadow-none w-auto max-w-[280px]">
                <span className="truncate">
                  {selectedSprintId === "all"
                    ? "Todos los tickets (Global)"
                    : currentSprint
                    ? currentSprint.name
                    : "Seleccionar Sprint"}
                </span>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800 min-w-[240px]">
                {/* Global Option */}
                <SelectItem value="all" className="text-xs font-medium cursor-pointer">
                  Todos los tickets (Global)
                </SelectItem>

                {/* Sprints Flat List without Section Headings */}
                {sprints.map((s) => (
                  <SelectItem
                    key={s.id}
                    value={s.id}
                    className={cn(
                      "text-xs cursor-pointer",
                      s.status === "active"
                        ? "font-semibold text-emerald-600 dark:text-emerald-400"
                        : s.status === "planning"
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {s.name} ({s.status === "active" ? "En curso" : s.status === "planning" ? "Planificación" : "Cerrado"})
                  </SelectItem>
                ))}

                <SelectSeparator />
                <SelectItem
                  value="__create__"
                  className="text-xs cursor-pointer font-bold text-primary"
                >
                  + Crear nuevo sprint...
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Contextual Badges based strictly on selectedSprintId / currentSprint */}
            {currentSprint ? (
              <>
                {/* Status Badge */}
                <Badge
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-none",
                    currentSprint.status === "active"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : currentSprint.status === "planning"
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                      : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20"
                  )}
                >
                  {currentSprint.status === "active"
                    ? "Sprint Activo"
                    : currentSprint.status === "planning"
                    ? "En Planificación"
                    : "Cerrado"}
                </Badge>

                {/* Dates / Duration */}
                {currentSprint.status === "active" && sprintDaysRemaining !== null && (
                  <span
                    className={cn(
                      "text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border",
                      sprintDaysRemaining < 0
                        ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                        : sprintDaysRemaining <= 3
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        : "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border-zinc-200 dark:border-zinc-700"
                    )}
                  >
                    {sprintDaysRemaining < 0
                      ? `Venció hace ${Math.abs(sprintDaysRemaining)}d`
                      : sprintDaysRemaining === 0
                      ? "Termina hoy"
                      : `${sprintDaysRemaining} días restantes`}
                  </span>
                )}

                {currentSprint.status === "planning" && (
                  <span className="text-[10px] text-muted-foreground font-mono bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 rounded-full border border-zinc-200/80 dark:border-zinc-700/80">
                    Inicia: {currentSprint.start_date} ({currentSprint.duration_days}d)
                  </span>
                )}

                {currentSprint.status === "completed" && (
                  <span className="text-[10px] text-muted-foreground font-mono bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 rounded-full border border-zinc-200/80 dark:border-zinc-700/80">
                    Cerrado: {currentSprint.end_date}
                  </span>
                )}

                {/* Auto Rollover Badge if applicable */}
                {currentSprint.auto_rollover && (
                  <span className="text-[10px] flex items-center gap-1 text-zinc-600 dark:text-zinc-400 font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-200/80 dark:border-zinc-700/80">
                    <RotateCw className="w-2.5 h-2.5 text-zinc-500" />
                    Auto-ciclado
                  </span>
                )}
              </>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed">
                Vista Global
              </Badge>
            )}
          </div>

          {/* Right: PM Controls - Precise Contextual Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {currentSprint ? (
              <>
                {/* Editar is ALWAYS present for the currently selected sprint */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setSprintModalState({ isOpen: true, mode: "edit", sprint: currentSprint })
                  }
                  className="h-8 text-xs rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 mr-1.5" />
                  Editar
                </Button>

                {/* If active: Finalizar Sprint */}
                {currentSprint.status === "active" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      setSprintModalState({ isOpen: true, mode: "complete", sprint: currentSprint })
                    }
                    className="h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Finalizar Sprint
                  </Button>
                )}

                {/* If planning: Iniciar Sprint */}
                {currentSprint.status === "planning" && (
                  <Button
                    size="sm"
                    onClick={() => handleStartPlanningSprint(currentSprint)}
                    className="h-8 text-xs rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                    Iniciar Sprint
                  </Button>
                )}
              </>
            ) : (
              /* When no sprint exists or global view: Crear Sprint */
              <Button
                size="sm"
                onClick={() => setSprintModalState({ isOpen: true, mode: "create", sprint: null })}
                className="h-8 text-xs rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Crear Sprint
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Balanced High-Value KPI Cards - Low Profile Compact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Salud del Sprint / Salud Global */}
        <Card className="p-4 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-card to-card dark:from-blue-500/20 relative overflow-hidden group shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {currentSprint ? "Salud del Sprint" : "Salud Global"}
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
              {sprintTasks.length > 0 ? Math.round((qaQueueTasks.length / sprintTasks.length) * 100) : 0}% {currentSprint ? "del sprint" : "del total"}
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
                <span>{sprintProgress}% {currentSprint ? "sprint" : "global"}</span>
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

      {/* 1. Gráfico de Carga Operativa & Rendimiento a lo ANCHO TOTAL */}
      <Card className="w-full p-6 sm:p-7 rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-card/60 backdrop-blur-xl shadow-xl shadow-black/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <h3 className="text-lg font-bold text-foreground">
                Carga Operativa & Rendimiento
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {workloadChartMode === "hours"
                ? "Comparativa de horas estimadas presupuestadas vs horas reales incurridas por especialista"
                : "Distribución real de tickets activos en desarrollo vs tareas completadas"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Mode Toggle: Tickets vs Horas */}
            <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-white/5 rounded-xl border border-zinc-200/80 dark:border-white/10">
              <button
                type="button"
                onClick={() => setWorkloadChartMode("tickets")}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  workloadChartMode === "tickets"
                    ? "bg-white dark:bg-zinc-800 text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Tickets
              </button>
              <button
                type="button"
                onClick={() => setWorkloadChartMode("hours")}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer",
                  workloadChartMode === "hours"
                    ? "bg-white dark:bg-zinc-800 text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Clock className="w-3 h-3 text-violet-500" />
                <span>Horas</span>
              </button>
            </div>

            {/* Dynamic Legend based on Mode */}
            {workloadChartMode === "tickets" ? (
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 font-medium">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Activas ({activeTasks.length})</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Listas ({completedTasks.length})</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 font-medium">
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                  <span>Estimadas ({totalEstimatedHours}h)</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                  <span>Reales ({totalActualHours}h)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {memberPerformanceData.length === 0 ? (
          <div className="h-[260px] flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
            <Users className="w-8 h-8 opacity-30" />
            <span>No hay tareas asignadas en este período o filtro</span>
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart
                data={memberPerformanceData}
                margin={{ top: 10, right: 15, left: -10, bottom: 10 }}
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
                {workloadChartMode === "tickets" ? (
                  <>
                    <Bar dataKey="activas" name="Tickets Activos" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={22} />
                    <Bar dataKey="completadas" name="Completadas" fill="#10b981" radius={[6, 6, 0, 0]} barSize={22} />
                  </>
                ) : (
                  <>
                    <Bar dataKey="estimadas" name="Horas Estimadas" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={22} />
                    <Bar dataKey="reales" name="Horas Incurridas" fill="#ec4899" radius={[6, 6, 0, 0]} barSize={22} />
                  </>
                )}
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* 2. Balance de Horas & Rendimiento por Especialista AL LADO de Estado del Sprint */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left (8 cols): Tabla Balance de Horas & Rendimiento */}
        <Card className="lg:col-span-8 p-6 sm:p-7 rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-card/60 backdrop-blur-xl shadow-xl shadow-black/5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-violet-500" />
                <h4 className="text-base font-bold text-foreground">
                  Balance de Horas & Rendimiento por Especialista
                </h4>
              </div>
              <span className="text-xs text-muted-foreground font-medium font-mono">
                {currentSprint ? "Ciclo: " : "Total: "}<strong className="text-foreground">{totalActualHours}h</strong> / {totalEstimatedHours}h ({hoursBurnRate}%)
              </span>
            </div>

            {memberPerformanceData.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                <Users className="w-8 h-8 opacity-30" />
                <span>No hay datos de especialistas en este período</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[580px]">
                  <thead>
                    <tr className="border-b border-border/60 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      <th className="pb-2.5 pl-1">Especialista</th>
                      <th className="pb-2.5 text-center">Tickets</th>
                      <th className="pb-2.5 text-right">Horas Est.</th>
                      <th className="pb-2.5 text-right">Horas Reales</th>
                      <th className="pb-2.5 text-right">Variación (Δ)</th>
                      <th className="pb-2.5 text-center">Burn Rate</th>
                      <th className="pb-2.5 text-right pr-1">Avance Prom.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {memberPerformanceData.map((m) => {
                      const isFavorable = m.delta >= 0
                      const isOver = m.burnRate > 100

                      return (
                        <tr key={m.id} className="hover:bg-zinc-500/5 transition-colors">
                          <td className="py-2.5 pl-1 pr-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6 rounded-full border shrink-0">
                                <AvatarImage src={getCollaboratorAvatar(m.photoUrl, m.fullName)} />
                                <AvatarFallback className="text-[8px]">{m.fullName[0]}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <span className="font-semibold text-foreground block truncate">{m.fullName}</span>
                                <span className="text-[10px] text-muted-foreground block truncate">{m.role}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                            <span className="text-blue-500 font-bold">{m.activas}</span> / <span className="text-emerald-500 font-bold">{m.completadas}</span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                            {m.estimadas}h
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-[11px] font-bold text-foreground whitespace-nowrap">
                            {m.reales}h
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-[11px] font-bold whitespace-nowrap">
                            <span className={isFavorable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}>
                              {m.delta >= 0 ? `+${m.delta}h` : `${m.delta}h`}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center whitespace-nowrap">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold inline-block",
                                isOver
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                  : m.burnRate >= 85
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              )}
                            >
                              {m.burnRate}%
                            </span>
                          </td>
                          <td className="py-2.5 pl-2 pr-1 text-right font-mono text-[11px] font-bold text-foreground whitespace-nowrap">
                            {m.progreso}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        {/* Right (4 cols): Estado del Sprint (Donut Chart) */}
        <Card className="lg:col-span-4 p-6 sm:p-7 rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-card/60 backdrop-blur-xl shadow-xl shadow-black/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PieChartIcon className="w-4 h-4 text-violet-500" />
              <h3 className="text-lg font-bold text-foreground">
                {currentSprint ? "Estado del Sprint" : "Estado de los Tickets"}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {currentSprint
                ? `Desglose de entregas de ${currentSprint.name}`
                : "Desglose general de entregas"}
            </p>
          </div>

          <div className="h-[210px] w-full relative flex items-center justify-center my-4">
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
                {currentSprint ? "En Sprint" : "Tickets"}
              </span>
            </div>
          </div>

          {/* Clean Legend */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-200/70 dark:border-white/5">
            {statusPieData.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-white/5">
                <div className="flex items-center gap-1.5 truncate">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="truncate text-muted-foreground text-[11px]">{s.name}</span>
                </div>
                <span className="font-mono font-bold text-foreground ml-1 text-[11px]">{s.value}</span>
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
            onClick={() => setActiveTriageTab("overbudget")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border",
              activeTriageTab === "overbudget"
                ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400 shadow-xs"
                : "bg-zinc-100/70 dark:bg-white/5 border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="w-3.5 h-3.5 text-purple-500" />
            <span>Horas Excedidas</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                overbudgetTasks.length > 0
                  ? "bg-purple-500 text-white font-bold"
                  : "bg-zinc-200 dark:bg-zinc-800 text-muted-foreground"
              )}
            >
              {overbudgetTasks.length}
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
                  : activeTriageTab === "overbudget"
                  ? "No hay tickets con horas excedidas sobre su estimación"
                  : activeTriageTab === "qa"
                  ? "No hay tickets pendientes de revisión técnica en QA"
                  : activeTriageTab === "done"
                  ? "No hay entregas registradas en este período"
                  : "El backlog está vacío"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeTriageTab === "critical"
                  ? currentSprint
                    ? "Excelente: el sprint fluye sin retrasos críticos"
                    : "Excelente: las operaciones fluyen sin retrasos críticos"
                  : activeTriageTab === "overbudget"
                  ? "Excelente: todo el consumo de tiempo está dentro del presupuesto planificado"
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
                        {task.blocked_by && task.blocked_by.status !== "done" && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0 whitespace-nowrap"
                            title={`Bloqueado por #${task.blocked_by.ticket_code} (${task.blocked_by.title})`}
                          >
                            <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                            <span>Bloqueado por #{task.blocked_by.ticket_code}</span>
                          </span>
                        )}
                        {task.status === "blocked" && task.blocked_reason && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 max-w-[220px] truncate"
                            title={`Motivo del bloqueo: ${task.blocked_reason}`}
                          >
                            <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">Motivo: {task.blocked_reason}</span>
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

                    {/* Hours balance chip */}
                    {(Number(task.estimated_hours) > 0 || Number(task.actual_hours) > 0) && (
                      <div
                        className={cn(
                          "flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-lg border shrink-0",
                          Number(task.actual_hours) > Number(task.estimated_hours) && Number(task.estimated_hours) > 0
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 font-bold"
                            : "bg-zinc-100 dark:bg-white/5 text-muted-foreground border-zinc-200/80 dark:border-white/10 font-medium"
                        )}
                        title={`Horas reales: ${task.actual_hours || 0}h / Estimadas: ${task.estimated_hours || 0}h`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        <span>
                          {task.actual_hours || 0}h{Number(task.estimated_hours) > 0 ? `/${task.estimated_hours}h` : ""}
                        </span>
                      </div>
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

      {/* Task Sprint Management Modal */}
      <TaskSprintModal
        isOpen={sprintModalState.isOpen}
        onClose={() => setSprintModalState((prev) => ({ ...prev, isOpen: false }))}
        mode={sprintModalState.mode}
        sprint={sprintModalState.sprint}
        activeSprint={activeSprintObj}
        allSprints={sprints}
        token={token}
        onSprintCreated={(newSprint) => {
          onSprintCreated?.(newSprint)
          setSelectedSprintId(newSprint.id)
        }}
        onSprintUpdated={(updated) => {
          onSprintUpdated?.(updated)
        }}
        onSprintCompleted={(completedId, nextSprint) => {
          onSprintCompleted?.(completedId, nextSprint)
          if (nextSprint) {
            setSelectedSprintId(nextSprint.id)
          } else {
            setSelectedSprintId("all")
          }
        }}
        onSprintDeleted={(deletedId) => {
          onSprintDeleted?.(deletedId)
          setSelectedSprintId("all")
        }}
      />
    </div>
  )
}
