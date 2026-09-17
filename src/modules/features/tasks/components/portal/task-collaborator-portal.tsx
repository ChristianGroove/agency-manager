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
  Bell,
  CheckCheck,
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
  User
} from "lucide-react"
import type { TaskItem, TaskStatus, TaskPriority, TaskChecklistItem, TaskComment, TaskWorkspace, TaskProject } from "../../types"
import { parseTaskChecklist, SYSTEM_STAGE_TAGS } from "../../types"
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
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import { cn } from "@/modules/infrastructure/utils/utils"
import { ViewToggle, ViewMode } from "@/modules/core/ui/components/view-toggle"
import { SearchFilterBar } from "@/modules/core/ui/components/search-filter-bar"
import { TaskKanbanBoard } from "../kanban/task-kanban-board"
import { TaskPortalDetailModal } from "./task-portal-detail-modal"
import { ProjectFormModal } from "../modals/project-form-modal"
import { WorkspaceFormModal } from "../modals/workspace-form-modal"
import { TaskPmOperationsDashboard } from "./task-pm-operations-dashboard"
import { TaskCollaboratorRibbon } from "./task-collaborator-ribbon"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"
import { GlobalParticles } from "@/components/layout/global-particles"

const Lottie = dynamic(() => import("lottie-react"), { ssr: false })

interface PortalTaskSliderProps {
  taskId: string
  progress: number
  hasUnfinishedDeliverables: boolean
  savedProg: number
  isLeadOrPm: boolean
  onCommit: (taskId: string, val: number) => void
  className?: string
  trackClassName?: string
  showLabel?: boolean
  labelClassName?: string
}

// Self-contained memoized slider: holds local progress state during dragging
// and only commits on release, eliminating 60fps whole-page re-renders.
const PortalTaskSlider = React.memo(function PortalTaskSlider({
  taskId,
  progress,
  hasUnfinishedDeliverables,
  savedProg,
  isLeadOrPm,
  onCommit,
  className,
  trackClassName,
  showLabel = false,
  labelClassName,
}: PortalTaskSliderProps) {
  const [localVal, setLocalVal] = useState(progress)

  useEffect(() => {
    setLocalVal(progress)
  }, [progress])

  const handleChange = ([val]: number[]) => {
    let clamped = Math.max(0, Math.min(100, Math.round(val)))
    if (hasUnfinishedDeliverables && clamped > 95) clamped = 95
    if (!isLeadOrPm && clamped < savedProg) clamped = savedProg
    setLocalVal(clamped)
  }

  const handleCommit = ([val]: number[]) => {
    let clamped = Math.max(0, Math.min(100, Math.round(val)))
    if (hasUnfinishedDeliverables && clamped > 95) clamped = 95
    if (!isLeadOrPm && clamped < savedProg) clamped = savedProg
    setLocalVal(clamped)
    onCommit(taskId, clamped)
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Slider
        value={[localVal]}
        min={0}
        max={100}
        step={5}
        onValueChange={handleChange}
        onValueCommit={handleCommit}
        className="cursor-pointer flex-1"
        trackClassName={trackClassName}
      />
      {showLabel && (
        <span className={cn("font-mono font-bold text-primary shrink-0", labelClassName || "text-xs")}>
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
  const { staff, organization, projects: initialProjects = [], workspaces: initialWorkspaces = [], isLeadOrPm, isQa, recentMentions = [] } = portalData
  const brandColor = organization?.primary_color || "#8ec045"
  const [workspaces, setWorkspaces] = useState<TaskWorkspace[]>(initialWorkspaces)
  const [projects, setProjects] = useState<TaskProject[]>(initialProjects)
  const [tasks, setTasks] = useState<TaskItem[]>(portalData.tasks)
  const [allTeamTasks, setAllTeamTasks] = useState<TaskItem[]>(portalData.allTeamTasks || [])
  const teamMembers = portalData.teamMembers || []

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

  // PM Portal View Mode: 'dashboard' (Hero + futuristic telemetry) | 'gestion' (clean tasks & team review)
  const [pmViewMode, setPmViewMode] = useState<"dashboard" | "gestion">("dashboard")

  // Active tab filter & collaborator filter
  const [activeTab, setActiveTab] = useState<"my_tasks" | "in_progress" | "qa_queue" | "team_tasks">(
    isLeadOrPm ? "team_tasks" : isQa ? "qa_queue" : "my_tasks"
  )
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>("all")
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

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

  // Computed metrics
  const myTotal = tasks.length
  const myCompleted = tasks.filter((t) => t.status === "done").length
  const myInProgress = tasks.filter((t) => t.status === "in_progress").length
  const myInReview = tasks.filter((t) => t.status === "in_review").length
  const myPercentage = myTotal > 0 ? Math.round((myCompleted / myTotal) * 100) : 0

  const qaQueueTasks = allTeamTasks.filter((t) => t.status === "in_review")

  // Additional Sprint & Hero metrics
  const totalEstimatedHours = tasks.reduce((acc, t) => acc + (Number(t.estimated_hours) || 0), 0)
  const teamTotal = allTeamTasks.length
  const teamCompleted = allTeamTasks.filter((t) => t.status === "done").length
  const teamInProgress = allTeamTasks.filter((t) => t.status === "in_progress").length
  const teamPercentage = teamTotal > 0 ? Math.round((teamCompleted / teamTotal) * 100) : 0

  // Focus Task: either currently in_progress or the next todo
  const focusTask =
    tasks.find((t) => t.status === "in_progress") ||
    tasks.find((t) => t.status === "todo" || t.status === "backlog") ||
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
        metricLabel: "Avance Global del Equipo",
        percentage: teamPercentage,
        completed: teamCompleted,
        total: teamTotal,
      }
    }

    if (myTotal === 0) {
      return {
        key: "empty",
        lottieUrl: "/animations/time-for-coffee-break-animated-icon-2025-10-20-06-00-36-utc.json",
        title,
        desc: "No tienes tareas pendientes asignadas por el momento en tu bandeja. Todo al día.",
        metricLabel: "Tu Avance de Sprint",
        percentage: 100,
        completed: 0,
        total: 0,
      }
    }

    if (myPercentage === 100) {
      return {
        key: "completed",
        lottieUrl: "/animations/business-goal-achievement-and-target-success-2025-10-20-06-18-35-utc.json",
        title,
        desc: `Has finalizado con éxito todas tus ${myTotal} tareas asignadas en este sprint.`,
        metricLabel: "Tu Avance Global",
        percentage: 100,
        completed: myCompleted,
        total: myTotal,
      }
    }

    if (myPercentage >= 80) {
      return {
        key: "near_done",
        lottieUrl: "/animations/business-goal-achievement-and-target-success-2025-10-20-06-18-35-utc.json",
        title,
        desc: `Estás en la recta final con el ${myPercentage}% completado. Resta${myTotal - myCompleted > 1 ? "n" : ""} ${myTotal - myCompleted} ticket${myTotal - myCompleted > 1 ? "s" : ""} para culminar el sprint.`,
        metricLabel: "Tu Avance Global",
        percentage: myPercentage,
        completed: myCompleted,
        total: myTotal,
      }
    }

    if (myInProgress > 0 || myPercentage > 0) {
      return {
        key: "in_progress",
        lottieUrl: "/animations/animated-office-workspace-desk-with-computer-and-b-2025-10-20-06-00-41-utc.json",
        title,
        desc: `Tienes ${myInProgress} tarea${myInProgress > 1 ? "s" : ""} en curso y un avance del ${myPercentage}% en tus asignaciones.`,
        metricLabel: "Tu Avance Global",
        percentage: myPercentage,
        completed: myCompleted,
        total: myTotal,
      }
    }

    return {
      key: "todo",
      lottieUrl: "/animations/cartoon-task-list-illustration-2025-10-20-03-26-27-utc.json",
      title,
      desc: `Tienes ${myTotal} tarea${myTotal > 1 ? "s" : ""} asignada${myTotal > 1 ? "s" : ""} (${totalEstimatedHours > 0 ? `${totalEstimatedHours}h estimadas` : "listas para empezar"}).`,
      metricLabel: "Tu Avance Global",
      percentage: 0,
      completed: 0,
      total: myTotal,
    }
  }, [
    timeGreeting,
    collaboratorName,
    isLeadOrPm,
    myTotal,
    myPercentage,
    myCompleted,
    myInProgress,
    teamPercentage,
    teamCompleted,
    teamTotal,
    totalEstimatedHours,
  ])

  // Dynamic metrics based on selected collaborator filter (Todos vs individual collaborator)
  const contextualMetrics = useMemo(() => {
    if (isLeadOrPm || isQa) {
      if (selectedMemberFilter === "all") {
        return {
          label: "Avance Global del Equipo",
          total: teamTotal,
          completed: teamCompleted,
          inProgress: teamInProgress,
          inReview: qaQueueTasks.length,
          percentage: teamPercentage,
          chipLabel: "Equipo",
          chipValue: `${teamMembers.length} staff`,
          photoUrl: undefined as string | undefined,
          initials: undefined as string | undefined,
        }
      } else {
        const member = teamMembers.find((m) => m.id === selectedMemberFilter)
        const memberTasks = allTeamTasks.filter((t) => t.assigned_staff_id === selectedMemberFilter)
        const memberTotal = memberTasks.length
        const memberCompleted = memberTasks.filter((t) => t.status === "done").length
        const memberInProgress = memberTasks.filter((t) => t.status === "in_progress").length
        const memberInReview = memberTasks.filter((t) => t.status === "in_review").length
        const memberPercentage = memberTotal > 0 ? Math.round((memberCompleted / memberTotal) * 100) : 0
        const memberHours = memberTasks.reduce((acc, t) => acc + (Number(t.estimated_hours) || 0), 0)

        const memberName = member ? `${member.first_name} ${member.last_name}` : "Colaborador"
        return {
          label: `Avance de ${memberName}`,
          total: memberTotal,
          completed: memberCompleted,
          inProgress: memberInProgress,
          inReview: memberInReview,
          percentage: memberPercentage,
          chipLabel: "Estimado",
          chipValue: `${memberHours}h`,
          photoUrl: member?.photo_url || undefined,
          initials: member ? `${member.first_name[0]}${member.last_name[0]}` : "CO",
        }
      }
    } else {
      return {
        label: "Mi Avance en el Sprint",
        total: myTotal,
        completed: myCompleted,
        inProgress: myInProgress,
        inReview: myInReview,
        percentage: myPercentage,
        chipLabel: "Estimado",
        chipValue: `${totalEstimatedHours}h`,
        photoUrl: undefined as string | undefined,
        initials: undefined as string | undefined,
      }
    }
  }, [
    isLeadOrPm,
    isQa,
    selectedMemberFilter,
    teamTotal,
    teamCompleted,
    teamInProgress,
    qaQueueTasks.length,
    teamPercentage,
    teamMembers,
    allTeamTasks,
    myTotal,
    myCompleted,
    myInProgress,
    myInReview,
    myPercentage,
    totalEstimatedHours,
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
      fetch("/animations/business-goal-achievement-and-target-success-2025-10-20-06-18-35-utc.json")
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
      const assignedToMe = tasks.filter(
        (t) =>
          (t.assigned_staff_id === staff.id || (isQa && t.qa_staff_id === staff.id)) &&
          t.status !== "done"
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

  const markTaskAsSeen = (taskId: string) => {
    setSeenTaskIds((prev) => {
      if (prev.includes(taskId)) return prev
      const next = [...prev, taskId]
      try {
        localStorage.setItem(`pixy_seen_tasks_${staff.id}`, JSON.stringify(next))
      } catch (e) {
        console.error(e)
      }
      return next
    })
  }

  const handleMarkAllAsSeen = () => {
    const allRelevantIds = (
      isLeadOrPm && !tasks.some((t) => t.assigned_staff_id === staff.id)
        ? allTeamTasks.map((t) => t.id)
        : tasks.map((t) => t.id)
    )
    const allMentionIds = (recentMentions || []).map((m) => `mention-${m.id}`)
    const merged = Array.from(new Set([...seenTaskIds, ...allRelevantIds, ...allMentionIds]))
    setSeenTaskIds(merged)
    try {
      localStorage.setItem(`pixy_seen_tasks_${staff.id}`, JSON.stringify(merged))
    } catch (e) {
      console.error(e)
    }
    toast.success("Todas las notificaciones marcadas como leídas")
  }

  const handleSelectNotificationTask = (task: TaskItem) => {
    setIsNotificationsOpen(false)
    setAlertTask(task)
    setIsAlertModalOpen(true)
  }

  // Notifications list & badge count
  const myAssignedTasks =
    isLeadOrPm && !tasks.some((t) => t.assigned_staff_id === staff.id)
      ? allTeamTasks
      : tasks.filter(
          (t) => t.assigned_staff_id === staff.id || (isQa && t.qa_staff_id === staff.id)
        )
  const unseenTasks = myAssignedTasks.filter(
    (t) => t.status !== "done" && !seenTaskIds.includes(t.id)
  )
  const unseenMentions = (recentMentions || []).filter(
    (m) => !seenTaskIds.includes(`mention-${m.id}`)
  )
  const totalNotifications = unseenTasks.length + unseenMentions.length

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

    if (clamped === 100) {
      const task = tasks.find((t) => t.id === taskId) || allTeamTasks.find((t) => t.id === taskId)
      if (task) {
        triggerCelebration({ ...task, progress_percentage: 100, status: "done" })
      }
    }

    try {
      const res = await portalUpdateTaskProgress(token, taskId, clamped)
      if (!res.success) {
        toast.error("Error al actualizar progreso")
        handleSliderDrag(taskId, savedProg)
      } else {
        // Update the committed baseline on successful save
        committedProgressMap.current[taskId] = clamped
        if (clamped === 100) {
          initialStatusMap.current[taskId] = "done"
        } else if (clamped > 0 && savedStatus === "todo") {
          initialStatusMap.current[taskId] = "in_progress"
        }
        toast.success(`Progreso actualizado al ${clamped}%`)
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
      }
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar checklist")
    }
  }

  // Status Change
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId) || allTeamTasks.find((t) => t.id === taskId)
    const checklist = task?.checklist || []
    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c) => !c.completed)

    if (newStatus === "done" && hasUnfinishedDeliverables) {
      toast.warning("Entregables pendientes", {
        description: "No se puede marcar la tarea como completada (100%) porque aún tiene entregables sin finalizar. Avance limitado al 95%."
      })
      handleSliderCommit(taskId, 95)
      return
    }

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
      const res = await portalUpdateTaskStatus(token, taskId, newStatus)
      if (res.success) {
        toast.success(
          `Estado actualizado a: ${
            newStatus === "in_review"
              ? "Revisión QA"
              : newStatus === "done"
              ? "Completado"
              : newStatus
          }`
        )
      } else {
        toast.error("Error al actualizar estado")
      }
    } catch {
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

  // Filter by selected collaborator if applicable
  if ((isLeadOrPm || isQa) && selectedMemberFilter !== "all") {
    baseSourceTasks = allTeamTasks.filter((t) => t.assigned_staff_id === selectedMemberFilter)
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
  const countTodo = baseSourceTasks.filter((t) => t.status === "todo" || t.status === "backlog").length
  const countInProgress = baseSourceTasks.filter((t) => t.status === "in_progress").length
  const countInReview = baseSourceTasks.filter((t) => t.status === "in_review").length
  const countBlocked = baseSourceTasks.filter((t) => t.status === "blocked").length
  const countDone = baseSourceTasks.filter((t) => t.status === "done").length

  // Apply status filter
  let filteredTasks = baseSourceTasks
  if (statusFilter === "todo") {
    filteredTasks = filteredTasks.filter((t) => t.status === "todo" || t.status === "backlog")
  } else if (statusFilter === "in_progress") {
    filteredTasks = filteredTasks.filter((t) => t.status === "in_progress")
  } else if (statusFilter === "in_review") {
    filteredTasks = filteredTasks.filter((t) => t.status === "in_review")
  } else if (statusFilter === "blocked") {
    filteredTasks = filteredTasks.filter((t) => t.status === "blocked")
  } else if (statusFilter === "done") {
    filteredTasks = filteredTasks.filter((t) => t.status === "done")
  }

  // Apply search query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim()
    filteredTasks = filteredTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.ticket_code.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    )
  }

  const displayedTasks = filteredTasks

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

          {/* Switch Moderno Centrado para Gestores de Proyecto (Dashboard vs Gestión) */}
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
            </div>
          )}

          {/* Colaborador, Tema y Notificaciones a la derecha */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Botón Modo Claro / Oscuro (Afecta solo al portal) */}
            <button
              type="button"
              onClick={togglePortalTheme}
              className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title={portalTheme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              aria-label={portalTheme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              {portalTheme === "dark" ? (
                <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-5 h-5 text-zinc-600 dark:text-zinc-300 hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* Campanita de Notificaciones */}
            <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="relative p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  title="Novedades y Notificaciones de Tareas"
                >
                  <Bell className="w-5 h-5" />
                  {totalNotifications > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-extrabold shadow-sm animate-pulse">
                      {totalNotifications}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-80 sm:w-96 p-0 rounded-2xl shadow-xl border border-zinc-200/80 dark:border-white/10 bg-card overflow-hidden"
              >
                <div className="p-3.5 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-foreground">Novedades y Notificaciones</span>
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
                  {totalNotifications > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllAsSeen}
                      className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground rounded-lg"
                    >
                      <CheckCheck className="w-3.5 h-3.5 mr-1 text-primary" />
                      Marcar leídas
                    </Button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-white/5">
                  {/* Seccion Menciones @ */}
                  {recentMentions.length > 0 && (
                    <div className="border-b border-zinc-100 dark:border-white/5">
                      <div className="px-3 py-1.5 bg-zinc-50 dark:bg-white/[0.02] text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <AtSign className="w-3 h-3 text-primary" />
                        <span>Menciones ({recentMentions.length})</span>
                      </div>
                      {recentMentions.map((mention) => {
                        const isUnseen = !seenTaskIds.includes(`mention-${mention.id}`)
                        return (
                          <div
                            key={mention.id}
                            onClick={() => {
                              markTaskAsSeen(`mention-${mention.id}`)
                              const target = tasks.find((t) => t.id === mention.task_id) || allTeamTasks.find((t) => t.id === mention.task_id)
                              if (target) openTaskDetail(target)
                              setIsNotificationsOpen(false)
                            }}
                            className={cn(
                              "p-3 cursor-pointer transition-colors hover:bg-muted/50 flex items-start gap-2.5 text-left",
                              isUnseen && "bg-primary/[0.04] dark:bg-primary/[0.08]"
                            )}
                          >
                            <Avatar className="w-6 h-6 rounded-lg shrink-0 mt-0.5 border border-border/60" style={{ backgroundColor: brandColor }}>
                              <AvatarImage src={getCollaboratorAvatar(mention.author_avatar, mention.author_name)} className="object-cover" />
                              <AvatarFallback className="text-[9px] font-bold text-white" style={{ backgroundColor: brandColor }}>
                                {mention.author_name?.[0] || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-semibold text-foreground truncate">
                                  {mention.author_name}
                                </span>
                                {isUnseen && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                                    Nueva
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-600 dark:text-zinc-300 line-clamp-2">
                                {mention.content}
                              </p>
                              <span className="text-[9px] text-muted-foreground">
                                {new Date(mention.created_at).toLocaleDateString("es-ES", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {myAssignedTasks.length === 0 && recentMentions.length === 0 ? (
                    <div className="py-8 px-4 text-center space-y-1.5">
                      <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                      <p className="text-xs font-semibold text-foreground">Sin notificaciones</p>
                      <p className="text-[11px] text-muted-foreground">
                        No tienes notificaciones pendientes por el momento.
                      </p>
                    </div>
                  ) : (
                    myAssignedTasks.slice(0, 10).map((t) => {
                      const isUnseen = !seenTaskIds.includes(t.id)
                      const proj = projects.find((p) => p.id === t.project_id)
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleSelectNotificationTask(t)}
                          className={cn(
                            "p-3 cursor-pointer transition-colors hover:bg-muted/50 flex items-start gap-2.5 text-left",
                            isUnseen && "bg-primary/[0.04] dark:bg-primary/[0.08]"
                          )}
                        >
                          <div className="pt-0.5 shrink-0">
                            {isUnseen ? (
                              <span className="w-2 h-2 rounded-full bg-rose-500 block animate-pulse mt-1" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600 block mt-1" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 border border-primary/20">
                                {t.ticket_code || `TK-${t.id.slice(0, 4)}`}
                              </span>
                              {isUnseen && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                  Nueva
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-foreground truncate">
                              {t.title}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              {proj && <span className="truncate max-w-[120px]">{proj.name}</span>}
                              <span>•</span>
                              <span>
                                {t.priority === "urgent"
                                  ? "Urgente"
                                  : t.priority === "high"
                                  ? "Alta"
                                  : t.priority === "medium"
                                  ? "Media"
                                  : "Baja"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })
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
              <div
                className="w-8 h-8 rounded-full border border-zinc-200/80 dark:border-white/10 shadow-xs flex items-center justify-center transition-colors bg-zinc-100 dark:bg-white/10 text-muted-foreground"
                title={`${staff.first_name} ${staff.last_name}`}
              >
                <User className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
              </div>
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

              {/* Tarea en Foco / Quick Actions para colaboradores */}
              {focusTask && !isLeadOrPm && (
                <div
                  onClick={() => openTaskDetail(focusTask)}
                  className="group flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-zinc-50/80 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/10 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-primary/[0.03] transition-all cursor-pointer max-w-xl shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                      focusTask.status === "in_progress"
                        ? "bg-primary/15 text-primary"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    )}>
                      {focusTask.status === "in_progress" ? (
                        <Flame className="w-3.5 h-3.5 animate-pulse" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 leading-none">
                        <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 border border-primary/20">
                          {focusTask.ticket_code || `TK-${focusTask.id.slice(0, 4)}`}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          • {focusTask.status === "in_progress" ? `En Curso (${focusTask.progress_percentage || 0}%)` : "Siguiente"}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors mt-0.5">
                        {focusTask.title}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px] font-semibold text-primary group-hover:bg-primary/10 rounded-lg shrink-0"
                  >
                    {focusTask.status === "in_progress" ? "Continuar" : "Iniciar"}
                    <ChevronRight className="w-3 h-3 ml-0.5 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </div>
              )}

              {/* Botones de acción para PM / Lead */}
              {isLeadOrPm && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <Button
                    size="sm"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:bg-primary/90 h-8 px-3"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Nuevo Ticket de Sprint
                  </Button>
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
                  {teamMembers.length > 0 && (
                    <span className="text-[11px] text-muted-foreground font-mono inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted/40 rounded-lg">
                      <Users className="w-3 h-3 text-primary" />
                      {teamMembers.length} en sprint
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
            onSwitchToGestion={() => setPmViewMode("gestion")}
            onSelectTask={openTaskDetail}
          />
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
            searchPlaceholder="Buscar por código, título o descripción..."
            filters={[
              { id: "all", label: "Todas", count: countAll },
              { id: "todo", label: "Por Hacer", count: countTodo, color: "slate" },
              { id: "in_progress", label: "En Curso", count: countInProgress, color: "indigo" },
              { id: "in_review", label: "En QA", count: countInReview, color: "amber" },
              { id: "blocked", label: "Bloqueadas", count: countBlocked, color: "red" },
              { id: "done", label: "Completadas", count: countDone, color: "emerald" },
            ]}
            activeFilter={statusFilter}
            onFilterChange={setStatusFilter}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditCurrentScope}
                className="h-10 w-9 p-0 text-muted-foreground hover:text-foreground shrink-0 rounded-2xl hover:bg-muted/50 cursor-pointer"
                title={selectedProjectFilter.startsWith("workspace:") ? "Editar espacio de trabajo" : "Editar proyecto"}
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
              </Button>
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

        {/* Dynamic Contextual Progress & Insights Component (adapts to selected collaborator or team) */}
        <div className="w-full rounded-2xl bg-zinc-50/80 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/10 p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition-all">
          <div className="flex-1 space-y-1.5 max-w-md">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="text-zinc-700 dark:text-zinc-300 font-semibold flex items-center gap-2">
                {contextualMetrics.photoUrl || contextualMetrics.initials ? (
                  <Avatar className="w-5 h-5 rounded-md border border-border/60 shrink-0 shadow-2xs" style={{ backgroundColor: brandColor }}>
                    <AvatarImage src={getCollaboratorAvatar(contextualMetrics.photoUrl, contextualMetrics.label)} className="object-cover" />
                    <AvatarFallback className="text-[9px] font-bold text-white" style={{ backgroundColor: brandColor }}>
                      {contextualMetrics.initials}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                )}
                <span>{contextualMetrics.label}</span>
              </span>
              <span className="font-mono font-bold text-foreground">
                {contextualMetrics.percentage}% ({contextualMetrics.completed}/{contextualMetrics.total} tickets)
              </span>
            </div>
            <div className="h-2 w-full bg-zinc-200/70 dark:bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${contextualMetrics.percentage}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Chips Métricos Compactos */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-2.5 py-1 rounded-xl bg-white dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/10 flex items-center gap-2 shadow-2xs">
              <span className="text-[11px] text-muted-foreground">En curso</span>
              <span className="font-mono font-bold text-indigo-500 text-xs">
                {contextualMetrics.inProgress}
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-white dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/10 flex items-center gap-2 shadow-2xs">
              <span className="text-[11px] text-muted-foreground">En QA</span>
              <span className="font-mono font-bold text-amber-500 text-xs">
                {contextualMetrics.inReview}
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-white dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/10 flex items-center gap-2 shadow-2xs">
              <span className="text-[11px] text-muted-foreground">
                {contextualMetrics.chipLabel}
              </span>
              <span className="font-mono font-bold text-emerald-500 text-xs">
                {contextualMetrics.chipValue}
              </span>
            </div>
          </div>
        </div>

        {/* Task Content Renderers based on ViewMode */}

        {/* 1. GRID VIEW (Detailed Cards) */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AnimatePresence>
              {displayedTasks.map((task) => {
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
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-zinc-900 dark:text-white leading-snug">
                        {task.title}
                      </h4>
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
                          {safeChecklist.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => handleToggleChecklist(task.id, item.id, item.completed)}
                              className="flex items-center gap-2 text-xs p-2 rounded-xl bg-zinc-50/50 dark:bg-white/5 hover:bg-zinc-100/70 dark:hover:bg-white/10 cursor-pointer transition-colors border border-zinc-100 dark:border-white/5"
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
                                {item.title}
                              </span>
                            </div>
                          ))}
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

                            {task.status !== "done" && (
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
                        title="Gestionar tarea"
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
              {displayedTasks.map((task) => (
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
                            : "text-zinc-600 border-zinc-200"
                        )}
                      >
                        {task.status === "done" ? "Listo" : task.status === "in_review" ? "QA" : task.status === "in_progress" ? "Curso" : task.status === "blocked" ? "Bloqueado" : "Por Hacer"}
                      </Badge>
                    </div>

                    <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-1">
                      {task.title}
                    </h4>
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
                      <span className="font-mono font-bold text-primary">{task.progress_percentage}%</span>
                    </div>
                    <PortalTaskSlider
                      taskId={task.id}
                      progress={task.progress_percentage}
                      hasUnfinishedDeliverables={Array.isArray(task.checklist) && task.checklist.some((c: any) => !c.completed)}
                      savedProg={getSavedProgress(task.id)}
                      isLeadOrPm={isLeadOrPm}
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
                      title="Gestionar tarea"
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
                  {displayedTasks.map((task) => {
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
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 max-w-[340px]">
                                {task.title}
                              </span>
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
                            onCommit={handleSliderCommit}
                            showLabel={true}
                            labelClassName="text-[11px] w-8 text-right"
                          />
                        </td>
                        <td className="px-4 py-3.5">
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
                                : task.status === "blocked"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                            )}
                          >
                            {task.status === "done"
                              ? "Completado"
                              : task.status === "in_review"
                              ? "En QA"
                              : task.status === "in_progress"
                              ? "En Curso"
                              : task.status === "blocked"
                              ? "Bloqueado"
                              : "Por Hacer"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {task.status !== "done" && (
                              <Button
                                size="sm"
                                onClick={() => setTaskToComplete(task)}
                                className="w-7 h-7 p-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg flex items-center justify-center shrink-0 shadow-xs"
                                title="Marcar como listo"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openTaskDetail(task)}
                              className="w-7 h-7 p-0 text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg flex items-center justify-center shrink-0"
                              title="Gestionar tarea"
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
              onNewTaskInColumn={isLeadOrPm ? (status) => {
                setNewTaskStatus(status)
                setIsCreateModalOpen(true)
              } : undefined}
            />
          </div>
        )}

        {/* Empty State (Para vistas Grid, Compact y List) */}
        {displayedTasks.length === 0 && viewMode !== "kanban" && (
          <div className="py-16 text-center rounded-3xl border border-dashed border-zinc-200 dark:border-white/10 bg-zinc-50/40 dark:bg-white/5 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h4 className="text-sm font-bold text-foreground">
              No hay tareas en esta sección
            </h4>
            <p className="text-xs text-muted-foreground">
              Ajusta los filtros o la búsqueda para encontrar otras tareas del sprint.
            </p>
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
        projects={projects}
        teamMembers={teamMembers}
        brandColor={brandColor}
        availableTasks={allTeamTasks || tasks}
        onSelectTask={(task) => setSelectedTask(task)}
        onTaskUpdated={(updatedTask) => {
          committedProgressMap.current[updatedTask.id] = updatedTask.progress_percentage || 0
          initialStatusMap.current[updatedTask.id] = updatedTask.status
          setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)))
          if (allTeamTasks) {
            setAllTeamTasks((prev) => (prev ? prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)) : prev))
          }
          setSelectedTask(updatedTask)
        }}
        onTaskDeleted={(taskId) => {
          setTasks((prev) => prev.filter((t) => t.id !== taskId))
          if (allTeamTasks) {
            setAllTeamTasks((prev) => (prev ? prev.filter((t) => t.id !== taskId) : prev))
          }
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
          projects={projects}
          teamMembers={teamMembers}
          brandColor={brandColor}
          defaultStatus={newTaskStatus || "todo"}
          defaultProjectId={selectedProjectFilter !== "all" && !selectedProjectFilter.startsWith("workspace:") ? selectedProjectFilter : projects[0]?.id}
          onTaskCreated={(createdTask) => {
            setTasks((prev) => [createdTask, ...prev])
            setAllTeamTasks((prev) => [createdTask, ...prev])
            setIsCreateModalOpen(false)
            toast.success("¡Ticket de Sprint creado con éxito!")
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
    </div>
  )
}
