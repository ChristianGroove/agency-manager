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
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Video,
  Calendar,
  Clock,
  MapPin,
  Users,
  Link2,
  Trash2,
  X,
  Layers,
  Repeat,
  ExternalLink,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  Pencil,
  Check,
  UserPlus,
} from "lucide-react"
import type {
  TaskItem,
  TaskProject,
  TaskCollaborator,
  TaskComment,
  TaskMeetingModality,
  TaskMeetingAttendee,
} from "../../types"
import { parseTaskChecklist } from "../../types"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"
import { formatRecurrenceLabel } from "../../utils/recurrence-utils"
import { TaskMeetingConsole } from "./task-meeting-console"
import {
  deleteTask,
  getTaskComments,
  addTaskComment,
  updateTask,
} from "../../actions/task-actions"
import {
  portalDeleteTask,
  portalGetTaskComments,
  portalUpdateTask,
} from "../../actions/collaborator-portal-actions"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"

interface TaskMeetingDetailModalProps {
  meeting: TaskItem | null
  isOpen: boolean
  onClose: () => void
  currentStaffId?: string | null
  isLeadOrPm?: boolean
  portalToken?: string
  collaborators?: TaskCollaborator[]
  onMeetingUpdated?: (updated: TaskItem) => void
  onMeetingDeleted?: (meetingId: string) => void
}

export function TaskMeetingDetailModal({
  meeting,
  isOpen,
  onClose,
  currentStaffId,
  isLeadOrPm = false,
  portalToken,
  collaborators = [],
  onMeetingUpdated,
  onMeetingDeleted,
}: TaskMeetingDetailModalProps) {
  const [comments, setComments] = useState<TaskComment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isSendingComment, setIsSendingComment] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Edit form states
  const [editTitle, setEditTitle] = useState("")
  const [editMeetingUrl, setEditMeetingUrl] = useState("")
  const [editStartAt, setEditStartAt] = useState("")
  const [editDuration, setEditDuration] = useState<number>(30)
  const [editModality, setEditModality] = useState<TaskMeetingModality>("virtual")
  const [editLocation, setEditLocation] = useState("")
  const [editAttendees, setEditAttendees] = useState<TaskMeetingAttendee[]>([])

  function toDateTimeLocal(isoString?: string | null): string {
    if (!isoString) return ""
    try {
      const d = new Date(isoString)
      if (isNaN(d.getTime())) return ""
      const pad = (n: number) => String(n).padStart(2, "0")
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    } catch {
      return ""
    }
  }

  // Sync edit form with meeting data
  useEffect(() => {
    if (meeting) {
      setEditTitle(meeting.title || "")
      setEditMeetingUrl(meeting.meeting_url || "")
      setEditStartAt(toDateTimeLocal(meeting.meeting_start_at))
      setEditDuration(meeting.meeting_duration_minutes || 30)
      setEditModality(meeting.meeting_modality || "virtual")
      setEditLocation(meeting.meeting_location || "")
      setEditAttendees(Array.isArray(meeting.meeting_attendees) ? meeting.meeting_attendees : [])
    }
    if (!isOpen) {
      setIsEditing(false)
    }
  }, [meeting, isOpen])

  // Load comments on open
  useEffect(() => {
    if (meeting?.id && isOpen) {
      loadComments(meeting.id)
    }
  }, [meeting?.id, isOpen])

  const loadComments = async (taskId: string) => {
    try {
      if (portalToken) {
        const comms = await portalGetTaskComments(portalToken, taskId)
        setComments(comms || [])
      } else {
        const comms = await getTaskComments(taskId)
        setComments(comms || [])
      }
    } catch (err) {
      console.error("Error loading meeting notes/comments:", err)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !meeting) return

    setIsSendingComment(true)
    try {
      const currentStaff = collaborators.find((c) => c.id === currentStaffId)
      const authorName = currentStaff
        ? `${currentStaff.first_name} ${currentStaff.last_name}`
        : "Participante"

      const res = await addTaskComment({
        taskId: meeting.id,
        content: newComment.trim(),
        authorType: "staff",
        authorId: currentStaffId || undefined,
        authorName,
      })

      if (res.success && res.comment) {
        setComments((prev) => [res.comment!, ...prev])
        setNewComment("")
        toast.success("Nota agregada")
      } else {
        toast.error(res.error || "No se pudo agregar la nota")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al agregar nota")
    } finally {
      setIsSendingComment(false)
    }
  }

  const handleToggleAttendee = (collab: TaskCollaborator) => {
    setEditAttendees((prev) => {
      const exists = prev.some((a) => a.staff_id === collab.id)
      if (exists) {
        return prev.filter((a) => a.staff_id !== collab.id)
      } else {
        const newAttendee: TaskMeetingAttendee = {
          staff_id: collab.id,
          status: "pending",
          hours_allocated: editDuration / 60,
          notes: null,
          staff: {
            id: collab.id,
            first_name: collab.first_name,
            last_name: collab.last_name,
            photo_url: collab.photo_url || null,
            role: collab.role,
          },
        }
        return [...prev, newAttendee]
      }
    })
  }

  const handleAddAllAttendees = () => {
    const all: TaskMeetingAttendee[] = collaborators.map((c) => {
      const existing = editAttendees.find((a) => a.staff_id === c.id)
      if (existing) return existing
      return {
        staff_id: c.id,
        status: "pending",
        hours_allocated: editDuration / 60,
        notes: null,
        staff: {
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          photo_url: c.photo_url || null,
          role: c.role,
        },
      }
    })
    setEditAttendees(all)
  }

  const handleSaveEdit = async () => {
    if (!meeting) return
    const trimmedTitle = editTitle.trim()
    if (!trimmedTitle) {
      toast.error("El título de la sesión es obligatorio")
      return
    }

    setIsSaving(true)
    try {
      const updatedDuration = Number(editDuration) || 30
      const durationHours = updatedDuration / 60
      const updatedEstimatedHours = Math.round(durationHours * 10) / 10
      const updatedStartAt = editStartAt ? new Date(editStartAt).toISOString() : null
      const updatedDueDate = updatedStartAt ? updatedStartAt.split("T")[0] : null
      const updatedUrl = editMeetingUrl.trim() || null
      const updatedLocation = editLocation.trim() || null

      // Synchronize hours_allocated for each attendee with current session duration
      const syncedAttendees = editAttendees.map((a) => ({
        ...a,
        hours_allocated: a.status === "attended" || a.status === "pending"
          ? durationHours
          : (Number(a.hours_allocated) || durationHours),
      }))

      let res: { success: boolean; task?: TaskItem; error?: string }

      if (portalToken) {
        res = await portalUpdateTask(portalToken, meeting.id, {
          title: trimmedTitle,
          meetingUrl: updatedUrl,
          meetingStartAt: updatedStartAt,
          meetingDurationMinutes: updatedDuration,
          meetingModality: editModality,
          meetingLocation: updatedLocation,
          meetingAttendees: syncedAttendees,
          estimatedHours: updatedEstimatedHours,
          dueDate: updatedDueDate,
        })
      } else {
        res = await updateTask(meeting.id, {
          title: trimmedTitle,
          meeting_url: updatedUrl,
          meeting_start_at: updatedStartAt,
          meeting_duration_minutes: updatedDuration,
          meeting_modality: editModality,
          meeting_location: updatedLocation,
          meeting_attendees: syncedAttendees,
          estimated_hours: updatedEstimatedHours,
          due_date: updatedDueDate,
        })
      }

      if (res.success && res.task) {
        toast.success("Sesión actualizada exitosamente")
        setIsEditing(false)
        onMeetingUpdated?.(res.task)
      } else {
        toast.error(res.error || "No se pudo actualizar la sesión")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al guardar cambios de la reunión")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteMeeting = async () => {
    if (!meeting) return
    const conf = window.confirm(`¿Estás seguro de eliminar la sesión "${meeting.title}"? Esta acción no se puede deshacer.`)
    if (!conf) return

    setIsDeleting(true)
    try {
      if (portalToken) {
        const res = await portalDeleteTask(portalToken, meeting.id)
        if (res.success) {
          toast.success("Reunión eliminada")
          onMeetingDeleted?.(meeting.id)
          onClose()
        } else {
          toast.error(res.error || "No se pudo eliminar")
        }
      } else {
        const res = await deleteTask(meeting.id)
        if (res.success) {
          toast.success("Reunión eliminada")
          onMeetingDeleted?.(meeting.id)
          onClose()
        } else {
          toast.error(res.error || "No se pudo eliminar")
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar")
    } finally {
      setIsDeleting(false)
    }
  }

  if (!meeting) return null

  const checklist = parseTaskChecklist(meeting.checklist)
  const modality = meeting.meeting_modality || "virtual"
  const startAt = meeting.meeting_start_at ? new Date(meeting.meeting_start_at) : null
  const durationMinutes = meeting.meeting_duration_minutes || 30
  const scheduledEndMs = meeting.meeting_start_at
    ? new Date(meeting.meeting_start_at).getTime() + durationMinutes * 60 * 1000
    : null
  const isMeetingTimePassed = Boolean(scheduledEndMs && Date.now() > scheduledEndMs)
  const isPastMeeting = meeting.status === "done" || isMeetingTimePassed

  const formattedDate = startAt ? startAt.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }) : "Fecha no definida"
  const formattedTime = startAt ? startAt.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }) : "--:--"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto scrollbar-thin p-0 gap-0 border-border bg-card shadow-2xl rounded-3xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{meeting.title}</DialogTitle>
        </DialogHeader>

        {/* Top Header - Meeting Identity & Ticket Code (Compact) */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-3 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <Badge
              variant="outline"
              className="font-mono text-xs font-bold px-3 py-1 bg-primary/10 text-primary border-primary/20 rounded-xl shrink-0"
            >
              {meeting.ticket_code}
            </Badge>

            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-foreground truncate tracking-tight">
                {meeting.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  {meeting.project?.name || "Proyecto"}
                </span>
                <span>•</span>
                <span className="capitalize">{modality === "virtual" ? "Reunión Virtual" : modality === "in_person" ? "Reunión Presencial" : "Reunión Híbrida"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isLeadOrPm && (
              <>
                {!isPastMeeting && (
                  <Button
                    variant={isEditing ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    disabled={isSaving || isDeleting}
                    className="text-xs h-8 px-3 rounded-xl cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    {isEditing ? "Cancelar" : "Editar"}
                  </Button>
                )}
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteMeeting}
                    disabled={isDeleting}
                    className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs h-8 px-3 rounded-xl cursor-pointer"
                  >
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                    Eliminar
                  </Button>
                )}
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Modal Body: Dedicated Meeting Experience or Edit Mode */}
        {isEditing ? (
          <div className="p-5 sm:p-7 space-y-5">
            <div className="p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/60 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Editar Datos de la Sesión</h3>
                </div>
                <Badge variant="outline" className="font-mono text-xs font-bold text-primary">
                  {meeting.ticket_code}
                </Badge>
              </div>

              {/* Titulo */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Título de la Sesión *
                </label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Título de la reunión"
                  className="bg-background h-10 text-xs rounded-xl"
                  required
                />
              </div>

              {/* Modalidad */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Modalidad
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-muted/60 rounded-xl border border-border/60">
                  <button
                    type="button"
                    onClick={() => setEditModality("virtual")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                      editModality === "virtual"
                        ? "bg-background text-primary shadow-xs font-bold border border-border/50"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Virtual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditModality("in_person")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                      editModality === "in_person"
                        ? "bg-background text-primary shadow-xs font-bold border border-border/50"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Presencial</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditModality("hybrid")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                      editModality === "hybrid"
                        ? "bg-background text-primary shadow-xs font-bold border border-border/50"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Híbrida</span>
                  </button>
                </div>
              </div>

              {/* Enlace de Videollamada */}
              {(editModality === "virtual" || editModality === "hybrid") && (
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Enlace de Videollamada (Google Meet, Zoom, MS Teams)
                  </label>
                  <div className="relative">
                    <Link2 className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={editMeetingUrl}
                      onChange={(e) => setEditMeetingUrl(e.target.value)}
                      placeholder="https://meet.google.com/xxx-yyyy-zzz"
                      className="pl-9 bg-background h-10 text-xs font-mono rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Ubicacion Presencial */}
              {(editModality === "in_person" || editModality === "hybrid") && (
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Lugar / Ubicación Presencial
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="ej: Sala de Juntas A, Piso 2..."
                      className="pl-9 bg-background h-10 text-xs rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Fecha/Hora y Duracion */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Fecha y Hora de Inicio
                  </label>
                  <Input
                    type="datetime-local"
                    value={editStartAt}
                    onChange={(e) => setEditStartAt(e.target.value)}
                    className="w-full bg-background h-10 text-xs font-mono font-medium rounded-xl"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Duración Estimada
                    </label>
                    <span className="text-[11px] font-bold text-primary font-mono">
                      {editDuration} min ({editDuration / 60}h)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[15, 30, 45, 60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          setEditDuration(mins)
                          const newHours = mins / 60
                          setEditAttendees((prev) =>
                            prev.map((a) => ({
                              ...a,
                              hours_allocated: a.status === "attended" || a.status === "pending" ? newHours : (a.hours_allocated || newHours),
                            }))
                          )
                        }}
                        className={cn(
                          "h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          editDuration === mins
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

              {/* Convocados */}
              <div className="space-y-3 pt-3 border-t border-border/60">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">
                      Participantes Convocados ({editAttendees.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {collaborators.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddAllAttendees}
                        className="h-7 px-2.5 text-[11px] rounded-lg border-primary/30 text-primary hover:bg-primary/10 cursor-pointer font-semibold"
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Convocar a todos ({collaborators.length})
                      </Button>
                    )}
                    {editAttendees.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditAttendees([])}
                        className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        Limpiar
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 bg-background rounded-xl border border-border/60 scrollbar-thin">
                  {collaborators.map((c) => {
                    const isSelected = editAttendees.some((a) => a.staff_id === c.id)
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
              </div>

              {/* Botones de Accion */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="h-9 px-4 rounded-xl text-xs cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editTitle.trim()}
                  className="h-9 px-4 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-7 space-y-6">
          {/* Live Session Room & Attendance Console */}
          <TaskMeetingConsole
            task={meeting}
            currentStaffId={currentStaffId}
            isLeadOrPm={isLeadOrPm}
            portalToken={portalToken}
            onTaskUpdated={onMeetingUpdated}
          />

          {/* 2-Column Info Section: Left Agenda & Description, Right Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Left 2 Cols: Description & Agenda */}
            <div className="md:col-span-2 space-y-5">
              {/* Meeting Description / Objective */}
              {meeting.description && (
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Objetivos de la Sesión
                  </span>
                  <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {meeting.description}
                  </p>
                </div>
              )}

              {/* Agenda / Topics */}
              <div className="p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/60 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Agenda de la Sesión / Temas a Tratar ({checklist.length})
                  </span>
                </div>

                {checklist.length > 0 ? (
                  <div className="space-y-2">
                    {checklist.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="flex items-start gap-2.5 p-2.5 bg-background rounded-xl border border-border/60 text-xs"
                      >
                        <span className="w-5 h-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold font-mono flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="text-foreground leading-relaxed font-medium">
                          {item.title}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Sin temas de agenda específicos registrados.
                  </p>
                )}
              </div>

              {/* Session Notes & Discussion */}
              <div className="p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/60 space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Minuta & Comentarios de la Sesión ({comments.length})
                  </span>
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <Input
                    value={newComment}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewComment(e.target.value)}
                    placeholder="Registrar acuerdo, conclusión o nota de la reunión..."
                    className="bg-background text-xs h-9 rounded-xl flex-1"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSendingComment || !newComment.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9 px-3 rounded-xl cursor-pointer"
                  >
                    {isSendingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </Button>
                </form>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                  {comments.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-xl bg-background border border-border/60 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{c.author_name || "Participante"}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(c.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-[11px] text-muted-foreground italic">No hay notas de reunión registradas todavía.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right 1 Col: Meeting Details Card */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-3.5 text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block border-b border-border/60 pb-2">
                  Ficha de la Sesión
                </span>

                <div className="space-y-1">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Fecha Programada</span>
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span className="capitalize">{formattedDate}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Horario & Duración</span>
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>{formattedTime} • {meeting.meeting_duration_minutes || 30} min ({meeting.estimated_hours || 0.5}h)</span>
                  </div>
                </div>

                {meeting.is_recurring && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Recurrencia</span>
                    <div className="flex items-center gap-1.5 font-medium text-primary">
                      <Repeat className="w-3.5 h-3.5" />
                      <span>{formatRecurrenceLabel(meeting.recurrence_interval, meeting.recurrence_days)}</span>
                    </div>
                    {meeting.next_recurrence_at && (
                      <span className="text-[10px] text-muted-foreground block">
                        Próxima: {new Date(meeting.next_recurrence_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                )}

                {(meeting.meeting_url || meeting.meeting_location) && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                      {modality === "in_person" ? "Ubicación Presencial" : "Sala Virtual"}
                    </span>
                    {meeting.meeting_url ? (
                      <a
                        href={meeting.meeting_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-[11px] truncate max-w-full"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{meeting.meeting_url}</span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-1.5 text-foreground font-medium">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{meeting.meeting_location}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1 pt-2 border-t border-border/60">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Horas Liberadas</span>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px]">Horas acumuladas:</span>
                    <Badge variant="outline" className="font-mono font-bold text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      {meeting.actual_hours || 0}h / {meeting.estimated_hours || 0.5}h
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
