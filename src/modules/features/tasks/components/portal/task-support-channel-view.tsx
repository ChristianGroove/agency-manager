"use client"

import React, { useState, useMemo, useEffect } from "react"
import {
  Headset,
  Search,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Inbox,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/modules/infrastructure/utils/utils"
import { formatDistanceToNow, parseISO, differenceInHours } from "date-fns"
import { es } from "date-fns/locale"
import { TASK_PRIORITY_LABELS, type TaskItem, type TaskWorkspace, type TaskProject, type TaskStatus } from "../../types"
import type { SupportTeamMember } from "../../actions/collaborator-portal-actions"
import { portalUpdateTask } from "../../actions/collaborator-portal-actions"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"
import { SearchFilterBar } from "@/modules/core/ui/components/search-filter-bar"
import { TaskSupportTicketDetailModal } from "./task-support-ticket-detail-modal"
import { getTicketReadState, getUnreadCommentCount, type SupportReadState } from "../../utils/support-thread-read-state"

interface TaskSupportChannelViewProps {
  supportTickets: TaskItem[]
  supportMembers?: SupportTeamMember[]
  workspaces: TaskWorkspace[]
  projects: TaskProject[]
  token?: string
  currentStaffId?: string
  onPromoteTicket: (ticket: TaskItem) => void
  onViewTicket?: (ticket: TaskItem) => void
  onResolveTicket: (ticketId: string) => Promise<void>
  onTicketStatusChange?: (ticketId: string, newStatus: TaskStatus) => Promise<void>
  teamMembers?: {
    id: string
    first_name: string
    last_name?: string | null
    role?: string | null
    photo_url?: string | null
  }[]
  brandColor?: string
}

export function TaskSupportChannelView({
  supportTickets,
  supportMembers = [],
  workspaces,
  projects,
  token = "",
  currentStaffId,
  onPromoteTicket,
  onViewTicket,
  onResolveTicket,
  onTicketStatusChange,
  teamMembers = [],
  brandColor = "#0284c7",
}: TaskSupportChannelViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>("all")
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [selectedTicketForDetail, setSelectedTicketForDetail] = useState<TaskItem | null>(null)
  const [readState, setReadState] = useState<SupportReadState>(() => getTicketReadState(currentStaffId || ""))

  useEffect(() => {
    setReadState(getTicketReadState(currentStaffId || ""))
  }, [currentStaffId])

  useEffect(() => {
    const handleReadUpdate = (e: Event) => {
      const customEvent = e as CustomEvent
      if (!customEvent.detail || customEvent.detail.staffId === currentStaffId) {
        setReadState(getTicketReadState(currentStaffId || ""))
      }
    }
    window.addEventListener("support-thread-read-update", handleReadUpdate)
    window.addEventListener("storage", handleReadUpdate)
    return () => {
      window.removeEventListener("support-thread-read-update", handleReadUpdate)
      window.removeEventListener("storage", handleReadUpdate)
    }
  }, [currentStaffId])

  // Workspaces that have parallel_team_enabled = true
  const supportEnabledWorkspaces = useMemo(() => {
    return workspaces.filter((w) => w.parallel_team_enabled)
  }, [workspaces])

  // Map workspace id to workspace details
  const workspaceMap = useMemo(() => {
    const map = new Map<string, TaskWorkspace>()
    workspaces.forEach((w) => map.set(w.id, w))
    return map
  }, [workspaces])

  // Map project id to workspace id
  const projectWorkspaceMap = useMemo(() => {
    const map = new Map<string, string>()
    projects.forEach((p) => {
      if (p.workspace_id) map.set(p.id, p.workspace_id)
    })
    return map
  }, [projects])

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return supportTickets.filter((ticket) => {
      // Collaborator / Staff Filter
      if (selectedStaffFilter !== "all") {
        if (ticket.created_by_staff_id !== selectedStaffFilter) return false
      }

      // Workspace filter
      if (selectedWorkspaceId !== "all") {
        const wsId = projectWorkspaceMap.get(ticket.project_id)
        if (wsId !== selectedWorkspaceId) return false
      }

      // Status filter
      if (statusFilter === "received") {
        if (ticket.status !== "backlog" && ticket.status !== "todo") return false
      } else if (statusFilter === "in_progress") {
        if (ticket.status !== "in_progress" && ticket.status !== "in_review" && ticket.status !== "blocked") return false
      } else if (statusFilter === "resolved") {
        if (ticket.status !== "done") return false
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTitle = ticket.title.toLowerCase().includes(q)
        const matchCode = ticket.ticket_code.toLowerCase().includes(q)
        const matchDesc = (ticket.description || "").toLowerCase().includes(q)
        const matchAuthor = (ticket.assigned_staff?.first_name || "").toLowerCase().includes(q)
        if (!matchTitle && !matchCode && !matchDesc && !matchAuthor) return false
      }

      return true
    })
  }, [supportTickets, selectedStaffFilter, selectedWorkspaceId, statusFilter, searchQuery, projectWorkspaceMap])

  // Metric counts
  const totalCount = supportTickets.length
  const receivedCount = supportTickets.filter((t) => t.status === "backlog" || t.status === "todo").length
  const inProgressCount = supportTickets.filter(
    (t) => t.status === "in_progress" || t.status === "in_review" || t.status === "blocked"
  ).length
  const resolvedCount = supportTickets.filter((t) => t.status === "done").length
  const resolutionPercentage = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0

  const handleQuickResolve = async (ticketId: string) => {
    setResolvingId(ticketId)
    try {
      await onResolveTicket(ticketId)
    } finally {
      setResolvingId(null)
    }
  }

  const handleOpenDetailModal = (ticket: TaskItem) => {
    setSelectedTicketForDetail(ticket)
    if (onViewTicket) {
      onViewTicket(ticket)
    }
  }

  const handleStatusChangeInternal = async (ticketId: string, newStatus: TaskStatus) => {
    if (newStatus === "done") {
      await onResolveTicket(ticketId)
    } else if (onTicketStatusChange) {
      await onTicketStatusChange(ticketId, newStatus)
    } else if (token) {
      await portalUpdateTask(token, ticketId, { status: newStatus })
    }
  }

  const selectedTicketWorkspace = useMemo(() => {
    if (!selectedTicketForDetail) return null
    const wsId = projectWorkspaceMap.get(selectedTicketForDetail.project_id)
    return wsId ? workspaceMap.get(wsId) || null : null
  }, [selectedTicketForDetail, projectWorkspaceMap, workspaceMap])

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Top 50/50 Split Section: Left Support Collaborator Ribbon + Right 4 Dashboard Insight Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Left Column: Ribbon de Especialistas de Soporte */}
        <div className="bg-card/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Headset className="w-3.5 h-3.5 text-sky-500" />
              Equipo de Soporte & Atención ({supportMembers.length})
            </span>
            {selectedStaffFilter !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedStaffFilter("all")}
                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
              >
                Ver todos
              </button>
            )}
          </div>

          {/* Cinta de Colaboradores con scroll horizontal */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1 no-scrollbar snap-x">
            {/* Master Bubble: "Todos los Especialistas" */}
            <div
              onClick={() => setSelectedStaffFilter("all")}
              className={cn(
                "flex flex-col items-center justify-between p-2 rounded-2xl cursor-pointer shrink-0 snap-start select-none w-20 sm:w-22 h-[92px] sm:h-[96px] text-center transition-all duration-150 relative",
                selectedStaffFilter === "all"
                  ? "border-2 border-primary bg-primary/[0.04] dark:bg-primary/[0.08] shadow-xs"
                  : "bg-white/70 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 hover:bg-white dark:hover:bg-white/10",
                selectedStaffFilter !== "all" && "opacity-60 hover:opacity-100"
              )}
            >
              <div className="relative flex items-center justify-center pt-1">
                <div
                  className={cn(
                    "w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-colors duration-150",
                    selectedStaffFilter === "all"
                      ? "text-white shadow-xs bg-primary"
                      : "bg-zinc-100/90 dark:bg-white/10 text-muted-foreground"
                  )}
                >
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                {totalCount > 0 && (
                  <div className="absolute -top-1 -right-1.5 h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-mono font-bold bg-zinc-800 dark:bg-zinc-700 text-white shadow-xs">
                    {totalCount}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center justify-center w-full min-h-[30px]">
                <span className="text-[11px] font-bold text-foreground truncate w-full leading-tight">
                  Todos
                </span>
                <span className="text-[10px] text-muted-foreground/75 font-mono leading-tight">
                  Global
                </span>
              </div>
            </div>

            <div className="h-11 w-[1px] bg-zinc-200/80 dark:bg-white/10 shrink-0 my-auto" />

            {/* Individual Support Members */}
            {supportMembers.map((member) => {
              const isSelected = selectedStaffFilter === member.id
              const memberTickets = supportTickets.filter((t) => t.created_by_staff_id === member.id)
              const mPending = memberTickets.filter((t) => t.status !== "done").length
              const mTotal = memberTickets.length

              return (
                <div
                  key={member.id}
                  onClick={() => setSelectedStaffFilter(isSelected ? "all" : member.id)}
                  className={cn(
                    "flex flex-col items-center justify-between p-2 rounded-2xl cursor-pointer shrink-0 snap-start select-none w-22 sm:w-24 h-[92px] sm:h-[96px] text-center group transition-all duration-200 relative overflow-visible",
                    isSelected
                      ? "border-2 border-primary bg-primary/[0.04] dark:bg-primary/[0.08] shadow-xs z-10"
                      : "bg-white/70 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 hover:bg-white dark:hover:bg-white/10 hover:shadow-xs",
                    selectedStaffFilter !== "all" && !isSelected && "opacity-60 hover:opacity-100"
                  )}
                >
                  <div className="relative flex items-center justify-center pt-1">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-white/10 bg-zinc-100 dark:bg-white/10 flex items-center justify-center">
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={member.first_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={getCollaboratorAvatar(null, member.first_name)}
                          alt={member.first_name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    {mPending > 0 && (
                      <div className="absolute -top-1 -right-1.5 h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-mono font-bold bg-amber-500 text-white shadow-xs">
                        {mPending}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center w-full min-h-[30px]">
                    <span className="text-[11px] font-bold text-foreground truncate w-full leading-tight">
                      {member.first_name}
                    </span>
                    <span className="text-[10px] text-muted-foreground/75 font-mono leading-tight">
                      {mTotal} {mTotal === 1 ? "ticket" : "tickets"}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: 4 Dashboard-style Insight Cards (2 Rows, Compact Height matching ribbon) */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 h-full">
          {/* 1. Total */}
          <div className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-card to-card dark:from-indigo-500/20 relative overflow-hidden group shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 truncate">
                Total
              </span>
              <div className="p-1 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Headset className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-2 mt-1">
              <h3 className="text-xl sm:text-2xl font-black text-foreground font-mono tracking-tight leading-none">
                {totalCount}
              </h3>
              <span className="text-[10px] text-muted-foreground font-medium truncate">
                Incidencias
              </span>
            </div>
          </div>

          {/* 2. Recibidos */}
          <div className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-card to-card dark:from-sky-500/20 relative overflow-hidden group shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 truncate">
                Recibidos
              </span>
              <div className="p-1 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 shrink-0">
                <Inbox className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-2 mt-1">
              <h3 className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 font-mono tracking-tight leading-none">
                {receivedCount}
              </h3>
              <span className="text-[10px] text-muted-foreground font-medium truncate">
                Por atender
              </span>
            </div>
          </div>

          {/* 3. En Atención */}
          <div className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-card dark:from-amber-500/20 relative overflow-hidden group shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate">
                En Atención
              </span>
              <div className="p-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-2 mt-1">
              <h3 className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight leading-none">
                {inProgressCount}
              </h3>
              <span className="text-[10px] text-muted-foreground font-medium truncate">
                En gestión
              </span>
            </div>
          </div>

          {/* 4. Resueltos */}
          <div className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-card dark:from-emerald-500/20 relative overflow-hidden group shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
                Resueltos
              </span>
              <div className="p-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-2 mt-1">
              <h3 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight leading-none">
                {resolvedCount}
              </h3>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium font-mono truncate">
                {resolutionPercentage}% resueltos
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: SearchFilterBar Combobox + Radix Select de Espacios */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <SearchFilterBar
          searchTerm={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Buscar por código, título o especialista..."
          filters={[
            { id: "all", label: "Todos", count: totalCount },
            { id: "received", label: "Recibidos", count: receivedCount, color: "sky" },
            { id: "in_progress", label: "En Atención", count: inProgressCount, color: "amber" },
            { id: "resolved", label: "Resueltos", count: resolvedCount, color: "emerald" },
          ]}
          activeFilter={statusFilter}
          onFilterChange={(f) => setStatusFilter(f)}
          defaultShowFilters={false}
          className="flex-1"
        />

        {/* Workspace Filter if multi-workspace */}
        {supportEnabledWorkspaces.length > 1 && (
          <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
            <SelectTrigger className="h-10 text-xs w-[190px] sm:w-[220px] rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-white/10 shadow-xs font-medium text-left">
              <div className="flex items-center truncate text-left flex-1 min-w-0">
                <SelectValue placeholder="Todos los espacios" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-2xl max-h-[320px]">
              <SelectItem value="all" className="text-xs font-medium">
                Todos los Espacios
              </SelectItem>
              {supportEnabledWorkspaces.map((ws) => (
                <SelectItem key={ws.id} value={ws.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: ws.color || brandColor }}
                    />
                    <span className="truncate">{ws.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tickets Feed */}
      {filteredTickets.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border/70 bg-card/40 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-center mx-auto text-muted-foreground">
            <Inbox className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">No hay tickets en este canal</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all" || selectedStaffFilter !== "all"
                ? "Prueba cambiando los filtros de búsqueda o colaborador."
                : "Los tickets reportados por el equipo de soporte aparecerán aquí inmediatamente."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => {
            const isResolved = ticket.status === "done"
            const isReceived = ticket.status === "backlog" || ticket.status === "todo"
            const wsId = projectWorkspaceMap.get(ticket.project_id)
            const ws = wsId ? workspaceMap.get(wsId) : null
            const createdAtDate = parseISO(ticket.created_at)
            const hoursElapsed = differenceInHours(new Date(), createdAtDate)
            const slaHours = ticket.priority === "urgent" ? 4 : ticket.priority === "high" ? 12 : 24
            const isSlaBreached = !isResolved && hoursElapsed > slaHours
            const unreadComments = getUnreadCommentCount(ticket, currentStaffId || "", readState)
            const totalComments = ticket.comments_count || 0

            return (
              <div
                key={ticket.id}
                className={cn(
                  "p-4 rounded-2xl border transition-all bg-card flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs hover:shadow-xs",
                  isResolved
                    ? "border-emerald-500/20 bg-emerald-500/5 opacity-80"
                    : isSlaBreached
                    ? "border-red-500/30 bg-red-500/[0.02]"
                    : "border-border/60 hover:border-border"
                )}
              >
                {/* Left Section: Ticket Info */}
                <div
                  className="space-y-2 flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleOpenDetailModal(ticket)}
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Ticket Code */}
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                      {ticket.ticket_code}
                    </span>

                    {/* Workspace Indicator */}
                    {ws && (
                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: ws.color || brandColor }}
                        />
                        <span>{ws.name}</span>
                      </span>
                    )}

                    {/* Reporter Name */}
                    {ticket.assigned_staff && (
                      <span className="text-[11px] font-medium text-foreground flex items-center gap-1.5 bg-muted/40 px-2 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                        <span>{ticket.assigned_staff.first_name} {ticket.assigned_staff.last_name || ""}</span>
                      </span>
                    )}

                    {/* Status Badge */}
                    {isResolved ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                        Resuelto
                      </Badge>
                    ) : isReceived ? (
                      <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 text-[10px]">
                        Recibido
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                        En Atención
                      </Badge>
                    )}

                    {/* Priority Chip */}
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.2 rounded font-semibold uppercase tracking-wider",
                        ticket.priority === "urgent"
                          ? "bg-red-500/10 text-red-600 border border-red-500/30"
                          : ticket.priority === "high"
                          ? "bg-orange-500/10 text-orange-600 border border-orange-500/30"
                          : ticket.priority === "medium"
                          ? "bg-sky-500/10 text-sky-600 border border-sky-500/30"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {TASK_PRIORITY_LABELS[ticket.priority] || ticket.priority}
                    </span>

                    {/* SLA Chip */}
                    {!isResolved && (
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-md font-mono flex items-center gap-1",
                          isSlaBreached
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 font-bold border border-red-500/30"
                            : "bg-muted/50 text-muted-foreground"
                        )}
                      >
                        {isSlaBreached ? (
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>
                          {isSlaBreached ? `SLA Excedido (${hoursElapsed}h)` : `SLA: ${hoursElapsed}h / ${slaHours}h`}
                        </span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-foreground tracking-tight line-clamp-1">
                    {ticket.title}
                  </h3>

                  {ticket.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {ticket.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-0.5">
                    <span>
                      Reportado hace {formatDistanceToNow(createdAtDate, { locale: es })}
                    </span>
                    {totalComments > 0 && (
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <MessageSquare className="w-3 h-3 text-primary" />
                        {totalComments} {totalComments === 1 ? "mensaje" : "mensajes"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Section: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-start md:self-center flex-wrap">
                  {/* CTA Hilo de Mensajes */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenDetailModal(ticket)}
                    className={cn(
                      "h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 transition-all cursor-pointer",
                      unreadComments > 0
                        ? "bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/40 shadow-xs"
                        : totalComments > 0
                        ? "bg-card hover:bg-muted/70 text-foreground border-border/80 hover:border-border"
                        : "bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-foreground border-border/60"
                    )}
                  >
                    {unreadComments > 0 ? (
                      <>
                        <MessageSquare className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        <span>Mensaje nuevo</span>
                      </>
                    ) : totalComments > 0 ? (
                      <>
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Ver Hilo</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/70" />
                        <span>Responder</span>
                      </>
                    )}
                  </Button>

                  {!isResolved && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickResolve(ticket.id)}
                        disabled={resolvingId === ticket.id}
                        className="h-8 text-xs gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Resolver</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => onPromoteTicket(ticket)}
                        className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs font-semibold cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Promover a Ticket</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Dedicado para Soporte (Triaje, Conversacion, Adjuntos y Triaje Limpio) */}
      {selectedTicketForDetail && (
        <TaskSupportTicketDetailModal
          ticket={selectedTicketForDetail}
          isOpen={!!selectedTicketForDetail}
          onClose={() => setSelectedTicketForDetail(null)}
          token={token}
          isLeadOrPm={true}
          currentStaffId={currentStaffId}
          workspace={selectedTicketWorkspace}
          onStatusChange={handleStatusChangeInternal}
          onPromoteTicket={onPromoteTicket}
          onTicketUpdated={(updated) => {
            setSelectedTicketForDetail(updated)
          }}
          teamMembers={teamMembers}
          brandColor={brandColor}
        />
      )}
    </div>
  )
}
