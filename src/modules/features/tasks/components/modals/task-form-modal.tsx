"use client"

import React, { useState, useEffect, useRef } from "react"
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
import { Slider } from "@/components/ui/slider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CheckSquare,
  Clock,
  User,
  ShieldCheck,
  Send,
  Trash2,
  Calendar,
  AlertCircle,
  Plus,
  Flame,
  CheckCircle2,
  Layers,
  Sparkles,
  X,
  Paperclip,
  Link2,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  Loader2,
  Upload,
  TrendingUp,
  FolderArchive,
  RefreshCw,
  Ban,
  Headset,
} from "lucide-react"
import type {
  TaskItem,
  TaskProject,
  TaskCollaborator,
  TaskPriority,
  TaskType,
  TaskStatus,
  TaskChecklistItem,
  TaskAttachment,
  RecurrenceInterval,
} from "../../types"
import { RECURRENCE_INTERVAL_LABELS } from "../../types"
import { createTask, uploadTaskAttachment, promoteSupportTicketToTask } from "../../actions/task-actions"
import { TaskTagSelector } from "../tags/task-tag-selector"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/modules/infrastructure/utils/utils"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"

interface TaskFormModalProps {
  isOpen: boolean
  onClose: () => void
  onTaskCreated?: (task: TaskItem) => void
  projects: TaskProject[]
  collaborators: TaskCollaborator[]
  defaultProjectId?: string
  defaultStatus?: TaskStatus
  promotedFromTask?: TaskItem | null
}

export function TaskFormModal({
  isOpen,
  onClose,
  onTaskCreated,
  projects,
  collaborators,
  defaultProjectId,
  defaultStatus = "todo",
  promotedFromTask,
}: TaskFormModalProps) {
  const [projectId, setProjectId] = useState(
    defaultProjectId && defaultProjectId !== "all"
      ? defaultProjectId
      : projects[0]?.id || ""
  )
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<TaskStatus>(defaultStatus)
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [type, setType] = useState<TaskType>("task")
  const [tags, setTags] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [assignedStaffId, setAssignedStaffId] = useState("unassigned")
  const [qaStaffId, setQaStaffId] = useState("unassigned")
  const [dueDate, setDueDate] = useState("")
  const [estimatedHours, setEstimatedHours] = useState<number | string>(0)
  const [actualHours, setActualHours] = useState<number | string>(0)
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>([])
  const [newChecklistTitle, setNewChecklistTitle] = useState("")
  const [newChecklistWeek, setNewChecklistWeek] = useState<1 | 2 | 3 | 4 | null>(null)
  const [newChecklistAssignee, setNewChecklistAssignee] = useState<string>("unassigned")
  const [blockedReason, setBlockedReason] = useState("")

  // Recurrence configuration
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>("monthly")
  const [recurrenceDay, setRecurrenceDay] = useState(1)

  // Attachments & References
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [newRefUrl, setNewRefUrl] = useState("")
  const [newRefName, setNewRefName] = useState("")
  const [newRefType, setNewRefType] = useState<string>("auto")
  const [showAddRef, setShowAddRef] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset/Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setProjectId(
        defaultProjectId && defaultProjectId !== "all"
          ? defaultProjectId
          : (promotedFromTask?.project_id || projects[0]?.id || "")
      )
      if (promotedFromTask) {
        setTitle(promotedFromTask.title || "")
        setDescription(promotedFromTask.description || "")
        setStatus("todo")
        setBlockedReason("")
        setPriority(promotedFromTask.priority || "medium")
        setType(promotedFromTask.type || "task")
        setTags(promotedFromTask.tags || [])
        setProgress(0)
        setAssignedStaffId("unassigned")
        setQaStaffId("unassigned")
        setDueDate("")
        setEstimatedHours(0)
        setActualHours(0)
        setChecklist([])
        setNewChecklistTitle("")
        setNewChecklistWeek(null)
        setIsRecurring(false)
        setRecurrenceInterval("monthly")
        setRecurrenceDay(1)
        setAttachments(promotedFromTask.attachments || [])
        setNewRefUrl("")
        setNewRefName("")
        setShowAddRef(false)
      } else {
        setTitle("")
        setDescription("")
        setStatus(defaultStatus || "todo")
        setBlockedReason("")
        setPriority("medium")
        setType("task")
        setTags([])
        setProgress(0)
        setAssignedStaffId("unassigned")
        setQaStaffId("unassigned")
        setDueDate("")
        setEstimatedHours(0)
        setActualHours(0)
        setChecklist([])
        setNewChecklistTitle("")
        setNewChecklistWeek(null)
        setIsRecurring(false)
        setRecurrenceInterval("monthly")
        setRecurrenceDay(1)
        setAttachments([])
        setNewRefUrl("")
        setNewRefName("")
        setShowAddRef(false)
      }
    }
  }, [isOpen, defaultProjectId, defaultStatus, projects, promotedFromTask])

  const selectedProject = projects.find((p) => p.id === projectId)

  // Checklist Calculations
  const completedChecklistCount = checklist.filter((c) => c.completed).length
  const checklistPercentage =
    checklist.length > 0
      ? Math.round((completedChecklistCount / checklist.length) * 100)
      : 0

  // Checklist Handlers
  const handleAddChecklistItem = () => {
    if (!newChecklistTitle.trim()) return
    const newItem: TaskChecklistItem = {
      id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: newChecklistTitle.trim(),
      completed: false,
      target_week: newChecklistWeek,
      assigned_staff_id: newChecklistAssignee === "unassigned" ? null : newChecklistAssignee,
    }
    const updated = [...checklist, newItem]
    setChecklist(updated)
    setNewChecklistTitle("")
    setNewChecklistWeek(null)
    setNewChecklistAssignee("unassigned")
  }

  const handleUpdateChecklistWeek = (itemId: string, week: 1 | 2 | 3 | 4 | null) => {
    setChecklist((prev) =>
      prev.map((c) => (c.id === itemId ? { ...c, target_week: week } : c))
    )
  }

  const handleUpdateChecklistAssignee = (itemId: string, staffId: string | null) => {
    setChecklist((prev) =>
      prev.map((c) => (c.id === itemId ? { ...c, assigned_staff_id: staffId } : c))
    )
  }

  const handleToggleChecklist = (itemId: string, currentCompleted: boolean) => {
    const updated = checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !currentCompleted } : item
    )
    setChecklist(updated)

    // Adjust progress percentage automatically if slider wasn't manually set high
    const countDone = updated.filter((i) => i.completed).length
    const calc = Math.round((countDone / updated.length) * 100)
    setProgress(calc)
    if (calc === 100 && status !== "done") {
      setStatus("in_review")
    }
  }

  const handleRemoveChecklistItem = (itemId: string) => {
    const updated = checklist.filter((item) => item.id !== itemId)
    setChecklist(updated)
  }

  // Progress Slider Handlers
  const handleProgressSlider = (vals: number[]) => {
    const val = vals[0]
    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c) => !c.completed)

    if (val === 100 && hasUnfinishedDeliverables) {
      toast.warning("No puedes marcar 100% hasta completar todos los entregables (máximo 95%)", {
        duration: 3500,
      })
      setProgress(95)
      return
    }

    setProgress(val)
    if (val === 100 && status !== "done") {
      setStatus("done")
    } else if (val > 0 && status === "todo") {
      setStatus("in_progress")
    }
  }

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const file = files[0]

    setIsUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await uploadTaskAttachment(formData)
      if (res.success && res.attachment) {
        setAttachments((prev) => [...prev, res.attachment!])
        toast.success(`Archivo "${file.name}" subido con éxito`)
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

  // Add External Reference / Link
  const handleAddAttachment = () => {
    if (!newRefUrl.trim()) return
    const rawUrl = newRefUrl.trim()
    const fullUrl = rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`

    let detectedType = newRefType
    if (detectedType === "auto") {
      if (fullUrl.includes("figma.com")) detectedType = "figma"
      else if (fullUrl.includes("github.com")) detectedType = "github"
      else if (fullUrl.includes("docs.google.com") || fullUrl.includes("drive.google.com")) detectedType = "doc"
      else if (/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(fullUrl)) detectedType = "image"
      else detectedType = "link"
    }

    const defaultName =
      detectedType === "figma"
        ? "Diseño en Figma"
        : detectedType === "github"
        ? "Pull Request / Repositorio"
        : detectedType === "doc"
        ? "Documento de Especificación"
        : detectedType === "image"
        ? "Captura / Imagen de Referencia"
        : "Enlace de Referencia"

    const newAttachment: TaskAttachment = {
      id: `att-${Date.now()}`,
      name: newRefName.trim() || defaultName,
      url: fullUrl,
      type: detectedType,
      created_at: new Date().toISOString(),
    }

    setAttachments((prev) => [...prev, newAttachment])
    setNewRefUrl("")
    setNewRefName("")
    setNewRefType("auto")
    setShowAddRef(false)
    toast.success("Recurso añadido al ticket")
  }

  const handleRemoveAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId))
  }

  // Submit Handler
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Por favor ingresa el título de la tarea")
      return
    }
    if (!projectId) {
      toast.error("Por favor selecciona o crea un proyecto primero")
      return
    }

    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c) => !c.completed)
    let finalProgress = progress
    let finalStatus = status

    if (finalProgress === 100 && hasUnfinishedDeliverables) {
      finalProgress = 95
      if (finalStatus === "done") finalStatus = "in_review"
      toast.warning("Se ajustó al 95%: faltan entregables por marcar al 100%", { duration: 3500 })
    }

    setIsSubmitting(true)
    try {
      let res;
      if (promotedFromTask) {
        res = await promoteSupportTicketToTask({
          supportTicketId: promotedFromTask.id,
          projectId,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          type,
          assignedStaffId: assignedStaffId === "unassigned" ? null : assignedStaffId,
          dueDate: dueDate || null,
          estimatedHours: Number(estimatedHours) || 0,
          checklist,
          tags,
          attachments,
        })
      } else {
        res = await createTask({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || undefined,
          status: finalStatus,
          priority,
          type,
          progress_percentage: finalProgress,
          assigned_staff_id: assignedStaffId === "unassigned" ? null : assignedStaffId,
          qa_staff_id: qaStaffId === "unassigned" ? null : qaStaffId,
          due_date: dueDate || null,
          estimated_hours: Number(estimatedHours) || 0,
          actual_hours: Number(actualHours) || 0,
          checklist,
          tags,
          attachments,
          is_recurring: isRecurring,
          recurrence_interval: isRecurring ? recurrenceInterval : null,
          recurrence_day: isRecurring ? recurrenceDay : null,
          blocked_reason: finalStatus === "blocked" ? (blockedReason.trim() || null) : null,
        })
      }

      if (res.success && res.task) {
        toast.success(promotedFromTask ? "Ticket de soporte promovido exitosamente" : "Ticket creado con éxito")
        onTaskCreated?.(res.task)
        onClose()
      } else {
        toast.error(res.error || "No se pudo procesar la solicitud")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al crear la tarea")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto scrollbar-thin p-0 gap-0 border-border bg-card shadow-2xl rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Nuevo Requerimiento / Ticket</DialogTitle>
        </DialogHeader>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar,.txt"
        />

        {/* Top Header - Modern Linear / Jira Style */}
        <div className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-3 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-2">
            {promotedFromTask ? (
              <Headset className="w-4 h-4 text-sky-500 shrink-0" />
            ) : (
              <CheckSquare className="w-4 h-4 text-primary shrink-0" />
            )}
            <h2 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
              {promotedFromTask ? `Promover Ticket de Soporte #${promotedFromTask.ticket_code}` : "Nuevo Requerimiento / Ticket"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting || isUploadingFile}
              className={cn(
                "text-xs h-8 px-4 font-semibold shadow-sm rounded-lg",
                promotedFromTask
                  ? "bg-sky-600 hover:bg-sky-700 text-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  {promotedFromTask ? "Promoviendo..." : "Creando..."}
                </>
              ) : promotedFromTask ? (
                "Promover a Ticket"
              ) : (
                "Crear Ticket"
              )}
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

        {promotedFromTask && (
          <div className="px-5 py-2.5 bg-sky-500/10 border-b border-sky-500/20 text-xs flex items-center justify-between text-sky-800 dark:text-sky-300">
            <div className="flex items-center gap-2">
              <Headset className="w-4 h-4 text-sky-500 shrink-0" />
              <span>
                Ticket origen: <strong>#{promotedFromTask.ticket_code}</strong>. Al guardar, se creará este ticket de trabajo y se vinculará con trazabilidad completa.
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
              [Trazabilidad Bidireccional]
            </span>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Left Column (2 Cols on Desktop) */}
          <div className="lg:col-span-2 p-5 sm:p-6 space-y-6 border-b lg:border-b-0 lg:border-r border-border/60">
            {/* Project Selector */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Proyecto Asignado *
              </label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-full bg-background h-10 text-xs font-medium rounded-xl">
                  <SelectValue placeholder="Selecciona un proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="font-semibold">{p.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Título del Ticket *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base sm:text-lg font-bold bg-background rounded-xl"
                placeholder="Título de la tarea o requerimiento..."
              />
            </div>

            {/* Compact Progress Slider: [Avance] [Slider] [XX%] */}
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
                  onValueChange={handleProgressSlider}
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

            {/* Description */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Descripción & Criterios de Aceptación
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalla los requerimientos técnicos, alcance, casos de prueba, especificaciones o detalles de entrega..."
                rows={4}
                className="bg-background resize-none text-xs sm:text-sm rounded-xl"
              />
            </div>

            {/* Checklist of Deliverables */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Checklist de Entregables ({completedChecklistCount}/{checklist.length})
                  </span>
                </div>
                {checklist.length > 0 && (
                  <span className="text-xs font-bold text-muted-foreground font-mono">
                    {checklistPercentage}% completado
                  </span>
                )}
              </div>

              {checklist.length > 0 && (
                <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${checklistPercentage}%` }}
                  />
                </div>
              )}

              <div className="space-y-2">
                {checklist.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-background border border-border/60 hover:border-primary/40 transition-colors group"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleChecklist(item.id, item.completed)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary shrink-0"
                    />
                    <span
                      className={`text-xs sm:text-sm flex-1 ${
                        item.completed
                          ? "line-through text-muted-foreground"
                          : "text-foreground font-medium"
                      }`}
                    >
                      {item.title}
                    </span>

                    {/* Subtask Assignee selector */}
                    <Select
                      value={item.assigned_staff_id || "unassigned"}
                      onValueChange={(val) =>
                        handleUpdateChecklistAssignee(
                          item.id,
                          val === "unassigned" ? null : val
                        )
                      }
                    >
                      <SelectTrigger className="h-6 max-w-[120px] text-[10px] font-medium rounded-md border-border/60 bg-muted/30 px-1.5 py-0 gap-1 shrink-0 truncate">
                        <SelectValue placeholder="Responsable" />
                      </SelectTrigger>
                      <SelectContent className="text-xs max-w-[220px]">
                        <SelectItem value="unassigned" className="text-[11px] text-muted-foreground">
                          Sin asignar
                        </SelectItem>
                        {collaborators.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-[11px]">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="truncate">{c.first_name} {c.last_name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Week tag / selector */}
                    <Select
                      value={item.target_week ? String(item.target_week) : "general"}
                      onValueChange={(val) =>
                        handleUpdateChecklistWeek(
                          item.id,
                          val === "general" ? null : (Number(val) as 1 | 2 | 3 | 4)
                        )
                      }
                    >
                      <SelectTrigger className="h-6 w-20 text-[10px] font-semibold rounded-md border-border/60 bg-muted/30 px-1.5 py-0 gap-1 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="general" className="text-[11px] text-muted-foreground">General</SelectItem>
                        <SelectItem value="1" className="text-[11px] font-medium text-sky-600 dark:text-sky-400">Semana 1</SelectItem>
                        <SelectItem value="2" className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">Semana 2</SelectItem>
                        <SelectItem value="3" className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Semana 3</SelectItem>
                        <SelectItem value="4" className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Semana 4</SelectItem>
                      </SelectContent>
                    </Select>

                    {item.completed && (
                      <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/20 font-semibold px-2 py-0 shrink-0">
                        Listo
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      aria-label="Eliminar entregable"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                ))}

                {/* Add new checklist item input with week selector and assignee */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-1">
                  <Input
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddChecklistItem()}
                    placeholder="Añadir nuevo entregable o requisito de QA..."
                    className="h-8 text-xs bg-background rounded-lg flex-1 min-w-[140px]"
                  />
                  <Select
                    value={newChecklistAssignee}
                    onValueChange={setNewChecklistAssignee}
                  >
                    <SelectTrigger className="h-8 w-28 text-xs rounded-lg border-border/80 bg-background px-2 shrink-0">
                      <SelectValue placeholder="Responsable" />
                    </SelectTrigger>
                    <SelectContent className="text-xs max-w-[220px]">
                      <SelectItem value="unassigned" className="text-xs text-muted-foreground">
                        Sin asignar
                      </SelectItem>
                      {collaborators.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          <span className="truncate">{c.first_name} {c.last_name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={newChecklistWeek ? String(newChecklistWeek) : "general"}
                    onValueChange={(val) =>
                      setNewChecklistWeek(val === "general" ? null : (Number(val) as 1 | 2 | 3 | 4))
                    }
                  >
                    <SelectTrigger className="h-8 w-24 text-xs rounded-lg border-border/80 bg-background px-2 shrink-0">
                      <SelectValue placeholder="Semana" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="general" className="text-xs text-muted-foreground">General</SelectItem>
                      <SelectItem value="1" className="text-xs font-medium text-sky-600 dark:text-sky-400">Semana 1</SelectItem>
                      <SelectItem value="2" className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Semana 2</SelectItem>
                      <SelectItem value="3" className="text-xs font-medium text-amber-600 dark:text-amber-400">Semana 3</SelectItem>
                      <SelectItem value="4" className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Semana 4</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddChecklistItem}
                    className="h-8 px-3 text-xs rounded-lg border-border hover:border-primary/40 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Añadir
                  </Button>
                </div>
              </div>
            </div>

            {/* Resources, Attachments & Links */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wider truncate">
                    Enlaces & Referencias ({attachments.length})
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingFile}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-7 text-xs px-2.5 rounded-lg border-border text-foreground hover:bg-muted/40 font-medium shrink-0"
                  >
                    {isUploadingFile ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 mr-1 text-primary" />
                    )}
                    Subir desde PC
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddRef(!showAddRef)}
                    className="h-7 text-xs px-2.5 rounded-lg border-border text-foreground hover:bg-muted/40 font-medium shrink-0"
                  >
                    <Link2 className="w-3.5 h-3.5 mr-1 text-primary" />
                    {showAddRef ? "Cancelar" : "Enlaces"}
                  </Button>
                </div>
              </div>

              {/* Add Reference Collapsible Form */}
              <AnimatePresence>
                {showAddRef && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3.5 rounded-xl bg-muted/30 border border-primary/20 space-y-3 overflow-hidden shadow-xs"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                          URL del Recurso (Figma, GitHub, Docs, Imagen...)
                        </label>
                        <Input
                          value={newRefUrl}
                          onChange={(e) => setNewRefUrl(e.target.value)}
                          placeholder="https://figma.com/... o https://..."
                          className="h-8 text-xs bg-background rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                          Tipo de Enlace
                        </label>
                        <Select value={newRefType} onValueChange={setNewRefType}>
                          <SelectTrigger className="h-8 text-xs bg-background rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto-detectar</SelectItem>
                            <SelectItem value="figma">Figma Design</SelectItem>
                            <SelectItem value="github">GitHub PR / Repo</SelectItem>
                            <SelectItem value="image">Imagen / Captura</SelectItem>
                            <SelectItem value="doc">Documento / Especificación</SelectItem>
                            <SelectItem value="link">Enlace General</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                        Título o Descripción Breve (Opcional)
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={newRefName}
                          onChange={(e) => setNewRefName(e.target.value)}
                          placeholder="Ej: Mockup UI V2, Captura de bug, PR #12..."
                          className="h-8 text-xs bg-background flex-1 rounded-lg"
                          onKeyDown={(e) => e.key === "Enter" && handleAddAttachment()}
                        />
                        <Button
                          size="sm"
                          onClick={handleAddAttachment}
                          disabled={!newRefUrl.trim()}
                          className="h-8 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Guardar Enlace
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* References & Files List */}
              {attachments.length === 0 ? (
                <div className="py-2.5 px-3 rounded-xl border border-dashed border-border/70 text-center text-xs text-muted-foreground bg-muted/10">
                  <p>Sin referencias adjuntas</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {attachments.map((att) => {
                    const isImg = att.type === "image" || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(att.url)
                    const isFigma = att.type === "figma" || att.url.includes("figma.com")
                    const isGithub = att.type === "github" || att.url.includes("github.com")
                    const isDoc = att.type === "doc" || att.type === "sheet" || att.type === "pdf"

                    const formattedSize = att.size
                      ? att.size > 1024 * 1024
                        ? `${(att.size / (1024 * 1024)).toFixed(1)} MB`
                        : `${Math.round(att.size / 1024)} KB`
                      : null

                    return (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/60 hover:border-primary/40 transition-colors group gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {isImg ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-border/80 bg-muted/40 relative flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={att.url}
                                alt={att.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none"
                                }}
                              />
                              <ImageIcon className="w-4 h-4 text-muted-foreground absolute" />
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold",
                                isFigma
                                  ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                                  : isGithub
                                  ? "bg-zinc-800 text-zinc-100 dark:bg-zinc-700"
                                  : isDoc
                                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                  : "bg-primary/10 text-primary"
                              )}
                            >
                              {isFigma ? (
                                <span className="font-mono text-[11px] font-extrabold">F</span>
                              ) : isGithub ? (
                                <span className="font-mono text-[11px] font-extrabold">GH</span>
                              ) : isDoc ? (
                                <FileText className="w-3.5 h-3.5" />
                              ) : (
                                <Link2 className="w-3.5 h-3.5" />
                              )}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1 truncate"
                            >
                              <span className="truncate">{att.name}</span>
                              <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                            </a>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                              <span className="capitalize">{att.type || "archivo"}</span>
                              {formattedSize && (
                                <>
                                  <span>•</span>
                                  <span>{formattedSize}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="w-6 h-6 text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Eliminar recurso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Sidebar Controls) */}
          <div className="p-5 sm:p-6 bg-muted/10 space-y-5">
            {/* Status */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Estado
              </label>
              <Select value={status} onValueChange={(val: TaskStatus) => setStatus(val)}>
                <SelectTrigger className="w-full bg-background h-9 text-xs font-medium rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="todo">Por Hacer</SelectItem>
                  <SelectItem value="in_progress">En Progreso</SelectItem>
                  <SelectItem value="in_review">Revisión / QA</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                  <SelectItem value="done">Completado</SelectItem>
                </SelectContent>
              </Select>

              {status === "blocked" && (
                <div className="mt-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20 space-y-1.5">
                  <label className="text-[11px] font-semibold text-destructive dark:text-red-400 flex items-center gap-1.5">
                    <Ban className="w-3.5 h-3.5 shrink-0" />
                    Motivo del bloqueo
                  </label>
                  <Textarea
                    value={blockedReason}
                    onChange={(e) => setBlockedReason(e.target.value)}
                    placeholder="Motivo del bloqueo..."
                    className="text-xs bg-background min-h-[64px] resize-none border-border/80 focus-visible:ring-destructive/30 rounded-lg"
                    rows={2}
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Describe el motivo o impedimento que detiene esta tarea.
                  </p>
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Prioridad
              </label>
              <Select value={priority} onValueChange={(val: TaskPriority) => setPriority(val)}>
                <SelectTrigger className="w-full bg-background h-9 text-xs font-medium rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">Baja</span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Media</span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">Alta</span>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <span className="text-rose-600 dark:text-rose-400 font-bold">Urgente</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Tipo de Ticket
              </label>
              <Select value={type} onValueChange={(val: TaskType) => setType(val)}>
                <SelectTrigger className="w-full bg-background h-9 text-xs font-medium rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Tarea Estándar</SelectItem>
                  <SelectItem value="feature">Nueva Característica</SelectItem>
                  <SelectItem value="bug">Reporte de Bug</SelectItem>
                  <SelectItem value="improvement">Mejora</SelectItem>
                  <SelectItem value="delivery">Entrega de Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tags & Quality Stages */}
            <div className="pt-2 border-t border-border/60">
              <TaskTagSelector tags={tags} onChange={setTags} />
            </div>

            {/* Assignee */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Responsable Asignado
              </label>
              <Select value={assignedStaffId} onValueChange={setAssignedStaffId}>
                <SelectTrigger className="w-full bg-background h-9 text-xs rounded-xl truncate">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent className="max-w-[320px]">
                  <SelectItem value="unassigned">Sin asignar</SelectItem>
                  {collaborators.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <Avatar className="w-5 h-5 rounded-full shrink-0">
                          <AvatarImage
                            src={getCollaboratorAvatar(c.photo_url, c.first_name)}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-[9px] font-bold">
                            {c.first_name.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate">
                          {c.first_name} {c.last_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          ({c.role})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* QA Reviewer */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Revisor / Tester QA
              </label>
              <Select value={qaStaffId} onValueChange={setQaStaffId}>
                <SelectTrigger className="w-full bg-background h-9 text-xs rounded-xl truncate">
                  <SelectValue placeholder="Sin revisor QA" />
                </SelectTrigger>
                <SelectContent className="max-w-[320px]">
                  <SelectItem value="unassigned">Sin revisor</SelectItem>
                  {collaborators.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <Avatar className="w-5 h-5 rounded-full shrink-0">
                          <AvatarImage
                            src={getCollaboratorAvatar(c.photo_url, c.first_name)}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-[9px] font-bold">
                            {c.first_name.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate">
                          {c.first_name} {c.last_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          ({c.role})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Fecha Límite
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-background h-9 text-xs rounded-xl"
              />
            </div>

            {/* Recurrence Engine */}
            <div className="p-3 rounded-xl border border-border/80 bg-muted/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <RefreshCw className={cn("w-3.5 h-3.5", isRecurring ? "text-primary animate-spin-slow" : "text-muted-foreground")} />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                    Tarea Periódica / Recurrente
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary"
                />
              </div>

              {isRecurring && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                      Frecuencia de Renovación
                    </label>
                    <Select
                      value={recurrenceInterval}
                      onValueChange={(val: RecurrenceInterval) => setRecurrenceInterval(val)}
                    >
                      <SelectTrigger className="w-full bg-background h-8 text-xs rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(RECURRENCE_INTERVAL_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-xs">
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
                        onChange={(e) => setRecurrenceDay(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-background h-8 text-xs font-mono rounded-lg"
                      />
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground/90 leading-tight bg-primary/5 p-2 rounded-lg border border-primary/10">
                    🔁 Al cumplirse el ciclo, se autogenerará una nueva tarea con checklist reiniciado y nuevo correlativo.
                  </p>
                </div>
              )}
            </div>

            {/* Hours Estimated & Actual */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Horas Est.
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  className="bg-background h-8 text-xs font-mono rounded-lg"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Horas Reales
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={actualHours}
                  onChange={(e) => setActualHours(e.target.value)}
                  className="bg-background h-8 text-xs font-mono rounded-lg"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
