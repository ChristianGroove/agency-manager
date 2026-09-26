"use client"

import React, { useState, useEffect, useTransition } from "react"
import {
  Video,
  Users,
  Clock,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  XCircle,
  AlertCircle,
  Lock,
  UserCheck,
  ChevronDown,
  Loader2,
  CalendarDays,
  Repeat,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type {
  TaskItem,
  TaskMeetingAttendee,
  TaskMeetingAttendanceStatus,
  TaskMeetingCheckinMethod,
} from "../../types"
import {
  getMeetingAttendanceWindowStatus,
  isStaffLeadOrPmRole,
  ensureAbsoluteUrl,
} from "../../types"
import { formatRecurrenceLabel } from "../../utils/recurrence-utils"
import {
  registerMeetingAttendance,
  updateMeetingAttendeeStatus,
  completeMeetingSession,
} from "../../actions/task-actions"
import {
  portalCompleteMeetingSession,
} from "../../actions/collaborator-portal-actions"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"

interface TaskMeetingConsoleProps {
  task: TaskItem
  currentStaffId?: string | null
  isLeadOrPm?: boolean
  portalToken?: string
  onTaskUpdated?: (updatedTask: TaskItem) => void
  readOnly?: boolean
}

export function TaskMeetingConsole({
  task,
  currentStaffId,
  isLeadOrPm = false,
  portalToken,
  onTaskUpdated,
  readOnly = false,
}: TaskMeetingConsoleProps) {
  const [isPending, startTransition] = useTransition()
  const [actionLoadingStaffId, setActionLoadingStaffId] = useState<string | null>(null)

  const attendees: TaskMeetingAttendee[] = Array.isArray(task.meeting_attendees)
    ? task.meeting_attendees
    : []

  const durationMinutes = task.meeting_duration_minutes || 30
  const durationHours = durationMinutes / 60

  const windowStatus = getMeetingAttendanceWindowStatus(
    task.meeting_start_at,
    durationMinutes
  )

  const scheduledEndMs = task.meeting_start_at
    ? new Date(task.meeting_start_at).getTime() + durationMinutes * 60 * 1000
    : null
  const isMeetingTimePassed = Boolean(scheduledEndMs && Date.now() > scheduledEndMs)
  const isPastMeeting = task.status === "done" || isMeetingTimePassed

  // Mensaje y estilo contextual de la ventana de asistencia
  const bannerMessage = windowStatus.message

  const currentAttendee = currentStaffId
    ? attendees.find((a) => a.staff_id === currentStaffId)
    : null

  const isCurrentAttendeePresent = currentAttendee?.status === "attended"

  // Manejador de autoregistro de asistencia
  const handleSelfAttendance = (method: TaskMeetingCheckinMethod = "manual_checkin") => {
    // 1. Si la sesión ya concluyó formalmente, solo permitir abrir videollamada sin registrar
    if (task.status === "done") {
      if (task.meeting_url) {
        window.open(ensureAbsoluteUrl(task.meeting_url), "_blank", "noopener,noreferrer")
      }
      return
    }

    // 2. Si la ventana aún no abre, bloquear acceso anticipado (SIN abrir videollamada)
    if (windowStatus.isBefore) {
      toast.warning(windowStatus.message)
      return
    }

    if (!windowStatus.isOpen && !isLeadOrPm) {
      toast.warning(windowStatus.message)
      return
    }

    // 3. Abrir enlace de videollamada únicamente si la ventana está abierta
    if (method === "link_click" && task.meeting_url) {
      window.open(ensureAbsoluteUrl(task.meeting_url), "_blank", "noopener,noreferrer")
    }

    // 4. Si ya se registró asistencia previamente, no duplicar mutaciones
    if (isCurrentAttendeePresent) {
      return
    }

    if (!currentStaffId) {
      toast.error("Identificador de usuario no disponible para registrar asistencia")
      return
    }

    setActionLoadingStaffId(currentStaffId)
    startTransition(async () => {
      try {
        const res = await registerMeetingAttendance({
          taskId: task.id,
          staffId: currentStaffId,
          method,
          isPmOverride: false, // Auto-registro nunca debe saltarse la ventana anticipadamente
          token: portalToken,
        })

        if (res.success && res.task) {
          toast.success(`Asistencia confirmada. Se acreditaron ${durationHours}h en tu reporte.`)
          onTaskUpdated?.(res.task)
        } else {
          toast.error(res.error || "No se pudo registrar la asistencia")
        }
      } catch (err: any) {
        toast.error(err.message || "Error al registrar asistencia")
      } finally {
        setActionLoadingStaffId(null)
      }
    })
  }

  // Manejador de cambio de estado en pase de lista por el PM
  const handlePmRollCall = (staffId: string, status: TaskMeetingAttendanceStatus) => {
    setActionLoadingStaffId(staffId)
    startTransition(async () => {
      try {
        const res = await updateMeetingAttendeeStatus({
          taskId: task.id,
          staffId,
          status,
          token: portalToken,
        })

        if (res.success && res.task) {
          const statusLabels: Record<TaskMeetingAttendanceStatus, string> = {
            attended: "Presente",
            excused: "Justificado",
            absent: "Ausente",
            pending: "Pendiente",
          }
          toast.success(`Asistente actualizado a: ${statusLabels[status]}`)
          onTaskUpdated?.(res.task)
        } else {
          toast.error(res.error || "No se pudo actualizar el estado")
        }
      } catch (err: any) {
        toast.error(err.message || "Error al actualizar estado del asistente")
      } finally {
        setActionLoadingStaffId(null)
      }
    })
  }

  // Manejador para concluir sesion formalmente por el PM
  const handleCompleteSession = () => {
    startTransition(async () => {
      try {
        const res = portalToken
          ? await portalCompleteMeetingSession(portalToken, task.id)
          : await completeMeetingSession({
              taskId: task.id,
              concludedByStaffId: currentStaffId || undefined,
            })

        if (res.success && res.task) {
          toast.success("Sesión concluida. Ticket marcado como completado.")
          onTaskUpdated?.(res.task)
        } else {
          toast.error(res.error || "No se pudo concluir la sesión")
        }
      } catch (err: any) {
        toast.error(err.message || "Error al concluir la sesión")
      }
    })
  }

  const ATTENDEE_STATUS_LABELS: Record<TaskMeetingAttendanceStatus, string> = {
    attended: "Presente",
    pending: "Pendiente",
    excused: "Justificado",
    absent: "Ausente",
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-muted/40 to-muted/10 p-4 sm:p-5 space-y-4 shadow-xs">
      {/* Barra superior de la consola: Control de Asistencia y estado/acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Control de Asistencia
            </span>
            {task.is_recurring && (
              <Badge variant="secondary" className="text-[10px] font-mono font-medium">
                {formatRecurrenceLabel(task.recurrence_interval, task.recurrence_days)}
              </Badge>
            )}
          </div>
        </div>

        {/* Acciones principales y estado */}
        {!readOnly && (
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Texto de asistencia registrada */}
            {isCurrentAttendeePresent && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 mr-1 select-none">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Asistencia registrada ({durationHours}h)</span>
              </span>
            )}

            {/* Estado cuando la sesión ya concluyó o el tiempo ya expiró */}
            {(task.status === "done" || isPastMeeting) && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                <span>Sesión Concluida</span>
              </div>
            )}

            {/* Si la reunión es ACTIVA o FUTURA (!isPastMeeting && task.status !== "done") */}
            {!isPastMeeting && task.status !== "done" && (
              <>
                {/* Botón para concluir sesión del PM si está en vivo */}
                {isLeadOrPm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCompleteSession}
                    disabled={isPending}
                    className="h-8 px-3 rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs font-semibold cursor-pointer shadow-2xs"
                    title="Finalizar la reunión anticipadamente y marcar el ticket como completado"
                  >
                    {isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                    )}
                    Concluir
                  </Button>
                )}

                {/* Botón Unirme para reuniones virtuales activas */}
                {task.meeting_url && (
                  <Button
                    size="sm"
                    onClick={() => handleSelfAttendance("link_click")}
                    disabled={
                      isPending ||
                      actionLoadingStaffId === currentStaffId ||
                      windowStatus.isBefore ||
                      (!windowStatus.isOpen && !isLeadOrPm)
                    }
                    title={
                      windowStatus.isBefore || (!windowStatus.isOpen && !isLeadOrPm)
                        ? windowStatus.message
                        : undefined
                    }
                    className={cn(
                      "h-8 px-3.5 rounded-xl font-medium text-xs shadow-xs cursor-pointer",
                      windowStatus.isBefore || (!windowStatus.isOpen && !isLeadOrPm)
                        ? "opacity-60 cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    {actionLoadingStaffId === currentStaffId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Video className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {isCurrentAttendeePresent ? "Entrar" : "Unirme"}
                    <ExternalLink className="w-3 h-3 ml-1.5 opacity-70" />
                  </Button>
                )}

                {/* Botón de auto-registro presencial */}
                {!task.meeting_url && currentStaffId && !isCurrentAttendeePresent && (
                  <Button
                    size="sm"
                    onClick={() => handleSelfAttendance("manual_checkin")}
                    disabled={
                      isPending ||
                      (!windowStatus.isOpen && !isLeadOrPm) ||
                      actionLoadingStaffId === currentStaffId
                    }
                    className="h-8 px-3.5 rounded-xl text-xs font-medium cursor-pointer shadow-2xs bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {actionLoadingStaffId === currentStaffId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Confirmar Asistencia
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Indicador de ventana de asistencia (únicamente cuando la sesión NO está concluida ni pasada) */}
      {task.status !== "done" && !isPastMeeting && (
        <div
          className={cn(
            "px-3.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2 border",
            windowStatus.isOpen
              ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
              : windowStatus.isBefore
              ? "bg-blue-500/5 border-blue-500/20 text-blue-800 dark:text-blue-300"
              : "bg-amber-500/5 border-amber-500/20 text-amber-800 dark:text-amber-300"
          )}
        >
          <div className="flex items-center gap-2">
            {windowStatus.isOpen ? (
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : windowStatus.isBefore ? (
              <CalendarDays className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <span className="font-medium text-[11px] sm:text-xs">
              {bannerMessage}
            </span>
          </div>

          {isLeadOrPm && (
            <span className="text-[10px] font-mono text-muted-foreground uppercase shrink-0">
              Control de PM Activo
            </span>
          )}
        </div>
      )}

      {/* Seccion de convocados y pase de lista */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Convocados & Asistencia ({attendees.length})
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              {attendees.filter((a) => a.status === "attended").length} Presentes
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />
              {attendees.filter((a) => a.status === "pending").length} Pendientes
            </span>
            {attendees.some((a) => a.status === "excused") && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                {attendees.filter((a) => a.status === "excused").length} Justificados
              </span>
            )}
          </div>
        </div>

        {attendees.length === 0 ? (
          <div className="py-3 px-4 rounded-xl border border-dashed border-border/70 text-center text-xs text-muted-foreground bg-muted/10">
            Sin colaboradores convocados específicamente. El equipo del proyecto puede asistir libremente.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {attendees.map((attendee) => {
              const staff = attendee.staff
              const fullName = staff ? `${staff.first_name} ${staff.last_name}` : "Colaborador"
              const isCurrentUser = currentStaffId === attendee.staff_id
              const isLoading = actionLoadingStaffId === attendee.staff_id

              return (
                <div
                  key={attendee.staff_id}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs",
                    attendee.status === "attended"
                      ? "bg-emerald-500/5 border-emerald-500/25"
                      : attendee.status === "excused"
                      ? "bg-amber-500/5 border-amber-500/25"
                      : attendee.status === "absent"
                      ? "bg-rose-500/5 border-rose-500/25"
                      : "bg-background border-border/70",
                    isCurrentUser && "ring-1 ring-primary/40"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                    <Avatar className="w-7 h-7 rounded-lg shrink-0 border border-border/60">
                      <AvatarImage src={getCollaboratorAvatar(staff?.photo_url, staff?.first_name || "C")} />
                      <AvatarFallback className="text-[10px] font-bold">
                        {staff?.first_name?.[0] || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate text-[11px] leading-tight">
                        {fullName}
                        {isCurrentUser && (
                          <span className="ml-1 text-[10px] text-primary font-normal">(Tú)</span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate leading-tight capitalize mt-0.5">
                        {staff?.role || "Colaborador"}
                      </p>
                    </div>
                  </div>

                  {/* Estado y menu desplegable de pase de lista */}
                  <div className="shrink-0">
                    {isLeadOrPm && !readOnly ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            disabled={isLoading}
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer",
                              attendee.status === "attended"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                : attendee.status === "excused"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                                : attendee.status === "absent"
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
                                : "bg-muted text-muted-foreground border-border/80 hover:bg-muted/80"
                            )}
                          >
                            {isLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : attendee.status === "attended" ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            ) : attendee.status === "excused" ? (
                              <ShieldCheck className="w-3 h-3 text-amber-500" />
                            ) : attendee.status === "absent" ? (
                              <XCircle className="w-3 h-3 text-rose-500" />
                            ) : (
                              <Clock className="w-3 h-3 text-muted-foreground" />
                            )}
                            <span className="font-semibold">{ATTENDEE_STATUS_LABELS[attendee.status] || attendee.status}</span>
                            <ChevronDown className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 text-xs">
                          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Pase de Lista
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handlePmRollCall(attendee.staff_id, "attended")}
                            className="text-emerald-600 dark:text-emerald-400 cursor-pointer text-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                            Presente ({durationHours}h)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handlePmRollCall(attendee.staff_id, "excused")}
                            className="text-amber-600 dark:text-amber-400 cursor-pointer text-xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 mr-2" />
                            Justificado
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handlePmRollCall(attendee.staff_id, "absent")}
                            className="text-rose-600 dark:text-rose-400 cursor-pointer text-xs"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-2" />
                            Ausente
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handlePmRollCall(attendee.staff_id, "pending")}
                            className="cursor-pointer text-xs text-muted-foreground"
                          >
                            <Clock className="w-3.5 h-3.5 mr-2" />
                            Pendiente
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border",
                          attendee.status === "attended"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                            : attendee.status === "excused"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                            : attendee.status === "absent"
                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                            : "bg-muted text-muted-foreground border-border/80"
                        )}
                      >
                        {attendee.status === "attended" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                        {attendee.status === "excused" && <ShieldCheck className="w-3 h-3 text-amber-500" />}
                        {attendee.status === "absent" && <XCircle className="w-3 h-3 text-rose-500" />}
                        {attendee.status === "pending" && <Clock className="w-3 h-3 text-muted-foreground" />}
                        <span>{ATTENDEE_STATUS_LABELS[attendee.status] || attendee.status}</span>
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
