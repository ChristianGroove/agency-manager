"use client"

import React, { useState, useEffect, useMemo, useTransition } from "react"
import {
  Video,
  Clock,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TaskItem, TaskMeetingAttendee } from "../../types"
import { getMeetingAttendanceWindowStatus, ensureAbsoluteUrl } from "../../types"
import { registerMeetingAttendance } from "../../actions/task-actions"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"

interface TaskMeetingHeroWidgetProps {
  tasks: TaskItem[]
  allTeamTasks?: TaskItem[]
  currentStaffId?: string | null
  isLeadOrPm?: boolean
  portalToken?: string
  onOpenMeeting: (meeting: TaskItem) => void
  onMeetingUpdated?: (updated: TaskItem) => void
}

type MeetingStateKind = "live" | "soon" | "upcoming"

interface EvaluatedMeeting {
  meeting: TaskItem
  stateKind: MeetingStateKind
  startTime: Date | null
  durationMinutes: number
  minutesUntil: number
  minutesUntilOpen: number
  isAttended: boolean
  isWindowOpen: boolean
  isBefore: boolean
}

function formatMeetingSchedule(dateStr?: string | null): string {
  if (!dateStr) return "PROGRAMADA"
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return "PROGRAMADA"

  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()

  const rawTime = date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
  const timeStr = rawTime.replace(/\s*([ap])\.?\s*m\.?/i, " $1M").toUpperCase().trim()

  if (isToday) return `HOY · ${timeStr}`
  if (isTomorrow) return `MAÑANA · ${timeStr}`

  const dayName = date
    .toLocaleDateString("es-ES", { weekday: "short" })
    .replace(".", "")
    .toUpperCase()
  const dayNum = date.getDate()
  return `${dayName} ${dayNum} · ${timeStr}`
}

export function TaskMeetingHeroWidget({
  tasks,
  allTeamTasks,
  currentStaffId,
  isLeadOrPm = false,
  portalToken,
  onOpenMeeting,
  onMeetingUpdated,
}: TaskMeetingHeroWidgetProps) {
  const [now, setNow] = useState<Date>(() => new Date())
  const [isPending, startTransition] = useTransition()
  const [isExpandedManual, setIsExpandedManual] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Actualizador periodico cada 20 segundos para transiciones fluidas de cuenta regresiva y estado en vivo
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 20000)
    return () => clearInterval(timer)
  }, [])

  // Seleccion y clasificacion de la reunion mas relevante
  const candidate = useMemo<EvaluatedMeeting | null>(() => {
    const pool =
      isLeadOrPm && allTeamTasks && allTeamTasks.length > 0
        ? allTeamTasks
        : tasks

    // Filtrar reuniones activas
    const meetingTasks = pool.filter(
      (t) => t.type === "meeting" && t.status !== "done"
    )

    if (meetingTasks.length === 0) return null

    // Filtrar reuniones pertinentes al usuario actual si no es PM global
    const userMeetings = meetingTasks.filter((m) => {
      if (isLeadOrPm) return true
      if (currentStaffId && m.assigned_staff_id === currentStaffId) return true
      if (
        currentStaffId &&
        Array.isArray(m.meeting_attendees) &&
        m.meeting_attendees.some((a) => a.staff_id === currentStaffId)
      ) {
        return true
      }
      return false
    })

    const targetList = userMeetings.length > 0 ? userMeetings : (isLeadOrPm ? meetingTasks : [])
    if (targetList.length === 0) return null

    const nowTime = now.getTime()
    const evaluated: EvaluatedMeeting[] = []

    for (const m of targetList) {
      const attendees: TaskMeetingAttendee[] = Array.isArray(m.meeting_attendees)
        ? m.meeting_attendees
        : []
      const currentAttendee = currentStaffId
        ? attendees.find((a) => a.staff_id === currentStaffId)
        : null
      const isAttended = currentAttendee?.status === "attended"

      const durationMinutes = m.meeting_duration_minutes || 30
      const durationMs = durationMinutes * 60 * 1000

      // 1. Reunion flexible / ad-hoc sin horario programado: solo vive si esta explicitamente in_progress
      if (!m.meeting_start_at) {
        if (m.status === "in_progress") {
          evaluated.push({
            meeting: m,
            stateKind: "live",
            startTime: null,
            durationMinutes,
            minutesUntil: 0,
            minutesUntilOpen: 0,
            isAttended,
            isWindowOpen: true,
            isBefore: false,
          })
        }
        continue
      }

      const start = new Date(m.meeting_start_at)
      if (isNaN(start.getTime())) continue

      const startTimeMs = start.getTime()
      const endTimeMs = startTimeMs + durationMs

      const windowStatus = getMeetingAttendanceWindowStatus(
        m.meeting_start_at,
        durationMinutes,
        now
      )

      // Regla de Oro 1: Si la reunion ya concluyo (fin + ventana de gracia de 15m expiraron),
      // bajo NINGUNA circunstancia persiste en el dock (se descarta de inmediato para dar paso a la siguiente)
      if (windowStatus.isAfter || nowTime > endTimeMs + 15 * 60 * 1000) {
        continue
      }

      // Regla de Oro 2: Estado EN VIVO:
      // Ocurre durante la ventana activa: desde 2m antes del inicio hasta 15m posteriores al fin programado
      const isLiveNow =
        nowTime >= startTimeMs - 2 * 60 * 1000 &&
        nowTime <= endTimeMs + 15 * 60 * 1000

      if (isLiveNow) {
        evaluated.push({
          meeting: m,
          stateKind: "live",
          startTime: start,
          durationMinutes,
          minutesUntil: 0,
          minutesUntilOpen: 0,
          isAttended,
          isWindowOpen: windowStatus.isOpen,
          isBefore: false,
        })
        continue
      }

      // Regla de Oro 3: Estado COMIENZA PRONTO (< 60 minutos antes de iniciar)
      const msUntilStart = startTimeMs - nowTime
      const minutesUntil = Math.max(1, Math.round(msUntilStart / (60 * 1000)))

      if (msUntilStart > 0 && msUntilStart <= 60 * 60 * 1000) {
        evaluated.push({
          meeting: m,
          stateKind: "soon",
          startTime: start,
          durationMinutes,
          minutesUntil,
          minutesUntilOpen: windowStatus.minutesUntilOpen,
          isAttended,
          isWindowOpen: windowStatus.isOpen,
          isBefore: windowStatus.isBefore,
        })
        continue
      }

      // Regla de Oro 4: Estado PROXIMA (Futura, > 60 minutos antes de iniciar)
      if (msUntilStart > 60 * 60 * 1000) {
        evaluated.push({
          meeting: m,
          stateKind: "upcoming",
          startTime: start,
          durationMinutes,
          minutesUntil,
          minutesUntilOpen: windowStatus.minutesUntilOpen,
          isAttended,
          isWindowOpen: false,
          isBefore: true,
        })
      }
    }

    if (evaluated.length === 0) return null

    // Orden de prioridad:
    // Prioridad 1: "live" (en vivo)
    // Prioridad 2: "soon" (comienza en menos de 60m)
    // Prioridad 3: "upcoming" (proxima)
    const priorityWeight: Record<MeetingStateKind, number> = {
      live: 1,
      soon: 2,
      upcoming: 3,
    }

    evaluated.sort((a, b) => {
      const pDiff = priorityWeight[a.stateKind] - priorityWeight[b.stateKind]
      if (pDiff !== 0) return pDiff

      const timeA = a.startTime ? a.startTime.getTime() : 0
      const timeB = b.startTime ? b.startTime.getTime() : 0
      return timeA - timeB
    })

    return evaluated[0]
  }, [tasks, allTeamTasks, currentStaffId, isLeadOrPm, now])

  if (!candidate) {
    return null
  }

  const {
    meeting,
    stateKind,
    minutesUntil,
    minutesUntilOpen,
    isAttended,
    isWindowOpen,
    isBefore,
  } = candidate

  const handleJoinOrAttend = (e: React.MouseEvent) => {
    e.stopPropagation()

    // 1. Validar ventana de asistencia de manera estricta
    if (isBefore || !isWindowOpen) {
      toast.warning(
        `La ventana de asistencia abre 5 min antes del inicio programado (en ${minutesUntilOpen} min).`
      )
      return
    }

    // 2. Si no hay URL configurada en la reunion
    if (!meeting.meeting_url || !meeting.meeting_url.trim()) {
      toast.info(
        "Esta reunión no tiene un enlace de videollamada configurado. Revisa la agenda o consulta con el organizador."
      )
      return
    }

    // 3. Abrir la videollamada en una nueva pestaña asegurando protocolo absoluto (https://)
    const safeUrl = ensureAbsoluteUrl(meeting.meeting_url)
    window.open(safeUrl, "_blank", "noopener,noreferrer")

    // 4. Si el colaborador aun no tiene la asistencia registrada, registrar y liberar horas
    if (currentStaffId && !isAttended) {
      startTransition(async () => {
        try {
          const res = await registerMeetingAttendance({
            taskId: meeting.id,
            staffId: currentStaffId,
            method: "link_click",
            isPmOverride: false, // Desactivado override en auto-checkin para garantizar cumplimiento estricto
          })

          if (res.success && res.task) {
            const durationH = meeting.meeting_duration_minutes
              ? meeting.meeting_duration_minutes / 60
              : 0.5
            toast.success(
              `Asistencia registrada exitosamente. Se imputaron ${durationH}h a tu reporte.`
            )
            onMeetingUpdated?.(res.task)
          } else if (res.error) {
            toast.error(res.error)
          }
        } catch (err: any) {
          console.error("Error al registrar asistencia:", err)
        }
      })
    }
  }

  const isFocused = isHovered || isExpandedManual

  return (
    <>
      {/* Backdrop teatral de foco: gradiente vertical 100-0 de abajo hacia arriba en todo el ancho de pantalla */}
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-x-0 bottom-0 h-64 sm:h-80 pointer-events-none z-40 transition-opacity duration-300 ease-out",
          "bg-gradient-to-t from-background via-background/70 to-transparent",
          isFocused ? "opacity-100" : "opacity-0"
        )}
      />

      <div className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
        {/* Dock flotante inferior centrado con apariencia Glassmorphism premium */}
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false)
            setIsExpandedManual(false)
          }}
          onClick={() => setIsExpandedManual((prev) => !prev)}
          className={cn(
          "group relative flex items-center h-11 sm:h-12 rounded-full border cursor-pointer select-none whitespace-nowrap overflow-hidden",
          // Efecto de cristal real: alta translucidez, desenfoque y saturacion de fondo (Frosted Liquid Glass):
          "backdrop-blur-xl backdrop-saturate-150",
          // Mismo padding uniforme en todos los lados (vertical y horizontal identicos):
          "p-1 sm:p-1.5",
          "transition-[width,box-shadow,border-color,background-color] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isExpandedManual && "is-expanded",
          // Ancho cerrado en reposo (Píldora dock compacta con badge centrado):
          stateKind === "live" && "w-[136px] sm:w-[146px]",
          stateKind === "soon" && "w-[128px] sm:w-[138px]",
          stateKind === "upcoming" && "w-[178px] sm:w-[196px]",
          // Ancho expandido suavemente al hover o tap manual (Expande simetricamente desde el centro por -translate-x-1/2):
          stateKind === "live" &&
            "hover:w-[480px] sm:hover:w-[560px] md:hover:w-[600px] [&.is-expanded]:w-[480px] sm:[&.is-expanded]:w-[560px] md:[&.is-expanded]:w-[600px]",
          stateKind !== "live" &&
            "hover:w-[450px] sm:hover:w-[520px] md:hover:w-[560px] [&.is-expanded]:w-[450px] sm:[&.is-expanded]:w-[520px] md:[&.is-expanded]:w-[560px]",
          "max-w-[94vw]",
          // Apariencia de vidrio auténtico limpio y neutro (sin contorno glow de color):
          "bg-white/20 dark:bg-zinc-950/30 hover:bg-white/30 dark:hover:bg-zinc-950/40",
          "border-white/60 dark:border-white/10 hover:border-white/80 dark:hover:border-white/20",
          "shadow-[inset_0_1px_1.5px_0_rgba(255,255,255,0.7),0_10px_35px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_1.5px_0_rgba(255,255,255,0.1),0_14px_44px_rgba(0,0,0,0.45)] hover:shadow-[inset_0_1px_1.5px_0_rgba(255,255,255,0.85),0_14px_42px_rgba(0,0,0,0.14)]"
        )}
      >
        {/* LADO IZQUIERDO (.sign): Badge centrado en reposo y anclado a la izquierda al expandirse */}
        <div
          className={cn(
            "flex items-center justify-center shrink-0 whitespace-nowrap transition-[width,padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] px-3 sm:px-3.5",
            // En reposo ocupa el 100% de la pildora dock para estar centrado
            "w-full",
            // Al hacer hover se fija con ancho automatico a la izquierda
            "group-hover:w-auto group-[.is-expanded]:w-auto"
          )}
        >
          {stateKind === "live" && (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase whitespace-nowrap shrink-0">
                EN DIRECTO
              </span>
            </div>
          )}

          {stateKind === "soon" && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 whitespace-nowrap shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse text-amber-500 shrink-0" />
              <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase whitespace-nowrap shrink-0">
                EN {minutesUntil} MIN
              </span>
            </div>
          )}

          {stateKind === "upcoming" && (
            <div className="flex items-center gap-2 text-primary whitespace-nowrap shrink-0">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase truncate whitespace-nowrap shrink-0 max-w-[134px] sm:max-w-[150px]">
                {formatMeetingSchedule(meeting.meeting_start_at)}
              </span>
            </div>
          )}
        </div>

        {/* LADO DERECHO (.text): Frame interno con overflow-visible al desplegarse para NUNCA cortar bordes del CTA */}
        <div
          className={cn(
            "flex-1 min-w-0 flex items-center whitespace-nowrap pr-1",
            // Estado cerrado (oculto)
            "max-w-0 opacity-0 pointer-events-none translate-x-3 overflow-hidden",
            // Estado expandido: overflow-visible obligatorio para que ni sombras ni bordes arriba/abajo sufran recortes
            "group-hover:max-w-[580px] group-[.is-expanded]:max-w-[580px] group-hover:opacity-100 group-[.is-expanded]:opacity-100 group-hover:pointer-events-auto group-[.is-expanded]:pointer-events-auto group-hover:translate-x-0 group-[.is-expanded]:translate-x-0 group-hover:overflow-visible group-[.is-expanded]:overflow-visible",
            "transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          )}
        >
          {/* Separador vertical hairline */}
          <span className="w-px h-5 bg-border/70 shrink-0 mx-2 sm:mx-2.5" />

          {/* Titulo de la sesion clickeable: sin color hover ni tooltip flotante nativo */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpenMeeting(meeting)
            }}
            className="text-xs sm:text-sm font-semibold text-foreground truncate min-w-0 flex-1 text-left cursor-pointer whitespace-nowrap mr-2.5 sm:mr-3"
          >
            {meeting.title}
          </button>

          {/* Badge de asistencia confirmada */}
          {isAttended && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 shrink-0 whitespace-nowrap mr-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Presente
            </span>
          )}

          {/* Frame contenedor del CTA: overflow-visible para garantizar visualizacion total del boton y su sombra */}
          <div className="shrink-0 flex items-center whitespace-nowrap overflow-visible pl-1 pr-0.5">
            {stateKind === "live" ? (
              isAttended ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleJoinOrAttend}
                  className="h-8 px-3.5 sm:px-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 active:scale-95 rounded-full flex items-center gap-1.5 transition-transform whitespace-nowrap shrink-0 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span>Entrar</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleJoinOrAttend}
                  disabled={isPending}
                  className="h-8 px-4 sm:px-4.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-full shadow-md flex items-center gap-1.5 transition-transform whitespace-nowrap shrink-0"
                >
                  {isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  ) : (
                    <Video className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>Unirme</span>
                </Button>
              )
            ) : stateKind === "soon" ? (
              isWindowOpen ? (
                isAttended ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleJoinOrAttend}
                    className="h-8 px-3.5 sm:px-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 active:scale-95 rounded-full flex items-center gap-1.5 transition-transform whitespace-nowrap shrink-0 shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>Entrar</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleJoinOrAttend}
                    disabled={isPending}
                    className="h-8 px-4 sm:px-4.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-full shadow-md flex items-center gap-1.5 transition-transform whitespace-nowrap shrink-0"
                  >
                    {isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <Video className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>Unirme</span>
                  </Button>
                )
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    disabled
                    title={`La ventana de asistencia abre 5 min antes del inicio programado (en ${minutesUntilOpen} min).`}
                    className="h-8 px-3 sm:px-3.5 text-xs font-medium bg-muted/60 text-muted-foreground border border-border/40 rounded-full cursor-not-allowed select-none shadow-none flex items-center gap-1.5 shrink-0"
                  >
                    <Clock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                    <span>Abre en {minutesUntilOpen}m</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenMeeting(meeting)
                    }}
                    className="h-8 px-2.5 sm:px-3 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 active:scale-95 rounded-full flex items-center gap-1 transition-transform whitespace-nowrap shrink-0"
                    title="Ver agenda y temas de la reunión"
                  >
                    <span>Agenda</span>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  </Button>
                </div>
              )
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenMeeting(meeting)
                }}
                className="h-8 px-3 sm:px-3.5 text-xs font-medium hover:bg-primary/10 text-foreground/80 active:scale-95 rounded-full flex items-center gap-1 transition-transform whitespace-nowrap shrink-0"
              >
                <span>Detalles</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  </>
  )
}
