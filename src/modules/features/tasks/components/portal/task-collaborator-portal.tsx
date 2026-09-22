"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import {
  Bell,
  CheckCheck,
  Trash2,
  CheckCircle2,
  Clock,
  Flame,
  Bug,
  Sparkles,
  ShieldCheck,
  Send,
  Plus,
  Layers,
  CheckSquare,
  MessageSquare,
  AlertCircle,
  AlertTriangle,
  Briefcase,
  Code2,
  Palette,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Users,
  Search,
  Check,
  X,
  Calendar,
  UserCheck,
  Sun,
  Moon,
  AtSign,
  Settings,
  Pencil,
  ChevronDown,
  FolderPlus,
  LayoutDashboard,
  Kanban,
  User,
  CalendarDays,
  Lock,
  Ban,
} from "lucide-react"
import { ShimmerText } from "@/modules/core/dashboard/components/global-dashboard-banner"
import type { TaskItem, TaskStatus, TaskPriority, TaskChecklistItem, TaskComment, TaskWorkspace, TaskProject, TaskProgressAuditSummary, TaskSprint } from "../../types"
import { parseTaskChecklist, SYSTEM_STAGE_TAGS, parseSystemAuditNote } from "../../types"
import type { CollaboratorPortalData } from "../../actions/collaborator-portal-actions"
import {
  portalUpdateTaskProgress,
  portalUpdateTaskStatus,
  portalToggleChecklist,
  portalAddTaskComment,
  portalGetTaskComments,
  portalCreateTask,
  portalUpdateTaskPriority,
  portalAssignTask
} from "../../actions/collaborator-portal-actions"
import { realtimeManager } from "@/modules/core/database/supabase-realtime-manager"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/modules/infrastructure/utils/utils"
import { ViewToggle, ViewMode } from "@/modules/core/ui/components/view-toggle"
import { SearchFilterBar } from "@/modules/core/ui/components/search-filter-bar"
import { TaskKanbanBoard } from "../kanban/task-kanban-board"
import { TaskPortalDetailModal } from "./task-portal-detail-modal"
import { ProjectFormModal } from "../modals/project-form-modal"
import { WorkspaceFormModal } from "../modals/workspace-form-modal"
import { TaskPmOperationsDashboard } from "./task-pm-operations-dashboard"
import { TaskCollaboratorRibbon } from "./task-collaborator-ribbon"
import { TaskWeeklyPacingMatrix } from "../pacing/task-weekly-pacing-matrix"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"
import { GlobalParticles } from "@/components/layout/global-particles"
import { TaskSubtasksTooltipBadge } from "../shared/task-subtasks-tooltip-badge"
import { TaskLogWorkModal } from "../shared/task-log-work-modal"

const Lottie = dynamic(() => import("lottie-react"), { ssr: false })

interface PortalTaskSliderProps {
  taskId: string
  progress: number
  hasUnfinishedDeliverables?: boolean
  savedProg: number
  isLeadOrPm: boolean
  isMainAssignee?: boolean
  isBacklog?: boolean
  blockedBy?: {
    id: string
    ticket_code?: string | null
    title?: string
    status?: string
  } | null
  latestAudit?: TaskProgressAuditSummary | null
  onCommit: (taskId: string, val: number) => void
  className?: string
  trackClassName?: string
  showLabel?: boolean
  labelClassName?: string
}

function formatAuditShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const day = d.getDate()
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    const month = months[d.getMonth()] || "sep"
    const hours = d.getHours().toString().padStart(2, "0")
    const minutes = d.getMinutes().toString().padStart(2, "0")
    return `${day} ${month}, ${hours}:${minutes}`
  } catch {
    return dateStr
  }
}

// Self-contained memoized slider: holds local progress state during dragging
// and only commits on release, eliminating 60fps whole-page re-renders.
// Includes 2-second hover tooltip with compact previous change audit for Project Managers.
const PortalTaskSlider = React.memo(function PortalTaskSlider({
  taskId,
  progress,
  hasUnfinishedDeliverables,
  savedProg,
  isLeadOrPm,
  isMainAssignee = false,
  isBacklog = false,
  blockedBy,
  latestAudit,
  onCommit,
  className,
  trackClassName,
  showLabel = false,
  labelClassName,
}: PortalTaskSliderProps) {
  const canClose = isLeadOrPm || isMainAssignee
  const isBacklogLocked = Boolean(isBacklog && !isLeadOrPm)
  const isSliderDisabled = !canClose || isBacklogLocked
  const [localVal, setLocalVal] = useState(progress)
  const [showTooltip, setShowTooltip] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setLocalVal(progress)
  }, [progress])

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    }
  }, [])

  const handleMouseEnter = () => {
    if (isSliderDisabled) return
    // Only PMs/Leads get the 2-second quick audit inspection tooltip
    if (!latestAudit || isDragging) return
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      setShowTooltip(true)
    }, 1000) // 1-second hover delay as requested!
  }

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    setShowTooltip(false)
  }

  const handleChange = ([val]: number[]) => {
    if (isSliderDisabled) return
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    setShowTooltip(false)
    setIsDragging(true)
    let clamped = Math.max(0, Math.min(100, Math.round(val)))
    if (hasUnfinishedDeliverables && clamped > 95) clamped = 95
    if (!canClose && clamped > 95) clamped = 95
    const hasUnresolvedBlocker = blockedBy && blockedBy.status !== "done"
    if (clamped === 100 && hasUnresolvedBlocker) clamped = 95
    if (!isLeadOrPm && clamped < savedProg) clamped = savedProg
    setLocalVal(clamped)
  }

  const handleCommit = ([val]: number[]) => {
    if (isSliderDisabled) return
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    setShowTooltip(false)
    setIsDragging(false)
    let clamped = Math.max(0, Math.min(100, Math.round(val)))
    if (hasUnfinishedDeliverables && clamped > 95) clamped = 95
    if (!canClose && clamped > 95) {
      clamped = 95
      toast.warning("Cierre reservado al responsable directo", {
        description: "Al tener solo una subtarea asignada en este ticket, tu avance máximo permitido es del 95%. La aprobación y cierre formal corresponden al responsable directo del ticket o PM.",
        id: "collaborator-close-lock",
      })
    }
    const hasUnresolvedBlocker = blockedBy && blockedBy.status !== "done"
    if (clamped === 100 && hasUnresolvedBlocker) {
      clamped = 95
      toast.warning("Ticket con dependencia pendiente", {
        description: `No puedes completar este ticket al 100%: depende de #${blockedBy.ticket_code || "ticket predecesor"} (${blockedBy.title || ""}), el cual aún está pendiente.`,
        id: "blocker-close-lock",
      })
    }
    if (!isLeadOrPm && clamped < savedProg) clamped = savedProg
    setLocalVal(clamped)
    onCommit(taskId, clamped)
  }

  const firstName = latestAudit?.authorName ? latestAudit.authorName.trim().split(" ")[0] : "Colaborador"

  return (
    <div
      className={cn("relative flex items-center gap-2", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <AnimatePresence>
        {showTooltip && latestAudit && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 3, scale: 0.95 }}
            transition={{ duration: 0.16 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-50 pointer-events-none"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100 backdrop-blur-md border border-zinc-200/90 dark:border-white/10 shadow-xl whitespace-nowrap text-[11px] select-none">
              {/* Avatar chiquito */}
              <Avatar className="w-4 h-4 rounded-full ring-1 ring-zinc-300 dark:ring-white/20 shrink-0">
                <AvatarImage
                  src={getCollaboratorAvatar(latestAudit.authorAvatar, latestAudit.authorName)}
                  className="object-cover"
                />
                <AvatarFallback className="text-[7px] font-bold bg-primary text-primary-foreground">
                  {firstName.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Nombre 1 no más */}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{firstName}</span>

              <span className="text-zinc-400 dark:text-zinc-500">·</span>

              {/* anterior: 10%-40% (verde si avance, rojo si regresión) */}
              <span
                className={cn(
                  "font-bold flex items-center gap-1",
                  latestAudit.isRegression ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                )}
              >
                <span>{latestAudit.isRegression ? "📉" : "📈"}</span>
                <span>anterior: {latestAudit.fromProgress}%-{latestAudit.toProgress}%</span>
              </span>

              <span className="text-zinc-400 dark:text-zinc-500">·</span>

              {/* 18sep,13:05 */}
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                {formatAuditShortDate(latestAudit.createdAt)}
              </span>

              {/* Tooltip arrow down */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-solid border-t-white dark:border-t-zinc-900 border-t-[5px] border-x-transparent border-x-[5px] border-b-0" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isSliderDisabled ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex-1 cursor-not-allowed">
              <Slider
                value={[localVal]}
                min={0}
                max={100}
                step={5}
                disabled={true}
                className="cursor-not-allowed opacity-50"
                trackClassName={trackClassName}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-center max-w-[270px] text-xs font-normal">
            {isBacklogLocked
              ? "Requerimiento en Backlog: debe ser evaluado y aprobado por el PM antes de poder registrar avances."
              : "Control bloqueado: el avance general solo puede ser modificado por el responsable directo del ticket o el Gestor de Proyecto."}
          </TooltipContent>
        </Tooltip>
      ) : (
        <Slider
          value={[localVal]}
          min={0}
          max={100}
          step={5}
          disabled={false}
          onValueChange={handleChange}
          onValueCommit={handleCommit}
          className="cursor-pointer flex-1"
          trackClassName={trackClassName}
        />
      )}

      {isSliderDisabled && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex shrink-0 cursor-help">
              <Lock className="w-3 h-3 text-muted-foreground/60" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-center max-w-[260px] text-xs font-normal">
            {isBacklogLocked
              ? "Requerimiento en Backlog: aprobación requerida por el PM"
              : "Control bloqueado: solo el responsable directo o PM pueden modificar el avance"}
          </TooltipContent>
        </Tooltip>
      )}
      {showLabel && (
        <span className={cn("font-mono font-black text-primary shrink-0", labelClassName || "text-xs sm:text-[13px]")}>
          {localVal}%
        </span>
      )}
    </div>
  )
})

interface TaskCollaboratorPortalProps {
  portalData: CollaboratorPortalData
  token: string
}

export function TaskCollaboratorPortal({
  portalData,
  token,
}: TaskCollaboratorPortalProps) {
  const { staff, organization, projects: initialProjects = [], workspaces: initialWorkspaces = [], isLeadOrPm, isQa } = portalData
  const brandColor = organization?.primary_color || "#8ec045"
  const [workspaces, setWorkspaces] = useState<TaskWorkspace[]>(initialWorkspaces)
  const [projects, setProjects] = useState<TaskProject[]>(initialProjects)
  const [tasks, setTasks] = useState<TaskItem[]>(portalData.tasks)
  const [allTeamTasks, setAllTeamTasks] = useState<TaskItem[]>(portalData.allTeamTasks || [])
  const [availableTasks, setAvailableTasks] = useState<TaskItem[]>(portalData.availableTasks || portalData.allTeamTasks || portalData.tasks || [])
  const [latestAudits, setLatestAudits] = useState<Record<string, TaskProgressAuditSummary>>(portalData.latestAudits || {})
  const [sprints, setSprints] = useState<TaskSprint[]>(portalData.sprints || [])
  const [activeSprint, setActiveSprint] = useState<TaskSprint | null>(portalData.activeSprint || null)
  const [recentMentions, setRecentMentions] = useState(portalData.recentMentions || [])
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([])
  const teamMembers = portalData.teamMembers || []

  // Prop Synchronization
  useEffect(() => {
    setSprints(portalData.sprints || [])
  }, [portalData.sprints])

  useEffect(() => {
    setActiveSprint(portalData.activeSprint || null)
  }, [portalData.activeSprint])

  useEffect(() => {
    setTasks(portalData.tasks)
  }, [portalData.tasks])

  useEffect(() => {
    setAllTeamTasks(portalData.allTeamTasks || [])
  }, [portalData.allTeamTasks])

  useEffect(() => {
    setAvailableTasks(portalData.availableTasks || portalData.allTeamTasks || portalData.tasks || [])
  }, [portalData.availableTasks, portalData.allTeamTasks, portalData.tasks])

  useEffect(() => {
    setProjects(portalData.projects || [])
  }, [portalData.projects])

  useEffect(() => {
    setWorkspaces(portalData.workspaces || [])
  }, [portalData.workspaces])

  useEffect(() => {
    setRecentMentions(portalData.recentMentions || [])
  }, [portalData.recentMentions])

  // Realtime subscription for collaborator portal (task_items and task_comments)
  useEffect(() => {
    if (!organization?.id) return

    const channelName = `realtime_portal_tasks_org_${organization.id}`
    let isMounted = true

    realtimeManager.getOrCreateChannel(channelName, (channel) => {
      // 1. Task Items changes
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_items",
          filter: `organization_id=eq.${organization.id}`,
        },
        (payload) => {
          if (!isMounted) return

          if (payload.eventType === "UPDATE") {
            const updatedRow = payload.new as Partial<TaskItem>

            // Check for status change alerts to PM and stakeholders
            const existingTask = tasks.find((t) => t.id === updatedRow.id) || allTeamTasks.find((t) => t.id === updatedRow.id)
            if (existingTask && updatedRow.status && existingTask.status !== updatedRow.status) {
              const ticketCode = updatedRow.ticket_code || existingTask.ticket_code || "TK"
              const taskTitle = updatedRow.title || existingTask.title || "Tarea"
              const merged = { ...existingTask, ...updatedRow } as TaskItem

              if (updatedRow.status === "in_review" && (isLeadOrPm || (isQa && existingTask.qa_staff_id === staff.id))) {
                toast.info(`🔍 #${ticketCode} pasó a Revisión / QA`, {
                  description: `"${taskTitle}" está listo para revisión.`,
                  action: {
                    label: "Revisar",
                    onClick: () => openTaskDetail(merged),
                  },
                })
              } else if (updatedRow.status === "done" && (isLeadOrPm || existingTask.created_by_staff_id === staff.id)) {
                toast.success(`✅ #${ticketCode} completado`, {
                  description: `"${taskTitle}" ha sido finalizado.`,
                  action: {
                    label: "Ver",
                    onClick: () => openTaskDetail(merged),
                  },
                })
              } else if (updatedRow.status === "blocked" && isLeadOrPm) {
                toast.error(`🚫 #${ticketCode} fue bloqueado`, {
                  description: updatedRow.blocked_reason || `"${taskTitle}" requiere asistencia del PM.`,
                  action: {
                    label: "Ver",
                    onClick: () => openTaskDetail(merged),
                  },
                })
              }
            }

            const mergeTask = (prev: TaskItem[]) =>
              prev.map((t) => {
                if (t.id === updatedRow.id) {
                  return {
                    ...t,
                    ...updatedRow,
                    assigned_staff: t.assigned_staff,
                    qa_staff: t.qa_staff,
                    project: t.project,
                    blocked_by: t.blocked_by,
                  }
                }
                return t
              })
            setTasks(mergeTask)
            setAllTeamTasks(mergeTask)
            setAvailableTasks(mergeTask)
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as any)?.id
            if (deletedId) {
              setTasks((prev) => prev.filter((t) => t.id !== deletedId))
              setAllTeamTasks((prev) => prev.filter((t) => t.id !== deletedId))
              setAvailableTasks((prev) => prev.filter((t) => t.id !== deletedId))
            }
          }
        }
      )

      // 2. Task Comments changes (mentions & real-time alerts)
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "task_comments",
          filter: `organization_id=eq.${organization.id}`,
        },
        (payload) => {
          if (!isMounted) return
          const newComment = payload.new as any
          if (!newComment) return

          const isMentioned =
            (newComment.content && newComment.content.toLowerCase().includes(`@${staff.first_name.toLowerCase()}`)) ||
            (Array.isArray(newComment.mentions) && newComment.mentions.some((m: string) => m.toLowerCase() === staff.first_name.toLowerCase()))

          if (isMentioned && newComment.author_id !== staff.id) {
            setRecentMentions((prev) => {
              if (prev.some((m) => m.id === newComment.id)) return prev
              const targetTask =
                tasks.find((t) => t.id === newComment.task_id) ||
                allTeamTasks.find((t) => t.id === newComment.task_id) ||
                availableTasks.find((t) => t.id === newComment.task_id)

              const newMention = {
                id: newComment.id,
                task_id: newComment.task_id,
                ticket_code: targetTask?.ticket_code || `TK-${newComment.task_id.slice(0, 4)}`,
                task_title: targetTask?.title || "Tarea",
                author_name: newComment.author_name,
                author_avatar: newComment.author_avatar,
                content: newComment.content,
                created_at: newComment.created_at,
              }
              return [newMention, ...prev]
            })

            const auditInfo = parseSystemAuditNote(newComment.content)
            const sanitizedDescription = auditInfo.formattedText || (newComment.content || "").replace(/\s*\|\s*[Nn]otificando a\s+.*$/i, "").trim()
            toast.info(`🔔 Notificación para @${staff.first_name}`, {
              description: sanitizedDescription.slice(0, 100),
            })
          }
        }
      )

      // 3. Task Sprints realtime synchronization
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_sprints",
          filter: `organization_id=eq.${organization.id}`,
        },
        (payload) => {
          if (!isMounted) return
          if (payload.eventType === "INSERT") {
            const newSprint = payload.new as TaskSprint
            setSprints((prev) => {
              if (prev.some((s) => s.id === newSprint.id)) return prev
              return [newSprint, ...prev]
            })
            if (newSprint.status === "active") {
              setActiveSprint(newSprint)
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedSprint = payload.new as TaskSprint
            setSprints((prev) => prev.map((s) => (s.id === updatedSprint.id ? { ...s, ...updatedSprint } : s)))
            if (updatedSprint.status === "active") {
              setActiveSprint(updatedSprint)
            } else if (updatedSprint.status === "completed" && activeSprint?.id === updatedSprint.id) {
              setActiveSprint(null)
            }
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as any)?.id
            if (deletedId) {
              setSprints((prev) => prev.filter((s) => s.id !== deletedId))
              if (activeSprint?.id === deletedId) {
                setActiveSprint(null)
              }
            }
          }
        }
      )
    })

    return () => {
      isMounted = false
      realtimeManager.releaseChannel(channelName)
    }
  }, [organization?.id])

  // Workspace & Project Edit Modal States for PM Portal
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false)
  const [workspaceToEdit, setWorkspaceToEdit] = useState<TaskWorkspace | null>(null)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState<TaskProject | null>(null)

  const handleEditCurrentScope = () => {
    if (selectedProjectFilter.startsWith("workspace:")) {
      const wsId = selectedProjectFilter.replace("workspace:", "")
      const ws = workspaces.find((w) => w.id === wsId)
      if (ws) {
        setWorkspaceToEdit(ws)
        setIsWorkspaceModalOpen(true)
      }
    } else if (selectedProjectFilter !== "all") {
      const proj = projects.find((p) => p.id === selectedProjectFilter)
      if (proj) {
        setProjectToEdit(proj)
        setIsProjectModalOpen(true)
      }
    }
  }

  const handleWorkspaceUpdated = (updatedWs: TaskWorkspace) => {
    setWorkspaces((prev) => prev.map((w) => (w.id === updatedWs.id ? updatedWs : w)))
  }

  const handleWorkspaceDeleted = (workspaceId: string) => {
    setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId))
    if (selectedProjectFilter === `workspace:${workspaceId}`) {
      setSelectedProjectFilter("all")
    }
  }

  const handleProjectCreated = (newProject: TaskProject) => {
    setProjects((prev) => [newProject, ...prev])
    setSelectedProjectFilter(newProject.id)
    toast.success(`Proyecto "${newProject.name}" creado con éxito`)
  }

  const handleProjectUpdated = (updatedProj: TaskProject) => {
    setProjects((prev) => prev.map((p) => (p.id === updatedProj.id ? updatedProj : p)))
  }

  const handleProjectDeleted = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId))
    if (selectedProjectFilter === projectId) {
      setSelectedProjectFilter("all")
    }
  }

  // View Mode: 'list' (default) | 'kanban' | 'compact' | 'grid'
  const [viewMode, setViewMode] = useState<ViewMode>("list")

  // PM Portal View Mode: 'dashboard' (Hero + futuristic telemetry) | 'gestion' (clean tasks & team review) | 'pacing' (Weekly Pacing Matrix)
  const [pmViewMode, setPmViewMode] = useState<"dashboard" | "gestion" | "pacing">("dashboard")

  // Active tab filter & collaborator filter
  const [activeTab, setActiveTab] = useState<"my_tasks" | "in_progress" | "qa_queue" | "team_tasks">(
    isLeadOrPm ? "team_tasks" : isQa ? "qa_queue" : "my_tasks"
  )
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>("all")
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("active")

  // Pagination State for Management / Tasks views
  const [pageSize, setPageSize] = useState<number>(25)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Reset pagination when filters or view mode change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, selectedProjectFilter, selectedMemberFilter, viewMode])

  // Selected task for comments & details
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null)
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false)
  const [comments, setComments] = useState<TaskComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [isSendingComment, setIsSendingComment] = useState(false)

  const openTaskDetail = (task: TaskItem) => {
    setSelectedTask(task)
    setIsCommentModalOpen(true)
  }

  // Portal Theme Mode: 'light' | 'dark' (isolated to portal)
  const [portalTheme, setPortalTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    const saved = localStorage.getItem("portal_task_theme") as "light" | "dark" | null
    if (saved) {
      setPortalTheme(saved)
      if (saved === "dark") {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      const initial = prefersDark ? "dark" : "light"
      setPortalTheme(initial)
      if (initial === "dark") {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }
  }, [])

  const togglePortalTheme = () => {
    const next = portalTheme === "dark" ? "light" : "dark"
    setPortalTheme(next)
    localStorage.setItem("portal_task_theme", next)
    if (next === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  // PM creation modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("todo")

  // PM Quick Actions
  const handleUpdatePriority = async (taskId: string, newPriority: TaskPriority) => {
    const updateTaskState = (prev: TaskItem[]) =>
      prev.map((t) => (t.id === taskId ? { ...t, priority: newPriority } : t))
    setTasks(updateTaskState)
    setAllTeamTasks(updateTaskState)

    try {
      const res = await portalUpdateTaskPriority(token, taskId, newPriority)
      if (res.success) {
        toast.success(
          `Prioridad actualizada a ${
            newPriority === "urgent"
              ? "Urgente"
              : newPriority === "high"
              ? "Alta"
              : newPriority === "medium"
              ? "Media"
              : "Baja"
          }`
        )
      } else {
        toast.error("Error al actualizar prioridad")
      }
    } catch {
      toast.error("Error al actualizar prioridad")
    }
  }

  const handleAssignTask = async (taskId: string, targetStaffId: string) => {
    const targetMember = teamMembers.find((m) => m.id === targetStaffId)
    const updateTaskState = (prev: TaskItem[]) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            assigned_staff_id: targetStaffId === "unassigned" ? null : targetStaffId,
            assigned_staff:
              targetMember && targetStaffId !== "unassigned"
                ? {
                    id: targetMember.id,
                    first_name: targetMember.first_name,
                    last_name: targetMember.last_name,
                    photo_url: targetMember.photo_url,
                    role: targetMember.role,
                  }
                : null,
          }
        }
        return t
      })
    setTasks(updateTaskState)
    setAllTeamTasks(updateTaskState)

    try {
      const res = await portalAssignTask(
        token,
        taskId,
        targetStaffId === "unassigned" ? null : targetStaffId
      )
      if (res.success) {
        toast.success(
          `Tarea asignada a ${targetMember ? targetMember.first_name : "colaborador"}`
        )
      } else {
        toast.error("Error al reasignar tarea")
      }
    } catch {
      toast.error("Error al reasignar tarea")
    }
  }

  // Celebration modal state (100% completion) - loaded strictly on-demand
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false)
  const [celebrationTask, setCelebrationTask] = useState<TaskItem | null>(null)
  const [celebrationLottie, setCelebrationLottie] = useState<any>(null)

  // Confirmation modal state for completing tasks
  const [taskToComplete, setTaskToComplete] = useState<TaskItem | null>(null)

  // Agile log work modal state (transition to QA or Complete)
  const [logWorkState, setLogWorkState] = useState<{ task: TaskItem; targetStatus: TaskStatus } | null>(null)

  // Computed metrics
  // Computed metrics (Active tasks strictly excluding backlog and done)
  const myTotal = tasks.length
  const myCompleted = tasks.filter((t) => t.status === "done").length
  const myInProgress = tasks.filter((t) => t.status === "in_progress").length
  const myInReview = tasks.filter((t) => t.status === "in_review").length
  const myActiveTasks = tasks.filter(
    (t) =>
      t.status === "todo" ||
      t.status === "in_progress" ||
      t.status === "in_review" ||
      t.status === "blocked"
  )
  const myActiveTotal = myActiveTasks.length
  const myActiveProgress =
    myActiveTotal > 0
      ? Math.round(
          myActiveTasks.reduce((acc, t) => acc + (t.progress_percentage || 0), 0) /
            myActiveTotal
        )
      : myCompleted > 0
      ? 100
      : 0

  const qaQueueTasks = allTeamTasks.filter((t) => t.status === "in_review")

  // Additional Sprint & Hero metrics
  const totalEstimatedHours = tasks.reduce((acc, t) => acc + (Number(t.estimated_hours) || 0), 0)
  const myActiveEstimatedHours = myActiveTasks.reduce(
    (acc, t) => acc + (Number(t.estimated_hours) || 0),
    0
  )
  const teamTotal = allTeamTasks.length
  const teamCompleted = allTeamTasks.filter((t) => t.status === "done").length
  const teamInProgress = allTeamTasks.filter((t) => t.status === "in_progress").length

  // Focus Task: either currently in_progress or the next todo
  const focusTask =
    tasks.find((t) => t.status === "in_progress") ||
    tasks.find((t) => t.status === "todo") ||
    null

  // Dynamic Greeting based on time of day (Dashboard style)
  const timeGreeting = useMemo(() => {
    const currentHour = new Date().getHours()
    if (currentHour >= 5 && currentHour < 12) {
      return "Buenos días"
    } else if (currentHour >= 12 && currentHour < 19) {
      return "Buenas tardes"
    } else {
      return "Buenas noches"
    }
  }, [])

  const collaboratorName = staff.first_name || "Colaborador"

  // Dynamic Hero State Configuration for different progress/roles/cases
  const heroConfig = useMemo(() => {
    const title = `${timeGreeting}, ${collaboratorName}`

    if (isLeadOrPm) {
      return {
        key: "pm",
        lottieUrl: "/animations/creative-team-brainstorming-session-2025-10-20-06-25-38-utc.json",
        title,
        desc: "Supervisa la cadencia del sprint, destraba revisiones en QA y coordina las asignaciones del equipo.",
        metricLabel: "Avance del Equipo",
        percentage: 0,
        completed: 0,
        total: 0,
      }
    }

    if (myTotal === 0) {
      return {
        key: "empty",
        lottieUrl: "/animations/time-for-coffee-break-animated-icon-2025-10-20-06-00-36-utc.json",
        title,
        desc: "No tienes tareas pendientes asignadas por el momento en tu bandeja. Todo al día.",
        metricLabel: "Tu Avance en Activas",
        percentage: 100,
        completed: 0,
        total: 0,
      }
    }

    if (myActiveTotal === 0 && myCompleted > 0) {
      return {
        key: "completed",
        lottieUrl: "/animations/business-goal-achievement-and-target-success-2025-10-20-06-18-35-utc.json",
        title,
        desc: `Has finalizado con éxito todas tus ${myCompleted} tareas asignadas en este sprint.`,
        metricLabel: "Tu Avance en Activas",
        percentage: 100,
        completed: myCompleted,
        total: myCompleted,
      }
    }

    if (myInProgress > 0 || myActiveProgress > 0) {
      return {
        key: "in_progress",
        lottieUrl: "/animations/animated-office-workspace-desk-with-computer-and-b-2025-10-20-06-00-41-utc.json",
        title,
        desc: `Tienes ${myInProgress} tarea${myInProgress > 1 ? "s" : ""} en curso y un avance del ${myActiveProgress}% en tus tareas activas.`,
        metricLabel: "Mi Avance en Activas",
        percentage: myActiveProgress,
        completed: myCompleted,
        total: myActiveTotal,
      }
    }

    return {
      key: "todo",
      lottieUrl: "/animations/cartoon-task-list-illustration-2025-10-20-03-26-27-utc.json",
      title,
      desc: `Tienes ${myActiveTotal} tarea${myActiveTotal > 1 ? "s" : ""} activa${myActiveTotal > 1 ? "s" : ""} (${myActiveEstimatedHours > 0 ? `${myActiveEstimatedHours}h estimadas` : "listas para empezar"}).`,
      metricLabel: "Mi Avance en Activas",
      percentage: 0,
      completed: 0,
      total: myActiveTotal,
    }
  }, [
    timeGreeting,
    collaboratorName,
    isLeadOrPm,
    myTotal,
    myActiveTotal,
    myActiveProgress,
    myCompleted,
    myInProgress,
    myActiveEstimatedHours,
  ])

  // Lottie Animation for dynamic Hero Banner
  const [heroLottieData, setHeroLottieData] = useState<any>(null)

  useEffect(() => {
    let isCancelled = false
    fetch(heroConfig.lottieUrl)
      .then((r) => r.json())
      .then((data) => {
        if (!isCancelled) setHeroLottieData(data)
      })
      .catch((e) => console.error("Error loading hero Lottie:", e))
    return () => {
      isCancelled = true
    }
  }, [heroConfig.lottieUrl])

  const triggerCelebration = (task: TaskItem) => {
    setCelebrationTask(task)
    if (!celebrationLottie) {
      fetch("/animations/cartoon-marketing-target-illustration-2025-10-20-02-32-54-utc.json")
        .then((r) => r.json())
        .then((data) => setCelebrationLottie(data))
        .catch((e) => console.error("Error loading celebration Lottie:", e))
    }
    setIsCelebrationOpen(true)
  }

  // Task Notifications & Assignment Alert state
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false)
  const [alertTask, setAlertTask] = useState<TaskItem | null>(null)
  const [alertLottie, setAlertLottie] = useState<any>(null)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [seenTaskIds, setSeenTaskIds] = useState<string[]>([])

  // On-demand load of alert animation only when alert modal is opened
  useEffect(() => {
    if (isAlertModalOpen && !alertLottie) {
      fetch("/animations/cartoon-task-list-illustration-2025-10-20-03-26-27-utc.json")
        .then((r) => r.json())
        .then((data) => setAlertLottie(data))
        .catch((e) => console.error("Error loading alert Lottie animation:", e))
    }
  }, [isAlertModalOpen, alertLottie])

  useEffect(() => {

    try {
      const storageKey = `pixy_seen_tasks_${staff.id}`
      const stored = localStorage.getItem(storageKey)
      const seenList: string[] = stored ? JSON.parse(stored) : []
      setSeenTaskIds(seenList)

      // Find active tasks assigned to this collaborator that haven't been seen yet
      // Exclude tasks created by the collaborator themselves and tasks in backlog
      const assignedToMe = tasks.filter(
        (t) =>
          (t.assigned_staff_id === staff.id ||
            (isQa && t.qa_staff_id === staff.id) ||
            (Array.isArray(t.checklist) && t.checklist.some((c: any) => c.assigned_staff_id === staff.id))) &&
          t.status !== "done" &&
          t.status !== "backlog" &&
          t.created_by_staff_id !== staff.id
      )
      const unseen = assignedToMe.filter((t) => !seenList.includes(t.id))

      if (unseen.length > 0) {
        // Prioritize highest priority or newest task
        const prioOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 }
        const sorted = [...unseen].sort(
          (a, b) => (prioOrder[b.priority] || 0) - (prioOrder[a.priority] || 0)
        )
        setAlertTask(sorted[0])
        setIsAlertModalOpen(true)
      }
    } catch (e) {
      console.error("Error checking seen tasks:", e)
    }
  }, [staff.id])

  // Load dismissed notifications from localStorage on mount
  useEffect(() => {
    try {
      const storageKey = `pixy_dismissed_notifications_${staff.id}`
      const stored = localStorage.getItem(storageKey)
      if (stored) setDismissedNotificationIds(JSON.parse(stored))
    } catch (e) {
      console.error("Error loading dismissed notifications:", e)
    }
  }, [staff.id])

  const markTaskAsSeen = (id: string) => {
    setSeenTaskIds((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      try {
        localStorage.setItem(`pixy_seen_tasks_${staff.id}`, JSON.stringify(next))
      } catch (e) {
        console.error(e)
      }
      return next
    })
  }

  const handleDismissNotification = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setDismissedNotificationIds((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      try {
        localStorage.setItem(`pixy_dismissed_notifications_${staff.id}`, JSON.stringify(next))
      } catch (err) {
        console.error(err)
      }
      return next
    })
  }

  const handleSelectNotificationTask = (task: TaskItem, notifKey?: string) => {
    if (notifKey) markTaskAsSeen(notifKey)
    markTaskAsSeen(task.id)
    setIsNotificationsOpen(false)
    openTaskDetail(task)
  }

  // Format relative timestamp safely
  const formatNotifTime = (dateStr?: string) => {
    if (!dateStr) return ""
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return ""
      return formatDistanceToNow(d, { addSuffix: true, locale: es })
    } catch {
      return ""
    }
  }

  // 1. Backlog tasks (PM / Lead only)
  const backlogNotifs = isLeadOrPm
    ? (allTeamTasks || [])
        .filter((t) => t.status === "backlog" && !dismissedNotificationIds.includes(`backlog-${t.id}`))
        .map((t) => {
          const notifKey = `backlog-${t.id}`
          const isUnseen = !seenTaskIds.includes(notifKey) && !seenTaskIds.includes(t.id)
          const creator = teamMembers.find((m) => m.id === t.created_by_staff_id)
          return {
            id: notifKey,
            notifKey,
            type: "backlog" as const,
            tag: "Backlog",
            ticketCode: t.ticket_code || `TK-${t.id.slice(0, 4)}`,
            title: t.title,
            content: creator ? `Propuesto por: ${creator.first_name} ${creator.last_name || ""}`.trim() : "Pendiente de aprobación",
            createdAt: t.created_at || t.updated_at,
            isUnseen,
            semantic: {
              dotColor: "bg-amber-500",
              bgUnseen: "bg-amber-500/[0.05] dark:bg-amber-500/[0.08]",
              tagUnseen: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25",
              codeUnseen: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
            },
            onClick: () => handleSelectNotificationTask(t, notifKey),
          }
        })
    : []

  // 2. Mentions & System Audits
  const mentionNotifs = (recentMentions || [])
    .filter((m) => !dismissedNotificationIds.includes(`mention-${m.id}`))
    .map((m) => {
      const notifKey = `mention-${m.id}`
      const isUnseen = !seenTaskIds.includes(notifKey)
      const auditInfo = parseSystemAuditNote(m.content)
      const targetTask =
        tasks.find((t) => t.id === m.task_id) ||
        allTeamTasks.find((t) => t.id === m.task_id) ||
        availableTasks.find((t) => t.id === m.task_id)

      let tag = "Mención"
      let dotColor = "bg-primary"
      let bgUnseen = "bg-primary/[0.04] dark:bg-primary/[0.08]"
      let tagUnseen = "bg-primary/15 text-primary border-primary/25"
      let codeUnseen = "text-primary bg-primary/10 border-primary/20"

      if (auditInfo.isAudit) {
        if (auditInfo.type === "progress") {
          const isRegression = m.content.toLowerCase().includes("regres") || m.content.includes("📉")
          tag = isRegression ? "Regresión" : "Avance"
          dotColor = isRegression ? "bg-rose-500" : "bg-emerald-500"
          bgUnseen = isRegression ? "bg-rose-500/[0.05] dark:bg-rose-500/[0.08]" : "bg-emerald-500/[0.05] dark:bg-emerald-500/[0.08]"
          tagUnseen = isRegression
            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25"
            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
          codeUnseen = isRegression
            ? "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20"
            : "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        } else if (auditInfo.type === "status") {
          const isQaStatus = m.content.toLowerCase().includes("qa") || m.content.toLowerCase().includes("revisión")
          tag = isQaStatus ? "QA" : "Estado"
          dotColor = "bg-violet-500"
          bgUnseen = "bg-violet-500/[0.05] dark:bg-violet-500/[0.08]"
          tagUnseen = "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/25"
          codeUnseen = "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20"
        } else if (auditInfo.type === "blocker") {
          tag = "Bloqueada"
          dotColor = "bg-rose-500"
          bgUnseen = "bg-rose-500/[0.05] dark:bg-rose-500/[0.08]"
          tagUnseen = "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25"
          codeUnseen = "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20"
        } else if (auditInfo.type === "subtask") {
          tag = "Subtarea"
          dotColor = "bg-blue-500"
          bgUnseen = "bg-blue-500/[0.05] dark:bg-blue-500/[0.08]"
          tagUnseen = "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25"
          codeUnseen = "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20"
        }
      }

      return {
        id: notifKey,
        notifKey,
        type: "mention" as const,
        tag,
        ticketCode: m.ticket_code || targetTask?.ticket_code || `TK-${m.task_id.slice(0, 4)}`,
        title: targetTask?.title || m.task_title || "Tarea",
        content: auditInfo.formattedText || (m.content || "").replace(/\s*\|\s*[Nn]otificando a\s+.*$/i, "").trim(),
        createdAt: m.created_at,
        isUnseen,
        semantic: {
          dotColor,
          bgUnseen,
          tagUnseen,
          codeUnseen,
        },
        onClick: () => {
          markTaskAsSeen(notifKey)
          if (targetTask) openTaskDetail(targetTask)
          setIsNotificationsOpen(false)
        },
      }
    })

  // 3. QA / Revisión (PM or QA staff)
  const qaNotifs = (isLeadOrPm || isQa)
    ? (allTeamTasks || [])
        .filter((t) => {
          if (t.status !== "in_review" || dismissedNotificationIds.includes(`qa-${t.id}`)) return false
          const hasMention = (recentMentions || []).some(
            (m) => m.task_id === t.id && (m.content.toLowerCase().includes("qa") || m.content.toLowerCase().includes("revisión"))
          )
          return !hasMention
        })
        .map((t) => {
          const notifKey = `qa-${t.id}`
          const isUnseen = !seenTaskIds.includes(notifKey)
          const assignee = teamMembers.find((m) => m.id === t.assigned_staff_id)
          return {
            id: notifKey,
            notifKey,
            type: "qa" as const,
            tag: "QA",
            ticketCode: t.ticket_code || `TK-${t.id.slice(0, 4)}`,
            title: t.title,
            content: assignee ? `Entregado por: ${assignee.first_name} ${assignee.last_name || ""}`.trim() : "Lista para validación",
            createdAt: t.updated_at || t.created_at,
            isUnseen,
            semantic: {
              dotColor: "bg-violet-500",
              bgUnseen: "bg-violet-500/[0.05] dark:bg-violet-500/[0.08]",
              tagUnseen: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/25",
              codeUnseen: "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20",
            },
            onClick: () => handleSelectNotificationTask(t, notifKey),
          }
        })
    : []

  // 4. Blocked tasks (PM / Lead only)
  const blockedNotifs = isLeadOrPm
    ? (allTeamTasks || [])
        .filter((t) => {
          if (t.status !== "blocked" || dismissedNotificationIds.includes(`blocked-${t.id}`)) return false
          const hasMention = (recentMentions || []).some(
            (m) => m.task_id === t.id && (m.content.toLowerCase().includes("bloqueada") || m.content.toLowerCase().includes("bloqueo"))
          )
          return !hasMention
        })
        .map((t) => {
          const notifKey = `blocked-${t.id}`
          const isUnseen = !seenTaskIds.includes(notifKey)
          return {
            id: notifKey,
            notifKey,
            type: "blocked" as const,
            tag: "Bloqueada",
            ticketCode: t.ticket_code || `TK-${t.id.slice(0, 4)}`,
            title: t.title,
            content: t.blocked_reason ? `Motivo: ${t.blocked_reason}` : "Requiere soporte",
            createdAt: t.updated_at || t.created_at,
            isUnseen,
            semantic: {
              dotColor: "bg-rose-500",
              bgUnseen: "bg-rose-500/[0.05] dark:bg-rose-500/[0.08]",
              tagUnseen: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25",
              codeUnseen: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
            },
            onClick: () => handleSelectNotificationTask(t, notifKey),
          }
        })
    : []

  // 5. Recent Completed tasks (PM / Lead only)
  const doneNotifs = isLeadOrPm
    ? (allTeamTasks || [])
        .filter((t) => {
          if (t.status !== "done" || dismissedNotificationIds.includes(`done-${t.id}`)) return false
          const hasMention = (recentMentions || []).some(
            (m) => m.task_id === t.id && (m.content.toLowerCase().includes("completada") || m.content.toLowerCase().includes("finalizada"))
          )
          return !hasMention
        })
        .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
        .slice(0, 8)
        .map((t) => {
          const notifKey = `done-${t.id}`
          const isUnseen = !seenTaskIds.includes(notifKey)
          const assignee = teamMembers.find((m) => m.id === t.assigned_staff_id)
          return {
            id: notifKey,
            notifKey,
            type: "done" as const,
            tag: "Completada",
            ticketCode: t.ticket_code || `TK-${t.id.slice(0, 4)}`,
            title: t.title,
            content: assignee ? `Completada por: ${assignee.first_name} ${assignee.last_name || ""}`.trim() : "Finalizada",
            createdAt: t.updated_at || t.created_at,
            isUnseen,
            semantic: {
              dotColor: "bg-emerald-500",
              bgUnseen: "bg-emerald-500/[0.05] dark:bg-emerald-500/[0.08]",
              tagUnseen: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
              codeUnseen: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
            },
            onClick: () => handleSelectNotificationTask(t, notifKey),
          }
        })
    : []

  // 6. Assigned tasks for standard collaborators (non-PM)
  const assignedNotifs = !isLeadOrPm
    ? (tasks || [])
        .filter(
          (t) =>
            (t.assigned_staff_id === staff.id ||
              (isQa && t.qa_staff_id === staff.id) ||
              (Array.isArray(t.checklist) && t.checklist.some((c: any) => c.assigned_staff_id === staff.id))) &&
            t.status !== "done" &&
            !(t.created_by_staff_id === staff.id && t.status === "backlog") &&
            !dismissedNotificationIds.includes(t.id)
        )
        .map((t) => {
          const notifKey = t.id
          const isUnseen = !seenTaskIds.includes(notifKey)
          const proj = projects.find((p) => p.id === t.project_id)
          const priorityLabel =
            t.priority === "urgent"
              ? "Urgente"
              : t.priority === "high"
              ? "Alta"
              : t.priority === "medium"
              ? "Media"
              : "Baja"
          return {
            id: notifKey,
            notifKey,
            type: "assigned" as const,
            tag: "Asignada",
            ticketCode: t.ticket_code || `TK-${t.id.slice(0, 4)}`,
            title: t.title,
            content: proj ? `${proj.name} • Prioridad ${priorityLabel}` : `Prioridad ${priorityLabel}`,
            createdAt: t.created_at || t.updated_at,
            isUnseen,
            semantic: {
              dotColor: "bg-blue-500",
              bgUnseen: "bg-blue-500/[0.05] dark:bg-blue-500/[0.08]",
              tagUnseen: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25",
              codeUnseen: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
            },
            onClick: () => handleSelectNotificationTask(t, notifKey),
          }
        })
    : []

  // UNIFIED & CHRONOLOGICALLY SORTED STREAM (arrival order descending)
  const unifiedNotifications = useMemo(() => {
    return [
      ...backlogNotifs,
      ...mentionNotifs,
      ...qaNotifs,
      ...blockedNotifs,
      ...doneNotifs,
      ...assignedNotifs,
    ].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return timeB - timeA
    })
  }, [backlogNotifs, mentionNotifs, qaNotifs, blockedNotifs, doneNotifs, assignedNotifs])

  const totalNotifications = unifiedNotifications.filter((n) => n.isUnseen).length
  const hasAnyRead = unifiedNotifications.some((n) => !n.isUnseen)

  const handleMarkAllAsSeen = () => {
    const keysToMark = unifiedNotifications.map((n) => n.notifKey)
    const backlogBaseIds = backlogNotifs.map((n) => n.notifKey.replace("backlog-", ""))
    const merged = Array.from(new Set([...seenTaskIds, ...keysToMark, ...backlogBaseIds]))
    setSeenTaskIds(merged)
    try {
      localStorage.setItem(`pixy_seen_tasks_${staff.id}`, JSON.stringify(merged))
    } catch (e) {
      console.error(e)
    }
    toast.success("Todas las notificaciones marcadas como leídas")
  }

  const handleDismissAllRead = () => {
    const readKeys = unifiedNotifications.filter((n) => !n.isUnseen).map((n) => n.notifKey)
    if (readKeys.length === 0) {
      toast.info("No hay notificaciones leídas para limpiar")
      return
    }
    const merged = Array.from(new Set([...dismissedNotificationIds, ...readKeys]))
    setDismissedNotificationIds(merged)
    try {
      localStorage.setItem(`pixy_dismissed_notifications_${staff.id}`, JSON.stringify(merged))
    } catch (e) {
      console.error(e)
    }
    toast.success(`Se limpiaron ${readKeys.length} notificaciones leídas`)
  }

  // Committed progress & initial status map: stores the saved baseline in DB so drag gestures
  // can move freely between [savedProgress, 100] without ratcheting upwards before release
  const committedProgressMap = useRef<Record<string, number>>({})
  const initialStatusMap = useRef<Record<string, TaskStatus>>({})

  const getSavedProgress = (taskId: string): number => {
    if (committedProgressMap.current[taskId] !== undefined) {
      return committedProgressMap.current[taskId]
    }
    const t = tasks.find((item) => item.id === taskId) || allTeamTasks.find((item) => item.id === taskId)
    const initialProg = t?.progress_percentage || 0
    committedProgressMap.current[taskId] = initialProg
    if (t?.status) {
      initialStatusMap.current[taskId] = t.status
    }
    return initialProg
  }

  const getSavedStatus = (taskId: string): TaskStatus => {
    if (initialStatusMap.current[taskId] !== undefined) {
      return initialStatusMap.current[taskId]
    }
    const t = tasks.find((item) => item.id === taskId) || allTeamTasks.find((item) => item.id === taskId)
    const initialSt = t?.status || "todo"
    initialStatusMap.current[taskId] = initialSt
    return initialSt
  }

  // Progress slider: real-time visual drag update without saving to server
  const handleSliderDrag = (taskId: string, newProgress: number) => {
    let clamped = Math.max(0, Math.min(100, Math.round(newProgress)))
    const task = tasks.find((t) => t.id === taskId) || allTeamTasks.find((t) => t.id === taskId)
    const checklist = task?.checklist || []
    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c) => !c.completed)

    // Rule: Cannot advance past 95% if deliverables/subtasks are incomplete
    if (hasUnfinishedDeliverables && clamped > 95) {
      clamped = 95
    }

    const savedProg = getSavedProgress(taskId)
    const savedStatus = getSavedStatus(taskId)

    // Collaborators can slide freely between their saved point and 100, but cannot go below saved point
    const effectiveProgress = !isLeadOrPm && clamped < savedProg ? savedProg : clamped

    const updateTaskState = (prev: TaskItem[]) =>
      prev.map((t) => {
        if (t.id === taskId) {
          let nextStatus: TaskStatus = t.status
          if (effectiveProgress === 100) {
            nextStatus = "done"
          } else if (effectiveProgress > 0) {
            if (t.status === "done" || savedStatus === "todo") {
              nextStatus = "in_progress"
            } else {
              nextStatus = savedStatus
            }
          } else {
            nextStatus = savedStatus === "in_progress" ? "todo" : savedStatus
          }
          return { ...t, progress_percentage: effectiveProgress, status: nextStatus }
        }
        return t
      })

    setTasks(updateTaskState)
    setAllTeamTasks(updateTaskState)
  }

  // Progress slider: persist to server ONLY when user releases the click/touch
  const handleSliderCommit = async (taskId: string, finalProgress: number) => {
    let clamped = Math.max(0, Math.min(100, Math.round(finalProgress)))
    const task = tasks.find((t) => t.id === taskId) || allTeamTasks.find((t) => t.id === taskId)
    const isMainAssignee = task?.assigned_staff_id === staff.id
    const canManageParent = isLeadOrPm || isQa || isMainAssignee

    if (!canManageParent) {
      toast.warning("Control de avance reservado", {
        description: "El avance general del ticket solo puede ser modificado por el responsable directo del ticket o el PM.",
        id: "collaborator-slider-disabled"
      })
      handleSliderDrag(taskId, getSavedProgress(taskId))
      return
    }

    const checklist = task?.checklist || []
    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c) => !c.completed)

    if (hasUnfinishedDeliverables && clamped > 95) {
      toast.warning("Faltan entregables por completar", {
        description: "Una tarea no puede avanzar del 95% hasta que todos sus entregables estén marcados al 100%."
      })
      clamped = 95
      handleSliderDrag(taskId, 95)
    }

    const savedProg = getSavedProgress(taskId)
    const savedStatus = getSavedStatus(taskId)

    // Rule: Collaborators cannot regress progress below saved progress
    if (!isLeadOrPm && clamped < savedProg) {
      toast.info("El avance registrado no puede ser reducido por colaboradores.")
      handleSliderDrag(taskId, savedProg)
      return
    }

    // Blocker dependency check
    if (clamped === 100 && task?.blocked_by && task.blocked_by.status !== "done") {
      toast.warning("Ticket con dependencia pendiente", {
        description: `No se puede completar este ticket al 100%: depende de #${task.blocked_by.ticket_code || "ticket predecesor"} (${task.blocked_by.title || ""}), el cual aún está pendiente.`,
        id: "blocker-close-lock",
      })
      handleSliderDrag(taskId, savedProg)
      return
    }

    if (clamped === 100) {
      const task = tasks.find((t) => t.id === taskId) || allTeamTasks.find((t) => t.id === taskId)
      if (task) {
        triggerCelebration({ ...task, progress_percentage: 100, status: "done" })
      }
    }

    try {
      const res = await portalUpdateTaskProgress(token, taskId, clamped)
      if (!res.success) {
        toast.error(res.error || "Error al actualizar progreso")
        handleSliderDrag(taskId, savedProg)
      } else {
        // Update the committed baseline on successful save
        committedProgressMap.current[taskId] = clamped
        if (clamped === 100) {
          initialStatusMap.current[taskId] = "done"
        } else if (clamped > 0 && savedStatus === "todo") {
          initialStatusMap.current[taskId] = "in_progress"
        }

        // Immediately update local latestAudits so hover tooltip reflects the change right away!
        if (clamped !== savedProg) {
          const isRegression = clamped < savedProg
          setLatestAudits((prev) => ({
            ...prev,
            [taskId]: {
              taskId,
              authorName: `${staff.first_name} ${staff.last_name}`.trim(),
              authorAvatar: staff.photo_url || null,
              fromProgress: savedProg,
              toProgress: clamped,
              isRegression,
              createdAt: new Date().toISOString()
            }
          }))
        }

        const updateTaskState = (prev: TaskItem[]) =>
          prev.map((t) => {
            if (t.id === taskId) {
              const nextStatus = clamped === 100 ? "done" : clamped > 0 && savedStatus === "todo" ? "in_progress" : t.status
              return { ...t, progress_percentage: clamped, status: nextStatus }
            }
            return t
          })

        setTasks(updateTaskState)
        setAllTeamTasks(updateTaskState)
        toast.success(`Progreso actualizado al ${clamped}%`)

        if (res.unblockedTasks && res.unblockedTasks.length > 0) {
          const unblockedMap = new Map(res.unblockedTasks.map((u) => [u.id, u]))
          const applyUnblocked = (prev: TaskItem[]) =>
            prev.map((t) => unblockedMap.get(t.id) || t)
          setTasks(applyUnblocked)
          setAllTeamTasks(applyUnblocked)
          toast.success(`${res.unblockedTasks.length} ticket(s) dependientes han sido desbloqueados automáticamente`, {
            id: "portal-unblocked-cascade-toast"
          })
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar progreso")
      handleSliderDrag(taskId, savedProg)
    }
  }

  // Checklist item toggle
  const handleToggleChecklist = async (taskId: string, itemId: string, currentVal: boolean) => {
    const nextVal = !currentVal
    try {
      const res = await portalToggleChecklist(token, taskId, itemId, nextVal)
      if (res.success && res.checklist) {
        if (res.progress !== undefined) {
          committedProgressMap.current[taskId] = res.progress
          if (res.progress === 100) {
            initialStatusMap.current[taskId] = "done"
          }
        }
        const updateTaskState = (prev: TaskItem[]) =>
          prev.map((t) => {
            if (t.id === taskId) {
              const nextStatus = res.progress === 100 ? "done" : t.status
              return {
                ...t,
                checklist: res.checklist!,
                progress_percentage: res.progress ?? t.progress_percentage,
                status: nextStatus,
              }
            }
            return t
          })

        setTasks(updateTaskState)
        setAllTeamTasks(updateTaskState)

        if (res.progress === 100) {
          const task = tasks.find((t) => t.id === taskId) || allTeamTasks.find((t) => t.id === taskId)
          if (task) {
            triggerCelebration({ ...task, progress_percentage: 100, status: "done" })
          }
        }
      } else if (res.error) {
        toast.error(res.error)
      }
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar checklist")
    }
  }

  // Status Change
  const handleStatusChange = async (
    taskId: string,
    newStatus: TaskStatus,
    loggedHours?: number,
    note?: string
  ) => {
    const task = tasks.find((t) => t.id === taskId) || allTeamTasks.find((t) => t.id === taskId)
    const isMainAssignee = task?.assigned_staff_id === staff.id
    const canCloseParentTask = isLeadOrPm || isQa || isMainAssignee

    if (newStatus === "done" && !canCloseParentTask) {
      toast.warning("Permiso de cierre restringido", {
        description: "Solo el responsable directo de la tarea o un Líder/PM puede marcarla como Completada.",
        id: "collaborator-close-permission-denied"
      })
      return
    }

    if (newStatus === "done" && task?.blocked_by && task.blocked_by.status !== "done") {
      toast.warning("Ticket con dependencia pendiente", {
        description: `No se puede completar este ticket: depende de #${task.blocked_by.ticket_code || "ticket predecesor"} (${task.blocked_by.title || ""}), el cual aún está pendiente.`,
        id: "blocker-close-lock",
      })
      return
    }

    const checklist = task?.checklist || []
    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c) => !c.completed)

    if (newStatus === "done" && hasUnfinishedDeliverables) {
      toast.warning("Entregables pendientes", {
        description: "No se puede marcar la tarea como completada (100%) porque aún tiene entregables sin finalizar. Avance limitado al 95%."
      })
      handleSliderCommit(taskId, 95)
      return
    }

    // Agile log work interceptor: when moving to in_review or done without loggedHours explicitly defined
    if (
      (newStatus === "in_review" || newStatus === "done") &&
      loggedHours === undefined &&
      task &&
      task.status !== newStatus
    ) {
      setLogWorkState({ task, targetStatus: newStatus })
      return
    }

    const incrementalHours = loggedHours ? Number(loggedHours) : 0

    initialStatusMap.current[taskId] = newStatus
    if (newStatus === "done") {
      committedProgressMap.current[taskId] = 100
    }
    const updateTaskState = (prev: TaskItem[]) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: newStatus,
            actual_hours: (Number(t.actual_hours) || 0) + incrementalHours,
            progress_percentage: newStatus === "done" ? 100 : t.progress_percentage,
          }
        }
        return t
      })

    setTasks(updateTaskState)
    setAllTeamTasks(updateTaskState)

    if (newStatus === "done") {
      const task = tasks.find((t) => t.id === taskId) || allTeamTasks.find((t) => t.id === taskId)
      if (task) {
        triggerCelebration({ ...task, progress_percentage: 100, status: "done" })
      }
    }

    try {
      const res = await portalUpdateTaskStatus(token, taskId, newStatus, undefined, incrementalHours, note)
      if (res.success) {
        const hoursMessage = incrementalHours > 0 ? ` (+${incrementalHours}h registradas)` : ""
        toast.success(
          `Estado actualizado a: ${
            newStatus === "in_review"
              ? "Revisión QA"
              : newStatus === "done"
              ? "Completado"
              : newStatus
          }${hoursMessage}`
        )
        if (res.unblockedTasks && res.unblockedTasks.length > 0) {
          const unblockedMap = new Map(res.unblockedTasks.map((u) => [u.id, u]))
          const applyUnblocked = (prev: TaskItem[]) =>
            prev.map((t) => unblockedMap.get(t.id) || t)
          setTasks(applyUnblocked)
          setAllTeamTasks(applyUnblocked)
          toast.success(`${res.unblockedTasks.length} ticket(s) dependientes han sido desbloqueados automáticamente`, {
            id: "portal-unblocked-cascade-toast"
          })
        }
      } else {
        // Revert optimistic state
        const savedStatus = getSavedStatus(taskId)
        const savedProgress = getSavedProgress(taskId)
        const revertState = (prev: TaskItem[]) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: savedStatus, progress_percentage: savedProgress } : t))
        setTasks(revertState)
        setAllTeamTasks(revertState)
        toast.error(res.error || "Error al actualizar estado")
      }
    } catch {
      const savedStatus = getSavedStatus(taskId)
      const savedProgress = getSavedProgress(taskId)
      const revertState = (prev: TaskItem[]) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: savedStatus, progress_percentage: savedProgress } : t))
      setTasks(revertState)
      setAllTeamTasks(revertState)
      toast.error("Error al actualizar estado")
    }
  }

  // Send Comment
  const handleSendComment = async () => {
    if (!commentText.trim() || !selectedTask) return
    setIsSendingComment(true)
    try {
      const res = await portalAddTaskComment(token, selectedTask.id, commentText.trim())
      if (res.success) {
        toast.success("Comentario enviado")
        setCommentText("")
        setIsCommentModalOpen(false)
      } else {
        toast.error(res.error || "Error al enviar comentario")
      }
    } catch {
      toast.error("Error al enviar comentario")
    } finally {
      setIsSendingComment(false)
    }
  }

  // Task filtering logic: for PM/Lead or QA, base source is all team tasks; for individual collaborator, base is their tasks
  let baseSourceTasks = (isLeadOrPm || isQa) ? allTeamTasks : tasks

  if ((isLeadOrPm || isQa) && selectedMemberFilter !== "all") {
    baseSourceTasks = allTeamTasks.filter(
      (t) =>
        t.assigned_staff_id === selectedMemberFilter ||
        (Array.isArray(t.checklist) && t.checklist.some((c: any) => c.assigned_staff_id === selectedMemberFilter))
    )
  }

  // Project / Workspace filter
  if (selectedProjectFilter !== "all") {
    if (selectedProjectFilter.startsWith("workspace:")) {
      const wsId = selectedProjectFilter.replace("workspace:", "")
      const wsProjectIds = new Set(projects.filter((p) => p.workspace_id === wsId).map((p) => p.id))
      baseSourceTasks = baseSourceTasks.filter((t) => wsProjectIds.has(t.project_id))
    } else {
      baseSourceTasks = baseSourceTasks.filter((t) => t.project_id === selectedProjectFilter)
    }
  }

  // Calculate status counts on base source before status filter
  const countAll = baseSourceTasks.length
  const countBacklog = baseSourceTasks.filter((t) => t.status === "backlog").length
  const countTodo = baseSourceTasks.filter((t) => t.status === "todo").length
  const countInProgress = baseSourceTasks.filter((t) => t.status === "in_progress").length
  const countInReview = baseSourceTasks.filter((t) => t.status === "in_review").length
  const countBlocked = baseSourceTasks.filter((t) => t.status === "blocked").length
  const countDone = baseSourceTasks.filter((t) => t.status === "done").length
  const countActive = baseSourceTasks.filter((t) =>
    t.status === "todo" || t.status === "in_progress" || t.status === "in_review" || t.status === "blocked"
  ).length

  // Apply status filter
  let filteredTasks = baseSourceTasks
  if (statusFilter === "active") {
    filteredTasks = filteredTasks.filter((t) =>
      t.status === "todo" || t.status === "in_progress" || t.status === "in_review" || t.status === "blocked"
    )
  } else if (statusFilter === "all") {
    // Show all tasks
  } else {
    filteredTasks = filteredTasks.filter((t) => t.status === statusFilter)
  }

  // Apply search query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim()
    filteredTasks = filteredTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.ticket_code.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.assigned_staff &&
          `${t.assigned_staff.first_name} ${t.assigned_staff.last_name || ""}`
            .toLowerCase()
            .includes(q))
    )
  }

  const displayedTasks = filteredTasks

  // Pagination calculations for Grid, Compact, and List views
  const totalPages = Math.max(1, Math.ceil(displayedTasks.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedTasks = useMemo(() => {
    if (viewMode === "kanban") return displayedTasks
    const start = (safePage - 1) * pageSize
    return displayedTasks.slice(start, start + pageSize)
  }, [displayedTasks, safePage, pageSize, viewMode])

  const startRecord = displayedTasks.length > 0 ? (safePage - 1) * pageSize + 1 : 0
  const endRecord = Math.min(safePage * pageSize, displayedTasks.length)

  // Dynamic Logo Selection based on Portal Color Mode (Dark vs Light from ADN de Marca)
  const activeLogo =
    portalTheme === "dark"
      ? organization.logo_dark_url || organization.logo_url
      : organization.logo_light_url || organization.logo_url

  return (
    <div className={cn("min-h-screen relative bg-gray-100 dark:bg-[#0a0a0a] text-foreground font-sans selection:bg-primary/20 transition-colors duration-200", portalTheme === "dark" ? "dark" : "")}>
      {/* Partículas animadas globales de la plataforma */}
      <div className="fixed inset-0 z-0 opacity-100 pointer-events-none overflow-hidden">
        <GlobalParticles orgId={organization?.id} primaryColor={brandColor} />
      </div>

      {/* Header: Logo del Tenant a la izquierda y Nombre del Colaborador (sin cargo) a la derecha */}
      <header className="border-b border-zinc-200/80 dark:border-white/10 bg-card/70 backdrop-blur-md sticky top-0 z-30">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-3 flex items-center justify-between gap-4">
          {/* Logo del tenant a la izquierda (cambia reactivamente en modo oscuro/claro) */}
          <div className="flex items-center">
            {activeLogo ? (
              <img
                key={portalTheme}
                src={activeLogo}
                alt={organization.name}
                className="h-8 md:h-9 w-auto max-w-[200px] object-contain transition-opacity duration-200"
              />
            ) : (
              <span className="font-extrabold text-base tracking-tight text-foreground">
                {organization.name}
              </span>
            )}
          </div>

          {/* Switch Moderno Centrado para Gestores de Proyecto (Dashboard vs Gestión vs Ritmo Semanal) */}
          {isLeadOrPm && (
            <div className="flex items-center bg-zinc-100/90 dark:bg-white/5 p-1 rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-inner backdrop-blur-md">
              <button
                type="button"
                onClick={() => setPmViewMode("dashboard")}
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  pmViewMode === "dashboard"
                    ? "bg-white dark:bg-zinc-900 text-primary shadow-sm shadow-black/5 dark:shadow-white/5 border border-zinc-200/50 dark:border-white/10"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => setPmViewMode("gestion")}
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  pmViewMode === "gestion"
                    ? "bg-white dark:bg-zinc-900 text-primary shadow-sm shadow-black/5 dark:shadow-white/5 border border-zinc-200/50 dark:border-white/10"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Gestión</span>
              </button>

              <button
                type="button"
                onClick={() => setPmViewMode("pacing")}
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  pmViewMode === "pacing"
                    ? "bg-white dark:bg-zinc-900 text-primary shadow-sm shadow-black/5 dark:shadow-white/5 border border-zinc-200/50 dark:border-white/10"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Ritmo Semanal</span>
              </button>
            </div>
          )}

          {/* Colaborador, Tema y Notificaciones a la derecha */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Botón Modo Claro / Oscuro (Afecta solo al portal) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={togglePortalTheme}
                  className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  aria-label={portalTheme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                >
                  {portalTheme === "dark" ? (
                    <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform" />
                  ) : (
                    <Moon className="w-5 h-5 text-zinc-600 dark:text-zinc-300 hover:-rotate-12 transition-transform" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span>{portalTheme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}</span>
              </TooltipContent>
            </Tooltip>

            {/* Campanita de Notificaciones */}
            <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="relative p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                      aria-label="Novedades y Notificaciones de Tareas"
                    >
                      <Bell className="w-5 h-5" />
                      {totalNotifications > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-extrabold shadow-sm animate-pulse">
                          {totalNotifications}
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <span>{totalNotifications > 0 ? `Novedades (${totalNotifications} sin revisar)` : "Novedades y Notificaciones al día"}</span>
                </TooltipContent>
              </Tooltip>
              <PopoverContent
                align="end"
                className="w-80 sm:w-96 p-0 rounded-2xl shadow-xl border border-zinc-200/80 dark:border-white/10 bg-card overflow-hidden"
              >
                <div className="p-3 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-foreground">Notificaciones</span>
                    {totalNotifications > 0 ? (
                      <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[10px] px-1.5 py-0 font-bold rounded-full">
                        {totalNotifications} nueva{totalNotifications > 1 ? "s" : ""}
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0 font-medium rounded-full">
                        Al día
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {hasAnyRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDismissAllRead}
                        className="h-7 text-[11px] px-2 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 rounded-lg flex items-center gap-1"
                        title="Limpiar todas las notificaciones leídas de la lista"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Limpiar leídas</span>
                      </Button>
                    )}
                    {totalNotifications > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllAsSeen}
                        className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground rounded-lg flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-primary" />
                        Marcar leídas
                      </Button>
                    )}
                  </div>
                </div>

                <div className="max-h-[420px] overflow-y-auto divide-y divide-zinc-100 dark:divide-white/5">
                  {unifiedNotifications.length > 0 ? (
                    unifiedNotifications.map((item) => {
                      return (
                        <div
                          key={item.id}
                          onClick={item.onClick}
                          className={cn(
                            "group relative p-3 cursor-pointer transition-all flex items-start gap-2.5 text-left",
                            item.isUnseen
                              ? cn(
                                  item.semantic.bgUnseen,
                                  "hover:brightness-95 dark:hover:brightness-110"
                                )
                              : "bg-transparent opacity-50 hover:opacity-90 hover:bg-muted/30 text-muted-foreground"
                          )}
                        >
                          {/* Dot / Indicator */}
                          <div className="pt-0.5 shrink-0">
                            {item.isUnseen ? (
                              <span className={cn("w-2 h-2 rounded-full block animate-pulse mt-1", item.semantic.dotColor)} />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 block mt-1.5" />
                            )}
                          </div>

                          {/* Content column */}
                          <div className="flex-1 min-w-0 space-y-1">
                            {/* Header row: Ticket Code + Tag Pill + Relative Time + Dismiss X */}
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={cn(
                                    "text-xs font-mono font-bold px-1.5 py-0.2 rounded shrink-0 border",
                                    item.isUnseen
                                      ? item.semantic.codeUnseen
                                      : "text-muted-foreground bg-muted/40 border-border/40 font-normal"
                                  )}
                                >
                                  {item.ticketCode}
                                </span>

                                {/* Diminutive subtle category pill */}
                                <span
                                  className={cn(
                                    "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded shrink-0 border transition-all",
                                    item.isUnseen
                                      ? item.semantic.tagUnseen
                                      : "bg-muted/50 text-muted-foreground/75 border-transparent font-normal"
                                  )}
                                >
                                  {item.tag}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {item.createdAt && (
                                  <span className={cn("text-[10px]", item.isUnseen ? "text-foreground/70 font-medium" : "text-muted-foreground/60")}>
                                    {formatNotifTime(item.createdAt)}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  title="Quitar notificación"
                                  onClick={(e) => handleDismissNotification(item.notifKey, e)}
                                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded transition-all ml-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Title */}
                            <p
                              className={cn(
                                "text-xs leading-snug line-clamp-2",
                                item.isUnseen ? "font-semibold text-foreground" : "font-normal text-muted-foreground"
                              )}
                            >
                              {item.title}
                            </p>

                            {/* Subtitle / content snippet */}
                            {item.content && (
                              <p
                                className={cn(
                                  "text-[11px] leading-relaxed line-clamp-2",
                                  item.isUnseen ? "text-foreground/80 font-normal" : "text-muted-foreground/70 font-normal"
                                )}
                              >
                                {item.content}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="py-10 px-4 text-center space-y-1.5">
                      <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                      <p className="text-xs font-semibold text-foreground">Sin notificaciones pendientes</p>
                      <p className="text-[11px] text-muted-foreground">
                        Tu bandeja de notificaciones está completamente al día.
                      </p>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <div className="h-4 w-px bg-zinc-200 dark:bg-white/10" />

            {/* Colaborador a la derecha: solo nombre y icono profile normal */}
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-sm font-semibold text-foreground hidden sm:inline">
                {staff.first_name} {staff.last_name}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="w-8 h-8 rounded-full border border-zinc-200/80 dark:border-white/10 shadow-xs flex items-center justify-center transition-colors bg-zinc-100 dark:bg-white/10 text-muted-foreground cursor-pointer"
                    aria-label={`Perfil de ${staff.first_name} ${staff.last_name}`}
                  >
                    <User className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground">{staff.first_name} {staff.last_name}</span>
                    <span className="text-[10px] text-muted-foreground">{staff.role || "Colaborador del Equipo"}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6 relative z-10">
        {/* Hero Section: Card compacta con Avatar 3D en posición absoluta y efecto pop-out flotante */}
        {(!isLeadOrPm || pmViewMode === "dashboard") && (
          <section className="w-full relative overflow-visible rounded-3xl border border-zinc-200/80 dark:border-white/10 shadow-sm bg-gradient-to-br from-card via-card to-primary/[0.03] dark:to-primary/[0.06] p-4 sm:p-5 md:py-5 md:px-7 transition-all flex items-center min-h-[140px] sm:min-h-[155px]">
            {/* Ambient Glow Orbs (Contenidos dentro del radio de la tarjeta) */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute bottom-0 left-1/3 -mb-16 w-48 h-48 rounded-full bg-sky-500/5 blur-3xl" />
            </div>

            {/* Contenido Principal a la izquierda */}
            <div className="relative z-10 w-full max-w-2xl pr-28 sm:pr-40 md:pr-48 lg:pr-56 space-y-2.5 sm:space-y-3">
              {/* Fecha sutil sin badges innecesarios */}
              <div className="text-[11px] sm:text-xs text-muted-foreground font-medium capitalize flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                {new Date().toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </div>

              {/* Saludo dinámico tipo Dashboard y descripción clara */}
              <div className="space-y-0.5 sm:space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-snug">
                  {heroConfig.title}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
                  {heroConfig.desc}
                </p>
              </div>

              {/* Bloque de Avance en Activas para colaboradores (Dentro del Hero) */}
              {!isLeadOrPm && myActiveTotal > 0 && (
                <div className="w-full max-w-xl rounded-2xl bg-zinc-50/90 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/10 p-3 sm:p-3.5 space-y-2 shadow-2xs backdrop-blur-xs">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Mi Avance en Activas</span>
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {myActiveProgress}% ({myActiveTotal} {myActiveTotal === 1 ? "tarea activa" : "tareas activas"})
                    </span>
                  </div>

                  {/* Barra de Progreso */}
                  <div className="h-2 w-full bg-zinc-200/70 dark:bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${myActiveProgress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>

                  {/* Chips métricos e hipervínculo a la tarea prioritaria */}
                  <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="px-2 py-0.5 rounded-lg bg-white dark:bg-white/[0.05] border border-zinc-200/60 dark:border-white/10 flex items-center gap-1.5 shadow-2xs cursor-default">
                          <span className="text-[10px] text-muted-foreground">En curso</span>
                          <span className="font-mono font-bold text-indigo-500 text-[11px]">
                            {myInProgress}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <span>Tareas en curso activo</span>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="px-2 py-0.5 rounded-lg bg-white dark:bg-white/[0.05] border border-zinc-200/60 dark:border-white/10 flex items-center gap-1.5 shadow-2xs cursor-default">
                          <span className="text-[10px] text-muted-foreground">En QA</span>
                          <span className="font-mono font-bold text-amber-500 text-[11px]">
                            {myInReview}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <span>Tareas en revisión / QA</span>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="px-2 py-0.5 rounded-lg bg-white dark:bg-white/[0.05] border border-zinc-200/60 dark:border-white/10 flex items-center gap-1.5 shadow-2xs cursor-default">
                          <span className="text-[10px] text-muted-foreground">Estimado</span>
                          <span className="font-mono font-bold text-emerald-500 text-[11px]">
                            {myActiveEstimatedHours}h
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <span>Total de horas estimadas activas</span>
                      </TooltipContent>
                    </Tooltip>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setIsCreateModalOpen(true)}
                      className="ml-auto h-6 px-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-bold shadow-2xs cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Crear Requerimiento / Ticket</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Estado completado si no quedan activas pero completó tareas */}
              {!isLeadOrPm && myActiveTotal === 0 && myCompleted > 0 && (
                <div className="w-full max-w-xl rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 sm:p-3.5 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      ¡Sprint al día! Todas tus tareas están completadas ({myCompleted}/{myCompleted})
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="h-6 px-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-bold shadow-2xs cursor-pointer flex items-center gap-1 shrink-0 ml-2"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Crear Requerimiento / Ticket</span>
                  </Button>
                </div>
              )}

              {/* Botones de acción para PM / Lead o colaboradores sin tareas activas */}
              {(isLeadOrPm || (!isLeadOrPm && myActiveTotal === 0 && myCompleted === 0) || (isQa && qaQueueTasks.length > 0)) && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {(isLeadOrPm || (!isLeadOrPm && myActiveTotal === 0 && myCompleted === 0)) && (
                    <Button
                      size="sm"
                      onClick={() => setIsCreateModalOpen(true)}
                      className="rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:bg-primary/90 h-8 px-3 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Crear Requerimiento / Ticket
                    </Button>
                  )}
                  {isQa && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatusFilter("in_review")}
                      className="rounded-xl text-xs font-semibold h-8 px-3 border-zinc-200/80 dark:border-white/10"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-1 text-amber-500" />
                      Cola de QA ({qaQueueTasks.length})
                    </Button>
                  )}
                  {isLeadOrPm && teamMembers.length > 0 && (
                    <span className="text-[11px] text-muted-foreground font-mono inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted/40 rounded-lg">
                      <Users className="w-3 h-3 text-primary" />
                      {teamMembers.length} especialistas
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 3D Floating Avatar: Posición absoluta, sobresaliendo libremente por encima del marco */}
            <div className="absolute right-2 sm:right-6 md:right-8 lg:right-12 bottom-0 flex items-end justify-center pointer-events-none select-none z-20">
              <motion.div
                animate={{ y: [0, -7, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="relative flex items-end justify-center"
              >
                <img
                  src={getCollaboratorAvatar(staff.photo_url, staff.first_name || staff.id)}
                  alt={`${staff.first_name} ${staff.last_name}`}
                  className="h-[142px] sm:h-[176px] md:h-[194px] lg:h-[212px] w-auto object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.18)]"
                />
              </motion.div>
            </div>
          </section>
        )}

        {/* Puesto de Operaciones y Telemetría Táctica para Gestores de Proyecto */}
        {isLeadOrPm && pmViewMode === "dashboard" && (
          <TaskPmOperationsDashboard
            tasks={allTeamTasks && allTeamTasks.length > 0 ? allTeamTasks : tasks}
            teamMembers={teamMembers}
            projects={projects}
            workspaces={workspaces}
            organization={organization}
            sprints={sprints}
            activeSprint={activeSprint}
            token={token}
            onSprintCreated={(newSprint) => {
              setSprints((prev) => [newSprint, ...prev])
              if (newSprint.status === "active") {
                setActiveSprint(newSprint)
              }
            }}
            onSprintUpdated={(updatedSprint) => {
              setSprints((prev) => prev.map((s) => (s.id === updatedSprint.id ? updatedSprint : s)))
              if (updatedSprint.status === "active") {
                setActiveSprint(updatedSprint)
              }
            }}
            onSprintCompleted={(completedId, nextSprint) => {
              setSprints((prev) =>
                prev.map((s) => (s.id === completedId ? { ...s, status: "completed" as const } : s))
              )
              if (nextSprint) {
                setSprints((prev) => [nextSprint, ...prev.filter((s) => s.id !== nextSprint.id)])
                setActiveSprint(nextSprint)
              } else {
                setActiveSprint(null)
              }
            }}
            onSprintDeleted={(deletedId) => {
              setSprints((prev) => prev.filter((s) => s.id !== deletedId))
              if (activeSprint?.id === deletedId) {
                setActiveSprint(null)
              }
            }}
            onSwitchToGestion={() => setPmViewMode("gestion")}
            onSelectTask={openTaskDetail}
          />
        )}

        {/* PM Ritmo Semanal (Weekly Pacing Matrix) */}
        {isLeadOrPm && pmViewMode === "pacing" && (
          <div className="pt-2 pb-8">
            <TaskWeeklyPacingMatrix
              tasks={allTeamTasks && allTeamTasks.length > 0 ? allTeamTasks : tasks}
              teamMembers={teamMembers}
              projects={projects}
              workspaces={workspaces}
              onSelectTask={openTaskDetail}
              brandColor={brandColor}
              tenantBranding={{
                name: organization?.name,
                logoUrl: organization?.logo_url,
                isotypeUrl: organization?.isotipo_url,
                primaryColor: organization?.primary_color || brandColor,
              }}
            />
          </div>
        )}

        {/* Espacio de Gestión Operativa (Siempre visible para colaboradores, o para PM cuando está en modo 'gestion') */}
        {(!isLeadOrPm || pmViewMode === "gestion") && (
          <>
            {/* Sophisticated Collaborator Ribbon (Inbox Agent Monitor Style) */}
            {isLeadOrPm && teamMembers.length > 0 && (
              <TaskCollaboratorRibbon
                teamMembers={teamMembers}
                allTasks={allTeamTasks && allTeamTasks.length > 0 ? allTeamTasks : tasks}
                selectedMemberId={selectedMemberFilter}
                brandColor={brandColor}
                organizationName={organization.name}
                onSelectMember={(memberId) => {
                  setSelectedMemberFilter(memberId)
                }}
              />
            )}

        {/* Toolbar: SearchFilterBar + Radix Select de Proyecto + ViewToggle */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <SearchFilterBar
            searchTerm={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Buscar por ticket, título o responsable..."
            filters={[
              { id: "all", label: "Todas", count: countAll },
              { id: "backlog", label: "Backlog", count: countBacklog, color: "slate" },
              {
                id: "active",
                label: "Activas",
                count: countActive,
                color: "emerald",
                subOptions: [
                  { id: "todo", label: "Por Hacer", count: countTodo, color: "sky" },
                  { id: "in_progress", label: "En Curso", count: countInProgress, color: "indigo" },
                  { id: "in_review", label: "En QA", count: countInReview, color: "amber" },
                  { id: "blocked", label: "Bloqueadas", count: countBlocked, color: "red" },
                ],
              },
              { id: "done", label: "Completadas", count: countDone, color: "emerald" },
            ]}
            activeFilter={statusFilter}
            onFilterChange={setStatusFilter}
            defaultShowFilters={true}
            className="flex-1"
          />

          <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-auto">
            {/* Project / Workspace Selector with modern Radix Select */}
            <Select value={selectedProjectFilter} onValueChange={setSelectedProjectFilter}>
              <SelectTrigger className="h-10 text-xs w-[190px] sm:w-[225px] rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-white/10 shadow-sm font-medium text-left">
                <div className="flex items-center truncate text-left flex-1 min-w-0">
                  <SelectValue placeholder="Todos los espacios" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl max-h-[340px]">
                <SelectItem value="all" className="text-xs font-medium">
                  <span className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Todos los espacios</span>
                  </span>
                </SelectItem>
                {workspaces.length > 0 ? (
                  <>
                    {workspaces.map((ws) => {
                      const wsProjects = projects.filter((p) => p.workspace_id === ws.id)
                      return (
                        <SelectGroup key={ws.id}>
                          <SelectSeparator className="my-1" />
                          <SelectItem
                            value={`workspace:${ws.id}`}
                            textValue={`${ws.name}${ws.key_prefix ? ` [${ws.key_prefix}]` : ""}`}
                            className="text-xs font-semibold text-foreground py-1.5 cursor-pointer pl-8"
                          >
                            <span className="flex items-center gap-2 w-full">
                              <span className="truncate">{ws.name}</span>
                              {ws.key_prefix && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-zinc-500 dark:text-zinc-400 font-normal">
                                  [{ws.key_prefix}]
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground font-normal ml-auto">
                                ({wsProjects.length})
                              </span>
                            </span>
                          </SelectItem>
                          {wsProjects.map((p) => (
                            <SelectItem
                              key={p.id}
                              value={p.id}
                              textValue={p.name}
                              className="text-xs pl-12 py-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: p.color }}
                                />
                                <span className="truncate">{p.name}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )
                    })}
                    {projects.filter((p) => !p.workspace_id || !workspaces.some((w) => w.id === p.workspace_id)).length > 0 && (
                      <SelectGroup>
                        <SelectSeparator className="my-1" />
                        <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-8 py-1">
                          Otros Proyectos
                        </SelectLabel>
                        {projects
                          .filter((p) => !p.workspace_id || !workspaces.some((w) => w.id === p.workspace_id))
                          .map((p) => (
                            <SelectItem
                              key={p.id}
                              value={p.id}
                              textValue={p.name}
                              className="text-xs pl-12 py-1.5"
                            >
                              <span className="flex items-center gap-2">
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: p.color }}
                                />
                                <span className="truncate">{p.name}</span>
                              </span>
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    )}
                  </>
                ) : (
                  projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} textValue={p.name} className="text-xs">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="truncate">{p.name}</span>
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {/* Dynamic Edit button for selected Workspace OR Project in Management Portal */}
            {isLeadOrPm && selectedProjectFilter !== "all" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEditCurrentScope}
                    className="h-10 w-9 p-0 text-muted-foreground hover:text-foreground shrink-0 rounded-2xl hover:bg-muted/50 cursor-pointer"
                    aria-label={selectedProjectFilter.startsWith("workspace:") ? "Editar espacio de trabajo" : "Editar proyecto"}
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <span>{selectedProjectFilter.startsWith("workspace:") ? "Editar espacio de trabajo" : "Editar proyecto"}</span>
                </TooltipContent>
              </Tooltip>
            )}

            {/* View Mode Toggle: Grid, Compact, List, Kanban */}
            <ViewToggle
              view={viewMode}
              onViewChange={setViewMode}
              showCompact={true}
              showKanban={true}
            />

            {/* Unified + Nuevo Dropdown Menu para PM */}
            {isLeadOrPm && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="h-10 px-3.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:bg-primary/90 shrink-0 gap-1.5 cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nuevo</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 p-1.5 rounded-2xl shadow-xl border border-zinc-200/80 dark:border-white/10 bg-card z-50"
                >
                  <DropdownMenuItem
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-colors hover:bg-muted/60"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-bold text-xs text-foreground block">Nuevo Ticket</span>
                      <span className="text-[11px] text-muted-foreground block leading-tight">
                        Crear requerimiento en el sprint
                      </span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => {
                      setProjectToEdit(null)
                      setIsProjectModalOpen(true)
                    }}
                    className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-colors hover:bg-muted/60"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 mt-0.5">
                      <FolderPlus className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-bold text-xs text-foreground block">Nuevo Proyecto</span>
                      <span className="text-[11px] text-muted-foreground block leading-tight">
                        Crear nuevo sprint o módulo
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Task Content Renderers based on ViewMode */}

        {/* 1. GRID VIEW (Detailed Cards) */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AnimatePresence>
              {paginatedTasks.map((task) => {
                const safeChecklist = Array.isArray(task.checklist)
                  ? task.checklist
                  : parseTaskChecklist(task.checklist)
                const checklistTotal = safeChecklist.length
                const checklistDone = safeChecklist.filter((c) => c.completed).length

                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-card rounded-3xl border border-zinc-200/80 dark:border-white/10 shadow-sm bg-card p-5 md:p-6 space-y-4 flex flex-col justify-between"
                  >
                    {/* Top Row: Ticket Code, Project & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/25 rounded-lg px-2.5 py-1 whitespace-nowrap shrink-0 tracking-wide shadow-xs"
                        >
                          {task.ticket_code}
                        </Badge>
                        {task.project && (
                          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: task.project.color }}
                            />
                            {task.project.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {task.priority === "urgent" && (
                          <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px] px-2 py-0.5 font-bold rounded-lg">
                            Urgente
                          </Badge>
                        )}
                        {task.status === "backlog" && (
                          <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 text-[10px] px-2 py-0.5 font-bold rounded-lg">
                            Backlog
                          </Badge>
                        )}
                        {task.status === "todo" && (
                          <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 text-[10px] px-2 py-0.5 font-bold rounded-lg">
                            Por Hacer
                          </Badge>
                        )}
                        {task.status === "done" && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-2 py-0.5 font-bold rounded-lg">
                            Completado
                          </Badge>
                        )}
                        {task.status === "in_review" && (
                          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] px-2 py-0.5 font-bold rounded-lg">
                            En QA
                          </Badge>
                        )}
                        {task.status === "blocked" && (
                          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[10px] px-2 py-0.5 font-bold rounded-lg">
                            Bloqueado
                          </Badge>
                        )}
                        {task.assigned_staff_id !== staff.id && safeChecklist.some((c) => c.assigned_staff_id === staff.id) && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25 text-[10px] px-2 py-0.5 font-bold rounded-lg flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            Tu subtarea
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-base font-bold text-zinc-900 dark:text-white leading-snug flex-1">
                          {task.title}
                        </h4>
                        <TaskSubtasksTooltipBadge
                          checklist={safeChecklist}
                          teamMembers={teamMembers}
                          onClick={() => openTaskDetail(task)}
                        />
                      </div>
                      {task.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {task.tags.map((tag) => {
                            const sysTag = SYSTEM_STAGE_TAGS[tag]
                            if (sysTag) {
                              return (
                                <span
                                  key={tag}
                                  className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-0.5 shadow-2xs",
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
                    </div>

                    {/* Assignee & Controls Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-t border-zinc-100 dark:border-white/5">
                      {/* Assignee */}
                      <div className="flex items-center gap-2">
                        {task.assigned_staff ? (
                          <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                            <Avatar className="w-6 h-6 rounded-full border border-border shrink-0 shadow-2xs" style={{ backgroundColor: brandColor }}>
                              <AvatarImage src={getCollaboratorAvatar(task.assigned_staff.photo_url, task.assigned_staff.first_name)} className="object-cover" />
                              <AvatarFallback className="text-[9px] text-white font-bold" style={{ backgroundColor: brandColor }}>
                                {task.assigned_staff.first_name[0]}
                                {task.assigned_staff.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold">
                              {task.assigned_staff.first_name} {task.assigned_staff.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sin asignar</span>
                        )}
                      </div>

                      {/* PM Fast Controls: Radix Selects */}
                      {isLeadOrPm && (
                        <div className="flex items-center gap-2">
                          <Select
                            value={task.priority}
                            onValueChange={(val) => handleUpdatePriority(task.id, val as TaskPriority)}
                          >
                            <SelectTrigger className="h-7 w-[82px] text-[11px] justify-between rounded-lg border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900 px-2 font-medium shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="low" className="text-xs">Baja</SelectItem>
                              <SelectItem value="medium" className="text-xs">Media</SelectItem>
                              <SelectItem value="high" className="text-xs">Alta</SelectItem>
                              <SelectItem value="urgent" className="text-xs">Urgente</SelectItem>
                            </SelectContent>
                          </Select>

                          {teamMembers.length > 0 && (
                            <Select
                              value={task.assigned_staff_id || "unassigned"}
                              onValueChange={(val) => handleAssignTask(task.id, val)}
                            >
                              <SelectTrigger className="h-7 text-[11px] rounded-lg border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900 px-2 font-medium max-w-[130px] truncate">
                                <SelectValue placeholder="Asignar" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="unassigned" className="text-xs">Sin asignar</SelectItem>
                                {teamMembers.map((m) => (
                                  <SelectItem key={m.id} value={m.id} className="text-xs">
                                    {m.first_name} {m.last_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Progress Slider */}
                    <div className="space-y-2 p-3 rounded-2xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-100 dark:border-white/5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          Progreso del entregable
                        </span>
                        <span className="font-mono font-bold text-primary">
                          {task.progress_percentage}%
                        </span>
                      </div>
                      <PortalTaskSlider
                        taskId={task.id}
                        progress={task.progress_percentage}
                        hasUnfinishedDeliverables={safeChecklist.length > 0 && safeChecklist.some((c) => !c.completed)}
                        savedProg={getSavedProgress(task.id)}
                        isLeadOrPm={isLeadOrPm}
                        isMainAssignee={task.assigned_staff_id === staff.id}
                        isBacklog={task.status === "backlog"}
                        blockedBy={task.blocked_by}
                        latestAudit={latestAudits[task.id]}
                        onCommit={handleSliderCommit}
                        className="py-1"
                      />
                    </div>

                    {/* Checklist Subtasks */}
                    {safeChecklist.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                          <span>Subtareas y Criterios</span>
                          <span className="font-mono text-[11px]">
                            {checklistDone}/{checklistTotal}
                          </span>
                        </div>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {safeChecklist.map((item) => {
                            const canToggle = isLeadOrPm || task.assigned_staff_id === staff.id || (item.assigned_staff_id === staff.id)
                            const assignedCollab = item.assigned_staff_id ? teamMembers.find((m) => m.id === item.assigned_staff_id) : null
                            const isMySubtask = Boolean(item.assigned_staff_id && item.assigned_staff_id === staff.id)

                            return (
                              <div
                                key={item.id}
                                onClick={() => {
                                  if (!canToggle) {
                                    toast.error("Solo el colaborador asignado a esta subtarea puede marcarla.", {
                                      id: `subtask-lock-${item.id}`
                                    })
                                    return
                                  }
                                  handleToggleChecklist(task.id, item.id, item.completed)
                                }}
                                className={cn(
                                  "flex items-center gap-2 text-xs p-2 rounded-xl transition-colors border",
                                  canToggle
                                    ? "bg-zinc-50/50 dark:bg-white/5 hover:bg-zinc-100/70 dark:hover:bg-white/10 cursor-pointer border-zinc-100 dark:border-white/5"
                                    : "bg-zinc-50/20 dark:bg-white/[0.02] border-zinc-100/40 dark:border-white/[0.02] opacity-60 cursor-not-allowed",
                                  isMySubtask && !item.completed && "animate-border-beam"
                                )}
                                title={!canToggle ? `Subtarea asignada a ${assignedCollab?.first_name || "otro colaborador"}` : undefined}
                                style={isMySubtask && !item.completed ? { "--beam-color": brandColor } as React.CSSProperties : undefined}
                              >
                                <div
                                  className={cn(
                                    "w-4 h-4 rounded flex items-center justify-center transition-colors border shrink-0",
                                    item.completed
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-muted-foreground/30 bg-background"
                                  )}
                                >
                                  {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span
                                  className={cn(
                                    "flex-1 leading-tight",
                                    item.completed
                                      ? "line-through text-muted-foreground"
                                      : "text-foreground font-medium"
                                  )}
                                >
                                  {isMySubtask && !item.completed ? (
                                    <ShimmerText active duration={3000}>{item.title}</ShimmerText>
                                  ) : (
                                    item.title
                                  )}
                                </span>
                                {assignedCollab && (
                                  <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 font-medium">
                                    @{assignedCollab.first_name}
                                  </span>
                                )}
                                {!canToggle && (
                                  <Lock className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-100 dark:border-white/5">
                      <div className="flex items-center gap-1.5">
                        {isQa && task.status === "in_review" ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => setTaskToComplete(task)}
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Aprobar QA
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(task.id, "in_progress")}
                              className="h-8 text-xs text-red-500 hover:bg-red-500/10 border-red-500/30 rounded-xl"
                            >
                              <Bug className="w-3.5 h-3.5 mr-1" />
                              Hallazgo
                            </Button>
                          </>
                        ) : (
                          <>
                            {task.status !== "in_review" && task.status !== "done" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(task.id, "in_review")}
                                className="h-8 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 rounded-xl"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                                Enviar a QA
                              </Button>
                            )}

                            {task.status !== "done" && (isLeadOrPm || isQa || task.assigned_staff_id === staff.id) && (
                              <Button
                                size="sm"
                                onClick={() => setTaskToComplete(task)}
                                className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-xl shadow-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Completar
                              </Button>
                            )}
                          </>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openTaskDetail(task)}
                        className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-xl flex items-center gap-1.5"
                        aria-label="Gestionar tarea"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Gestionar</span>
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* 2. COMPACT VIEW (Condensed Cards) */}
        {viewMode === "compact" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {paginatedTasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-sm bg-card p-4 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/25 rounded-lg px-2.5 py-0.5 whitespace-nowrap shrink-0 tracking-wide"
                        >
                          {task.ticket_code}
                        </Badge>
                        {task.project && (
                          <span className="text-[11px] text-muted-foreground truncate max-w-[110px]">
                            {task.project.name}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0 rounded-md font-semibold",
                          task.status === "done"
                            ? "text-emerald-600 border-emerald-500/20 bg-emerald-500/10"
                            : task.status === "in_review"
                            ? "text-amber-600 border-amber-500/20 bg-amber-500/10"
                            : task.status === "in_progress"
                            ? "text-indigo-600 border-indigo-500/20 bg-indigo-500/10"
                            : task.status === "blocked"
                            ? "text-rose-600 border-rose-500/20 bg-rose-500/10"
                            : task.status === "backlog"
                            ? "text-slate-600 border-slate-500/20 bg-slate-500/10"
                            : "text-sky-600 border-sky-500/20 bg-sky-500/10"
                        )}
                      >
                        {task.status === "done"
                          ? "Listo"
                          : task.status === "in_review"
                          ? "QA"
                          : task.status === "in_progress"
                          ? "Curso"
                          : task.status === "blocked"
                          ? "Bloqueado"
                          : task.status === "backlog"
                          ? "Backlog"
                          : "Por Hacer"}
                      </Badge>
                      {task.assigned_staff_id !== staff.id && Array.isArray(task.checklist) && task.checklist.some((c: any) => c.assigned_staff_id === staff.id) && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25 text-[10px] px-1.5 py-0 font-bold rounded-md flex items-center gap-1">
                          <UserCheck className="w-2.5 h-2.5" />
                          Tu subtarea
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-1 flex-1">
                        {task.title}
                      </h4>
                      <TaskSubtasksTooltipBadge
                        checklist={task.checklist}
                        teamMembers={teamMembers}
                        onClick={() => openTaskDetail(task)}
                      />
                    </div>
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {task.tags.map((tag) => {
                          const sysTag = SYSTEM_STAGE_TAGS[tag]
                          if (sysTag) {
                            return (
                              <span
                                key={tag}
                                className={cn(
                                  "text-[9px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-0.5 shadow-2xs",
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
                  </div>

                  {/* Compact Progress Slider */}
                  <div className="space-y-1.5 py-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Avance</span>
                      <span className="font-mono font-black text-primary text-xs sm:text-[13px]">{task.progress_percentage}%</span>
                    </div>
                    <PortalTaskSlider
                      taskId={task.id}
                      progress={task.progress_percentage}
                      hasUnfinishedDeliverables={Array.isArray(task.checklist) && task.checklist.some((c: any) => !c.completed)}
                      savedProg={getSavedProgress(task.id)}
                      isLeadOrPm={isLeadOrPm}
                      isMainAssignee={task.assigned_staff_id === staff.id}
                      isBacklog={task.status === "backlog"}
                      blockedBy={task.blocked_by}
                      latestAudit={latestAudits[task.id]}
                      onCommit={handleSliderCommit}
                    />
                  </div>

                  {/* Compact Footer */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-white/5 text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <Avatar className="w-5 h-5 rounded-full border shrink-0 shadow-2xs" style={{ backgroundColor: brandColor }}>
                        <AvatarImage src={getCollaboratorAvatar(task.assigned_staff?.photo_url, task.assigned_staff?.first_name)} className="object-cover" />
                        <AvatarFallback className="text-[8px] font-bold text-white" style={{ backgroundColor: brandColor }}>
                          {task.assigned_staff?.first_name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] font-medium truncate max-w-[90px]">
                        {task.assigned_staff?.first_name || "Sin asignar"}
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openTaskDetail(task)}
                      className="w-6 h-6 p-0 text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg flex items-center justify-center shrink-0"
                      aria-label="Gestionar tarea"
                    >
                      <Settings className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* 3. LIST VIEW (Table / Rows) */}
        {viewMode === "list" && (
          <div className="glass-card rounded-3xl border border-zinc-200/80 dark:border-white/10 overflow-hidden shadow-sm bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-zinc-50/80 dark:bg-white/5 border-b border-zinc-200/80 dark:border-white/10 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5 w-24">Ticket</th>
                    <th className="px-4 py-3.5">Título</th>
                    {isLeadOrPm && <th className="px-4 py-3.5">Responsable</th>}
                    <th className="px-4 py-3.5">Prioridad</th>
                    <th className="px-5 py-3.5 min-w-[160px]">Progreso</th>
                    <th className="px-4 py-3.5">Estado</th>
                    <th className="px-5 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                  {paginatedTasks.map((task) => {
                    const resolvedProject = task.project || projects.find((p) => p.id === task.project_id)
                    return (
                      <tr
                        key={task.id}
                        className="hover:bg-zinc-50/70 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                        onClick={() => openTaskDetail(task)}
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/25 rounded-lg px-2.5 py-1 whitespace-nowrap shrink-0 tracking-wide min-w-[70px] inline-flex items-center justify-center shadow-xs"
                          >
                            {task.ticket_code}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 font-medium">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 max-w-[340px]">
                                {task.title}
                              </span>
                              <TaskSubtasksTooltipBadge
                                checklist={task.checklist}
                                teamMembers={teamMembers}
                                onClick={() => openTaskDetail(task)}
                              />
                              {task.tags && task.tags.length > 0 && (
                                <div className="flex items-center gap-1 shrink-0 flex-wrap">
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
                            </div>
                            {resolvedProject && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Layers className="w-3 h-3 text-muted-foreground" />
                                {resolvedProject.name}
                              </span>
                            )}
                          </div>
                        </td>
                        {isLeadOrPm && (
                          <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                            {task.assigned_staff ? (
                              <div className="flex items-center gap-1.5">
                                <Avatar className="w-5 h-5 rounded-full border shrink-0 shadow-2xs" style={{ backgroundColor: brandColor }}>
                                  <AvatarImage src={getCollaboratorAvatar(task.assigned_staff.photo_url, task.assigned_staff.first_name)} className="object-cover" />
                                  <AvatarFallback className="text-[8px] font-bold text-white" style={{ backgroundColor: brandColor }}>
                                    {task.assigned_staff.first_name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-foreground truncate max-w-[110px]">
                                  {task.assigned_staff.first_name} {task.assigned_staff.last_name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">Sin asignar</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          {isLeadOrPm ? (
                            <Select
                              value={task.priority}
                              onValueChange={(val) => handleUpdatePriority(task.id, val as TaskPriority)}
                            >
                              <SelectTrigger className="h-7 w-[82px] text-[11px] justify-between rounded-lg border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900 px-2 font-medium shadow-none">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="low" className="text-xs">Baja</SelectItem>
                                <SelectItem value="medium" className="text-xs">Media</SelectItem>
                                <SelectItem value="high" className="text-xs">Alta</SelectItem>
                                <SelectItem value="urgent" className="text-xs">Urgente</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] w-[82px] justify-center text-center py-0.5 rounded-lg font-semibold shadow-none",
                                task.priority === "urgent"
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                  : task.priority === "high"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                  : task.priority === "medium"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                              )}
                            >
                              {task.priority === "urgent"
                                ? "Urgente"
                                : task.priority === "high"
                                ? "Alta"
                                : task.priority === "medium"
                                ? "Media"
                                : "Baja"}
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <PortalTaskSlider
                            taskId={task.id}
                            progress={task.progress_percentage}
                            hasUnfinishedDeliverables={Array.isArray(task.checklist) && task.checklist.some((c: any) => !c.completed)}
                            savedProg={getSavedProgress(task.id)}
                            isLeadOrPm={isLeadOrPm}
                            isMainAssignee={task.assigned_staff_id === staff.id}
                            isBacklog={task.status === "backlog"}
                            blockedBy={task.blocked_by}
                            latestAudit={latestAudits[task.id]}
                            onCommit={handleSliderCommit}
                            showLabel={true}
                            labelClassName="text-xs sm:text-[13px] font-black w-11 text-right tracking-tight"
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          {task.status === "blocked" ? (
                            <TooltipProvider delayDuration={1000}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] w-24 justify-center text-center py-0.5 rounded-lg font-semibold shadow-none bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 cursor-help inline-flex items-center gap-1 hover:bg-rose-500/20 transition-colors"
                                  >
                                    <Ban className="w-2.5 h-2.5 shrink-0" />
                                    <span>Bloqueado</span>
                                  </Badge>
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
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] w-24 justify-center text-center py-0.5 rounded-lg font-semibold shadow-none",
                                task.status === "done"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : task.status === "in_review"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                  : task.status === "in_progress"
                                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                                  : task.status === "backlog"
                                  ? "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
                                  : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                              )}
                            >
                              {task.status === "done"
                                ? "Completado"
                                : task.status === "in_review"
                                ? "En QA"
                                : task.status === "in_progress"
                                ? "En Curso"
                                : task.status === "backlog"
                                ? "Backlog"
                                : "Por Hacer"}
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {task.status !== "done" && (isLeadOrPm || isQa || task.assigned_staff_id === staff.id) && (
                              <Button
                                size="sm"
                                onClick={() => setTaskToComplete(task)}
                                className="w-7 h-7 p-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg flex items-center justify-center shrink-0 shadow-xs"
                                aria-label="Marcar como listo"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openTaskDetail(task)}
                              className="w-7 h-7 p-0 text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg flex items-center justify-center shrink-0"
                              aria-label="Gestionar tarea"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. KANBAN VIEW (Drag & Drop Board) */}
        {viewMode === "kanban" && (
          <div className="pt-1">
            <TaskKanbanBoard
              tasks={displayedTasks}
              onSelectTask={openTaskDetail}
              onQuickMoveTask={handleStatusChange}
              brandColor={brandColor}
              onNewTaskInColumn={(status) => {
                setNewTaskStatus(isLeadOrPm ? status : "backlog")
                setIsCreateModalOpen(true)
              }}
            />
          </div>
        )}

        {/* Pagination Footer (Para vistas Grid, Compact y List) */}
        {displayedTasks.length > 0 && viewMode !== "kanban" && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-card/80 backdrop-blur-md border border-zinc-200/80 dark:border-white/10 rounded-2xl text-xs text-muted-foreground shadow-2xs">
            <div className="flex items-center gap-2">
              <span>
                Mostrando <strong className="text-foreground font-semibold">{startRecord}</strong> - <strong className="text-foreground font-semibold">{endRecord}</strong> de{" "}
                <strong className="text-foreground font-semibold">{displayedTasks.length}</strong> tickets
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
                  <SelectTrigger className="h-8 w-[72px] text-xs font-semibold rounded-xl bg-background border-zinc-200/80 dark:border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end" className="rounded-xl">
                    <SelectItem value="25" className="text-xs">25</SelectItem>
                    <SelectItem value="50" className="text-xs">50</SelectItem>
                    <SelectItem value="100" className="text-xs">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-xl cursor-pointer border-zinc-200/80 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/10"
                        disabled={safePage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="rounded-xl text-xs">
                      Página anterior
                    </TooltipContent>
                  </Tooltip>

                  <span className="px-2 text-[11px] font-mono font-medium text-foreground">
                    {safePage} / {totalPages}
                  </span>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-xl cursor-pointer border-zinc-200/80 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/10"
                        disabled={safePage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        aria-label="Página siguiente"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="rounded-xl text-xs">
                      Página siguiente
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        )}

        {/* Empty State (Para vistas Grid, Compact y List) */}
        {displayedTasks.length === 0 && viewMode !== "kanban" && (
          <div className="py-16 text-center rounded-3xl border border-dashed border-zinc-200 dark:border-white/10 bg-zinc-50/40 dark:bg-white/5 space-y-3">
            <CheckCircle2 className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h4 className="text-sm font-bold text-foreground">
              {statusFilter === "active" && countActive === 0 && countAll > 0
                ? "No hay tareas activas"
                : "No hay tareas en esta sección"}
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {statusFilter === "active" && countActive === 0 && countAll > 0
                ? `Tienes ${countBacklog} tickets en Backlog y ${countDone} completados. Puedes visualizarlos haciendo clic en sus filtros.`
                : "Ajusta los filtros o la búsqueda para encontrar otras tareas del sprint."}
            </p>
            {statusFilter === "active" && countBacklog > 0 && (
              <div className="pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusFilter("backlog")}
                  className="text-xs rounded-xl border-zinc-200 dark:border-white/10 cursor-pointer"
                >
                  Ver tickets en Backlog ({countBacklog})
                </Button>
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>

      {/* Premium Linear/Jira 2-Column Task Detail Modal */}
      <TaskPortalDetailModal
        task={selectedTask}
        isOpen={isCommentModalOpen}
        onClose={() => {
          setIsCommentModalOpen(false)
          setSelectedTask(null)
        }}
        token={token}
        isLeadOrPm={isLeadOrPm}
        isQa={isQa}
        currentStaffId={staff.id}
        projects={projects}
        teamMembers={teamMembers}
        brandColor={brandColor}
        availableTasks={availableTasks}
        sprints={sprints}
        onSelectTask={(task) => setSelectedTask(task)}
        onTaskUpdated={(updatedTask) => {
          const oldProg = committedProgressMap.current[updatedTask.id] ?? (selectedTask?.progress_percentage || 0)
          const newProg = updatedTask.progress_percentage || 0
          if (newProg !== oldProg) {
            const isRegression = newProg < oldProg
            setLatestAudits((prev) => ({
              ...prev,
              [updatedTask.id]: {
                taskId: updatedTask.id,
                authorName: `${staff.first_name} ${staff.last_name}`.trim(),
                authorAvatar: staff.photo_url || null,
                fromProgress: oldProg,
                toProgress: newProg,
                isRegression,
                createdAt: new Date().toISOString()
              }
            }))
          }
          committedProgressMap.current[updatedTask.id] = updatedTask.progress_percentage || 0
          initialStatusMap.current[updatedTask.id] = updatedTask.status
          setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)))
          if (allTeamTasks) {
            setAllTeamTasks((prev) => (prev ? prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)) : prev))
          }
          setAvailableTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)))
          setSelectedTask(updatedTask)
        }}
        onTaskDeleted={(taskId) => {
          setTasks((prev) => prev.filter((t) => t.id !== taskId))
          if (allTeamTasks) {
            setAllTeamTasks((prev) => (prev ? prev.filter((t) => t.id !== taskId) : prev))
          }
          setAvailableTasks((prev) => prev.filter((t) => t.id !== taskId))
          setIsCommentModalOpen(false)
          setSelectedTask(null)
        }}
      />

      {/* PM Create Task Modal with Modern Full 2-Column Detail Modal */}
      {isCreateModalOpen && (
        <TaskPortalDetailModal
          task={null}
          isCreateMode={true}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          token={token}
          isLeadOrPm={isLeadOrPm}
          isQa={isQa}
          currentStaffId={staff.id}
          projects={projects}
          teamMembers={teamMembers}
          brandColor={brandColor}
          availableTasks={availableTasks}
          sprints={sprints}
          defaultStatus={newTaskStatus || "todo"}
          defaultProjectId={selectedProjectFilter !== "all" && !selectedProjectFilter.startsWith("workspace:") ? selectedProjectFilter : projects[0]?.id}
          onTaskCreated={(createdTask) => {
            markTaskAsSeen(createdTask.id)
            setTasks((prev) => [createdTask, ...prev])
            setAllTeamTasks((prev) => [createdTask, ...prev])
            setAvailableTasks((prev) => [createdTask, ...prev])
            setIsCreateModalOpen(false)
            toast.success("¡Ticket creado con éxito!")
          }}
        />
      )}

      {/* Modal de Alerta de Asignación de Tarea con Animación Lottie */}
      <Dialog
        open={isAlertModalOpen}
        onOpenChange={(open) => {
          if (!open && alertTask) {
            markTaskAsSeen(alertTask.id)
          }
          setIsAlertModalOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6 md:p-8 bg-card border border-zinc-200/80 dark:border-white/10 shadow-2xl text-center overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Nueva Tarea Asignada</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center space-y-4 pt-1">
            {/* Lottie Animation */}
            <div className="w-44 h-44 -my-2 flex items-center justify-center relative">
              {alertLottie ? (
                <Lottie animationData={alertLottie} loop={true} />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
              )}
            </div>

            {/* Título y Detalles */}
            <div className="space-y-2 text-center w-full">
              {alertTask && (
                <>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                    ¡Nueva Tarea Asignada! - {alertTask.ticket_code || `TK-${alertTask.id.slice(0, 4)}`}
                  </h2>

                  <p className="text-sm sm:text-base font-semibold text-foreground/90 leading-snug px-2">
                    {alertTask.title}
                  </p>

                  {(() => {
                    const project = projects.find((p) => p.id === alertTask.project_id)
                    const workspace = workspaces.find((w) => w.id === project?.workspace_id)
                    const priorityLabels: Record<string, string> = {
                      urgent: "Urgente",
                      high: "Alta",
                      medium: "Media",
                      low: "Baja",
                    }
                    const priorityLabel = priorityLabels[alertTask.priority] || "Media"
                    return (
                      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 flex-wrap font-medium pt-0.5">
                        <span>{workspace?.name || "General"}</span>
                        <span className="opacity-40">•</span>
                        <span>{project?.name || "Proyecto"}</span>
                        <span className="opacity-40">•</span>
                        <span
                          className={cn(
                            "font-semibold",
                            alertTask.priority === "urgent"
                              ? "text-rose-500"
                              : alertTask.priority === "high"
                              ? "text-amber-500"
                              : alertTask.priority === "medium"
                              ? "text-blue-500"
                              : "text-emerald-500"
                          )}
                        >
                          Prioridad {priorityLabel}
                        </span>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>

            {/* Acciones */}
            <div className="w-full pt-4 flex flex-col gap-3">
              <Button
                onClick={() => {
                  if (alertTask) {
                    markTaskAsSeen(alertTask.id)
                    setIsAlertModalOpen(false)
                    openTaskDetail(alertTask)
                  }
                }}
                className="w-full h-11 bg-primary text-primary-foreground text-xs font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Ver Detalles & Comenzar
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (alertTask) {
                    markTaskAsSeen(alertTask.id)
                  }
                  setIsAlertModalOpen(false)
                }}
                className="w-full h-9 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl transition-colors"
              >
                Entendido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Celebración de Tarea Completada (100%) - Mismo Estilo y Proporciones que Notificaciones */}
      <Dialog open={isCelebrationOpen} onOpenChange={setIsCelebrationOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 md:p-8 bg-card border border-zinc-200/80 dark:border-white/10 shadow-2xl text-center overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Objetivo Alcanzado</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center space-y-4 pt-1">
            {/* Lottie Animation */}
            <div className="w-44 h-44 -my-2 flex items-center justify-center relative">
              {celebrationLottie ? (
                <Lottie animationData={celebrationLottie} loop={true} />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-emerald-500/10 flex items-center justify-center animate-bounce">
                  <Award className="w-10 h-10 text-emerald-500" />
                </div>
              )}
            </div>

            {/* Título y Detalles */}
            <div className="space-y-2 text-center w-full">
              {celebrationTask && (
                <>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                    ¡Objetivo Alcanzado! - {celebrationTask.ticket_code || `TK-${celebrationTask.id.slice(0, 4)}`}
                  </h2>

                  <p className="text-sm sm:text-base font-semibold text-foreground/90 leading-snug px-2">
                    {celebrationTask.title}
                  </p>

                  {(() => {
                    const project = projects.find((p) => p.id === celebrationTask.project_id)
                    const workspace = workspaces.find((w) => w.id === project?.workspace_id)
                    const priorityLabels: Record<string, string> = {
                      urgent: "Urgente",
                      high: "Alta",
                      medium: "Media",
                      low: "Baja",
                    }
                    const priorityLabel = priorityLabels[celebrationTask.priority] || "Media"
                    return (
                      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 flex-wrap font-medium pt-0.5">
                        <span>{workspace?.name || "General"}</span>
                        <span className="opacity-40">•</span>
                        <span>{project?.name || "Proyecto"}</span>
                        <span className="opacity-40">•</span>
                        <span
                          className={cn(
                            "font-semibold",
                            celebrationTask.priority === "urgent"
                              ? "text-rose-500"
                              : celebrationTask.priority === "high"
                              ? "text-amber-500"
                              : celebrationTask.priority === "medium"
                              ? "text-blue-500"
                              : "text-emerald-500"
                          )}
                        >
                          Prioridad {priorityLabel}
                        </span>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>

            {/* Acciones */}
            <div className="w-full pt-4">
              <Button
                onClick={() => setIsCelebrationOpen(false)}
                className="w-full h-11 bg-primary text-primary-foreground text-xs font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Continuar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Workspace Edit Modal for PM Portal */}
      {isWorkspaceModalOpen && (
        <WorkspaceFormModal
          isOpen={isWorkspaceModalOpen}
          onClose={() => {
            setIsWorkspaceModalOpen(false)
            setWorkspaceToEdit(null)
          }}
          workspaceToEdit={workspaceToEdit}
          onWorkspaceUpdated={handleWorkspaceUpdated}
          onWorkspaceDeleted={handleWorkspaceDeleted}
          collaborators={teamMembers as any}
        />
      )}

      {/* Project Creation & Edit Modal for PM Portal */}
      {isProjectModalOpen && (
        <ProjectFormModal
          isOpen={isProjectModalOpen}
          onClose={() => {
            setIsProjectModalOpen(false)
            setProjectToEdit(null)
          }}
          projectToEdit={projectToEdit}
          onProjectCreated={handleProjectCreated}
          onProjectUpdated={handleProjectUpdated}
          onProjectDeleted={handleProjectDeleted}
          collaborators={teamMembers as any}
          workspaces={workspaces}
          defaultWorkspaceId={selectedProjectFilter.startsWith("workspace:") ? selectedProjectFilter.replace("workspace:", "") : undefined}
        />
      )}

      {/* Confirmation Dialog for Completing Task */}
      {taskToComplete && (() => {
        const checklist = taskToComplete.checklist || []
        const totalChecklist = checklist.length
        const pendingChecklist = checklist.filter((c: any) => !c.completed).length
        const hasUnfinished = totalChecklist > 0 && pendingChecklist > 0

        return (
          <AlertDialog open={!!taskToComplete} onOpenChange={(open) => !open && setTaskToComplete(null)}>
            <AlertDialogContent className="z-[70] max-w-md rounded-2xl border-border bg-background p-6 shadow-2xl">
              <AlertDialogHeader>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      hasUnfinished
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-emerald-500/10 text-emerald-500"
                    )}
                  >
                    {hasUnfinished ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <AlertDialogTitle className="text-base font-bold text-foreground">
                      {hasUnfinished
                        ? `¿Completar "${taskToComplete.ticket_code}" con pendientes?`
                        : `¿Marcar tarea "${taskToComplete.ticket_code}" como completada?`}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {taskToComplete.title}
                    </AlertDialogDescription>
                  </div>
                </div>
              </AlertDialogHeader>

              <div className="my-3 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-2.5">
                {hasUnfinished ? (
                  <div className="text-amber-600 dark:text-amber-400 font-medium flex items-start gap-2 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Atención: Esta tarea tiene <strong>{pendingChecklist} de {totalChecklist}</strong> entregables sin finalizar en su checklist.
                    </span>
                  </div>
                ) : (
                  <div className="text-emerald-700 dark:text-emerald-400 font-medium flex items-start gap-2 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      Todos los entregables están listos {totalChecklist > 0 ? `(${totalChecklist}/${totalChecklist})` : "(sin lista de entregables)"}.
                    </span>
                  </div>
                )}

                <div className="text-[11px] text-muted-foreground/90 border-t border-border/40 pt-2 space-y-1">
                  <p className="font-semibold text-foreground/90">
                    {hasUnfinished ? "Restricción de entregables:" : "¿Qué sucederá al confirmar?"}
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    {hasUnfinished ? (
                      <>
                        <li>
                          Por política de calidad, la tarea <strong>no puede cerrarse al 100%</strong> mientras existan entregables pendientes.
                        </li>
                        <li>
                          Al confirmar, su avance se establecerá automáticamente en el <strong>95%</strong> y la tarea permanecerá en curso.
                        </li>
                        <li>
                          Para finalizarla al 100%, marca todos los entregables como completados en el detalle del ticket.
                        </li>
                      </>
                    ) : (
                      <>
                        <li>
                          El progreso de la tarea avanzará automáticamente al <strong>100%</strong>.
                        </li>
                        <li>
                          El estado cambiará formalmente a <strong>"Completado"</strong>.
                        </li>
                        <li>
                          Se notificará al equipo y al gestor del proyecto.
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              <AlertDialogFooter className="flex items-center justify-end gap-2 pt-1">
                <AlertDialogCancel
                  onClick={() => setTaskToComplete(null)}
                  className="h-9 px-4 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    const t = taskToComplete
                    setTaskToComplete(null)
                    if (hasUnfinished) {
                      handleSliderCommit(t.id, 95)
                      toast.warning("Entregables pendientes", {
                        description: "Avance fijado al 95%. Completa los entregables para marcar el 100%."
                      })
                    } else {
                      handleStatusChange(t.id, "done")
                    }
                  }}
                  className={cn(
                    "h-9 px-4 text-xs font-semibold rounded-xl text-white transition-colors",
                    hasUnfinished
                      ? "bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700"
                      : "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                  )}
                >
                  {hasUnfinished ? "Fijar Avance en 95%" : "Confirmar y Completar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )
      })()}

      {/* Agile Work Hours Imputation Modal (Log Work on QA or Completion) */}
      {logWorkState && (
        <TaskLogWorkModal
          isOpen={!!logWorkState}
          onClose={() => setLogWorkState(null)}
          task={logWorkState.task}
          targetStatus={logWorkState.targetStatus}
          currentUserId={staff.id}
          onConfirm={(hours, note) => {
            const { task, targetStatus } = logWorkState
            setLogWorkState(null)
            handleStatusChange(task.id, targetStatus, hours, note)
          }}
          onSkip={() => {
            const { task, targetStatus } = logWorkState
            setLogWorkState(null)
            handleStatusChange(task.id, targetStatus, 0)
          }}
        />
      )}
    </div>
  )
}
