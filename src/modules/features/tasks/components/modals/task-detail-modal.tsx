"use client"

import React, { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  MessageSquare,
  X,
  Paperclip,
  Link2,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  Globe,
  TrendingUp
} from "lucide-react"
import type { TaskItem, TaskCollaborator, TaskComment, TaskStatus, TaskPriority, TaskType, TaskChecklistItem, TaskAttachment } from "../../types"
import { parseTaskChecklist } from "../../types"
import {
  updateTask,
  updateTaskProgress,
  toggleChecklistItem,
  deleteTask,
  getTaskComments,
  addTaskComment
} from "../../actions/task-actions"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/modules/infrastructure/utils/utils"

interface TaskDetailModalProps {
  task: TaskItem | null
  isOpen: boolean
  onClose: () => void
  onTaskUpdated?: (task: TaskItem) => void
  onTaskDeleted?: (taskId: string) => void
  collaborators: TaskCollaborator[]
}

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
  collaborators,
}: TaskDetailModalProps) {
  if (!task) return null

  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || "")
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const initialStatusRef = useRef<TaskStatus>(task.status)
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [type, setType] = useState<TaskType>(task.type)
  const [progress, setProgress] = useState(task.progress_percentage || 0)
  const [assignedStaffId, setAssignedStaffId] = useState<string>(task.assigned_staff_id || "unassigned")
  const [qaStaffId, setQaStaffId] = useState<string>(task.qa_staff_id || "unassigned")
  const [estimatedHours, setEstimatedHours] = useState(task.estimated_hours || 0)
  const [actualHours, setActualHours] = useState(task.actual_hours || 0)
  const [dueDate, setDueDate] = useState(task.due_date || "")
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>(parseTaskChecklist(task.checklist))
  const [newChecklistTitle, setNewChecklistTitle] = useState("")

  // Attachments & Project References
  const [attachments, setAttachments] = useState<TaskAttachment[]>(task.attachments || [])
  const [newRefUrl, setNewRefUrl] = useState("")
  const [newRefName, setNewRefName] = useState("")
  const [newRefType, setNewRefType] = useState<string>("auto")
  const [showAddRef, setShowAddRef] = useState(false)

  // Comments
  const [comments, setComments] = useState<TaskComment[]>([])
  const [newCommentText, setNewCommentText] = useState("")
  const [loadingComments, setLoadingComments] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Sync state when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || "")
      setStatus(task.status)
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

  const handleSaveDetails = async () => {
    if (!task) return
    setIsSaving(true)
    try {
      const res = await updateTask(task.id, {
        title,
        description,
        status,
        priority,
        type,
        progress_percentage: progress,
        assigned_staff_id: assignedStaffId === "unassigned" ? null : assignedStaffId,
        qa_staff_id: qaStaffId === "unassigned" ? null : qaStaffId,
        estimated_hours: Number(estimatedHours),
        actual_hours: Number(actualHours),
        due_date: dueDate || null,
        checklist,
        attachments,
      })

      if (res.success && res.task) {
        toast.success("Tarea actualizada con éxito")
        onTaskUpdated?.(res.task)
      } else {
        toast.error(res.error || "Error al actualizar la tarea")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al guardar cambios")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddAttachment = () => {
    if (!newRefUrl.trim() || !task) return
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

    const updated = [...attachments, newAttachment]
    setAttachments(updated)
    setNewRefUrl("")
    setNewRefName("")
    setNewRefType("auto")
    setShowAddRef(false)

    updateTask(task.id, { attachments: updated }).then((res) => {
      if (res.success && res.task) {
        toast.success("Referencia añadida con éxito")
        onTaskUpdated?.(res.task)
      }
    })
  }

  const handleRemoveAttachment = (attId: string) => {
    if (!task) return
    const updated = attachments.filter((a) => a.id !== attId)
    setAttachments(updated)
    updateTask(task.id, { attachments: updated }).then((res) => {
      if (res.success && res.task) {
        toast.success("Referencia eliminada")
        onTaskUpdated?.(res.task)
      }
    })
  }

  const handleProgressSliderDrag = (values: number[]) => {
    const val = values[0]
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

  const handleProgressSliderCommit = async (values: number[]) => {
    const val = values[0]
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

    if (task) {
      await updateTaskProgress(task.id, val)
      initialStatusRef.current = nextStatus
      onTaskUpdated?.({ ...task, progress_percentage: val, status: nextStatus })
      toast.success(`Progreso actualizado al ${val}%`)
    }
  }

  const handleToggleChecklist = async (itemId: string, currentVal: boolean) => {
    if (!task) return
    const nextVal = !currentVal
    const res = await toggleChecklistItem(task.id, itemId, nextVal)
    if (res.success && res.checklist) {
      setChecklist(res.checklist)
      if (res.progress !== undefined) {
        setProgress(res.progress)
        if (res.progress === 100) setStatus("done")
      }
      toast.success("Subtarea actualizada")
      onTaskUpdated?.({
        ...task,
        checklist: res.checklist,
        progress_percentage: res.progress ?? progress,
        status: res.progress === 100 ? "done" : status,
      })
    }
  }

  const handleAddChecklistItem = () => {
    if (!newChecklistTitle.trim() || !task) return
    const newItem = {
      id: `chk-${Date.now()}`,
      title: newChecklistTitle.trim(),
      completed: false,
    }
    const updated = [...checklist, newItem]
    setChecklist(updated)
    setNewChecklistTitle("")
    updateTask(task.id, { checklist: updated }).then((res) => {
      if (res.success && res.task) onTaskUpdated?.(res.task)
    })
  }

  const handleAddComment = async () => {
    if (!newCommentText.trim() || !task) return
    try {
      const res = await addTaskComment({
        taskId: task.id,
        content: newCommentText.trim(),
        authorType: "owner",
        authorName: "Auditor / Tenant Owner",
      })
      if (res.success && res.comment) {
        setComments((prev) => [...prev, res.comment!])
        setNewCommentText("")
        toast.success("Comentario publicado")
      }
    } catch (err: any) {
      toast.error("Error al enviar comentario")
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

  const completedChecklistCount = checklist.filter((c) => c.completed).length
  const checklistPercentage =
    checklist.length > 0 ? Math.round((completedChecklistCount / checklist.length) * 100) : 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-border bg-card">
        {/* Screen Reader Header */}
        <DialogHeader className="sr-only">
          <DialogTitle>{title || "Detalle de Tarea"}</DialogTitle>
        </DialogHeader>

        {/* Header Jira Style */}
        <div className="p-4 sm:p-6 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Badge variant="outline" className="font-mono text-xs font-bold px-3 py-1 bg-primary/10 text-primary border border-primary/25 rounded-lg whitespace-nowrap shrink-0 shadow-xs tracking-wide">
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
              disabled={isSaving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-8 font-medium shadow-sm"
            >
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground"
              title="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Content: 2-Column Jira Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Left Column (Details, Progress, Checklist, Comments) */}
          <div className="lg:col-span-2 p-6 space-y-6 border-b lg:border-b-0 lg:border-r border-border/60">
            {/* Title */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                Título del Ticket
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base md:text-lg font-semibold bg-background"
                placeholder="Nombre de la tarea..."
              />
            </div>

            {/* Manual Interactive Progress Slider (User requested) */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Avance y Progreso de Ejecución
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl sm:text-3xl font-black text-primary font-mono tracking-tight">{progress}%</span>
                  {progress === 100 && (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs px-2.5 py-1 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Completado
                    </Badge>
                  )}
                </div>
              </div>

              {/* Radix Slider with custom styled track */}
              <div className="pt-2 px-1">
                <Slider
                  value={[progress]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={handleProgressSliderDrag}
                  onValueCommit={handleProgressSliderCommit}
                  className="cursor-pointer"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground font-mono font-medium px-1">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

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

            {/* Interactive Checklist */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Checklist de Entregas ({completedChecklistCount}/{checklist.length})
                  </span>
                </div>
                {checklist.length > 0 && (
                  <span className="text-xs font-medium text-muted-foreground font-mono">
                    {checklistPercentage}% completado
                  </span>
                )}
              </div>

              {/* Checklist items */}
              <div className="space-y-2">
                {checklist.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border/60 hover:border-primary/40 transition-colors group"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleChecklist(item.id, item.completed)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary"
                    />
                    <span
                      className={`text-sm flex-1 ${
                        item.completed
                          ? "line-through text-muted-foreground"
                          : "text-foreground font-medium"
                      }`}
                    >
                      {item.title}
                    </span>
                    {item.completed && (
                      <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/20">
                        Listo
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        const updated = checklist.filter((c) => c.id !== item.id)
                        setChecklist(updated)
                      }}
                      title="Eliminar subtarea"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                ))}

                {/* Add new checklist item */}
                <div className="flex gap-2 pt-1">
                  <Input
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddChecklistItem()}
                    placeholder="Añadir nueva subtarea..."
                    className="h-8 text-xs bg-background"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddChecklistItem}
                    className="h-8 px-3 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Añadir
                  </Button>
                </div>
              </div>
            </div>

            {/* Project References, Links & Attachments */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Enlaces & Referencias de Proyecto ({attachments.length})
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddRef(!showAddRef)}
                  className="h-7 text-xs px-2.5 rounded-lg border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {showAddRef ? "Cancelar" : "Añadir Referencia"}
                </Button>
              </div>

              {/* Add Reference Form */}
              <AnimatePresence>
                {showAddRef && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3.5 rounded-xl bg-muted/30 border border-primary/20 space-y-3 overflow-hidden"
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
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                          Tipo de Enlace
                        </label>
                        <Select value={newRefType} onValueChange={setNewRefType}>
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto-detectar</SelectItem>
                            <SelectItem value="figma">Figma Design</SelectItem>
                            <SelectItem value="github">GitHub PR / Repo</SelectItem>
                            <SelectItem value="image">Imagen / Screenshot</SelectItem>
                            <SelectItem value="doc">Documento / Google Docs</SelectItem>
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
                          placeholder="Ej: Prototipo V2, Captura de QA..."
                          className="h-8 text-xs bg-background flex-1"
                          onKeyDown={(e) => e.key === "Enter" && handleAddAttachment()}
                        />
                        <Button
                          size="sm"
                          onClick={handleAddAttachment}
                          disabled={!newRefUrl.trim()}
                          className="h-8 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Guardar Enlace
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* References List */}
              {attachments.length === 0 ? (
                <div className="p-3.5 rounded-xl border border-dashed border-border/70 text-center text-xs text-muted-foreground bg-muted/10">
                  <p>Sin referencias adjuntas. Añade links de Figma, repositorios, imágenes o especificaciones.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {attachments.map((att) => {
                    const isImg = att.type === "image" || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(att.url)
                    const isFigma = att.type === "figma" || att.url.includes("figma.com")
                    const isGithub = att.type === "github" || att.url.includes("github.com")

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
                            <div className={cn(
                              "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold",
                              isFigma ? "bg-purple-500/15 text-purple-600 dark:text-purple-400" :
                              isGithub ? "bg-zinc-800 text-zinc-100 dark:bg-zinc-700" :
                              "bg-primary/10 text-primary"
                            )}>
                              {isFigma ? (
                                <span className="font-mono text-[11px] font-extrabold">F</span>
                              ) : isGithub ? (
                                <span className="font-mono text-[11px] font-extrabold">GH</span>
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
                              className="text-xs font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1 truncate group-hover:underline"
                            >
                              <span className="truncate">{att.name}</span>
                              <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                            </a>
                            <p className="text-[10px] text-muted-foreground font-mono truncate">
                              {att.url.replace(/^https?:\/\/(www\.)?/, "")}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => handleRemoveAttachment(att.id)}
                          title="Eliminar referencia"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Comments and Mentions Feed */}
            <div className="space-y-4 pt-4 border-t border-border/60">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Historial de Discusión & Menciones (@)
                </span>
              </div>

              {/* Comment list */}
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {loadingComments ? (
                  <p className="text-xs text-muted-foreground italic">Cargando comentarios...</p>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No hay comentarios aún. Usa @nombre para mencionar a los colaboradores.
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-3 rounded-lg bg-background border border-border/60 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={comment.author_avatar || undefined} />
                            <AvatarFallback className="text-[9px]">
                              {comment.author_name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-foreground">{comment.author_name}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                            {comment.author_type === "owner" ? "Admin" : "Colaborador"}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed pl-7 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Add comment input */}
              <div className="flex gap-2">
                <Input
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  placeholder="Escribe un comentario o menciona con @..."
                  className="text-xs h-9 bg-background"
                />
                <Button size="sm" onClick={handleAddComment} className="h-9 px-3">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column (Jira Metadata Sidebar) */}
          <div className="p-6 bg-muted/10 space-y-5">
            {/* Status */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Estado
              </label>
              <Select value={status} onValueChange={(val: TaskStatus) => setStatus(val)}>
                <SelectTrigger className="w-full bg-background h-9 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="todo">Por Hacer</SelectItem>
                  <SelectItem value="in_progress">En Progreso</SelectItem>
                  <SelectItem value="in_review">Revisión / QA</SelectItem>
                  <SelectItem value="done">Completado</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
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
                      {c.first_name} {c.last_name} ({c.role})
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

            {/* Hours */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Horas Estimadas
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(Number(e.target.value))}
                  className="bg-background h-9 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Horas Reales
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={actualHours}
                  onChange={(e) => setActualHours(Number(e.target.value))}
                  className="bg-background h-9 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
