"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Video,
  Calendar,
  Clock,
  MapPin,
  Users,
  Link2,
  Plus,
  Trash2,
  X,
  Layers,
  Check,
  ChevronDown,
  UserPlus,
  AlertCircle,
  Repeat,
  Loader2,
} from "lucide-react"
import type {
  TaskProject,
  TaskCollaborator,
  TaskSprint,
  TaskMeetingModality,
  TaskMeetingAttendee,
  TaskItem,
  RecurrenceInterval,
} from "../../types"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"
import { createTask } from "../../actions/task-actions"
import { portalCreateTask } from "../../actions/collaborator-portal-actions"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"

interface TaskMeetingModalProps {
  isOpen: boolean
  onClose: () => void
  projects: TaskProject[]
  collaborators: TaskCollaborator[]
  sprints?: TaskSprint[]
  defaultProjectId?: string
  portalToken?: string
  currentStaffId?: string
  onMeetingCreated?: (meeting: TaskItem) => void
}

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120]
const DAYS_OF_WEEK = [
  { day: 1, label: "Lun", fullName: "Lunes" },
  { day: 2, label: "Mar", fullName: "Martes" },
  { day: 3, label: "Mié", fullName: "Miércoles" },
  { day: 4, label: "Jue", fullName: "Jueves" },
  { day: 5, label: "Vie", fullName: "Viernes" },
  { day: 6, label: "Sáb", fullName: "Sábado" },
  { day: 7, label: "Dom", fullName: "Domingo" },
]

export function TaskMeetingModal({
  isOpen,
  onClose,
  projects = [],
  collaborators = [],
  sprints = [],
  defaultProjectId,
  portalToken,
  currentStaffId,
  onMeetingCreated,
}: TaskMeetingModalProps) {
  // Form State
  const [projectId, setProjectId] = useState<string>(
    defaultProjectId || projects[0]?.id || ""
  )
  const [sprintId, setSprintId] = useState<string>("none")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [modality, setModality] = useState<TaskMeetingModality>("virtual")
  const [meetingUrl, setMeetingUrl] = useState("")
  const [meetingLocation, setMeetingLocation] = useState("")
  const [meetingStartAt, setMeetingStartAt] = useState("")
  const [durationMinutes, setDurationMinutes] = useState<number>(30)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>("weekly")
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([1])
  const [attendees, setAttendees] = useState<TaskMeetingAttendee[]>([])
  const [agendaItems, setAgendaItems] = useState<string[]>([])
  const [newAgendaInput, setNewAgendaInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize or reset form on open
  useEffect(() => {
    if (isOpen) {
      setProjectId(defaultProjectId || projects[0]?.id || "")
      setSprintId("none")
      setTitle("")
      setDescription("")
      setModality("virtual")
      setMeetingUrl("")
      setMeetingLocation("")
      setDurationMinutes(30)
      setIsRecurring(false)
      setRecurrenceInterval("weekly")
      setRecurrenceDays([1])
      setAgendaItems([])
      setNewAgendaInput("")

      // Default meeting start to tomorrow at 09:00 AM or nearest rounded hour
      const d = new Date()
      d.setHours(d.getHours() + 1, 0, 0, 0)
      const offset = d.getTimezoneOffset() * 60000
      const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 16)
      setMeetingStartAt(localISOTime)

      // Pre-populate attendees with the creator or current user if available
      if (currentStaffId && collaborators.length > 0) {
        const currentStaff = collaborators.find((c) => c.id === currentStaffId)
        if (currentStaff) {
          setAttendees([
            {
              staff_id: currentStaff.id,
              status: "pending",
              hours_allocated: 0.5,
              notes: null,
              staff: {
                id: currentStaff.id,
                first_name: currentStaff.first_name,
                last_name: currentStaff.last_name,
                photo_url: currentStaff.photo_url || null,
                role: currentStaff.role,
              },
            },
          ])
        } else {
          setAttendees([])
        }
      } else {
        setAttendees([])
      }
    }
  }, [isOpen, defaultProjectId, projects, collaborators, currentStaffId])

  // Toggle Attendee
  const handleToggleAttendee = (collab: TaskCollaborator) => {
    const exists = attendees.some((a) => a.staff_id === collab.id)
    if (exists) {
      setAttendees((prev) => prev.filter((a) => a.staff_id !== collab.id))
    } else {
      setAttendees((prev) => [
        ...prev,
        {
          staff_id: collab.id,
          status: "pending",
          hours_allocated: durationMinutes / 60,
          notes: null,
          staff: {
            id: collab.id,
            first_name: collab.first_name,
            last_name: collab.last_name,
            photo_url: collab.photo_url || null,
            role: collab.role,
          },
        },
      ])
    }
  }

  // Add all collaborators from current project/org
  const handleAddAllCollaborators = () => {
    const all = collaborators.map((c) => ({
      staff_id: c.id,
      status: "pending" as const,
      hours_allocated: durationMinutes / 60,
      notes: null,
      staff: {
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        photo_url: c.photo_url || null,
        role: c.role,
      },
    }))
    setAttendees(all)
    toast.success(`Se convocaron ${all.length} miembros del equipo`)
  }

  // Toggle Days of week
  const handleToggleDay = (day: number) => {
    if (recurrenceDays.includes(day)) {
      if (recurrenceDays.length === 1) {
        toast.warning("Debes seleccionar al menos un día para la recurrencia")
        return
      }
      setRecurrenceDays((prev) => prev.filter((d) => d !== day))
    } else {
      setRecurrenceDays((prev) => [...prev, day].sort((a, b) => a - b))
    }
  }

  // Add Agenda Item
  const handleAddAgendaItem = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!newAgendaInput.trim()) return
    setAgendaItems((prev) => [...prev, newAgendaInput.trim()])
    setNewAgendaInput("")
  }

  // Remove Agenda Item
  const handleRemoveAgendaItem = (index: number) => {
    setAgendaItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Submit Handler
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!projectId) {
      toast.error("Por favor selecciona un proyecto asignado")
      return
    }

    if (!title.trim()) {
      toast.error("El título de la reunión es obligatorio")
      return
    }

    if (!meetingStartAt) {
      toast.error("Por favor especifica la fecha y hora de inicio")
      return
    }

    if ((modality === "virtual" || modality === "hybrid") && !meetingUrl.trim()) {
      toast.warning("Te recomendamos incluir el enlace de videollamada para habilitar el acceso automático", {
        duration: 3500,
      })
    }

    setIsSubmitting(true)

    try {
      const hoursPerPerson = durationMinutes / 60
      const formattedAttendees = attendees.map((a) => ({
        ...a,
        hours_allocated: hoursPerPerson,
      }))

      const checklistData = agendaItems.map((item, idx) => ({
        id: `agenda-${idx}-${Date.now()}`,
        title: item,
        completed: false,
        created_at: new Date().toISOString(),
      }))

      const meetingIsoDate = new Date(meetingStartAt).toISOString()
      const dueDateStr = meetingStartAt.split("T")[0]

      let res
      if (portalToken) {
        // Create via Collaborator Portal Action
        res = await portalCreateTask(portalToken, {
          projectId,
          title: title.trim(),
          description: description.trim() || undefined,
          status: "todo",
          priority: "high",
          type: "meeting",
          dueDate: dueDateStr,
          estimatedHours: hoursPerPerson,
          checklist: checklistData,
          tags: [modality === "virtual" ? "Reunión Virtual" : modality === "in_person" ? "Reunión Presencial" : "Reunión Híbrida"],
          meetingModality: modality,
          meetingUrl: meetingUrl.trim() || null,
          meetingLocation: meetingLocation.trim() || null,
          meetingStartAt: meetingIsoDate,
          meetingDurationMinutes: durationMinutes,
          meetingAttendees: formattedAttendees,
          sprintId: sprintId !== "none" ? sprintId : undefined,
          isRecurring,
          recurrenceInterval: isRecurring ? recurrenceInterval : null,
          recurrenceDay: isRecurring ? recurrenceDays[0] || 1 : null,
          recurrenceDays: isRecurring && recurrenceInterval === "weekly" ? recurrenceDays : null,
        })
      } else {
        // Create via Central Platform Action
        res = await createTask({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || undefined,
          status: "todo",
          priority: "high",
          type: "meeting",
          progress_percentage: 0,
          assigned_staff_id: attendees[0]?.staff_id || currentStaffId || null,
          due_date: dueDateStr,
          estimated_hours: hoursPerPerson,
          actual_hours: 0,
          checklist: checklistData,
          tags: [modality === "virtual" ? "Reunión Virtual" : modality === "in_person" ? "Reunión Presencial" : "Reunión Híbrida"],
          meeting_modality: modality,
          meeting_url: meetingUrl.trim() || null,
          meeting_location: meetingLocation.trim() || null,
          meeting_start_at: meetingIsoDate,
          meeting_duration_minutes: durationMinutes,
          meeting_attendees: formattedAttendees,
          sprint_id: sprintId !== "none" ? sprintId : null,
          is_recurring: isRecurring,
          recurrence_interval: isRecurring ? recurrenceInterval : null,
          recurrence_day: isRecurring ? recurrenceDays[0] || 1 : null,
          recurrence_days: isRecurring && recurrenceInterval === "weekly" ? recurrenceDays : null,
        })
      }

      if (res.success && res.task) {
        toast.success(`Reunión "${res.task.title}" programada con éxito`)
        onMeetingCreated?.(res.task)
        onClose()
      } else {
        toast.error(res.error || "No se pudo programar la reunión")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al programar la reunión")
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedProject = projects.find((p) => p.id === projectId)
  const computedHours = (durationMinutes / 60).toFixed(1).replace(".0", "")

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto scrollbar-thin p-0 gap-0 border-border bg-card shadow-2xl rounded-3xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Programar Reunión / Actividad Sincrónica</DialogTitle>
        </DialogHeader>

        {/* Top Header - Platform Ticket Standard */}
        <div className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-3 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-primary shrink-0" />
            <h2 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
              Programar Reunión
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="text-xs h-8 px-4 font-semibold shadow-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Programando...
                </>
              ) : (
                "Programar Reunión"
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Form Body: Balanced Single-Column Flow with Grouped Cards */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6">
          {/* Card 1: Contexto del Proyecto y Título */}
          <div className="p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/60 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Proyecto Asignado *
                </label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="w-full bg-background h-10 text-xs font-semibold rounded-xl">
                    <SelectValue placeholder="Selecciona un proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="font-semibold truncate">{p.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Sprint Asociado (Opcional)
                </label>
                <Select value={sprintId} onValueChange={setSprintId}>
                  <SelectTrigger className="w-full bg-background h-10 text-xs font-medium rounded-xl">
                    <SelectValue placeholder="Sin sprint específico" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin sprint específico</SelectItem>
                    {sprints.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        <span className="font-semibold">{s.name}</span> {s.status === "active" ? "(Activo)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Título de la Sesión *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ej: Reunión de equipo, Revisión de avances, Alineación..."
                className="text-sm font-normal bg-background rounded-xl h-10 placeholder:text-muted-foreground/60"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Objetivos & Contexto (Opcional)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Objetivos a lograr, temas clave o notas previas de la sesión..."
                rows={2}
                className="bg-background resize-none text-xs rounded-xl font-normal placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          {/* Card 2: Horario, Duración y Recurrencia */}
          <div className="p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/60 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Programación, Duración & Ciclo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Fecha y Hora de Inicio *
                </label>
                <div className="relative">
                  <Input
                    type="datetime-local"
                    value={meetingStartAt}
                    onChange={(e) => setMeetingStartAt(e.target.value)}
                    className="w-full bg-background h-10 text-xs font-mono font-medium rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Duración Estimada
                  </label>
                  <span className="text-[11px] font-bold text-primary font-mono">
                    {durationMinutes} min ({computedHours}h / persona)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DURATION_PRESETS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={cn(
                        "h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        durationMinutes === mins
                          ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                          : "bg-background text-foreground hover:bg-muted/80 border border-border/60"
                      )}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recurrencia Semanal Multidía */}
            <div className="pt-2 border-t border-border/60">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Repeat className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-foreground">Frecuencia de la Reunión</span>
                </div>
                <div className="inline-flex items-center gap-1 p-0.5 bg-muted/60 rounded-lg border border-border/60 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setIsRecurring(false)}
                    className={cn(
                      "px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer",
                      !isRecurring ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Sesión Única
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRecurring(true)}
                    className={cn(
                      "px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer",
                      isRecurring ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Recurrente (Ciclo)
                  </button>
                </div>
              </div>

              {isRecurring && (
                <div className="p-3 rounded-xl bg-background border border-primary/20 space-y-2.5 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Días de repetición semanal:
                    </span>
                    <span className="text-[11px] font-mono text-primary font-bold">
                      {recurrenceDays.map((d) => DAYS_OF_WEEK.find((w) => w.day === d)?.label).join(", ")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {DAYS_OF_WEEK.map((item) => {
                      const isSelected = recurrenceDays.includes(item.day)
                      return (
                        <button
                          key={item.day}
                          type="button"
                          onClick={() => handleToggleDay(item.day)}
                          className={cn(
                            "h-7 min-w-[34px] px-2 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                              : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted/80 hover:text-foreground"
                          )}
                        >
                          {item.label}
                        </button>
                      )
                    })}
                  </div>

                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    <strong>Generación Just-in-Time:</strong> Se autogenerará la siguiente sesión conforme concluya cada ciclo sin saturar el tablero Kanban.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Modalidad y Acceso */}
          <div className="p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/60 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Video className="w-4 h-4 text-primary" />
              <span>Modalidad & Acceso a la Sesión</span>
            </div>

            {/* Segmented Modality Selector */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-muted/60 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setModality("virtual")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  modality === "virtual"
                    ? "bg-background text-primary shadow-xs font-bold border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Virtual</span>
              </button>

              <button
                type="button"
                onClick={() => setModality("in_person")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  modality === "in_person"
                    ? "bg-background text-primary shadow-xs font-bold border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Presencial</span>
              </button>

              <button
                type="button"
                onClick={() => setModality("hybrid")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  modality === "hybrid"
                    ? "bg-background text-primary shadow-xs font-bold border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Híbrida</span>
              </button>
            </div>

            {/* URL Enlace de Videollamada */}
            {(modality === "virtual" || modality === "hybrid") && (
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Enlace de Videollamada (Google Meet, Zoom, MS Teams)
                </label>
                <div className="relative">
                  <Link2 className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="https://meet.google.com/xxx-yyyy-zzz"
                    className="pl-9 bg-background h-10 text-xs font-mono rounded-xl"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Los participantes podrán acceder directamente con 1 clic desde el portal, registrando su asistencia en automático.
                </p>
              </div>
            )}

            {/* Ubicación Presencial */}
            {(modality === "in_person" || modality === "hybrid") && (
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Lugar / Sala de Reuniones
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={meetingLocation}
                    onChange={(e) => setMeetingLocation(e.target.value)}
                    placeholder="ej: Sala Principal de Juntas, Piso 3..."
                    className="pl-9 bg-background h-10 text-xs rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Convocatoria de Participantes (Attendees) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/60 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Participantes Convocados ({attendees.length})
                </span>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold font-mono">
                  {computedHours}h / persona
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAllCollaborators}
                  className="h-7 px-2.5 text-[11px] rounded-lg border-primary/30 text-primary hover:bg-primary/10 cursor-pointer font-semibold"
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  Convocar a todos ({collaborators.length})
                </Button>
                {attendees.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAttendees([])}
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    Limpiar
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Picker Buttons of Collaborators */}
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-2 bg-background rounded-xl border border-border/60 scrollbar-thin">
              {collaborators.map((c) => {
                const isSelected = attendees.some((a) => a.staff_id === c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleToggleAttendee(c)}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                        : "bg-muted/30 text-foreground hover:bg-muted/70 border-border/50"
                    )}
                  >
                    <Avatar className="w-5 h-5 shrink-0 rounded-full">
                      <AvatarImage src={getCollaboratorAvatar(c.photo_url, c.first_name)} className="object-cover" />
                      <AvatarFallback className="text-[9px] font-bold">
                        {c.first_name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-[120px]">{c.first_name} {c.last_name}</span>
                    {isSelected && <Check className="w-3 h-3 text-primary-foreground shrink-0 ml-0.5" />}
                  </button>
                )
              })}
            </div>

            {attendees.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>No has convocado participantes. Puedes convocar miembros individuales o presionar "Convocar a todos".</span>
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Cada convocado recibirá la notificación en su portal y podrá hacer check-in al unirse a la reunión para registrar automáticamente sus {computedHours}h en el sprint.
              </p>
            )}
          </div>

          {/* Card 5: Agenda de la Sesión / Temas a Tratar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Temas a Tratar / Agenda {agendaItems.length > 0 ? `(${agendaItems.length})` : ""}
                </span>
              </div>
              {agendaItems.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAgendaItems([])}
                  className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive cursor-pointer"
                >
                  Limpiar temas
                </Button>
              )}
            </div>

            {agendaItems.length > 0 && (
              <div className="space-y-1.5">
                {agendaItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 p-2 bg-background rounded-xl border border-border/60 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold font-mono flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-foreground truncate font-medium">{item}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAgendaItem(index)}
                      className="w-6 h-6 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new agenda item input */}
            <div className="flex items-center gap-2">
              <Input
                value={newAgendaInput}
                onChange={(e) => setNewAgendaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddAgendaItem()
                  }
                }}
                placeholder="Agregar tema a la agenda... (Presiona Enter)"
                className="bg-background h-9 text-xs rounded-xl flex-1"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => handleAddAgendaItem()}
                disabled={!newAgendaInput.trim()}
                className="h-9 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Agregar
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
