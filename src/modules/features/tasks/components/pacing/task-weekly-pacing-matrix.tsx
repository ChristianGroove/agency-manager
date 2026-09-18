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
  Download,
  FileText,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowUpRight,
  Check,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Briefcase,
  TrendingUp,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/modules/infrastructure/utils/utils"
import { SearchFilterBar } from "@/modules/core/ui/components/search-filter-bar"
import type { TaskItem, TaskProject, TaskWorkspace } from "../../types"
import { RECURRENCE_INTERVAL_LABELS } from "../../types"
import { getTaskWeeklyPacing, parseTaskChecklist } from "../../types"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"
import { TaskPacingPdfModal } from "./task-pacing-pdf-modal"
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

interface TenantBranding {
  name?: string
  logoUrl?: string | null
  isotypeUrl?: string | null
  primaryColor?: string
}

interface TaskWeeklyPacingMatrixProps {
  tasks: TaskItem[]
  teamMembers?: StaffMember[]
  projects?: { id: string; name: string; color?: string; workspace_id?: string | null }[]
  workspaces?: TaskWorkspace[]
  onSelectTask?: (task: TaskItem) => void
  brandColor?: string
  tenantBranding?: TenantBranding
  className?: string
}

export function TaskWeeklyPacingMatrix({
  tasks,
  teamMembers = [],
  projects = [],
  workspaces = [],
  onSelectTask,
  brandColor = "#8ec045",
  tenantBranding,
  className,
}: TaskWeeklyPacingMatrixProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMember, setSelectedMember] = useState("all")
  const [selectedProject, setSelectedProject] = useState("all")
  const [filterPreset, setFilterPreset] = useState<string>("all")
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)

  // Selected collaborator object if filtering by specific member
  const selectedStaff = useMemo(() => {
    return teamMembers.find((m) => m.id === selectedMember)
  }, [teamMembers, selectedMember])

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

      // Member filter (includes assigned lead, QA tester, or assigned deliverable / subtask)
      if (selectedMember !== "all") {
        const isAssigned = task.assigned_staff_id === selectedMember
        const isQa = task.qa_staff_id === selectedMember
        const hasSubtask = task.checklist && parseTaskChecklist(task.checklist).some((c) => c.assigned_staff_id === selectedMember)
        if (!isAssigned && !isQa && !hasSubtask) return false
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

      // Monthly Period Scope:
      // When moving to a future month (e.g. October), tasks completed in previous months (September or earlier) must not appear.
      if (task.status === "done" || task.progress_percentage === 100) {
        const completedDate = new Date(task.updated_at || task.created_at)
        const startOfSelectedMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        if (completedDate < startOfSelectedMonth) {
          return false
        }
      }

      // If a task was created after the end of the selected month, it did not exist yet in this period
      const endOfSelectedMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59)
      const createdDate = new Date(task.created_at)
      if (createdDate > endOfSelectedMonth) {
        return false
      }

      return true
    })
  }, [tasks, selectedMember, selectedProject, projects, currentDate])

  // Dynamic counts for SearchFilterBar pills
  const countAll = baseTasks.length
  const countActive = useMemo(() => {
    return baseTasks.filter((t) => t.status !== "done" && t.progress_percentage < 100).length
  }, [baseTasks])
  const countCompleted = useMemo(() => {
    return baseTasks.filter((t) => t.status === "done" || t.progress_percentage === 100).length
  }, [baseTasks])

  // Final filtered tasks
  const filteredTasks = useMemo(() => {
    return baseTasks.filter((task) => {
      // Filter preset from SearchFilterBar pills (active vs all vs completed)
      if (filterPreset === "active") {
        if (task.status === "done" || task.progress_percentage === 100) return false
      } else if (filterPreset === "completed") {
        if (task.status !== "done" && task.progress_percentage < 100) return false
      }

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

      return true
    })
  }, [baseTasks, searchQuery, filterPreset])

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

    const activeTasks = filteredTasks.filter((t) => t.status !== "done" && t.progress_percentage < 100)
    const totalActiveProgress = activeTasks.reduce((acc, t) => acc + (t.progress_percentage || 0), 0)
    const averageActiveProgress = activeTasks.length > 0
      ? Math.round(totalActiveProgress / activeTasks.length)
      : (filteredTasks.length > 0 ? 100 : 0)

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
      activeCount: activeTasks.length,
      averageActiveProgress,
      onTrackCount,
      atRiskCount,
      delayedCount,
    }
  }, [filteredTasks, currentDate, activeMonthWeek])

  // Scope label for currently selected space or project
  const scopeLabel = useMemo(() => {
    if (selectedProject === "all") return "Todos los espacios"
    if (selectedProject.startsWith("workspace:")) {
      const wsId = selectedProject.replace("workspace:", "")
      const ws = workspaces.find((w) => w.id === wsId)
      return ws ? `Espacio: ${ws.name}` : "Espacio específico"
    }
    const proj = projects.find((p) => p.id === selectedProject)
    return proj ? `Proyecto: ${proj.name}` : "Proyecto específico"
  }, [selectedProject, workspaces, projects])

  // Copy Executive Report to Clipboard (Concise, Clean & Productive - No Bloated Descriptions)
  const handleCopySummary = async () => {
    const monthName = format(currentDate, "MMMM yyyy", { locale: es })
    const memberLabel = selectedStaff
      ? `${selectedStaff.first_name} ${selectedStaff.last_name}`
      : "Todo el equipo"
    const filterLabel =
      filterPreset === "active"
        ? "Activas"
        : filterPreset === "completed"
        ? "Completas"
        : "Todas"

    let report = `📊 *RITMO SEMANAL — ${monthName.toUpperCase()}*\n`
    report += `👤 *Responsable:* ${memberLabel} | 🏢 *Alcance:* ${scopeLabel} | 🔍 *Filtro:* ${filterLabel} (${filteredTasks.length})\n\n`

    report += `📈 *INSIGHTS CLAVE:*\n`
    report += `• Avance Activo: ${metrics.averageActiveProgress}%\n`
    report += `• Total Periodo: ${metrics.total} (${metrics.activeCount} en curso · ${metrics.completedCount} listas)\n`
    report += `• A Tiempo: ${metrics.onTrackCount} · En Riesgo: ${metrics.atRiskCount} · Rezagadas: ${metrics.delayedCount}\n\n`

    report += `📋 *TICKETS (${filteredTasks.length}):*\n`
    if (filteredTasks.length === 0) {
      report += `(Sin tareas para los filtros activos)\n`
    } else {
      const maxVisualizedInReport = 35
      const tasksToPrint = filteredTasks.slice(0, maxVisualizedInReport)

      tasksToPrint.forEach((t) => {
        const staff = t.assigned_staff ? t.assigned_staff.first_name : "Sin asignar"
        report += `• [${t.ticket_code}] ${t.title} [${staff}] (${t.progress_percentage}%)\n`
      })

      if (filteredTasks.length > maxVisualizedInReport) {
        report += `... y ${filteredTasks.length - maxVisualizedInReport} tickets más en el portal.\n`
      }
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(report)
      } else {
        const textArea = document.createElement("textarea")
        textArea.value = report
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
      }
      toast.success("Resumen copiado al portapapeles", {
        description: `Se copiaron las métricas y los ${Math.min(35, filteredTasks.length)} tickets visualizados.`,
      })
    } catch (err) {
      console.error("Failed to copy summary:", err)
      toast.error("No se pudo copiar automáticamente al portapapeles.")
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 1. Extended Toolbar: SearchFilterBar Combobox + Workspace & Team Selectors + Month + Copy */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 w-full pt-1">
        {/* Combobox Search & Active/Completed Filter Pills */}
        <SearchFilterBar
          searchTerm={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Buscar por código, título o colaborador..."
          filters={[
            { id: "all", label: "Todas", count: countAll, color: "gray" },
            { id: "active", label: "Activas", count: countActive, color: "emerald" },
            { id: "completed", label: "Completas", count: countCompleted, color: "slate" },
          ]}
          activeFilter={filterPreset}
          onFilterChange={setFilterPreset}
          defaultShowFilters={true}
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
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-xl cursor-pointer"
                    onClick={() => setCurrentDate((prev) => subMonths(prev, 1))}
                    aria-label="Mes anterior"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="rounded-xl text-xs">
                  Mes anterior
                </TooltipContent>
              </Tooltip>

              <span className="px-2 text-xs font-bold capitalize select-none min-w-[115px] text-center">
                {format(currentDate, "MMMM yyyy", { locale: es })}
              </span>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-xl cursor-pointer"
                    onClick={() => setCurrentDate((prev) => addMonths(prev, 1))}
                    aria-label="Mes siguiente"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="rounded-xl text-xs">
                  Mes siguiente
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Export Dropdown Menu (Icon-only trigger with 2 options: Copy Summary & PDF Preview) */}
          <DropdownMenu>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-sm hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                      aria-label="Exportar reporte"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent className="rounded-xl text-xs">
                  Exportar reporte
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenuContent
              align="end"
              className="w-64 p-1.5 rounded-2xl shadow-xl border border-zinc-200/80 dark:border-white/10 bg-card z-50"
            >
              <DropdownMenuItem
                onClick={handleCopySummary}
                className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-colors hover:bg-muted/60"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Copy className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-foreground block">Copiar Resumen</span>
                  <span className="text-[11px] text-muted-foreground block leading-tight">
                    Texto conciso para WhatsApp o Slack
                  </span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setIsPdfModalOpen(true)}
                className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-colors hover:bg-muted/60"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-foreground block">Documento PDF</span>
                  <span className="text-[11px] text-muted-foreground block leading-tight">
                    Previsualizar reporte ejecutivo imprimible
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 2. Executive Scoreboard (Compact 4-KPI Grid placed below the Toolbar) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Avance Global Activo (Executive Insight) */}
        <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-md shadow-2xs">
          <CardContent className="p-3 sm:p-3.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                  {selectedStaff ? `Avance ${selectedStaff.first_name}` : "Avance Activo"}
                </span>
              </div>
              <span className="text-xl sm:text-2xl font-black font-mono text-primary shrink-0 leading-none">
                {metrics.averageActiveProgress}%
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              Suma sobre {metrics.activeCount} en curso
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

      {/* 4. The Pacing Matrix Table */}
      <div className="glass-card rounded-3xl border border-border/80 overflow-hidden shadow-sm bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs border-collapse">
            <thead className="bg-muted/40 border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-4 w-80">Ticket & Requerimiento</th>
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
                        "px-4 py-3.5 w-48 text-center transition-colors relative",
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
                <th className="px-4 py-4 w-14 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-foreground space-y-2">
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
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 px-1.5 py-0 cursor-help"
                                    aria-label={`Recurrente: ${task.recurrence_interval ? RECURRENCE_INTERVAL_LABELS[task.recurrence_interval]?.split(" (")[0] : "Periódica"}`}
                                  >
                                    {task.recurrence_interval ? RECURRENCE_INTERVAL_LABELS[task.recurrence_interval]?.split(" (")[0] : "Periódica"}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <span>{`Frecuencia: ${task.recurrence_interval ? RECURRENCE_INTERVAL_LABELS[task.recurrence_interval] : "Periódica"}`}</span>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {task.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground flex-wrap">
                            {resolvedProject && (
                              <div className="flex items-center gap-1">
                                <Layers className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                <span className="truncate max-w-[140px]">{resolvedProject.name}</span>
                              </div>
                            )}
                            {task.assigned_staff && (
                              <div className="flex items-center gap-1 text-muted-foreground/80">
                                <Avatar className="w-3.5 h-3.5 shrink-0">
                                  <AvatarImage src={getCollaboratorAvatar(task.assigned_staff.photo_url, task.assigned_staff.first_name)} />
                                  <AvatarFallback className="text-[7px]">
                                    {task.assigned_staff.first_name.slice(0, 1)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate max-w-[120px] font-medium">{task.assigned_staff.first_name}</span>
                              </div>
                            )}
                          </div>
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

                      {/* View Action */}
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                                onClick={() => onSelectTask?.(task)}
                                aria-label="Ver detalle del ticket"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="rounded-xl text-xs">
                              Ver detalle del ticket
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-xl cursor-pointer"
                        disabled={safePage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="rounded-xl text-xs">
                      Página anterior
                    </TooltipContent>
                  </Tooltip>

                  <span className="px-2 text-[11px] font-mono font-medium text-foreground">
                    {safePage} / {totalPages}
                  </span>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-xl cursor-pointer"
                        disabled={safePage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        aria-label="Página siguiente"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="rounded-xl text-xs">
                      Página siguiente
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. PDF Executive Preview & Export Modal */}
      <TaskPacingPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        tasks={filteredTasks}
        currentDate={currentDate}
        selectedStaff={selectedStaff}
        scopeLabel={scopeLabel}
        filterPreset={filterPreset}
        metrics={metrics}
        tenantBranding={tenantBranding}
        brandColor={brandColor}
      />
    </div>
  )
}
