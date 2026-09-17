"use client"

import React, { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  Share2,
  Copy,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowUpRight,
  Check,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Briefcase
} from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { SearchFilterBar } from "@/modules/core/ui/components/search-filter-bar"
import type { TaskItem, TaskProject, TaskWorkspace } from "../../types"
import { RECURRENCE_INTERVAL_LABELS } from "../../types"
import { getTaskWeeklyPacing, parseTaskChecklist } from "../../types"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"
import { toast } from "sonner"
import { format, addMonths, subMonths } from "date-fns"
import { es } from "date-fns/locale"

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  photo_url?: string | null
  email?: string | null
  role?: string
}

interface TaskWeeklyPacingMatrixProps {
  tasks: TaskItem[]
  teamMembers?: StaffMember[]
  projects?: { id: string; name: string; color?: string; workspace_id?: string | null }[]
  workspaces?: TaskWorkspace[]
  onSelectTask?: (task: TaskItem) => void
  brandColor?: string
  className?: string
}

export function TaskWeeklyPacingMatrix({
  tasks,
  teamMembers = [],
  projects = [],
  workspaces = [],
  onSelectTask,
  brandColor = "#8ec045",
  className,
}: TaskWeeklyPacingMatrixProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMember, setSelectedMember] = useState("all")
  const [selectedProject, setSelectedProject] = useState("all")
  const [filterPreset, setFilterPreset] = useState<string>("all")

  // Check if currentDate is in current month & year
  const now = new Date()
  const isCurrentMonth =
    currentDate.getFullYear() === now.getFullYear() &&
    currentDate.getMonth() === now.getMonth()

  const activeMonthWeek = isCurrentMonth
    ? now.getDate() <= 7
      ? 1
      : now.getDate() <= 14
      ? 2
      : now.getDate() <= 21
      ? 3
      : 4
    : null

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(25)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedMember, selectedProject, filterPreset, currentDate])

  // Base tasks for current project and member scope (excludes backlog as it represents unscheduled/dormant work)
  const baseTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Exclude backlog tickets from sprint pacing
      if (task.status === "backlog") return false

      // Member
      if (selectedMember !== "all") {
        if (task.assigned_staff_id !== selectedMember) return false
      }

      // Project / Workspace filter
      if (selectedProject !== "all") {
        if (selectedProject.startsWith("workspace:")) {
          const wsId = selectedProject.replace("workspace:", "")
          const wsProjectIds = new Set(projects.filter((p) => p.workspace_id === wsId).map((p) => p.id))
          if (!wsProjectIds.has(task.project_id || "") && (task as any).workspace_id !== wsId) {
            return false
          }
        } else {
          if (task.project_id !== selectedProject) return false
        }
      }

      return true
    })
  }, [tasks, selectedMember, selectedProject, projects])

  // Dynamic counts for SearchFilterBar pills
  const countAll = baseTasks.length
  const countDelayed = useMemo(() => {
    return baseTasks.filter((t) => {
      const pacing = getTaskWeeklyPacing(t, currentDate)
      return pacing.some((p) => p.status === "delayed") || t.status === "blocked"
    }).length
  }, [baseTasks, currentDate])

  const countRecurring = useMemo(() => {
    return baseTasks.filter((t) => t.is_recurring).length
  }, [baseTasks])

  const countAtRisk = useMemo(() => {
    return baseTasks.filter((t) => {
      const pacing = getTaskWeeklyPacing(t, currentDate)
      const currentWeekPacing = pacing.find((p) => p.week === (activeMonthWeek || 1))
      return currentWeekPacing?.status === "at_risk"
    }).length
  }, [baseTasks, currentDate, activeMonthWeek])

  const countOnTrack = useMemo(() => {
    return baseTasks.filter((t) => {
      if (t.status === "done" || t.progress_percentage === 100) return true
      if (t.status === "blocked") return false
      const pacing = getTaskWeeklyPacing(t, currentDate)
      const hasDelayedWeek = pacing.some((p) => p.status === "delayed")
      if (hasDelayedWeek) return false
      const currentWeekPacing = pacing.find((p) => p.week === (activeMonthWeek || 1))
      return currentWeekPacing?.status !== "at_risk"
    }).length
  }, [baseTasks, currentDate, activeMonthWeek])

  // Final filtered tasks
  const filteredTasks = useMemo(() => {
    return baseTasks.filter((task) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTitle = task.title.toLowerCase().includes(q)
        const matchCode = task.ticket_code.toLowerCase().includes(q)
        const matchAssignee = task.assigned_staff
          ? `${task.assigned_staff.first_name} ${task.assigned_staff.last_name}`.toLowerCase().includes(q)
          : false
        if (!matchTitle && !matchCode && !matchAssignee) return false
      }

      // Filter preset from SearchFilterBar
      if (filterPreset === "delayed") {
        const pacing = getTaskWeeklyPacing(task, currentDate)
        const hasDelayedWeek = pacing.some((p) => p.status === "delayed")
        if (!hasDelayedWeek && task.status !== "blocked") return false
      } else if (filterPreset === "recurring") {
        if (!task.is_recurring) return false
      } else if (filterPreset === "at_risk") {
        const pacing = getTaskWeeklyPacing(task, currentDate)
        const currentWeekPacing = pacing.find((p) => p.week === (activeMonthWeek || 1))
        if (currentWeekPacing?.status !== "at_risk") return false
      } else if (filterPreset === "on_track") {
        if (task.status === "done" || task.progress_percentage === 100) return true
        if (task.status === "blocked") return false
        const pacing = getTaskWeeklyPacing(task, currentDate)
        const hasDelayedWeek = pacing.some((p) => p.status === "delayed")
        if (hasDelayedWeek) return false
        const currentWeekPacing = pacing.find((p) => p.week === (activeMonthWeek || 1))
        if (currentWeekPacing?.status === "at_risk") return false
        return true
      }

      return true
    })
  }, [baseTasks, searchQuery, filterPreset, currentDate, activeMonthWeek])

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedTasks = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredTasks.slice(start, start + pageSize)
  }, [filteredTasks, safePage, pageSize])

  const startRecord = filteredTasks.length > 0 ? (safePage - 1) * pageSize + 1 : 0
  const endRecord = Math.min(safePage * pageSize, filteredTasks.length)

  // Aggregate Metrics for Executive Scoreboard
  const metrics = useMemo(() => {
    let onTrackCount = 0
    let atRiskCount = 0
    let delayedCount = 0
    let completedCount = 0

    filteredTasks.forEach((task) => {
      if (task.status === "done" || task.progress_percentage === 100) {
        completedCount++
        return
      }

      const pacing = getTaskWeeklyPacing(task, currentDate)
      const currentWeekPacing = pacing.find((p) => p.week === (activeMonthWeek || 1))

      if (pacing.some((p) => p.status === "delayed") || task.status === "blocked") {
        delayedCount++
      } else if (currentWeekPacing?.status === "at_risk") {
        atRiskCount++
      } else {
        onTrackCount++
      }
    })

    const total = filteredTasks.length
    return {
      total,
      completedCount,
      onTrackCount,
      atRiskCount,
      delayedCount,
      healthScore: total > 0 ? Math.round(((completedCount + onTrackCount) / total) * 100) : 100,
    }
  }, [filteredTasks, currentDate, activeMonthWeek])

  // Copy Executive Report to Clipboard
  const handleCopySummary = () => {
    const monthName = format(currentDate, "MMMM yyyy", { locale: es })
    let report = `📊 *REPORTE DE RITMO SEMANAL - ${monthName.toUpperCase()}*\n`
    report += `• Total Tickets: ${metrics.total}\n`
    report += `• A Tiempo / Listos: ${metrics.completedCount + metrics.onTrackCount} (${metrics.healthScore}%)\n`
    report += `• En Riesgo: ${metrics.atRiskCount}\n`
    report += `• Rezagados / Bloqueados: ${metrics.delayedCount}\n\n`
    report += `🚨 *Casos que requieren atención:*\n`

    const delayed = filteredTasks.filter((t) => {
      const pacing = getTaskWeeklyPacing(t, currentDate)
      return pacing.some((p) => p.status === "delayed") || t.status === "blocked"
    })

    if (delayed.length === 0) {
      report += `✅ ¡Todos los tickets se encuentran en ritmo óptimo!\n`
    } else {
      delayed.slice(0, 8).forEach((t) => {
        const staff = t.assigned_staff ? `${t.assigned_staff.first_name}` : "Sin asignar"
        report += `- [${t.ticket_code}] ${t.title} (${staff}): Avance ${t.progress_percentage}%\n`
      })
    }

    navigator.clipboard.writeText(report)
    toast.success("Resumen ejecutivo copiado al portapapeles", {
      description: "Listo para compartir en Slack, WhatsApp o presentar en el comité.",
    })
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 1. Executive Scoreboard (Compact & Sleek) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Salud del Ciclo */}
        <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-md shadow-2xs">
          <CardContent className="p-3 sm:p-3.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                  Salud del Ciclo
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] font-bold px-1.5 py-0 rounded-md shrink-0",
                    metrics.healthScore >= 75
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : metrics.healthScore >= 50
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                  )}
                >
                  {metrics.healthScore >= 75 ? "Óptimo" : metrics.healthScore >= 50 ? "Atención" : "Crítico"}
                </Badge>
              </div>
              <span className="text-xl sm:text-2xl font-black font-mono text-primary shrink-0 leading-none">
                {metrics.healthScore}%
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {metrics.completedCount} de {metrics.total} tickets finalizados
            </p>
          </CardContent>
        </Card>

        {/* A Tiempo */}
        <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-md shadow-2xs">
          <CardContent className="p-3 sm:p-3.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 inline-block" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
                  A Tiempo (En Ritmo)
                </span>
              </div>
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 shrink-0 leading-none">
                {metrics.onTrackCount}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              Entregables de la semana al día
            </p>
          </CardContent>
        </Card>

        {/* En Riesgo */}
        <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-md shadow-2xs">
          <CardContent className="p-3 sm:p-3.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 inline-block" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate">
                  En Riesgo
                </span>
              </div>
              <span className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 shrink-0 leading-none">
                {metrics.atRiskCount}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              Avance lento en la semana actual
            </p>
          </CardContent>
        </Card>

        {/* Rezagadas / Críticas */}
        <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-md shadow-2xs">
          <CardContent className="p-3 sm:p-3.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 inline-block" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 truncate">
                  Rezagadas / Críticas
                </span>
              </div>
              <span className="text-xl sm:text-2xl font-black font-mono text-red-600 dark:text-red-400 shrink-0 leading-none">
                {metrics.delayedCount}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              Semanas previas sin completar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Extended Toolbar: SearchFilterBar Combobox + Workspace & Team Selectors */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 w-full pt-1">
        {/* Combobox Search & Pacing Filter Pills - Exactly like Gestión Tab */}
        <SearchFilterBar
          searchTerm={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Buscar por código, título o colaborador..."
          filters={[
            { id: "all", label: "Todas", count: countAll },
            { id: "delayed", label: "Con Retraso", count: countDelayed, color: "red" },
            { id: "recurring", label: "Periódicas", count: countRecurring, color: "purple" },
            { id: "at_risk", label: "En Riesgo", count: countAtRisk, color: "amber" },
            { id: "on_track", label: "En Ritmo", count: countOnTrack, color: "emerald" },
          ]}
          activeFilter={filterPreset}
          onFilterChange={setFilterPreset}
          className="flex-1 min-w-0"
        />

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end xl:self-auto">
          {/* Project / Workspace Selector - Same tree structure as Gestión Tab */}
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="h-10 text-xs w-[190px] sm:w-[225px] rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-white/10 shadow-sm font-medium text-left">
              <div className="flex items-center truncate text-left flex-1 min-w-0">
                <SelectValue placeholder="Todos los espacios" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-2xl max-h-[340px]">
              <SelectItem value="all" className="text-xs font-medium">
                <span className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Todos los espacios</span>
                </span>
              </SelectItem>
              {workspaces && workspaces.length > 0 ? (
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
                projects.map((p) => (
                  <SelectItem key={p.id} value={p.id} textValue={p.name} className="text-xs py-1.5">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="truncate">{p.name}</span>
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {/* Collaborator Selector - Matching Gestión Tab design */}
          {teamMembers.length > 0 && (
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger className="h-10 text-xs w-[170px] sm:w-[200px] rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-white/10 shadow-sm font-medium text-left">
                <div className="flex items-center truncate text-left flex-1 min-w-0">
                  <SelectValue placeholder="Todo el equipo" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl max-h-[340px]">
                <SelectItem value="all" className="text-xs font-medium">
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
                    className="text-xs py-1.5 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Avatar className="w-4 h-4 rounded-full border shrink-0">
                        <AvatarImage
                          src={getCollaboratorAvatar(m.photo_url, m.first_name)}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-[7px]">
                          {m.first_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{m.first_name} {m.last_name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Separador visual sutil */}
          <div className="hidden xl:block h-6 w-px bg-zinc-200 dark:bg-white/10" />

          {/* Month Selector — al lado del botón copiar */}
          <div className="flex items-center h-10 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-white/10 p-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl cursor-pointer"
              onClick={() => setCurrentDate((prev) => subMonths(prev, 1))}
              title="Mes anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="px-2 text-xs font-bold capitalize select-none min-w-[115px] text-center">
              {format(currentDate, "MMMM yyyy", { locale: es })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl cursor-pointer"
              onClick={() => setCurrentDate((prev) => addMonths(prev, 1))}
              title="Mes siguiente"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Copy Summary Icon Button with Tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopySummary}
                  className="h-10 w-10 rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-sm hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer text-muted-foreground hover:text-foreground shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="rounded-xl text-xs">
                Copiar resumen ejecutivo al portapapeles
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* 4. The Pacing Matrix Table */}
      <div className="glass-card rounded-3xl border border-border/80 overflow-hidden shadow-sm bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs border-collapse">
            <thead className="bg-muted/40 border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-4 w-72">Ticket & Requerimiento</th>
                {[
                  { week: 1, label: "Semana 1", range: "Días 1 - 7" },
                  { week: 2, label: "Semana 2", range: "Días 8 - 14" },
                  { week: 3, label: "Semana 3", range: "Días 15 - 21" },
                  { week: 4, label: "Semana 4", range: "Días 22 - Fin" },
                ].map(({ week: w, label, range }) => {
                  const isCurrent = activeMonthWeek === w
                  return (
                    <th
                      key={w}
                      className={cn(
                        "px-4 py-3.5 w-44 text-center transition-colors relative",
                        isCurrent && "bg-primary/10 text-primary border-b-2 border-primary dark:bg-primary/15"
                      )}
                    >
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <span
                            className={cn(
                              "text-[11px] font-bold tracking-wider",
                              isCurrent ? "text-primary font-black" : "text-foreground"
                            )}
                          >
                            {label}
                          </span>
                          {isCurrent && (
                            <Badge className="bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0 rounded-full h-4 shadow-2xs gap-1 border-0 inline-flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                              Actual
                            </Badge>
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-[9px] font-mono block",
                            isCurrent ? "text-primary/90 font-semibold" : "text-muted-foreground/75 font-normal"
                          )}
                        >
                          {range}
                        </span>
                      </div>
                    </th>
                  )
                })}
                <th className="px-5 py-4 w-40 text-center">Avance Global</th>
                <th className="px-4 py-4 w-20 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground space-y-2">
                    <CalendarDays className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                    <p className="font-semibold text-sm text-foreground">No hay tareas para los filtros seleccionados</p>
                    <p className="text-xs">Prueba cambiando el mes o retirando los filtros activos.</p>
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => {
                  const pacing = getTaskWeeklyPacing(task, currentDate)
                  const resolvedProject = task.project || projects.find((p) => p.id === task.project_id)
                  const safeChecklist = parseTaskChecklist(task.checklist)

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => onSelectTask?.(task)}
                    >
                      {/* Ticket Info */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs font-bold text-primary bg-primary/10 border-primary/25 rounded-lg px-2 py-0.5 shrink-0"
                            >
                              {task.ticket_code}
                            </Badge>
                            {task.is_recurring && (
                              <Badge
                                variant="outline"
                                className="text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 px-1.5 py-0"
                                title={`Recurrente: ${task.recurrence_interval ? RECURRENCE_INTERVAL_LABELS[task.recurrence_interval]?.split(" (")[0] : "Periódica"}`}
                              >
                                {task.recurrence_interval ? RECURRENCE_INTERVAL_LABELS[task.recurrence_interval]?.split(" (")[0] : "Periódica"}
                              </Badge>
                            )}
                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {task.title}
                            </span>
                          </div>

                          {resolvedProject && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Layers className="w-3 h-3" />
                              {resolvedProject.name}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Weeks 1, 2, 3, 4 */}
                      {pacing.map((weekData) => {
                        const isCurrent = weekData.week === activeMonthWeek

                        return (
                          <td
                            key={weekData.week}
                            className={cn(
                              "px-3 py-3.5 text-center transition-colors",
                              isCurrent && "bg-primary/[0.03] dark:bg-primary/[0.05] border-x border-primary/10"
                            )}
                          >
                            <div className="flex flex-col items-center gap-1 max-w-[130px] mx-auto">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-foreground text-[11px]">
                                  {weekData.hasSchedule || weekData.progress > 0 || weekData.status === "completed"
                                    ? `${weekData.progress}%`
                                    : "—"}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] font-bold px-1.5 py-0",
                                    weekData.status === "completed"
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                      : weekData.status === "on_track"
                                      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                                      : weekData.status === "at_risk"
                                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                      : weekData.status === "delayed"
                                      ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                      : "bg-muted text-muted-foreground border-border/60"
                                  )}
                                >
                                  {weekData.status === "completed"
                                    ? "Listo"
                                    : weekData.status === "on_track"
                                    ? "En Ritmo"
                                    : weekData.status === "at_risk"
                                    ? "Riesgo"
                                    : weekData.status === "delayed"
                                    ? "Retraso"
                                    : "Plan"}
                                </Badge>
                              </div>
                              {weekData.totalDeliverables > 0 && (
                                <span className="text-[9px] text-muted-foreground font-mono">
                                  {weekData.completedDeliverables}/{weekData.totalDeliverables} entregables
                                </span>
                              )}
                            </div>
                          </td>
                        )
                      })}

                      {/* Global Progress */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="space-y-1 max-w-[120px] mx-auto">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="font-mono text-primary">
                              {task.progress_percentage}%
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] py-0 px-1.5",
                                task.status === "done"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : task.status === "in_review"
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                  : task.status === "blocked"
                                  ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {task.status === "done"
                                ? "Completado"
                                : task.status === "in_review"
                                ? "En QA"
                                : task.status === "blocked"
                                ? "Bloqueado"
                                : "En Curso"}
                            </Badge>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-200/80 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${task.progress_percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* View Action */}
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-muted-foreground hover:text-foreground rounded-lg"
                          onClick={() => onSelectTask?.(task)}
                          title="Ver detalle del ticket"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredTasks.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-muted/20 border-t border-border/80 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>
                Mostrando <strong className="text-foreground font-semibold">{startRecord}</strong> - <strong className="text-foreground font-semibold">{endRecord}</strong> de{" "}
                <strong className="text-foreground font-semibold">{filteredTasks.length}</strong> tickets
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">Por pág:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-8 w-[72px] text-xs font-semibold rounded-xl bg-background border-border/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end" className="rounded-xl">
                    <SelectItem value="25" className="text-xs">25</SelectItem>
                    <SelectItem value="50" className="text-xs">50</SelectItem>
                    <SelectItem value="100" className="text-xs">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-xl cursor-pointer"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  title="Página anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="px-2 text-[11px] font-mono font-medium text-foreground">
                  {safePage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-xl cursor-pointer"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  title="Página siguiente"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
