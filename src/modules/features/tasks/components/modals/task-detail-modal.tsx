"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Layers,
  Trash2,
  X,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Ban,
  Lock,
} from "lucide-react"
import type {
  TaskItem,
  TaskCollaborator,
  TaskComment,
  TaskStatus,
  TaskPriority,
  TaskType,
  TaskChecklistItem,
  TaskAttachment,
  RecurrenceInterval,
} from "../../types"
import { parseTaskChecklist, RECURRENCE_INTERVAL_LABELS } from "../../types"
import { TaskBlockerSelector } from "../shared/task-blocker-selector"
import { TaskLogWorkModal } from "../shared/task-log-work-modal"
import { TaskMeetingConsole } from "../meetings/task-meeting-console"
import { TaskTagSelector } from "../tags/task-tag-selector"
import { TaskChecklistEditor } from "../detail/task-checklist-editor"
import { TaskAttachmentsSection } from "../detail/task-attachments-section"
import { TaskDiscussionFeed } from "../detail/task-discussion-feed"
import { TaskTimeCompactStrip } from "../detail/task-time-compact-strip"
import {
  updateTask,
  deleteTask,
  getTaskComments,
  addTaskComment,
  uploadTaskAttachment,
  updateChecklistItemAssignee,
  toggleChecklistItem,
} from "../../actions/task-actions"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"

interface TaskDetailModalProps {
  task: TaskItem | null
  isOpen: boolean
  onClose: () => void
  onTaskUpdated?: (task: TaskItem, unblockedTasks?: TaskItem[]) => void
  onTaskDeleted?: (taskId: string) => void
  collaborators: TaskCollaborator[]
  availableTasks?: TaskItem[]
  onSelectTask?: (task: TaskItem) => void
  isLeadOrPm?: boolean
  currentStaffId?: string | null
}

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
  collaborators,
  availableTasks,
  onSelectTask,
  isLeadOrPm = true,
  currentStaffId,
}: TaskDetailModalProps) {
  if (!task) return null

  const isTerminalLocked = !isLeadOrPm && task.status === "done"
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || "")
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const initialStatusRef = useRef<TaskStatus>(task.status)
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [type, setType] = useState<TaskType>(task.type)
  const [tags, setTags] = useState<string[]>(task.tags || [])
  const [progress, setProgress] = useState(task.progress_percentage || 0)
  const [assignedStaffId, setAssignedStaffId] = useState<string>(task.assigned_staff_id || "unassigned")
  const [qaStaffId, setQaStaffId] = useState<string>(task.qa_staff_id || "unassigned")
  const [estimatedHours, setEstimatedHours] = useState(task.estimated_hours || 0)
  const [actualHours, setActualHours] = useState(task.actual_hours || 0)
  const [dueDate, setDueDate] = useState(task.due_date || "")
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>(parseTaskChecklist(task.checklist))
  const [blockedByTaskId, setBlockedByTaskId] = useState<string>(task.blocked_by_task_id || "none")
  const [blockedReason, setBlockedReason] = useState<string>(task.blocked_reason || "")
  const [pendingLogWork, setPendingLogWork] = useState<{
    finalStatus: TaskStatus
    finalProgress: number
    targetLabel?: string
    isManualLog?: boolean
  } | null>(null)

  const currentBlocker = useMemo(() => {
    if (!blockedByTaskId || blockedByTaskId === "none") return null
    return (availableTasks || []).find((t) => t.id === blockedByTaskId) || task?.blocked_by || null
  }, [blockedByTaskId, availableTasks, task])

  const fullBlockerTask = useMemo(() => {
    if (!currentBlocker) return null
    return (availableTasks || []).find((t) => t.id === currentBlocker.id) || null
  }, [currentBlocker, availableTasks])

  const hasUnresolvedBlocker = Boolean(currentBlocker && currentBlocker.status !== "done")

  // Recurrence configuration
  const [isRecurring, setIsRecurring] = useState(task.is_recurring ?? false)
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>(task.recurrence_interval || "monthly")
  const [recurrenceDay, setRecurrenceDay] = useState<number>(task.recurrence_day || 1)

  // Attachments & Project References
  const [attachments, setAttachments] = useState<TaskAttachment[]>(task.attachments || [])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)

  // Comments
  const [comments, setComments] = useState<TaskComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Sync state when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || "")
      setStatus(task.status)
      setTags(task.tags || [])
      initialStatusRef.current = task.status
      setPriority(task.priority)
      setType(task.type)
      setProgress(task.progress_percentage || 0)
      setAssignedStaffId(task.assigned_staff_id || "unassigned")
      setQaStaffId(task.qa_staff_id || "unassigned")
      setEstimatedHours(task.estimated_hours || 0)
      setActualHours(task.actual_hours || 0)
      setDueDate(task.due_date || "")
      setChecklist(parseTaskChecklist(task.checklist))
      setAttachments(task.attachments || [])
      setIsRecurring(task.is_recurring ?? false)
      setRecurrenceInterval(task.recurrence_interval || "monthly")
      setRecurrenceDay(task.recurrence_day || 1)
      setBlockedByTaskId(task.blocked_by_task_id || "none")
      setBlockedReason(task.blocked_reason || "")
      loadComments(task.id)
    }
  }, [task?.id])

  const loadComments = async (taskId: string) => {
    setLoadingComments(true)
    try {
      const data = await getTaskComments(taskId)
      setComments(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleProgressSliderDrag = (values: number[]) => {
    let val = values[0]
    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c) => !c.completed)

    if (hasUnfinishedDeliverables && val > 95) {
      val = 95
      toast.warning("Entregables pendientes por completar", {
        description: "No puedes subir el avance al 100% mientras existan entregables pendientes en el checklist (avance limitado al 95%). Marca los entregables completados para desbloquear el 100%.",
        id: "unfinished-deliverables-warning-platform",
      })
    }

    if (val === 100 && hasUnresolvedBlocker) {
      val = 95
      toast.warning("Ticket con dependencia pendiente", {
        description: `No puedes subir el avance al 100%: depende de #${currentBlocker?.ticket_code || "ticket predecesor"} (${currentBlocker?.title || ""}), el cual aún está pendiente.`,
        id: "blocker-close-lock-slider",
      })
    }

    setProgress(val)
    let nextStatus: TaskStatus = initialStatusRef.current
    if (val === 100) {
      nextStatus = "done"
    } else if (val > 0) {
      nextStatus = initialStatusRef.current === "todo" ? "in_progress" : initialStatusRef.current
    } else {
      nextStatus = initialStatusRef.current === "in_progress" ? "todo" : initialStatusRef.current
    }
    setStatus(nextStatus)
  }

  // Checklist Handlers
  const handleToggleChecklist = async (itemId: string, currentVal: boolean) => {
    const nextVal = !currentVal
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              completed: nextVal,
              completed_at: nextVal ? new Date().toISOString() : undefined,
            }
          : item
      )
    )

    if (task?.id) {
      try {
        const res = await toggleChecklistItem(task.id, itemId, nextVal)
        if (res.success && res.task) {
          onTaskUpdated?.(res.task)
        } else if (!res.success) {
          toast.error(res.error || "No se pudo actualizar el estado del entregable")
          setChecklist((prev) =>
            prev.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    completed: currentVal,
                    completed_at: currentVal ? item.completed_at : undefined,
                  }
                : item
            )
          )
        }
      } catch (err: any) {
        console.error("Error al toggle checklist:", err)
      }
    }
  }

  const handleUpdateChecklistAssignee = async (itemId: string, staffId: string | null) => {
    setChecklist((prev) =>
      prev.map((c) => (c.id === itemId ? { ...c, assigned_staff_id: staffId } : c))
    )
    if (task?.id) {
      try {
        const res = await updateChecklistItemAssignee(task.id, itemId, staffId)
        if (!res.success) {
          toast.error(res.error || "No se pudo actualizar el responsable del entregable")
        } else if (onTaskUpdated && res.checklist) {
          onTaskUpdated({
            ...task,
            checklist: res.checklist,
          })
        }
      } catch (err: any) {
        toast.error("Error al actualizar responsable")
      }
    }
  }

  const handleUpdateChecklistWeek = (itemId: string, week: 1 | 2 | 3 | 4 | null) => {
    setChecklist((prev) =>
      prev.map((c) => (c.id === itemId ? { ...c, target_week: week } : c))
    )
  }

  const handleRemoveChecklistItem = (itemId: string) => {
    setChecklist((prev) => prev.filter((c) => c.id !== itemId))
  }

  const handleAddChecklistItem = (
    itemTitle: string,
    week: 1 | 2 | 3 | 4 | null,
    assigneeId: string | null
  ) => {
    const newItem: TaskChecklistItem = {
      id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: itemTitle,
      completed: false,
      target_week: week,
      assigned_staff_id: assigneeId,
    }
    setChecklist((prev) => [...prev, newItem])
  }

  // Attachments Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !task) return

    setIsUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await uploadTaskAttachment(formData)
      if (res.success && res.attachment) {
        const nextAttachments = [...attachments, res.attachment]
        setAttachments(nextAttachments)
        toast.success(`Archivo "${file.name}" añadido`)

        try {
          const updateRes = await updateTask(task.id, { attachments: nextAttachments })
          if (updateRes.success && updateRes.task) {
            onTaskUpdated?.(updateRes.task)
          }
        } catch (saveErr) {
          console.error("Error al persistir adjunto:", saveErr)
        }
      } else {
        toast.error(res.error || "Error al subir archivo")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al subir archivo")
    } finally {
      setIsUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleAddAttachment = (name: string, url: string, attType: string) => {
    const newAttachment: TaskAttachment = {
      id: `att-${Date.now()}`,
      name,
      url,
      type: attType,
      created_at: new Date().toISOString(),
    }
    setAttachments((prev) => [...prev, newAttachment])
    toast.success("Enlace agregado a referencias")
  }

  const handleRemoveAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId))
  }

  // Comments Handlers
  const handleAddComment = async (content: string, stagedAtts: TaskAttachment[]) => {
    if (!task) return
    const textToSend = [content, ...stagedAtts.map((a) => a.url)].filter(Boolean).join("\n")
    const res = await addTaskComment({
      taskId: task.id,
      content: textToSend,
      authorType: "owner",
      authorName: "Auditor / Tenant Owner",
    })
    if (res.success && res.comment) {
      setComments((prev) => [res.comment!, ...prev])
      toast.success("Comentario publicado")
    } else {
      throw new Error(res.error || "Error al publicar")
    }
  }

  const handleUploadCommentAttachment = async (file: File): Promise<TaskAttachment | null> => {
    if (!task) return null
    const formData = new FormData()
    formData.append("file", file)
    const res = await uploadTaskAttachment(formData)
    if (res.success && res.attachment) {
      const nextAttachments = [...attachments, res.attachment]
      setAttachments(nextAttachments)
      updateTask(task.id, { attachments: nextAttachments }).then((uRes) => {
        if (uRes.success && uRes.task) onTaskUpdated?.(uRes.task)
      })
      return res.attachment
    }
    return null
  }

  // Save and Delete Handlers
  const handleSaveDetails = async () => {
    if (!task) return

    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c) => !c.completed)
    let finalProgress = progress
    let finalStatus = status

    if (hasUnfinishedDeliverables) {
      if (finalProgress > 95) finalProgress = 95
      if (finalStatus === "done") {
        finalStatus = "in_review"
        finalProgress = 95
        toast.warning("Entregables pendientes", {
          description: "La tarea no puede marcarse completada mientras existan entregables pendientes. Avance fijado al 95%.",
        })
      }
    }

    if (hasUnresolvedBlocker) {
      if (finalProgress > 95) finalProgress = 95
      if (finalStatus === "done") {
        toast.warning("Ticket con dependencia pendiente", {
          description: `No se puede marcar el ticket como completado: depende de #${currentBlocker?.ticket_code || "ticket predecesor"}, el cual aún está pendiente.`,
          id: "blocker-close-lock-modal",
        })
        return
      }
    } else if (finalStatus === "done") {
      finalProgress = 100
    }

    const isTransitioningToReviewOrDone =
      (finalStatus === "in_review" || finalStatus === "done") &&
      task.status !== finalStatus

    if (isTransitioningToReviewOrDone) {
      setPendingLogWork({
        finalStatus,
        finalProgress,
        targetLabel: finalStatus === "done" ? "Completar" : "Enviar a QA",
      })
      return
    }

    await executeSaveDetails(finalStatus, finalProgress, 0)
  }

  const executeSaveDetails = async (
    finalStatus: TaskStatus,
    finalProgress: number,
    loggedHours = 0,
    note?: string
  ) => {
    if (!task) return
    setIsSaving(true)
    try {
      const incrementalHours = loggedHours ? Number(loggedHours) : 0
      const totalActualHours = Math.round(((Number(actualHours) || 0) + incrementalHours) * 10) / 10

      const res = await updateTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        status: finalStatus,
        priority,
        type,
        progress_percentage: finalProgress,
        assigned_staff_id: assignedStaffId === "unassigned" ? null : assignedStaffId,
        qa_staff_id: qaStaffId === "unassigned" ? null : qaStaffId,
        estimated_hours: Number(estimatedHours),
        actual_hours: totalActualHours,
        due_date: dueDate || null,
        checklist,
        tags,
        attachments,
        is_recurring: isRecurring,
        recurrence_interval: isRecurring ? recurrenceInterval : null,
        recurrence_day: isRecurring ? recurrenceDay : null,
        blocked_by_task_id: blockedByTaskId === "none" ? null : blockedByTaskId,
        blocked_reason: finalStatus === "blocked" ? (blockedReason.trim() || null) : null,
        loggedHours: incrementalHours > 0 ? incrementalHours : undefined,
        note: note,
      } as any)

      if (res.success && res.task) {
        toast.success("Tarea actualizada con éxito")
        setStatus(finalStatus)
        setProgress(finalProgress)
        setActualHours(totalActualHours)
        initialStatusRef.current = finalStatus
        onTaskUpdated?.(res.task, res.unblockedTasks)
        onClose()
      } else {
        toast.error(res.error || "Error al actualizar la tarea")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al guardar cambios")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!task || !confirm("¿Seguro que deseas eliminar esta tarea?")) return
    try {
      const res = await deleteTask(task.id)
      if (res.success) {
        toast.success("Tarea eliminada")
        onTaskDeleted?.(task.id)
        onClose()
      }
    } catch (err: any) {
      toast.error("Error al eliminar la tarea")
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin p-0 gap-0 border-border bg-card">
          <DialogHeader className="sr-only">
            <DialogTitle>{title || "Detalle de Tarea"}</DialogTitle>
          </DialogHeader>

          {/* Hidden input for local file upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar,.txt"
          />

          {/* Header Jira Style */}
          <div className="p-4 sm:p-6 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Badge
                variant="outline"
                className="font-mono text-xs font-bold px-3 py-1 bg-primary/10 text-primary border border-primary/25 rounded-lg whitespace-nowrap shrink-0 shadow-xs tracking-wide"
              >
                {task.ticket_code}
              </Badge>
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 truncate">
                <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                {task.project?.name || "Proyecto"}
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs h-8"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Eliminar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveDetails}
                disabled={isSaving || isUploadingFile}
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-8 font-medium shadow-sm"
              >
                {isSaving ? "Guardando..." : "Guardar Cambios"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Main Content: 2-Column Jira Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
            {/* Left Column (Details, Progress, Checklist, References, Comments) */}
            <div className="lg:col-span-2 p-6 space-y-6 border-b lg:border-b-0 lg:border-r border-border/60">
              {/* If Meeting: Live Session Room & Attendance Console */}
              {task.type === "meeting" && (
                <TaskMeetingConsole
                  task={task}
                  currentStaffId={currentStaffId}
                  isLeadOrPm={isLeadOrPm}
                  onTaskUpdated={(updated) => {
                    onTaskUpdated?.(updated)
                    setActualHours(updated.actual_hours || 0)
                  }}
                />
              )}

              {/* Title */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Título del Ticket
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-base md:text-lg font-semibold bg-background"
                  placeholder="Título de la tarea o requerimiento..."
                />
              </div>

              {/* Compact Progress Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-muted/30 border border-border/60">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Avance
                    </span>
                  </div>
                  <div className="flex-1 px-1">
                    <Slider
                      value={[progress]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={handleProgressSliderDrag}
                      className="cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 min-w-[52px] justify-end">
                    <span className="text-sm sm:text-base font-black font-mono text-primary tracking-tight">
                      {progress}%
                    </span>
                    {progress === 100 && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                  </div>
                </div>

                {checklist.length > 0 && checklist.some((c) => !c.completed) && progress >= 95 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium px-2 py-1 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span>
                      Avance limitado al 95%: completa todos los entregables del checklist para habilitar el 100%.
                    </span>
                  </p>
                )}
              </div>

              {/* Blocker Alert Banner */}
              {status === "blocked" && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive dark:text-red-400 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-xs">
                    <Ban className="w-4 h-4 shrink-0" />
                    <span>Tarea Bloqueada</span>
                  </div>
                  {currentBlocker ? (
                    <div className="pl-5.5 text-xs text-foreground/90 font-normal leading-relaxed space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-muted-foreground">Bloqueada por el ticket:</span>
                        <button
                          type="button"
                          disabled={!fullBlockerTask || !onSelectTask}
                          onClick={() => fullBlockerTask && onSelectTask?.(fullBlockerTask)}
                          className={cn(
                            "inline-flex items-center gap-1 font-mono text-[11px] font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20",
                            fullBlockerTask && onSelectTask ? "hover:bg-primary/20 transition-colors cursor-pointer" : "cursor-default"
                          )}
                          title={fullBlockerTask && onSelectTask ? "Ver ticket predecesor" : undefined}
                        >
                          {currentBlocker.ticket_code || `TK-${currentBlocker.id.slice(0, 4)}`}
                        </button>
                        <span className="font-medium text-foreground truncate max-w-[320px]">
                          {currentBlocker.title}
                        </span>
                      </div>
                      {currentBlocker.status === "done" && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          El ticket predecesor ya ha sido completado. Esta tarea puede desbloquearse.
                        </p>
                      )}
                    </div>
                  ) : blockedReason ? (
                    <p className="text-xs text-foreground/90 font-normal leading-relaxed pl-5.5 whitespace-pre-wrap">
                      {blockedReason}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground font-normal leading-relaxed pl-5.5">
                      Esta tarea se encuentra detenida. Puedes indicar el motivo o vincular un ticket en el panel lateral.
                    </p>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Descripción & Criterios de Aceptación
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalla los requerimientos técnicos, enlaces de Figma, especificaciones..."
                  rows={4}
                  className="bg-background resize-none text-sm"
                />
              </div>

              {/* Modular Checklist & Subtasks Editor */}
              <TaskChecklistEditor
                checklist={checklist}
                collaborators={collaborators}
                isMeeting={type === "meeting"}
                disabled={isTerminalLocked}
                onToggleItem={handleToggleChecklist}
                onUpdateAssignee={handleUpdateChecklistAssignee}
                onUpdateWeek={handleUpdateChecklistWeek}
                onRemoveItem={handleRemoveChecklistItem}
                onAddItem={handleAddChecklistItem}
              />

              {/* Modular References, Links & Attachments Section */}
              <TaskAttachmentsSection
                attachments={attachments}
                disabled={isTerminalLocked}
                isUploadingFile={isUploadingFile}
                onTriggerFileUpload={() => fileInputRef.current?.click()}
                onAddAttachment={handleAddAttachment}
                onRemoveAttachment={handleRemoveAttachment}
              />

              {/* Modular Discussion Feed with Mentions and Staged Files */}
              <TaskDiscussionFeed
                comments={comments}
                loadingComments={loadingComments}
                collaborators={collaborators}
                availableTasks={availableTasks}
                onSelectTask={onSelectTask}
                onAddComment={handleAddComment}
                onUploadCommentAttachment={handleUploadCommentAttachment}
                disabled={isTerminalLocked}
              />
            </div>

            {/* Right Column (Jira Metadata Sidebar) */}
            <div className="p-6 bg-muted/10 space-y-5">
              {/* Status & Conditional Blocker */}
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Estado
                  </label>
                  <Select
                    value={status}
                    onValueChange={(val: TaskStatus) => {
                      setStatus(val)
                      if (val !== "blocked") {
                        setBlockedByTaskId("none")
                        setBlockedReason("")
                      }
                    }}
                    disabled={isTerminalLocked}
                  >
                    <SelectTrigger className="w-full bg-background h-9 text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="backlog">Backlog</SelectItem>
                      <SelectItem value="todo">Por Hacer</SelectItem>
                      <SelectItem value="in_progress">En Progreso</SelectItem>
                      <SelectItem value="in_review" disabled={hasUnresolvedBlocker}>
                        Revisión / QA {hasUnresolvedBlocker ? "(Bloqueado por dependencia)" : ""}
                      </SelectItem>
                      <SelectItem value="done" disabled={hasUnresolvedBlocker}>
                        Completado {hasUnresolvedBlocker ? "(Bloqueado por dependencia)" : ""}
                      </SelectItem>
                      <SelectItem value="blocked">Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                  {isTerminalLocked && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1.5 font-medium">
                      <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                      <span>Ticket finalizado. Solo el PM puede reabrirlo o cambiar su estado.</span>
                    </p>
                  )}
                </div>

                {/* Blocker input (only visible when status is Bloqueado) */}
                {status === "blocked" && (
                  <TaskBlockerSelector
                    blockedByTaskId={blockedByTaskId}
                    blockedReason={blockedReason}
                    onChange={({ blockedByTaskId: newId, blockedReason: newReason }) => {
                      setBlockedByTaskId(newId || "none")
                      setBlockedReason(newReason || "")
                    }}
                    availableTasks={availableTasks || []}
                    currentTaskId={task.id}
                    isBlockedStatus={true}
                  />
                )}
              </div>

              {/* Tags & Quality Stages */}
              <div className="pt-1 border-t border-border/60">
                <TaskTagSelector tags={tags} onChange={setTags} />
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Prioridad
                </label>
                <Select value={priority} onValueChange={(val: TaskPriority) => setPriority(val)}>
                  <SelectTrigger className="w-full bg-background h-9 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Tipo de Ticket
                </label>
                <Select value={type} onValueChange={(val: TaskType) => setType(val)}>
                  <SelectTrigger className="w-full bg-background h-9 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Tarea Estándar</SelectItem>
                    <SelectItem value="feature">Nueva Característica</SelectItem>
                    <SelectItem value="bug">Reporte de Bug</SelectItem>
                    <SelectItem value="improvement">Mejora</SelectItem>
                    <SelectItem value="delivery">Entrega de Cliente</SelectItem>
                    <SelectItem value="meeting">Reunión</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Responsable Asignado
                </label>
                <Select value={assignedStaffId} onValueChange={setAssignedStaffId}>
                  <SelectTrigger className="w-full bg-background h-9 text-xs">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sin asignar</SelectItem>
                    {collaborators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <span>{c.first_name} {c.last_name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">({c.role})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* QA Reviewer */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Revisor / Tester QA
                </label>
                <Select value={qaStaffId} onValueChange={setQaStaffId}>
                  <SelectTrigger className="w-full bg-background h-9 text-xs">
                    <SelectValue placeholder="Sin revisor QA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sin revisor</SelectItem>
                    {collaborators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <span>{c.first_name} {c.last_name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">({c.role})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Fecha de Entrega
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-background h-9 text-xs"
                />
              </div>

              {/* Modular Time Tracking Strip */}
              <TaskTimeCompactStrip
                estimatedHours={estimatedHours}
                actualHours={actualHours}
                isTerminalLocked={isTerminalLocked}
                canEditEstimated={true}
                onUpdateEstimatedHours={setEstimatedHours}
                onOpenLogWork={() =>
                  setPendingLogWork({
                    finalStatus: status,
                    finalProgress: progress,
                    targetLabel: "Registrar tiempo",
                    isManualLog: true,
                  })
                }
              />

              {/* Recurrence Config */}
              <div className="pt-2 border-t border-border/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Recurrencia
                  </label>
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary"
                  />
                </div>

                {isRecurring && (
                  <div className="p-3 rounded-xl bg-background border border-border/60 space-y-3">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                        Frecuencia
                      </label>
                      <Select
                        value={recurrenceInterval}
                        onValueChange={(val: RecurrenceInterval) => setRecurrenceInterval(val)}
                      >
                        <SelectTrigger className="w-full bg-background h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(RECURRENCE_INTERVAL_LABELS).map(([k, label]) => (
                            <SelectItem key={k} value={k} className="text-xs">
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {recurrenceInterval !== "daily" && (
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                          {recurrenceInterval === "weekly"
                            ? "Día de la semana (1 = Lun, 7 = Dom)"
                            : "Día del mes (1 al 28/31)"}
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={recurrenceInterval === "weekly" ? 7 : 31}
                          value={recurrenceDay}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value))
                            setRecurrenceDay(val)
                            updateTask(task.id, {
                              recurrence_day: val,
                            }).then((res) => {
                              if (res.success && res.task) onTaskUpdated?.(res.task)
                            })
                          }}
                          className="w-full bg-background h-8 text-xs font-mono rounded-lg"
                        />
                      </div>
                    )}

                    {task.next_recurrence_at && (
                      <div className="text-[10px] font-mono text-muted-foreground bg-primary/5 p-1.5 rounded border border-primary/15">
                        Próxima: {new Date(task.next_recurrence_at).toLocaleDateString("es-ES")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Agile Work Hours Imputation Modal */}
      {pendingLogWork && task && (
        <TaskLogWorkModal
          isOpen={!!pendingLogWork}
          onClose={() => setPendingLogWork(null)}
          task={task}
          targetStatus={pendingLogWork.finalStatus}
          targetLabel={pendingLogWork.targetLabel}
          onConfirm={async (loggedHours, note) => {
            const { finalStatus, finalProgress } = pendingLogWork
            setPendingLogWork(null)
            await executeSaveDetails(finalStatus, finalProgress, loggedHours, note)
          }}
          onSkip={async () => {
            const { finalStatus, finalProgress } = pendingLogWork
            setPendingLogWork(null)
            await executeSaveDetails(finalStatus, finalProgress, 0)
          }}
        />
      )}
    </>
  )
}
