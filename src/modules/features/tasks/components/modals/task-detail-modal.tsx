"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
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
  Activity,
  X,
  Paperclip,
  Link2,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  Globe,
  TrendingUp,
  TrendingDown,
  Upload,
  Loader2,
  AtSign,
  Hash,
  RefreshCw,
  ChevronDown,
  Ban,
  AlertTriangle,
  Edit3,
  Check,
} from "lucide-react"
import type { TaskItem, TaskCollaborator, TaskComment, TaskStatus, TaskPriority, TaskType, TaskChecklistItem, TaskAttachment, RecurrenceInterval } from "../../types"
import { parseTaskChecklist, SYSTEM_STAGE_TAGS, RECURRENCE_INTERVAL_LABELS, TASK_STATUS_LABELS, parseSystemAuditNote } from "../../types"
import { TaskBlockerSelector } from "../shared/task-blocker-selector"
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
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/modules/infrastructure/utils/utils"
import { TaskTagSelector } from "../tags/task-tag-selector"

function renderFormattedComment(
  content: string,
  availableTasks?: TaskItem[],
  onSelectTask?: (task: TaskItem) => void
) {
  const regex = /(#[A-Za-z0-9_-]+|@[A-Za-z0-9_\u00C0-\u017F]+|https?:\/\/[^\s]+)/g
  const parts = content.split(regex)

  return parts.map((part, index) => {
    if (!part) return null

    if (part.startsWith("#")) {
      const code = part.slice(1)
      const matchedTask = availableTasks?.find(
        (t) =>
          (t.ticket_code && t.ticket_code.toLowerCase() === code.toLowerCase()) ||
          t.id.toLowerCase() === code.toLowerCase() ||
          `tk-${t.id.slice(0, 4)}`.toLowerCase() === code.toLowerCase()
      )

      return (
        <button
          key={index}
          type="button"
          onClick={() => {
            if (matchedTask && onSelectTask) {
              onSelectTask(matchedTask)
              toast.info(`Abriendo ticket ${matchedTask.ticket_code || code}`)
            }
          }}
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[11px] font-semibold transition-all shadow-2xs mx-0.5 align-baseline",
            matchedTask && onSelectTask
              ? "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 cursor-pointer"
              : "bg-muted text-foreground/90 border border-border/60"
          )}
          title={matchedTask ? `${matchedTask.ticket_code || code}: ${matchedTask.title}` : `Ticket #${code}`}
        >
          <Hash className="w-3 h-3 text-primary shrink-0" />
          <span>{matchedTask?.ticket_code || code}</span>
        </button>
      )
    }

    if (part.startsWith("@")) {
      const name = part.slice(1)
      return (
        <span
          key={index}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 font-medium text-[11px] mx-0.5 align-baseline"
        >
          <AtSign className="w-2.5 h-2.5 shrink-0" />
          <span>{name}</span>
        </span>
      )
    }

    if (part.startsWith("http://") || part.startsWith("https://")) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-primary hover:underline font-mono text-[11px] mx-0.5 align-baseline"
        >
          <ExternalLink className="w-2.5 h-2.5 inline" />
          <span>{part.replace(/^https?:\/\/(www\.)?/, "").slice(0, 30)}</span>
        </a>
      )
    }

    return <span key={index}>{part}</span>
  })
}

function parseProgressAudit(content: string) {
  const isProgress =
    content.startsWith("📈") ||
    content.startsWith("📉") ||
    content.toLowerCase().includes("avance de tarea actualizado") ||
    content.toLowerCase().includes("regresión de tarea actualizado") ||
    content.toLowerCase().includes("regresion de tarea actualizado")

  if (!isProgress) {
    return { isProgress: false, isRegression: false, formattedContent: content }
  }

  const match = content.match(/del\s+(\d+)%\s+al\s+(\d+)%/i)
  let isRegression =
    content.startsWith("📉") ||
    content.toLowerCase().includes("regresión") ||
    content.toLowerCase().includes("regresion")

  if (match) {
    const fromVal = parseInt(match[1], 10)
    const toVal = parseInt(match[2], 10)
    if (toVal < fromVal) {
      isRegression = true
    } else if (toVal > fromVal) {
      isRegression = false
    }
  }

  let formattedContent = content
  if (isRegression) {
    formattedContent = content
      .replace(/📈/g, "📉")
      .replace(/Avance de tarea/gi, "Regresión de tarea")
  } else {
    formattedContent = content
      .replace(/📉/g, "📈")
      .replace(/Regresión de tarea/gi, "Avance de tarea")
      .replace(/Regresion de tarea/gi, "Avance de tarea")
  }

  return { isProgress: true, isRegression, formattedContent }
}

interface TaskDetailModalProps {
  task: TaskItem | null
  isOpen: boolean
  onClose: () => void
  onTaskUpdated?: (task: TaskItem, unblockedTasks?: TaskItem[]) => void
  onTaskDeleted?: (taskId: string) => void
  collaborators: TaskCollaborator[]
  availableTasks?: TaskItem[]
  onSelectTask?: (task: TaskItem) => void
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
}: TaskDetailModalProps) {
  if (!task) return null

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
  const [newChecklistTitle, setNewChecklistTitle] = useState("")
  const [newChecklistWeek, setNewChecklistWeek] = useState<1 | 2 | 3 | 4 | null>(null)
  const [newChecklistAssignee, setNewChecklistAssignee] = useState<string>("unassigned")
  const [blockedByTaskId, setBlockedByTaskId] = useState<string>(task.blocked_by_task_id || "none")
  const [blockedReason, setBlockedReason] = useState<string>(task.blocked_reason || "")

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
  const [newRefUrl, setNewRefUrl] = useState("")
  const [newRefName, setNewRefName] = useState("")
  const [newRefType, setNewRefType] = useState<string>("auto")
  const [showAddRef, setShowAddRef] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)

  // Comments & Mentions
  const [comments, setComments] = useState<TaskComment[]>([])
  const [visibleCommentsCount, setVisibleCommentsCount] = useState(10)
  const [newCommentText, setNewCommentText] = useState("")
  const [loadingComments, setLoadingComments] = useState(false)
  const [isSendingComment, setIsSendingComment] = useState(false)
  const [mentionType, setMentionType] = useState<"collaborator" | "ticket" | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionCursorPos, setMentionCursorPos] = useState<number>(0)
  const commentInputRef = useRef<HTMLInputElement>(null)
  const [isSaving, setIsSaving] = useState(false)

  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
      return timeB - timeA
    })
  }, [comments])

  const displayedComments = useMemo(() => {
    return sortedComments.slice(0, visibleCommentsCount)
  }, [sortedComments, visibleCommentsCount])

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
      setNewChecklistWeek(null)
      setNewChecklistAssignee("unassigned")
      setVisibleCommentsCount(10)
      loadComments(task.id)
    }
  }, [task?.id])

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags)
  }

  const loadComments = async (taskId: string) => {
    setLoadingComments(true)
    try {
      const data = await getTaskComments(taskId)
      setComments(data)
      setVisibleCommentsCount(10)
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
      const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c) => !c.completed)
      let finalProgress = progress
      let finalStatus = status

      // Prevenir falso completado si aún existen entregables pendientes en el checklist
      if (hasUnfinishedDeliverables) {
        if (finalProgress > 95) finalProgress = 95
        if (finalStatus === "done") {
          finalStatus = "in_review"
          finalProgress = 95
          toast.warning("Entregables pendientes", {
            description: "La tarea no puede marcarse completada mientras existan entregables pendientes. Avance fijado al 95%."
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
          setIsSaving(false)
          return
        }
      } else if (finalStatus === "done") {
        finalProgress = 100
      }

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
        actual_hours: Number(actualHours),
        due_date: dueDate || null,
        checklist,
        tags,
        attachments,
        is_recurring: isRecurring,
        recurrence_interval: isRecurring ? recurrenceInterval : null,
        recurrence_day: isRecurring ? recurrenceDay : null,
        blocked_by_task_id: blockedByTaskId === "none" ? null : blockedByTaskId,
        blocked_reason: finalStatus === "blocked" ? (blockedReason.trim() || null) : null,
      })

      if (res.success && res.task) {
        toast.success("Tarea actualizada con éxito")
        setStatus(finalStatus)
        setProgress(finalProgress)
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

    setAttachments((prev) => [...prev, newAttachment])
    setNewRefUrl("")
    setNewRefName("")
    setNewRefType("auto")
    setShowAddRef(false)
  }

  const handleRemoveAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId))
  }

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

        // Auto-guardar archivo adjunto en la tarea para persistencia inmediata
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

  const handleToggleChecklist = async (itemId: string, currentVal: boolean) => {
    const nextVal = !currentVal
    // Actualización optimista instantánea
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
          // Revertir cambio optimista
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

  const handleAddChecklistItem = () => {
    if (!newChecklistTitle.trim()) return
    const newItem: TaskChecklistItem = {
      id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: newChecklistTitle.trim(),
      completed: false,
      target_week: newChecklistWeek,
      assigned_staff_id: newChecklistAssignee === "unassigned" ? null : newChecklistAssignee,
    }
    setChecklist((prev) => [...prev, newItem])
    setNewChecklistTitle("")
    setNewChecklistWeek(null)
    setNewChecklistAssignee("unassigned")
  }

  const handleUpdateChecklistWeek = (itemId: string, week: 1 | 2 | 3 | 4 | null) => {
    setChecklist((prev) =>
      prev.map((c) => (c.id === itemId ? { ...c, target_week: week } : c))
    )
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

  const handleRemoveChecklistItem = (itemId: string) => {
    setChecklist((prev) => prev.filter((c) => c.id !== itemId))
  }

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setNewCommentText(val)
    const cursor = e.target.selectionStart || val.length

    const textBeforeCursor = val.slice(0, cursor)
    const lastAt = textBeforeCursor.lastIndexOf("@")
    const lastHash = textBeforeCursor.lastIndexOf("#")

    if (lastAt !== -1 && (lastHash === -1 || lastAt > lastHash)) {
      const query = textBeforeCursor.slice(lastAt + 1)
      if (!/\s/.test(query)) {
        setMentionType("collaborator")
        setMentionQuery(query.toLowerCase())
        setMentionCursorPos(lastAt)
        return
      }
    } else if (lastHash !== -1 && (lastAt === -1 || lastHash > lastAt)) {
      const query = textBeforeCursor.slice(lastHash + 1)
      if (!/\s/.test(query)) {
        setMentionType("ticket")
        setMentionQuery(query.toLowerCase())
        setMentionCursorPos(lastHash)
        return
      }
    }

    setMentionType(null)
    setMentionQuery(null)
  }

  const handleSelectCollaborator = (collab: TaskCollaborator) => {
    const mentionTag = `@${collab.first_name}${collab.last_name ? ` ${collab.last_name}` : ""} `
    const before = newCommentText.slice(0, mentionCursorPos)
    const after = newCommentText.slice(mentionCursorPos + (mentionQuery?.length || 0) + 1)
    const newText = before + mentionTag + after
    setNewCommentText(newText)
    setMentionType(null)
    setMentionQuery(null)
    setTimeout(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus()
        const newPos = before.length + mentionTag.length
        commentInputRef.current.setSelectionRange(newPos, newPos)
      }
    }, 50)
  }

  const handleSelectTicket = (t: TaskItem) => {
    const code = t.ticket_code || `TK-${t.id.slice(0, 4)}`
    const mentionTag = `#${code} `
    const before = newCommentText.slice(0, mentionCursorPos)
    const after = newCommentText.slice(mentionCursorPos + (mentionQuery?.length || 0) + 1)
    const newText = before + mentionTag + after
    setNewCommentText(newText)
    setMentionType(null)
    setMentionQuery(null)
    setTimeout(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus()
        const newPos = before.length + mentionTag.length
        commentInputRef.current.setSelectionRange(newPos, newPos)
      }
    }, 50)
  }

  const filteredMentionCollaborators =
    mentionType === "collaborator" && mentionQuery !== null
      ? (collaborators || []).filter(
          (c) =>
            c.first_name.toLowerCase().includes(mentionQuery) ||
            c.last_name.toLowerCase().includes(mentionQuery) ||
            (c.role && c.role.toLowerCase().includes(mentionQuery))
        )
      : []

  const filteredMentionTickets =
    mentionType === "ticket" && mentionQuery !== null
      ? (availableTasks || [])
          .filter(
            (t) =>
              t.id !== task?.id &&
              ((t.ticket_code && t.ticket_code.toLowerCase().includes(mentionQuery)) ||
                t.title.toLowerCase().includes(mentionQuery))
          )
          .slice(0, 8)
      : []

  const handleAddComment = async () => {
    if (!newCommentText.trim() || !task) return
    setIsSendingComment(true)
    try {
      const res = await addTaskComment({
        taskId: task.id,
        content: newCommentText.trim(),
        authorType: "owner",
        authorName: "Auditor / Tenant Owner",
      })
      if (res.success && res.comment) {
        setComments((prev) => [res.comment!, ...prev])
        setNewCommentText("")
        setMentionType(null)
        setMentionQuery(null)
        toast.success("Comentario publicado")
      }
    } catch (err: any) {
      toast.error("Error al enviar comentario")
    } finally {
      setIsSendingComment(false)
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin p-0 gap-0 border-border bg-card">
        {/* Screen Reader Header */}
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
                placeholder="Título de la tarea o requerimiento..."
              />
            </div>

            {/* Compact Progress Slider: [Avance] [Slider] [XX%] */}
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
                        ✓ El ticket predecesor ya ha sido completado. Esta tarea puede desbloquearse.
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

            {/* Interactive Checklist & Subtasks */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Checklist de Entregables / Subtareas ({completedChecklistCount}/{checklist.length})
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
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-background border border-border/60 hover:border-primary/40 transition-colors group"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleChecklist(item.id, item.completed)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary shrink-0"
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
                      <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/20 shrink-0">
                        Listo
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      aria-label="Eliminar subtarea"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                ))}

                {/* Add new checklist item with week selector and assignee */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-1">
                  <Input
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddChecklistItem()}
                    placeholder="Añadir subtarea / entregable..."
                    className="h-8 text-xs bg-background flex-1 min-w-[140px]"
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
                    className="h-8 px-3 text-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Añadir
                  </Button>
                </div>
              </div>
            </div>

            {/* Project References, Links & Attachments */}
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
                <div className="py-2.5 px-3 rounded-xl border border-dashed border-border/70 text-center text-xs text-muted-foreground bg-muted/10">
                  <p>Sin referencias adjuntas</p>
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
                          aria-label="Eliminar referencia"
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Actividad & Discusión
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {comments.length} {comments.length === 1 ? "comentario" : "comentarios"}
                </span>
              </div>

              {/* Comment list */}
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {loadingComments ? (
                  <p className="text-xs text-muted-foreground italic">Cargando comentarios...</p>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No hay comentarios aún. Usa @ para mencionar a colaboradores o # para vincular tickets.
                  </p>
                ) : (
                  <>
                    {displayedComments.map((comment) => {
                      const auditInfo = parseSystemAuditNote(comment.content)
                      const isSystemEvent = comment.author_type === "system" || auditInfo.isAudit

                      // Single-line sleek compact note for system audit events (status, assignment, dates, blockers, progress)
                      if (isSystemEvent) {
                        return (
                          <div
                            key={comment.id}
                            className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-muted/40 hover:bg-muted/60 text-xs transition-colors border border-border/40"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-xs shrink-0">{auditInfo.icon}</span>
                              <span className="font-semibold text-foreground text-xs shrink-0">{comment.author_name || "Sistema"}</span>
                              <span className="text-muted-foreground/40 shrink-0">·</span>
                              <span className="truncate text-xs text-foreground/85 font-normal">
                                {auditInfo.formattedText}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground/70 font-mono shrink-0">
                              {new Date(comment.created_at).toLocaleDateString("es-ES", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )
                      }

                      // Regular discussion comments (multi-line)
                      return (
                        <div
                          key={comment.id}
                          className="p-3 rounded-xl border border-border/60 bg-background text-xs space-y-1.5 shadow-2xs"
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
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(comment.created_at).toLocaleDateString("es-ES", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="text-muted-foreground leading-relaxed pl-7 whitespace-pre-wrap">
                            {renderFormattedComment(comment.content, availableTasks, onSelectTask)}
                          </div>
                        </div>
                      )
                    })}

                    {sortedComments.length > visibleCommentsCount && (
                      <div className="pt-1 pb-0.5 flex justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setVisibleCommentsCount((prev) => prev + 10)}
                          className="text-xs text-muted-foreground hover:text-foreground h-7 gap-1.5 rounded-lg border border-border/40 hover:bg-muted/60 transition-colors"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>Cargar más ({sortedComments.length - visibleCommentsCount} anteriores)</span>
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Add comment input with floating autocomplete popover */}
              <div className="relative">
                {/* Floating Mention Autocomplete Menu (Collaborators & Tickets) */}
                <AnimatePresence>
                  {mentionType === "collaborator" && filteredMentionCollaborators.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute bottom-full left-0 mb-2 w-72 max-h-52 overflow-y-auto bg-popover border border-border/80 rounded-xl shadow-xl z-30 p-1 space-y-0.5"
                    >
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1 border-b border-border/40">
                        <AtSign className="w-3 h-3 text-primary" />
                        Mencionar a un colaborador
                      </div>
                      {filteredMentionCollaborators.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleSelectCollaborator(member)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-muted/80 text-xs transition-colors"
                        >
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={member.photo_url || undefined} />
                            <AvatarFallback className="text-[9px] font-bold">
                              {member.first_name.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground truncate">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {member.role}
                            </p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}

                  {mentionType === "ticket" && filteredMentionTickets.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute bottom-full left-0 mb-2 w-80 max-h-52 overflow-y-auto bg-popover border border-border/80 rounded-xl shadow-xl z-30 p-1 space-y-0.5"
                    >
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1 border-b border-border/40">
                        <Hash className="w-3 h-3 text-primary" />
                        Vincular Ticket / Tarea
                      </div>
                      {filteredMentionTickets.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectTicket(t)}
                          className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-muted/80 text-xs transition-colors group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="font-mono text-[10px] font-bold text-primary px-1.5 py-0.2 bg-primary/10 rounded border border-primary/20">
                                {t.ticket_code || `TK-${t.id.slice(0, 4)}`}
                              </span>
                              {t.project?.name && (
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {t.project.name}
                                </span>
                              )}
                            </div>
                            <p className="font-medium text-foreground truncate text-xs">
                              {t.title}
                            </p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2">
                  <Input
                    ref={commentInputRef}
                    value={newCommentText}
                    onChange={handleCommentChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && mentionType === null) {
                        e.preventDefault()
                        handleAddComment()
                      } else if (e.key === "Escape") {
                        setMentionType(null)
                        setMentionQuery(null)
                      }
                    }}
                    placeholder="Escribe un comentario, usa @ para colaboradores o # para tickets..."
                    className="text-xs h-9 bg-background rounded-xl"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={isSendingComment || !newCommentText.trim()}
                    className="h-9 px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isSendingComment ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
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
              <TaskTagSelector tags={tags} onChange={handleTagsChange} />
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
                  onChange={(e) => {
                    const checked = e.target.checked
                    setIsRecurring(checked)
                    updateTask(task.id, {
                      is_recurring: checked,
                      recurrence_interval: checked ? recurrenceInterval : null,
                      recurrence_day: checked ? recurrenceDay : null,
                    }).then((res) => {
                      if (res.success && res.task) {
                        onTaskUpdated?.(res.task)
                        toast.success(checked ? "Recurrencia activada" : "Recurrencia desactivada")
                      }
                    })
                  }}
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
                      onValueChange={(val: RecurrenceInterval) => {
                        setRecurrenceInterval(val)
                        updateTask(task.id, {
                          recurrence_interval: val,
                        }).then((res) => {
                          if (res.success && res.task) onTaskUpdated?.(res.task)
                        })
                      }}
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
