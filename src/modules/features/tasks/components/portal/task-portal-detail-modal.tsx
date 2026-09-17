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
  Crown,
  Loader2,
  Upload,
  TrendingUp,
  SlidersHorizontal,
  AtSign,
  Download,
  FolderArchive,
  Hash,
  RefreshCw,
} from "lucide-react"
import type {
  TaskItem,
  TaskProject,
  TaskComment,
  TaskStatus,
  TaskPriority,
  TaskType,
  TaskChecklistItem,
  TaskAttachment,
  RecurrenceInterval,
} from "../../types"
import { parseTaskChecklist, RECURRENCE_INTERVAL_LABELS } from "../../types"
import {
  portalCreateTask,
  portalUpdateTask,
  portalDeleteTask,
  portalUpdateTaskProgress,
  portalToggleChecklist,
  portalGetTaskComments,
  portalAddTaskComment,
  portalUploadTaskAttachment
} from "../../actions/collaborator-portal-actions"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/modules/infrastructure/utils/utils"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"
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

interface TaskPortalDetailModalProps {
  task: TaskItem | null
  isOpen: boolean
  onClose: () => void
  token: string
  isLeadOrPm: boolean
  isQa?: boolean
  projects?: TaskProject[]
  teamMembers?: Array<{
    id: string
    first_name: string
    last_name: string
    photo_url?: string | null
    role: string
  }>
  isCreateMode?: boolean
  defaultStatus?: TaskStatus
  defaultProjectId?: string
  brandColor?: string
  onTaskCreated?: (task: TaskItem) => void
  onTaskUpdated?: (task: TaskItem) => void
  onTaskDeleted?: (taskId: string) => void
  availableTasks?: TaskItem[]
  onSelectTask?: (task: TaskItem) => void
}

export function TaskPortalDetailModal({
  task,
  isOpen,
  onClose,
  token,
  isLeadOrPm,
  isQa = false,
  projects = [],
  teamMembers = [],
  isCreateMode = false,
  defaultStatus,
  defaultProjectId,
  brandColor = "#8ec045",
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
  availableTasks = [],
  onSelectTask,
}: TaskPortalDetailModalProps) {
  const isCreating = isCreateMode || !task

  // Core task state
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    task?.project_id || defaultProjectId || projects[0]?.id || ""
  )
  const [title, setTitle] = useState(task?.title || "")
  const [description, setDescription] = useState(task?.description || "")
  const [status, setStatus] = useState<TaskStatus>(task?.status || defaultStatus || "todo")
  const initialStatusRef = useRef<TaskStatus>(task?.status || defaultStatus || "todo")
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || "medium")
  const [type, setType] = useState<TaskType>(task?.type || "task")
  const [tags, setTags] = useState<string[]>(task?.tags || [])
  const [progress, setProgress] = useState(task?.progress_percentage || 0)
  const [savedProgress, setSavedProgress] = useState(task?.progress_percentage || 0)
  const [assignedStaffId, setAssignedStaffId] = useState<string>(task?.assigned_staff_id || "unassigned")
  const [qaStaffId, setQaStaffId] = useState<string>(task?.qa_staff_id || "unassigned")
  const [estimatedHours, setEstimatedHours] = useState(task?.estimated_hours || 0)
  const [actualHours, setActualHours] = useState(task?.actual_hours || 0)
  const [dueDate, setDueDate] = useState(task?.due_date || "")
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>(parseTaskChecklist(task?.checklist))
  const [newChecklistTitle, setNewChecklistTitle] = useState("")
  const [newChecklistWeek, setNewChecklistWeek] = useState<1 | 2 | 3 | 4 | null>(null)

  // Recurrence configuration
  const [isRecurring, setIsRecurring] = useState(task?.is_recurring ?? false)
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>(task?.recurrence_interval || "monthly")
  const [recurrenceDay, setRecurrenceDay] = useState<number>(task?.recurrence_day || 1)

  // Attachments & Project References / Files
  const [attachments, setAttachments] = useState<TaskAttachment[]>(task?.attachments || [])
  const [newRefUrl, setNewRefUrl] = useState("")
  const [newRefName, setNewRefName] = useState("")
  const [newRefType, setNewRefType] = useState<string>("auto")
  const [showAddRef, setShowAddRef] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)

  // Comments & Mentions
  const [comments, setComments] = useState<TaskComment[]>([])
  const [newCommentText, setNewCommentText] = useState("")
  const [loadingComments, setLoadingComments] = useState(false)
  const [isSendingComment, setIsSendingComment] = useState(false)
  const [mentionType, setMentionType] = useState<"collaborator" | "ticket" | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionCursorPos, setMentionCursorPos] = useState<number>(0)
  const commentInputRef = useRef<HTMLInputElement>(null)

  // Loading states
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Sync state when task changes or modal opens
  useEffect(() => {
    if (task && !isCreating) {
      setSelectedProjectId(task.project_id)
      setTitle(task.title)
      setDescription(task.description || "")
      setStatus(task.status)
      initialStatusRef.current = task.status
      setPriority(task.priority)
      setType(task.type)
      setTags(task.tags || [])
      setProgress(task.progress_percentage || 0)
      setSavedProgress(task.progress_percentage || 0)
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
      setNewChecklistWeek(null)
      loadComments(task.id)
    } else if (isCreating) {
      setSelectedProjectId(defaultProjectId || projects[0]?.id || "")
      setTitle("")
      setDescription("")
      setStatus(defaultStatus || "todo")
      setPriority("medium")
      setType("task")
      setTags([])
      setProgress(0)
      setSavedProgress(0)
      setAssignedStaffId("unassigned")
      setQaStaffId("unassigned")
      setEstimatedHours(0)
      setActualHours(0)
      setDueDate("")
      setChecklist([])
      setAttachments([])
      setComments([])
      setIsRecurring(false)
      setRecurrenceInterval("monthly")
      setRecurrenceDay(1)
      setNewChecklistWeek(null)
    }
  }, [task?.id, isCreating, isOpen])

  const handleTagsChange = async (newTags: string[]) => {
    setTags(newTags)
    if (!isCreating && task) {
      try {
        const res = await portalUpdateTask(token, task.id, { tags: newTags })
        if (res.success && res.task) {
          onTaskUpdated?.(res.task)
          toast.success("Etiquetas actualizadas")
        }
      } catch (err: any) {
        toast.error("Error al actualizar etiquetas")
      }
    }
  }

  const loadComments = async (taskId: string) => {
    setLoadingComments(true)
    try {
      const data = await portalGetTaskComments(token, taskId)
      setComments(data)
    } catch (err) {
      console.error("Error loading comments:", err)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleSaveDetails = async () => {
    if (!title.trim()) {
      toast.error("Por favor ingresa un título para la tarea")
      return
    }

    if (isCreating && !selectedProjectId) {
      toast.error("Por favor selecciona un proyecto para el ticket")
      return
    }

    setIsSaving(true)
    try {
      if (isCreating) {
        const res = await portalCreateTask(token, {
          projectId: selectedProjectId,
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          type,
          assignedStaffId: assignedStaffId === "unassigned" ? null : assignedStaffId,
          qaStaffId: qaStaffId === "unassigned" ? null : qaStaffId,
          dueDate: dueDate || null,
          estimatedHours: Number(estimatedHours),
          checklist,
          tags,
          attachments,
          isRecurring: isRecurring,
          recurrenceInterval: isRecurring ? recurrenceInterval : null,
          recurrenceDay: isRecurring ? recurrenceDay : null,
        })

        if (res.success && res.task) {
          toast.success("¡Ticket de sprint creado con éxito!")
          onTaskCreated?.(res.task)
          onClose()
        } else {
          toast.error(res.error || "No se pudo crear el ticket")
        }
      } else if (task) {
        const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c) => !c.completed)
        let finalProgress = progress
        let finalStatus = status

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

        const res = await portalUpdateTask(token, task.id, {
          title: isLeadOrPm ? title : undefined,
          description,
          status: finalStatus,
          priority: isLeadOrPm ? priority : undefined,
          type: isLeadOrPm ? type : undefined,
          progressPercentage: finalProgress,
          assignedStaffId: isLeadOrPm ? (assignedStaffId === "unassigned" ? null : assignedStaffId) : undefined,
          qaStaffId: isLeadOrPm ? (qaStaffId === "unassigned" ? null : qaStaffId) : undefined,
          estimatedHours: isLeadOrPm ? Number(estimatedHours) : undefined,
          actualHours: Number(actualHours),
          dueDate: isLeadOrPm ? (dueDate || null) : undefined,
          checklist,
          tags: isLeadOrPm || isQa ? tags : undefined,
          attachments,
          isRecurring: isLeadOrPm ? isRecurring : undefined,
          recurrenceInterval: isLeadOrPm ? (isRecurring ? recurrenceInterval : null) : undefined,
          recurrenceDay: isLeadOrPm ? (isRecurring ? recurrenceDay : null) : undefined,
        })

        if (res.success && res.task) {
          toast.success("Tarea actualizada con éxito")
          setSavedProgress(finalProgress)
          setProgress(finalProgress)
          setStatus(finalStatus)
          onTaskUpdated?.(res.task)
        } else {
          toast.error(res.error || "Error al actualizar la tarea")
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Error al guardar cambios")
    } finally {
      setIsSaving(false)
    }
  }

  // Visual drag update without saving to server
  const handleProgressSliderDrag = (values: number[]) => {
    let val = values[0]
    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c) => !c.completed)
    if (hasUnfinishedDeliverables && val > 95) {
      val = 95
    }
    if (!isLeadOrPm && val < savedProgress) {
      val = savedProgress
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

  // Persist to server ONLY when user releases click/touch
  const handleProgressSliderCommit = async (values: number[]) => {
    let val = values[0]
    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c) => !c.completed)
    if (hasUnfinishedDeliverables && val > 95) {
      toast.warning("Faltan entregables por completar", {
        description: "Una tarea no puede avanzar del 95% hasta que todos sus entregables estén marcados al 100%."
      })
      val = 95
    }

    // Rule: Collaborators cannot regress progress below their saved progress
    if (!isLeadOrPm && val < savedProgress) {
      toast.info(`El avance no puede ser reducido por debajo del ${savedProgress}% registrado.`)
      val = savedProgress
      setProgress(val)
      return
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

    if (task && !isCreating) {
      const res = await portalUpdateTaskProgress(token, task.id, val)
      if (res.success) {
        setSavedProgress(val)
        initialStatusRef.current = nextStatus
        onTaskUpdated?.({ ...task, progress_percentage: val, status: nextStatus })
        toast.success(`Avance guardado en ${val}%`)
      } else {
        toast.error("Error al actualizar progreso")
        setProgress(savedProgress)
      }
    }
  }

  const handleSelectStatus = (newStatus: TaskStatus) => {
    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c) => !c.completed)
    if (newStatus === "done" && hasUnfinishedDeliverables) {
      toast.warning("Entregables pendientes", {
        description: "No se puede marcar la tarea como completada (100%) porque aún tiene entregables sin finalizar. Avance limitado al 95%."
      })
      setStatus("in_review")
      setProgress(95)
      return
    }
    setStatus(newStatus)
    if (newStatus === "done") {
      setProgress(100)
    }
  }

  const handleToggleChecklist = async (itemId: string, currentVal: boolean) => {
    const nextVal = !currentVal
    const updated = checklist.map((item) =>
      item.id === itemId ? { ...item, completed: nextVal } : item
    )
    setChecklist(updated)

    if (task && !isCreating) {
      const res = await portalToggleChecklist(token, task.id, itemId, nextVal)
      if (res.success && res.checklist) {
        setChecklist(res.checklist)
        if (res.progress !== undefined && res.progress > progress) {
          setProgress(res.progress)
          setSavedProgress(res.progress)
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
  }

  const handleAddChecklistItem = () => {
    if (!newChecklistTitle.trim()) return
    const newItem: TaskChecklistItem = {
      id: `chk-${Date.now()}`,
      title: newChecklistTitle.trim(),
      completed: false,
      target_week: newChecklistWeek,
    }
    const updated = [...checklist, newItem]
    setChecklist(updated)
    setNewChecklistTitle("")

    if (task && !isCreating) {
      portalUpdateTask(token, task.id, { checklist: updated }).then((res) => {
        if (res.success && res.task) onTaskUpdated?.(res.task)
      })
    }
  }

  const handleUpdateChecklistWeek = (itemId: string, week: 1 | 2 | 3 | 4 | null) => {
    const updated = checklist.map((c) => (c.id === itemId ? { ...c, target_week: week } : c))
    setChecklist(updated)

    if (task && !isCreating) {
      portalUpdateTask(token, task.id, { checklist: updated }).then((res) => {
        if (res.success && res.task) onTaskUpdated?.(res.task)
      })
    }
  }

  const handleRemoveChecklistItem = (itemId: string) => {
    const updated = checklist.filter((c) => c.id !== itemId)
    setChecklist(updated)

    if (task && !isCreating) {
      portalUpdateTask(token, task.id, { checklist: updated }).then((res) => {
        if (res.success && res.task) onTaskUpdated?.(res.task)
      })
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await portalUploadTaskAttachment(token, formData)
      if (res.success && res.attachment) {
        const updated = [...attachments, res.attachment]
        setAttachments(updated)
        toast.success(`Archivo "${file.name}" subido con éxito`)

        if (task && !isCreating) {
          portalUpdateTask(token, task.id, { attachments: updated }).then((uRes) => {
            if (uRes.success && uRes.task) onTaskUpdated?.(uRes.task)
          })
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

    const updated = [...attachments, newAttachment]
    setAttachments(updated)
    setNewRefUrl("")
    setNewRefName("")
    setNewRefType("auto")
    setShowAddRef(false)

    if (task && !isCreating) {
      portalUpdateTask(token, task.id, { attachments: updated }).then((res) => {
        if (res.success && res.task) {
          toast.success("Recurso añadido con éxito")
          onTaskUpdated?.(res.task)
        }
      })
    }
  }

  const handleRemoveAttachment = (attId: string) => {
    const updated = attachments.filter((a) => a.id !== attId)
    setAttachments(updated)

    if (task && !isCreating) {
      portalUpdateTask(token, task.id, { attachments: updated }).then((res) => {
        if (res.success && res.task) {
          toast.success("Recurso eliminado")
          onTaskUpdated?.(res.task)
        }
      })
    }
  }

  // Mentions autocomplete handler (Collaborators @ & Tickets #)
  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setNewCommentText(val)
    const cursor = e.target.selectionStart || val.length

    const textBeforeCursor = val.slice(0, cursor)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")
    const lastHashIndex = textBeforeCursor.lastIndexOf("#")

    if (lastAtIndex !== -1 && (lastHashIndex === -1 || lastAtIndex > lastHashIndex)) {
      const query = textBeforeCursor.slice(lastAtIndex + 1)
      if (!/\s/.test(query)) {
        setMentionType("collaborator")
        setMentionQuery(query.toLowerCase())
        setMentionCursorPos(lastAtIndex)
        return
      }
    } else if (lastHashIndex !== -1 && (lastAtIndex === -1 || lastHashIndex > lastAtIndex)) {
      const query = textBeforeCursor.slice(lastHashIndex + 1)
      if (!/\s/.test(query)) {
        setMentionType("ticket")
        setMentionQuery(query.toLowerCase())
        setMentionCursorPos(lastHashIndex)
        return
      }
    }

    setMentionType(null)
    setMentionQuery(null)
  }

  const handleSelectMention = (member: { first_name: string; last_name: string }) => {
    const mentionTag = `@${member.first_name}${member.last_name ? member.last_name.slice(0, 1) : ""} `
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

  const filteredMentionMembers =
    mentionType === "collaborator" && mentionQuery !== null
      ? teamMembers.filter(
          (m) =>
            m.first_name.toLowerCase().includes(mentionQuery) ||
            m.last_name.toLowerCase().includes(mentionQuery) ||
            m.role.toLowerCase().includes(mentionQuery)
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
      const res = await portalAddTaskComment(token, task.id, newCommentText.trim())
      if (res.success && res.comment) {
        setComments((prev) => [...prev, res.comment!])
        setNewCommentText("")
        setMentionType(null)
        setMentionQuery(null)
        toast.success("Comentario publicado")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al enviar comentario")
    } finally {
      setIsSendingComment(false)
    }
  }

  const handleDelete = async () => {
    if (!task) return
    if (!confirm("¿Seguro que deseas eliminar esta tarea de forma definitiva?")) return
    setIsDeleting(true)
    try {
      const res = await portalDeleteTask(token, task.id)
      if (res.success) {
        toast.success("Tarea eliminada exitosamente")
        onTaskDeleted?.(task.id)
        onClose()
      } else {
        toast.error(res.error || "No se pudo eliminar la tarea")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar la tarea")
    } finally {
      setIsDeleting(false)
    }
  }

  const completedChecklistCount = checklist.filter((c) => c.completed).length
  const checklistPercentage =
    checklist.length > 0 ? Math.round((completedChecklistCount / checklist.length) * 100) : 0

  const resolvedProject =
    projects.find((p) => p.id === (task?.project_id || selectedProjectId)) ||
    task?.project

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto scrollbar-thin p-0 gap-0 border-border bg-card shadow-2xl rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{title || (isCreating ? "Nuevo Ticket de Sprint" : "Detalle de Tarea")}</DialogTitle>
        </DialogHeader>

        {/* Hidden input for local file upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.rar,.txt"
        />

        {/* Top Header - Modern Linear / Jira Style */}
        <div className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-3 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0">
            {isCreating ? (
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                <h2 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
                  Nuevo Ticket de Sprint
                </h2>
              </div>
            ) : (
              <>
                <Badge
                  variant="outline"
                  className="font-mono text-xs font-bold px-3 py-1 bg-primary/10 text-primary border border-primary/25 rounded-lg whitespace-nowrap shrink-0 shadow-xs tracking-wide"
                >
                  {task?.ticket_code}
                </Badge>

                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 truncate">
                  <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                  {resolvedProject?.name || task?.project?.name || "Proyecto"}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isCreating && isLeadOrPm && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs h-8 px-3 rounded-lg"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                )}
                Eliminar
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleSaveDetails}
              disabled={isSaving || isUploadingFile}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-8 px-4 font-semibold shadow-sm rounded-lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  {isCreating ? "Creando..." : "Guardando..."}
                </>
              ) : isCreating ? (
                "Crear Ticket"
              ) : (
                "Guardar Cambios"
              )}
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

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Left Column (2 Cols on Desktop) */}
          <div className="lg:col-span-2 p-5 sm:p-6 space-y-6 border-b lg:border-b-0 lg:border-r border-border/60">
            {/* Project Selector (If in Create Mode) */}
            {isCreating && (
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Proyecto del Sprint *
                </label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="w-full bg-background h-10 text-xs font-medium rounded-xl">
                    <SelectValue placeholder="Selecciona un proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="font-semibold">{p.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Title Section */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Título del Ticket *
              </label>
              {isCreating || isLeadOrPm ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-base sm:text-lg font-bold bg-background rounded-xl"
                  placeholder="Título de la tarea o requerimiento..."
                />
              ) : (
                <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug p-1">
                  {title}
                </h3>
              )}
            </div>

            {/* Compact Progress Slider: [Avance] [Slider] [XX%] */}
            {!isCreating && (
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
                    onValueCommit={handleProgressSliderCommit}
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
            )}

            {/* Description & Criteria */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Descripción & Criterios de Aceptación
              </label>
              {isCreating || isLeadOrPm ? (
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalla los requerimientos técnicos, especificaciones, alcance, endpoints o casos de prueba..."
                  rows={4}
                  className="bg-background resize-none text-xs sm:text-sm rounded-xl"
                />
              ) : (
                <div className="p-3.5 rounded-xl bg-background border border-border/60 text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {description || <span className="text-muted-foreground italic">Sin descripción especificada.</span>}
                </div>
              )}
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

              {/* Progress bar of checklist */}
              {checklist.length > 0 && (
                <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${checklistPercentage}%` }}
                  />
                </div>
              )}

              {/* Checklist items */}
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

                    {/* Week tag / selector */}
                    {isLeadOrPm ? (
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
                    ) : item.target_week ? (
                      <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0 shrink-0 border-border/60 bg-muted/30">
                        Semana {item.target_week}
                      </Badge>
                    ) : null}

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
                      title="Eliminar subtarea"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                ))}

                {/* Add new checklist item with optional week selector */}
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddChecklistItem()}
                    placeholder="Añadir nueva subtarea..."
                    className="h-8 text-xs bg-background rounded-lg flex-1"
                  />
                  {isLeadOrPm && (
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
                  )}
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

            {/* Enlaces & Referencias */}
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
                              className="text-xs font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1 truncate group-hover:underline"
                            >
                              <span className="truncate">{att.name}</span>
                              <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                            </a>
                            <p className="text-[10px] text-muted-foreground font-mono truncate">
                              {formattedSize ? formattedSize : att.url.replace(/^https?:\/\/(www\.)?/, "")}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => handleRemoveAttachment(att.id)}
                          title="Eliminar recurso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Discussion Feed & Mentions (@) (Only in Edit Mode) */}
            {!isCreating && (
              <div className="space-y-4 pt-4 border-t border-border/60">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Historial de Discusión & Menciones (@) ({comments.length})
                  </span>
                </div>

                {/* Comment List */}
                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {loadingComments ? (
                    <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      Cargando comentarios...
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground italic border border-dashed rounded-xl">
                      No hay comentarios en este ticket aún. ¡Inicia la conversación usando @nombre!
                    </div>
                  ) : (
                    comments.map((c) => {
                      const isSystem = c.author_type === "system" || c.content.startsWith("📈")
                      return (
                        <div
                          key={c.id}
                          className={cn(
                            "p-3 rounded-xl border text-xs space-y-1.5 shadow-2xs",
                            isSystem
                              ? "bg-emerald-500/[0.04] border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                              : "bg-background border-border/60"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {!isSystem && (
                                <Avatar className="w-5 h-5 shrink-0" style={{ backgroundColor: brandColor }}>
                                  <AvatarImage src={getCollaboratorAvatar(c.author_avatar, c.author_name)} className="object-cover" />
                                  <AvatarFallback className="text-[9px] font-bold text-white" style={{ backgroundColor: brandColor }}>
                                    {c.author_name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <span className="font-semibold text-foreground">{c.author_name}</span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                                {isSystem ? "Sistema" : c.author_type === "owner" ? "Admin" : "Colaborador"}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(c.created_at).toLocaleDateString("es-ES", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="text-foreground/90 leading-relaxed pl-7 whitespace-pre-wrap">
                            {renderFormattedComment(c.content, availableTasks, onSelectTask)}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Add Comment Input with @ & # Mention Autocomplete Popover */}
                <div className="relative">
                  {/* Floating Mention Autocomplete Menu */}
                  <AnimatePresence>
                    {mentionType === "collaborator" && filteredMentionMembers.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute bottom-full left-0 mb-2 w-72 max-h-52 overflow-y-auto bg-popover border border-border/80 rounded-xl shadow-xl z-30 p-1 space-y-0.5"
                      >
                        <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1 border-b border-border/40">
                          <AtSign className="w-3 h-3 text-primary" />
                          Mencionar a un miembro del equipo
                        </div>
                        {filteredMentionMembers.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => handleSelectMention(member)}
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
            )}
          </div>

          {/* Right Column (Sidebar Controls) */}
          <div className="p-5 sm:p-6 bg-muted/10 space-y-5">
            {/* Status Selector */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Estado
              </label>
              <Select value={status} onValueChange={(val: TaskStatus) => handleSelectStatus(val)}>
                <SelectTrigger className="w-full bg-background h-9 text-xs font-medium rounded-xl truncate overflow-hidden">
                  <SelectValue className="truncate text-left" />
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

            {/* Priority Selector */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Prioridad
              </label>
              {isCreating || isLeadOrPm ? (
                <Select value={priority} onValueChange={(val: TaskPriority) => setPriority(val)}>
                  <SelectTrigger className="w-full bg-background h-9 text-xs font-medium rounded-xl truncate overflow-hidden">
                    <SelectValue className="truncate text-left" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs px-2.5 py-1 font-semibold rounded-lg whitespace-nowrap",
                    priority === "urgent"
                      ? "text-red-600 bg-red-500/10 border-red-500/20"
                      : priority === "high"
                      ? "text-amber-600 bg-amber-500/10 border-amber-500/20"
                      : priority === "medium"
                      ? "text-blue-600 bg-blue-500/10 border-blue-500/20"
                      : "text-zinc-600 bg-zinc-500/10 border-zinc-500/20"
                  )}
                >
                  {priority === "urgent"
                    ? "Urgente"
                    : priority === "high"
                    ? "Alta"
                    : priority === "medium"
                    ? "Media"
                    : "Baja"}
                </Badge>
              )}
            </div>

            {/* Type Selector */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Tipo de Ticket
              </label>
              {isCreating || isLeadOrPm ? (
                <Select value={type} onValueChange={(val: TaskType) => setType(val)}>
                  <SelectTrigger className="w-full bg-background h-9 text-xs font-medium rounded-xl truncate overflow-hidden">
                    <SelectValue className="truncate text-left" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Tarea Estándar</SelectItem>
                    <SelectItem value="feature">Nueva Característica</SelectItem>
                    <SelectItem value="bug">Reporte de Bug</SelectItem>
                    <SelectItem value="improvement">Mejora</SelectItem>
                    <SelectItem value="delivery">Entrega de Cliente</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className="text-xs px-2.5 py-1 font-medium rounded-lg whitespace-nowrap">
                  {type === "task"
                    ? "Tarea Estándar"
                    : type === "feature"
                    ? "Nueva Característica"
                    : type === "bug"
                    ? "Bug"
                    : type === "improvement"
                    ? "Mejora"
                    : "Entrega de Cliente"}
                </Badge>
              )}
            </div>

            {/* Tags & Quality Stages */}
            <div className="pt-2 border-t border-border/60">
              <TaskTagSelector
                tags={tags}
                onChange={handleTagsChange}
                readOnly={false}
                canManageCatalog={isLeadOrPm}
                portalToken={token}
              />
            </div>

            {/* Assignee Selector with Truncation */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Responsable Asignado
              </label>
              {isCreating || isLeadOrPm ? (
                <Select value={assignedStaffId} onValueChange={setAssignedStaffId}>
                  <SelectTrigger className="w-full bg-background h-9 text-xs rounded-xl truncate overflow-hidden">
                    <SelectValue placeholder="Sin asignar" className="truncate text-left" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[320px]">
                    <SelectItem value="unassigned">Sin asignar</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        <div className="flex items-center gap-2 truncate max-w-[280px]">
                          <span className="font-medium truncate">
                            {m.first_name} {m.last_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                            ({m.role})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-background border border-border/60 text-xs">
                  <Avatar className="w-6 h-6 shrink-0 rounded-full" style={{ backgroundColor: brandColor }}>
                    <AvatarImage src={getCollaboratorAvatar(task?.assigned_staff?.photo_url, task?.assigned_staff?.first_name)} className="object-cover" />
                    <AvatarFallback className="text-[10px] font-bold text-white" style={{ backgroundColor: brandColor }}>
                      {(task?.assigned_staff?.first_name || "A").slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">
                      {task?.assigned_staff
                        ? `${task.assigned_staff.first_name} ${task.assigned_staff.last_name}`
                        : "Sin asignar"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {task?.assigned_staff?.role || ""}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* QA Reviewer Selector with Truncation */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Revisor / Tester QA
              </label>
              {isCreating || isLeadOrPm ? (
                <Select value={qaStaffId} onValueChange={setQaStaffId}>
                  <SelectTrigger className="w-full bg-background h-9 text-xs rounded-xl truncate overflow-hidden">
                    <SelectValue placeholder="Sin revisor QA" className="truncate text-left" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[320px]">
                    <SelectItem value="unassigned">Sin revisor</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        <div className="flex items-center gap-2 truncate max-w-[280px]">
                          <span className="font-medium truncate">
                            {m.first_name} {m.last_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                            ({m.role})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-background border border-border/60 text-xs">
                  <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground truncate">
                    {task?.qa_staff
                      ? `${task.qa_staff.first_name} ${task.qa_staff.last_name}`
                      : "Sin revisor asignado"}
                  </span>
                </div>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Fecha de Entrega
              </label>
              {isCreating || isLeadOrPm ? (
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-background h-9 text-xs rounded-xl"
                />
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-background border border-border/60 text-xs">
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-mono truncate">
                    {dueDate
                      ? new Date(dueDate).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Sin fecha límite"}
                  </span>
                </div>
              )}
            </div>

            {/* Recurrence Engine */}
            {(isCreating || isLeadOrPm) && (
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
                      if (!isCreating && task) {
                        portalUpdateTask(token, task.id, {
                          isRecurring: checked,
                          recurrenceInterval: checked ? recurrenceInterval : null,
                          recurrenceDay: checked ? recurrenceDay : null,
                        }).then((res) => {
                          if (res.success && res.task) {
                            onTaskUpdated?.(res.task)
                            toast.success(checked ? "Recurrencia activada" : "Recurrencia desactivada")
                          }
                        })
                      }
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
                          if (!isCreating && task) {
                            portalUpdateTask(token, task.id, {
                              recurrenceInterval: val,
                            }).then((res) => {
                              if (res.success && res.task) onTaskUpdated?.(res.task)
                            })
                          }
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
                            if (!isCreating && task) {
                              portalUpdateTask(token, task.id, {
                                recurrenceDay: val,
                              }).then((res) => {
                                if (res.success && res.task) onTaskUpdated?.(res.task)
                              })
                            }
                          }}
                          className="w-full bg-background h-8 text-xs font-mono rounded-lg"
                        />
                      </div>
                    )}

                    {task?.next_recurrence_at && (
                      <div className="text-[10px] font-mono text-muted-foreground bg-primary/5 p-1.5 rounded border border-primary/15">
                        Próxima: {new Date(task.next_recurrence_at).toLocaleDateString("es-ES")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!isCreating && !isLeadOrPm && task?.is_recurring && (
              <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-medium text-foreground block">
                    Tarea Periódica ({task.recurrence_interval ? RECURRENCE_INTERVAL_LABELS[task.recurrence_interval] : "Recurrente"})
                  </span>
                  {task.next_recurrence_at && (
                    <span className="text-[10px] text-muted-foreground font-mono block">
                      Próxima renovación: {new Date(task.next_recurrence_at).toLocaleDateString("es-ES")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Hours Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1 truncate">
                  Horas Estimadas
                </label>
                {isCreating || isLeadOrPm ? (
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(Number(e.target.value))}
                    className="bg-background h-9 text-xs font-mono rounded-xl"
                  />
                ) : (
                  <div className="p-2 rounded-xl bg-background border border-border/60 text-xs font-mono font-semibold">
                    {estimatedHours}h
                  </div>
                )}
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1 truncate">
                  Horas Reales
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={actualHours}
                  onChange={(e) => setActualHours(Number(e.target.value))}
                  className="bg-background h-9 text-xs font-mono rounded-xl"
                />
              </div>
            </div>

            {/* Metadata Card (Edit Mode) */}
            {!isCreating && task && (
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 text-[11px] text-muted-foreground space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Creado:</span>
                  <span>{new Date(task.created_at).toLocaleDateString("es-ES")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Actualizado:</span>
                  <span>{new Date(task.updated_at).toLocaleDateString("es-ES")}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
