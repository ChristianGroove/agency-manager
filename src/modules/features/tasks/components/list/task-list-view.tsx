"use client"

import React, { useState, useMemo, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Clock,
  Layers,
  ChevronRight,
  ChevronLeft,
  Ban,
  Timer,
  Video,
  MapPin,
  CheckSquare,
  Users,
  Calendar,
  UserX,
  CheckCircle2,
  Lock,
} from "lucide-react"
import type { TaskItem, TaskStatus, TaskPriority } from "../../types"
import { SYSTEM_STAGE_TAGS } from "../../types"
import { getMeetingModalityBadgeLabel } from "../../utils/recurrence-utils"
import { cn } from "@/modules/infrastructure/utils/utils"
import { TaskSubtasksTooltipBadge } from "../shared/task-subtasks-tooltip-badge"
import { TaskMeetingViewToggle } from "../shared/task-meeting-view-toggle"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"

function isMeetingPast(task: TaskItem): boolean {
  if (task.status === "done") return true
  if (!task.meeting_start_at) return false
  const start = new Date(task.meeting_start_at).getTime()
  if (isNaN(start)) return false
  const durationMs = (task.meeting_duration_minutes || 60) * 60 * 1000
  const end = start + durationMs
  return Date.now() > end
}

function isMeetingLive(task: TaskItem): boolean {
  if (task.status === "done" || !task.meeting_start_at) return false
  const start = new Date(task.meeting_start_at).getTime()
  if (isNaN(start)) return false
  const durationMs = (task.meeting_duration_minutes || 60) * 60 * 1000
  const end = start + durationMs
  const now = Date.now()
  return now >= start && now <= end
}

function canJoinMeeting(task: TaskItem): boolean {
  if (!task.meeting_url || task.status === "done") return false
  if (isMeetingPast(task)) return false
  if (!task.meeting_start_at) return true
  const start = new Date(task.meeting_start_at).getTime()
  if (isNaN(start)) return true
  const fiveMinBefore = start - 5 * 60 * 1000
  return Date.now() >= fiveMinBefore
}

function formatMeetingDateSchedule(isoString?: string | null): string {
  if (!isoString) return ""
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return ""
    const today = new Date()
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear()

    const timeStr = d.toLocaleTimeString("es-ES", { hour: "numeric", minute: "2-digit", hour12: true })
    if (isToday) return `Hoy · ${timeStr}`
    if (isYesterday) return `Ayer · ${timeStr}`
    const dateStr = d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })
    return `${dateStr} · ${timeStr}`
  } catch {
    return ""
  }
}

interface TaskListViewProps {
  tasks: TaskItem[]
  onSelectTask: (task: TaskItem) => void
  onQuickMoveTask?: (taskId: string, newStatus: TaskStatus) => void
  teamMembers?: Array<{
    id: string
    first_name: string
    last_name?: string
  }>
  selectedTaskIds?: Set<string>
  onToggleSelectTask?: (taskId: string) => void
  onToggleSelectAll?: () => void
  includeMeetings?: boolean
  onIncludeMeetingsChange?: (include: boolean) => void
}

export function TaskListView({
  tasks,
  onSelectTask,
  onQuickMoveTask,
  teamMembers = [],
  selectedTaskIds = new Set(),
  onToggleSelectTask,
  onToggleSelectAll,
  includeMeetings: controlledIncludeMeetings,
  onIncludeMeetingsChange,
}: TaskListViewProps) {
  const [pageSize, setPageSize] = useState<number>(25)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [internalIncludeMeetings, setInternalIncludeMeetings] = useState<boolean>(false)

  const isControlled = controlledIncludeMeetings !== undefined
  const includeMeetings = isControlled ? controlledIncludeMeetings : internalIncludeMeetings

  const toggleIncludeMeetings = () => {
    const nextVal = !includeMeetings
    if (onIncludeMeetingsChange) {
      onIncludeMeetingsChange(nextVal)
    }
    if (!isControlled) {
      setInternalIncludeMeetings(nextVal)
    }
  }

  const ticketCount = useMemo(() => tasks.filter((t) => t.type !== "meeting").length, [tasks])
  const meetingCount = useMemo(() => tasks.filter((t) => t.type === "meeting").length, [tasks])

  const visibleTasks = useMemo(() => {
    if (includeMeetings) return tasks.filter((t) => t.type === "meeting")
    return tasks.filter((t) => t.type !== "meeting")
  }, [tasks, includeMeetings])

  // Reset to page 1 whenever filter or task list size changes
  useEffect(() => {
    setCurrentPage(1)
  }, [visibleTasks.length])

  const totalPages = Math.max(1, Math.ceil(visibleTasks.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)

  const paginatedTasks = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return visibleTasks.slice(start, start + pageSize)
  }, [visibleTasks, safePage, pageSize])

  const startRecord = visibleTasks.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endRecord = Math.min(safePage * pageSize, visibleTasks.length)
  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case "backlog":
        return "Backlog"
      case "todo":
        return "Por Hacer"
      case "in_progress":
        return "En Progreso"
      case "in_review":
        return "Revisión / QA"
      case "done":
        return "Completado"
      case "blocked":
        return "Bloqueado"
      default:
        return status
    }
  }

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "urgent":
        return (
          <Badge className="w-16 justify-center text-center bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[10px] font-semibold shadow-none">
            Urgente
          </Badge>
        )
      case "high":
        return (
          <Badge className="w-16 justify-center text-center bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold shadow-none">
            Alta
          </Badge>
        )
      case "medium":
        return (
          <Badge variant="outline" className="w-16 justify-center text-center bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] font-medium shadow-none">
            Media
          </Badge>
        )
      case "low":
        return (
          <Badge variant="outline" className="w-16 justify-center text-center text-muted-foreground/70 border-border/40 text-[10px] font-medium shadow-none">
            Baja
          </Badge>
        )
      default:
        return null
    }
  }

  const allSelected = visibleTasks.length > 0 && visibleTasks.every((t) => selectedTaskIds.has(t.id))
  const isIndeterminate = !allSelected && visibleTasks.some((t) => selectedTaskIds.has(t.id))

  return (
    <div className="space-y-3">
      {/* Control opcional de alternancia de reuniones (cuando no esté controlado por la barra superior) */}
      {!isControlled && (meetingCount > 0 || includeMeetings) && (
        <div className="flex items-center justify-end">
          <TaskMeetingViewToggle
            includeMeetings={includeMeetings}
            size="sm"
            onToggle={toggleIncludeMeetings}
          />
        </div>
      )}

      {/* Tasks Table */}
      <div className="border border-border/60 rounded-2xl bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-semibold">
                {onToggleSelectAll && (
                  <th className="p-3.5 pl-4 w-10 text-center">
                    <Checkbox
                      checked={isIndeterminate ? "indeterminate" : allSelected}
                      onCheckedChange={() => onToggleSelectAll()}
                      aria-label="Seleccionar todas las tareas"
                    />
                  </th>
                )}
                <th className={cn("p-3.5 w-24", !onToggleSelectAll && "pl-4")}>Ticket</th>
                <th className="p-3.5">Título</th>
                <th className="p-3.5 w-32">Estado</th>
                {!includeMeetings && <th className="p-3.5 w-24">Prioridad</th>}
                {!includeMeetings && <th className="p-3.5 w-36">Progreso</th>}
                <th className="p-3.5 w-28 text-right">
                  <span>Tiempo</span>
                </th>
                {!includeMeetings && <th className="p-3.5 w-40">Asignado</th>}
                {!includeMeetings && <th className="p-3.5 w-28">Fecha límite</th>}
                <th className="p-3.5 w-20 text-right pr-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {visibleTasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={(onToggleSelectTask ? 1 : 0) + 5 + (!includeMeetings ? 4 : 0)}
                    className="p-8 text-center text-muted-foreground"
                  >
                    {includeMeetings
                      ? "No se encontraron reuniones con los filtros seleccionados."
                      : "No se encontraron tareas con los filtros seleccionados."}
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => {
                  const isSelected = selectedTaskIds.has(task.id)
                  return (
                    <tr
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      className={cn(
                        "hover:bg-muted/30 transition-colors cursor-pointer group",
                        isSelected && "bg-primary/5 dark:bg-primary/10"
                      )}
                    >
                      {onToggleSelectTask && (
                        <td
                          className="p-3.5 pl-4 w-10 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onToggleSelectTask(task.id)}
                            aria-label={`Seleccionar tarea ${task.ticket_code}`}
                          />
                        </td>
                      )}
                      <td className={cn("p-3.5 whitespace-nowrap", !onToggleSelectTask && "pl-4")}>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono text-xs font-bold rounded-lg px-2.5 py-1 whitespace-nowrap shrink-0 tracking-wide min-w-[70px] inline-flex items-center justify-center shadow-xs",
                              task.type === "meeting"
                                ? "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700"
                                : "text-primary bg-primary/10 border border-primary/25"
                            )}
                          >
                            {task.type === "meeting"
                              ? (task.ticket_code?.startsWith("MTG-") ? task.ticket_code : task.ticket_code?.replace(/^[A-Za-z]+-/, "MTG-"))
                              : task.ticket_code}
                          </Badge>
                        </div>
                      </td>
                    <td className="p-3.5 font-medium">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {task.type === "meeting" ? (
                            <>
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-100/90 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 inline-flex items-center gap-1.5 shrink-0">
                                {task.meeting_modality === "in_person" ? (
                                  <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                                ) : (
                                  <Video className="w-3 h-3 text-zinc-500 shrink-0" />
                                )}
                                <span>{getMeetingModalityBadgeLabel(task)}</span>
                              </span>
                              <span className={cn(
                                "font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1",
                                includeMeetings ? "max-w-none" : ""
                              )}>
                                {task.title}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className={cn(
                                "font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1",
                                includeMeetings ? "max-w-none" : ""
                              )}>
                                {task.title}
                              </span>
                              <TaskSubtasksTooltipBadge
                                checklist={task.checklist}
                                teamMembers={teamMembers}
                                taskType={task.type}
                                onClick={() => onSelectTask(task)}
                              />
                              {task.tags && task.tags.length > 0 && (
                                <div className="flex items-center gap-1 shrink-0">
                                  {task.tags.map((tag) => {
                                    const sysTag = SYSTEM_STAGE_TAGS[tag]
                                    if (sysTag) {
                                      return (
                                        <span
                                          key={tag}
                                          className={cn(
                                            "text-[9px] font-bold px-1.5 py-0.5 rounded-md border",
                                            sysTag.badgeClass
                                          )}
                                        >
                                          {sysTag.shortLabel || sysTag.label}
                                        </span>
                                      )
                                    }
                                    return (
                                      <span
                                        key={tag}
                                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md border border-border/80 bg-secondary/80 text-secondary-foreground"
                                      >
                                        #{tag}
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                          {task.project && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Layers className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span>{task.project.name}</span>
                            </span>
                          )}
                          {task.type === "meeting" && task.meeting_start_at && (
                            <>
                              {task.project && <span className="text-zinc-300 dark:text-zinc-700">·</span>}
                              <span className="flex items-center gap-1 text-foreground/80 font-medium">
                                <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span>{formatMeetingDateSchedule(task.meeting_start_at)}</span>
                              </span>
                            </>
                          )}
                          {task.type === "meeting" && (
                            <>
                              <span className="text-zinc-300 dark:text-zinc-700">·</span>
                              <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
                                <Users className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span>
                                  {Array.isArray(task.meeting_attendees) && task.meeting_attendees.length > 0
                                    ? `${task.meeting_attendees.length} convocado${task.meeting_attendees.length === 1 ? "" : "s"}`
                                    : "Toda la empresa"}
                                </span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                      {task.type === "meeting" ? (
                        isMeetingLive(task) ? (
                          <Badge
                            variant="outline"
                            className="h-6 w-24 justify-center text-center rounded-lg font-semibold shadow-none bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 inline-flex items-center gap-1 text-[10px]"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>En Vivo</span>
                          </Badge>
                        ) : isMeetingPast(task) ? (
                          <Badge
                            variant="outline"
                            className="h-6 w-24 justify-center text-center rounded-lg font-semibold shadow-none bg-zinc-100 dark:bg-zinc-800/90 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 inline-flex items-center gap-1 text-[10px]"
                          >
                            <UserX className="w-2.5 h-2.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                            <span>Finalizada</span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="h-6 w-24 justify-center text-center rounded-lg font-semibold shadow-none bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 inline-flex items-center gap-1 text-[10px]"
                          >
                            <Clock className="w-2.5 h-2.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                            <span>Programada</span>
                          </Badge>
                        )
                      ) : task.status === "blocked" ? (
                        <TooltipProvider delayDuration={1000}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-block cursor-help">
                                {onQuickMoveTask ? (
                                  <Select
                                    value={task.status}
                                    onValueChange={(val: TaskStatus) => onQuickMoveTask(task.id, val)}
                                  >
                                    <SelectTrigger className="h-7 w-[108px] text-xs font-semibold rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-none px-2 focus:ring-0 hover:bg-rose-500/20 transition-colors">
                                      <div className="flex items-center gap-1.5 truncate">
                                        <Ban className="w-3 h-3 shrink-0" />
                                        <span>Bloqueado</span>
                                      </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="backlog">Backlog</SelectItem>
                                      <SelectItem value="todo">Por Hacer</SelectItem>
                                      <SelectItem value="in_progress">En Progreso</SelectItem>
                                      <SelectItem value="in_review" disabled={Boolean(task.blocked_by && task.blocked_by.status !== "done")}>
                                        Revisión / QA {task.blocked_by && task.blocked_by.status !== "done" ? "(Bloqueado)" : ""}
                                      </SelectItem>
                                      <SelectItem value="blocked">Bloqueado</SelectItem>
                                      <SelectItem value="done" disabled={Boolean(task.blocked_by && task.blocked_by.status !== "done")}>
                                        Completado {task.blocked_by && task.blocked_by.status !== "done" ? "(Bloqueado)" : ""}
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] w-24 justify-center text-center py-0.5 rounded-lg font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 inline-flex items-center gap-1"
                                  >
                                    <Ban className="w-2.5 h-2.5 shrink-0" />
                                    <span>Bloqueado</span>
                                  </Badge>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-[300px] p-3 rounded-xl border border-border/80 bg-popover/95 text-popover-foreground shadow-xl backdrop-blur-md space-y-1.5"
                            >
                              <div className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400 text-xs">
                                <Ban className="w-3.5 h-3.5 shrink-0" />
                                <span>Motivo del Bloqueo</span>
                              </div>
                              <p className="text-xs text-foreground/90 font-normal leading-relaxed whitespace-pre-wrap">
                                {task.blocked_reason || (task.blocked_by ? `Bloqueado por dependencia #${task.blocked_by.ticket_code}: ${task.blocked_by.title}` : "Esta tarea se encuentra bloqueada.")}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : onQuickMoveTask ? (
                        <Select
                          value={task.status}
                          onValueChange={(val: TaskStatus) => onQuickMoveTask(task.id, val)}
                        >
                          <SelectTrigger className="h-7 w-[120px] text-xs font-normal border-transparent bg-transparent hover:bg-muted/50 transition-colors shadow-none px-1.5 focus:ring-0">
                            <SelectValue placeholder="Estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="backlog">Backlog</SelectItem>
                            <SelectItem value="todo">Por Hacer</SelectItem>
                            <SelectItem value="in_progress">En Progreso</SelectItem>
                            <SelectItem value="in_review" disabled={Boolean(task.blocked_by && task.blocked_by.status !== "done")}>
                              Revisión / QA {task.blocked_by && task.blocked_by.status !== "done" ? "(Bloqueado)" : ""}
                            </SelectItem>
                            <SelectItem value="blocked">Bloqueado</SelectItem>
                            <SelectItem value="done" disabled={Boolean(task.blocked_by && task.blocked_by.status !== "done")}>
                              Completado {task.blocked_by && task.blocked_by.status !== "done" ? "(Bloqueado)" : ""}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-foreground px-1.5">
                          {getStatusLabel(task.status)}
                        </span>
                      )}
                    </td>
                    {!includeMeetings && (
                      <td className="p-3.5">
                        {getPriorityBadge(task.priority)}
                      </td>
                    )}
                    {!includeMeetings && (
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs sm:text-[13px]">
                            <span className="font-mono font-bold text-foreground">
                              {task.progress_percentage}%
                            </span>
                          </div>
                          <Progress value={task.progress_percentage} className="h-1.5 w-28" />
                        </div>
                      </td>
                    )}
                    <td className="p-3.5 text-right font-mono whitespace-nowrap">
                      {task.type === "meeting" ? (
                        <span className="text-xs font-semibold text-foreground">
                          {task.meeting_duration_minutes || 30} min
                        </span>
                      ) : (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={cn(
                            "text-xs font-semibold",
                            Number(task.actual_hours) > Number(task.estimated_hours) && Number(task.estimated_hours) > 0
                              ? "text-rose-600 dark:text-rose-400 font-bold"
                              : "text-foreground"
                          )}>
                            {Number(task.actual_hours) || 0}h
                            <span className="text-muted-foreground font-normal text-[11px]"> / {Number(task.estimated_hours) || 0}h</span>
                          </span>
                          {Number(task.estimated_hours) > 0 && (
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.2 rounded font-mono font-medium",
                              Number(task.actual_hours) > Number(task.estimated_hours)
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold"
                                : Number(task.actual_hours) === Number(task.estimated_hours)
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground"
                            )}>
                              {Math.round(((Number(task.actual_hours) || 0) / Number(task.estimated_hours)) * 100)}%
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    {!includeMeetings && (
                      <td className="p-3.5">
                        {task.assigned_staff ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="w-5 h-5">
                              <AvatarImage src={task.assigned_staff.photo_url || undefined} />
                              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                {task.assigned_staff.first_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground line-clamp-1">
                              {task.assigned_staff.first_name} {task.assigned_staff.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 italic">Sin asignar</span>
                        )}
                      </td>
                    )}
                    {!includeMeetings && (
                      <td className="p-3.5 font-mono text-muted-foreground">
                        {task.due_date ? (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(task.due_date).toLocaleDateString("es-ES", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    )}
                    <td className="p-3.5 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {task.type === "meeting" && task.meeting_url && !isMeetingPast(task) && (
                          canJoinMeeting(task) ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                window.open(task.meeting_url!, "_blank")
                              }}
                              className="h-7 px-2.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                            >
                              <Video className="w-3 h-3" />
                              <span>Unirme</span>
                            </Button>
                          ) : (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-block">
                                    <Button
                                      size="sm"
                                      disabled
                                      className="h-7 px-2.5 text-xs bg-muted text-muted-foreground opacity-60 cursor-not-allowed font-medium rounded-lg shadow-none flex items-center gap-1.5"
                                    >
                                      <Video className="w-3 h-3" />
                                      <span>Unirme</span>
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <span>Disponible 5 min antes del inicio</span>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onSelectTask(task)}
                          className="w-7 h-7 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {visibleTasks.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-card border border-border/60 rounded-2xl text-xs text-muted-foreground shadow-xs">
          <div className="flex items-center gap-2">
            <span>
              Mostrando <strong className="text-foreground font-semibold">{startRecord}</strong> - <strong className="text-foreground font-semibold">{endRecord}</strong> de{" "}
              <strong className="text-foreground font-semibold">{visibleTasks.length}</strong> {includeMeetings ? (visibleTasks.length === 1 ? "reunión" : "reuniones") : (visibleTasks.length === 1 ? "tarea" : "tareas")}
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
                <SelectTrigger className="h-7 w-[72px] text-xs font-semibold rounded-lg bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="px-2 text-[11px] font-mono font-medium text-foreground">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
