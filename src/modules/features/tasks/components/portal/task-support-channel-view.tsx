"use client"

import React, { useState, useMemo } from "react"
import {
  Headset,
  Search,
  Filter,
  ArrowUpRight,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Inbox,
  Send,
  Building,
  Calendar,
  User,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import type { TaskItem, TaskWorkspace, TaskProject, TaskPriority } from "../../types"

interface TaskSupportChannelViewProps {
  supportTickets: TaskItem[]
  workspaces: TaskWorkspace[]
  projects: TaskProject[]
  onPromoteTicket: (ticket: TaskItem) => void
  onViewTicket: (ticket: TaskItem) => void
  onResolveTicket: (ticketId: string) => Promise<void>
  brandColor?: string
}

export function TaskSupportChannelView({
  supportTickets,
  workspaces,
  projects,
  onPromoteTicket,
  onViewTicket,
  onResolveTicket,
  brandColor = "#0284c7",
}: TaskSupportChannelViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "received" | "in_progress" | "resolved">("all")
  const [resolvingId, setResolvingId] = useState<string | null>(null)

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
  }, [supportTickets, selectedWorkspaceId, statusFilter, searchQuery, projectWorkspaceMap])

  // Metric counts
  const totalCount = supportTickets.length
  const receivedCount = supportTickets.filter((t) => t.status === "backlog" || t.status === "todo").length
  const inProgressCount = supportTickets.filter(
    (t) => t.status === "in_progress" || t.status === "in_review" || t.status === "blocked"
  ).length
  const resolvedCount = supportTickets.filter((t) => t.status === "done").length

  const handleQuickResolve = async (ticketId: string) => {
    setResolvingId(ticketId)
    try {
      await onResolveTicket(ticketId)
    } finally {
      setResolvingId(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header and KPI Ribbon */}
      <div className="p-6 rounded-2xl bg-card border border-border/70 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
              <Headset className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                Canal de Soporte e Incidencias
                <Badge variant="outline" className="text-[10px] uppercase font-mono px-2 py-0.5 bg-muted/40">
                  Equipo Paralelo
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                Bandeja centralizada de tickets reportados por servicio al cliente. Aislados de las métricas de desarrollo y sprints.
              </p>
            </div>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="px-3.5 py-2.5 rounded-xl border border-border/60 bg-muted/20 text-center">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total
            </span>
            <span className="text-lg font-bold text-foreground font-mono">{totalCount}</span>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl border border-sky-500/30 bg-sky-500/5 text-center">
            <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">
              Recibidos
            </span>
            <span className="text-lg font-bold text-sky-600 dark:text-sky-400 font-mono">
              {receivedCount}
            </span>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-center">
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              En Atención
            </span>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">
              {inProgressCount}
            </span>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-center">
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Resueltos
            </span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {resolvedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/60 shadow-2xs">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código, título, colaborador..."
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>

          {/* Workspace Filter */}
          <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
            <SelectTrigger className="h-8 text-xs bg-background w-[190px]">
              <SelectValue placeholder="Espacio..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Todos los Espacios
              </SelectItem>
              {supportEnabledWorkspaces.map((ws) => (
                <SelectItem key={ws.id} value={ws.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: ws.color || "#0284c7" }}
                    />
                    <span className="truncate">{ws.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Pill Switcher */}
        <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/50 shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              statusFilter === "all"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Todos ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("received")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              statusFilter === "received"
                ? "bg-background text-sky-600 dark:text-sky-400 shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Recibidos ({receivedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("in_progress")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              statusFilter === "in_progress"
                ? "bg-background text-amber-600 dark:text-amber-400 shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            En Atención ({inProgressCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("resolved")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              statusFilter === "resolved"
                ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Resueltos ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Ticket List */}
      {filteredTickets.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border/70 bg-card/40 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-center mx-auto text-muted-foreground">
            <Inbox className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">No hay tickets de soporte</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || selectedWorkspaceId !== "all" || statusFilter !== "all"
                ? "No se encontraron tickets con los filtros actuales."
                : "Los tickets reportados por los colaboradores del equipo de atención aparecerán aquí para revisión del PM."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTickets.map((ticket) => {
            const isResolved = ticket.status === "done"
            const isReceived = ticket.status === "backlog" || ticket.status === "todo"
            const wsId = projectWorkspaceMap.get(ticket.project_id)
            const ws = wsId ? workspaceMap.get(wsId) : null

            // SLA calculation
            const createdAtDate = parseISO(ticket.created_at)
            const hoursElapsed = differenceInHours(new Date(), createdAtDate)
            const slaHours = ws?.support_config?.sla_first_response_hours || 24
            const isSlaBreached = !isResolved && hoursElapsed > slaHours

            return (
              <div
                key={ticket.id}
                className={cn(
                  "p-4 rounded-2xl border transition-all bg-card flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-xs",
                  isResolved
                    ? "border-emerald-500/20 bg-emerald-500/5 opacity-80"
                    : isSlaBreached
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-border/60 hover:border-border"
                )}
              >
                {/* Left Section: Details */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                      {ticket.ticket_code}
                    </span>

                    {ws && (
                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: ws.color || "#0284c7" }}
                        />
                        <span>{ws.name}</span>
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

                    {/* Priority Badge */}
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.2 rounded font-semibold uppercase tracking-wider",
                        ticket.priority === "urgent"
                          ? "bg-red-500/10 text-red-600 border border-red-500/30"
                          : ticket.priority === "high"
                          ? "bg-orange-500/10 text-orange-600 border border-orange-500/30"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {ticket.priority}
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
                    {ticket.comments_count !== undefined && ticket.comments_count > 0 && (
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <MessageSquare className="w-3 h-3 text-primary" />
                        {ticket.comments_count} {ticket.comments_count === 1 ? "mensaje" : "mensajes"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Section: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewTicket(ticket)}
                    className="h-8 text-xs gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ver / Responder</span>
                  </Button>

                  {!isResolved && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickResolve(ticket.id)}
                        disabled={resolvingId === ticket.id}
                        className="h-8 text-xs gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Resolver</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => onPromoteTicket(ticket)}
                        className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs font-semibold"
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
    </div>
  )
}
