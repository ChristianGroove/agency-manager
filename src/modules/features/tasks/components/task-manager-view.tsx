"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Kanban,
  List,
  BarChart3,
  Users,
  Plus,
  FolderPlus,
  Layers,
  Globe,
  Settings,
  Pencil,
  ChevronDown,
  CheckSquare,
  CalendarDays,
  CalendarRange,
  RefreshCw,
  Rocket,
  UploadCloud,
  Video,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/modules/infrastructure/utils/utils"
import { realtimeManager } from "@/modules/core/database/supabase-realtime-manager"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type {
  TaskWorkspace,
  TaskProject,
  TaskItem,
  TaskCollaborator,
  TaskMetrics,
  TaskStatus,
  TaskSprint,
  TaskType,
} from "../types"
import { parseTaskChecklist } from "../types"
import { TaskKanbanBoard } from "./kanban/task-kanban-board"
import { TaskListView } from "./list/task-list-view"
import { TaskCalendarView } from "./calendar/task-calendar-view"
import { TaskMetricsView } from "./metrics/task-metrics-view"
import { TaskCollaboratorsManager } from "./collaborators/task-collaborators-manager"
import { TaskCollaboratorRibbon } from "./portal/task-collaborator-ribbon"
import { TaskWeeklyPacingMatrix } from "./pacing/task-weekly-pacing-matrix"
import { TaskDetailModal } from "./modals/task-detail-modal"
import { TaskFormModal } from "./modals/task-form-modal"
import { ProjectFormModal } from "./modals/project-form-modal"
import { WorkspaceFormModal } from "./modals/workspace-form-modal"
import { TaskLogWorkModal } from "./shared/task-log-work-modal"
import { TaskMeetingViewToggle } from "./shared/task-meeting-view-toggle"
import { TaskSprintModal } from "./modals/task-sprint-modal"
import { TaskImportModal } from "./modals/task-import-modal"
import { TaskMeetingModal } from "./meetings/task-meeting-modal"
import { TaskMeetingDetailModal } from "./meetings/task-meeting-detail-modal"
import { updateTaskStatus, getTasks, deleteTasks } from "../actions/task-actions"
import { toast } from "sonner"
import { SearchFilterBar } from "@/modules/core/ui/components/search-filter-bar"
import { SectionHeader } from "@/components/layout/section-header"
import { BulkActionsFloatingBar } from "@/modules/core/ui/components/bulk-actions-floating-bar"

interface TaskManagerViewProps {
  initialWorkspaces?: TaskWorkspace[]
  initialProjects: TaskProject[]
  initialTasks: TaskItem[]
  initialCollaborators: TaskCollaborator[]
  initialMetrics?: TaskMetrics
  initialSprints?: TaskSprint[]
  organizationId: string
  tenantBranding?: {
    name?: string
    logoUrl?: string | null
    isotypeUrl?: string | null
    primaryColor?: string
  }
}

export function TaskManagerView({
  initialWorkspaces = [],
  initialProjects,
  initialTasks,
  initialCollaborators,
  initialSprints = [],
  organizationId,
  tenantBranding,
}: TaskManagerViewProps) {
  const router = useRouter()
  const [isSyncing, setIsSyncing] = useState(false)

  const [workspaces, setWorkspaces] = useState<TaskWorkspace[]>(initialWorkspaces)
  const [projects, setProjects] = useState<TaskProject[]>(initialProjects)
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks)
  const [collaborators, setCollaborators] = useState<TaskCollaborator[]>(initialCollaborators)
  const [sprints, setSprints] = useState<TaskSprint[]>(initialSprints)

  // Reactive Prop Synchronization with Server Component revalidations
  useEffect(() => {
    setWorkspaces(initialWorkspaces)
  }, [initialWorkspaces])

  useEffect(() => {
    setProjects(initialProjects)
  }, [initialProjects])

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  useEffect(() => {
    setCollaborators(initialCollaborators)
  }, [initialCollaborators])

  useEffect(() => {
    setSprints(initialSprints)
  }, [initialSprints])

  // Realtime WebSocket Subscription via singleton manager (Zero-Thundering-Herd)
  useEffect(() => {
    if (!organizationId) return

    const channelName = `realtime_tasks_org_${organizationId}`
    let isMounted = true

    realtimeManager.getOrCreateChannel(channelName, (channel) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_items",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          if (!isMounted) return

          if (payload.eventType === "UPDATE") {
            const updatedRow = payload.new as Partial<TaskItem>
            setTasks((prev) =>
              prev.map((t) => {
                if (t.id === updatedRow.id) {
                  let assignedStaff = t.assigned_staff
                  if (updatedRow.assigned_staff_id !== undefined) {
                    if (!updatedRow.assigned_staff_id) {
                      assignedStaff = null
                    } else {
                      const matched = collaborators.find((c) => c.id === updatedRow.assigned_staff_id)
                      if (matched) {
                        assignedStaff = {
                          id: matched.id,
                          first_name: matched.first_name,
                          last_name: matched.last_name,
                          photo_url: matched.photo_url,
                          role: matched.role,
                          email: matched.email || undefined,
                        }
                      }
                    }
                  }

                  let qaStaff = t.qa_staff
                  if (updatedRow.qa_staff_id !== undefined) {
                    if (!updatedRow.qa_staff_id) {
                      qaStaff = null
                    } else {
                      const matched = collaborators.find((c) => c.id === updatedRow.qa_staff_id)
                      if (matched) {
                        qaStaff = {
                          id: matched.id,
                          first_name: matched.first_name,
                          last_name: matched.last_name,
                          photo_url: matched.photo_url,
                          role: matched.role,
                        }
                      }
                    }
                  }

                  let projectRel = t.project
                  if (updatedRow.project_id !== undefined) {
                    if (!updatedRow.project_id) {
                      projectRel = null
                    } else {
                      const matched = projects.find((p) => p.id === updatedRow.project_id)
                      if (matched) {
                        projectRel = {
                          id: matched.id,
                          name: matched.name,
                          color: matched.color,
                        }
                      }
                    }
                  }

                  let blockedByRel = t.blocked_by
                  if (updatedRow.blocked_by_task_id !== undefined) {
                    if (!updatedRow.blocked_by_task_id) {
                      blockedByRel = null
                    } else {
                      const matched = prev.find((p) => p.id === updatedRow.blocked_by_task_id)
                      if (matched) {
                        blockedByRel = {
                          id: matched.id,
                          ticket_code: matched.ticket_code,
                          title: matched.title,
                          status: matched.status,
                        }
                      }
                    }
                  }

                  return {
                    ...t,
                    ...updatedRow,
                    assigned_staff: assignedStaff,
                    qa_staff: qaStaff,
                    project: projectRel,
                    blocked_by: blockedByRel,
                  }
                }
                return t
              })
            )
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as any)?.id
            if (deletedId) {
              setTasks((prev) => prev.filter((t) => t.id !== deletedId))
            }
          } else if (payload.eventType === "INSERT") {
            router.refresh()
          }
        }
      )

      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_sprints",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          if (!isMounted) return

          if (payload.eventType === "INSERT") {
            const newSprint = payload.new as TaskSprint
            setSprints((prev) => {
              if (prev.some((s) => s.id === newSprint.id)) return prev
              return [newSprint, ...prev]
            })
          } else if (payload.eventType === "UPDATE") {
            const updatedSprint = payload.new as TaskSprint
            setSprints((prev) =>
              prev.map((s) => (s.id === updatedSprint.id ? { ...s, ...updatedSprint } : s))
            )
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as any)?.id
            if (deletedId) {
              setSprints((prev) => prev.filter((s) => s.id !== deletedId))
            }
          }
        }
      )
    })

    return () => {
      isMounted = false
      realtimeManager.releaseChannel(channelName)
    }
  }, [organizationId, router])

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      const freshTasks = await getTasks({ orgId: organizationId })
      if (freshTasks) {
        setTasks(freshTasks)
      }
      router.refresh()
      toast.success("Datos sincronizados con éxito")
    } catch (err: any) {
      toast.error("Error al sincronizar datos")
    } finally {
      setTimeout(() => setIsSyncing(false), 500)
    }
  }

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("all")
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all")
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<"kanban" | "list" | "pacing" | "metrics" | "collaborators" | "calendar">("list")

  // Bulk Selection & Deletion State (Exclusively in List table view)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Sprint state
  const activeSprintObj = useMemo(() => {
    return sprints.find((s) => s.status === "active") || null
  }, [sprints])

  // Sprint modal state
  const [sprintModalState, setSprintModalState] = useState<{
    isOpen: boolean
    mode: "create" | "edit" | "complete"
    sprint?: TaskSprint | null
  }>({
    isOpen: false,
    mode: "create",
    sprint: null,
  })

  const handleSprintCompleted = (completedSprintId: string, nextSprint?: TaskSprint) => {
    setSprints((prev) => {
      const updated = prev.map((s) => (s.id === completedSprintId ? { ...s, status: "completed" as const } : s))
      if (nextSprint && !updated.some((s) => s.id === nextSprint.id)) {
        return [nextSprint, ...updated]
      }
      return updated
    })
    getTasks({ orgId: organizationId }).then(setTasks)
    router.refresh()
  }

  const handleSprintDeleted = (deletedSprintId: string) => {
    setSprints((prev) => prev.filter((s) => s.id !== deletedSprintId))
    setTasks((prev) =>
      prev.map((t) => (t.sprint_id === deletedSprintId ? { ...t, sprint_id: null } : t))
    )
    router.refresh()
  }

  // Search & Status filters
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("active")

  // Modal states
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState<TaskProject | null>(null)
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false)
  const [workspaceToEdit, setWorkspaceToEdit] = useState<TaskWorkspace | null>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false)
  const [selectedMeetingForDetail, setSelectedMeetingForDetail] = useState<TaskItem | null>(null)
  const [newTaskColumnStatus, setNewTaskColumnStatus] = useState<TaskStatus>("todo")
  const [newTaskInitialType, setNewTaskInitialType] = useState<TaskType>("task")
  const [includeMeetings, setIncludeMeetings] = useState(false)
  const [logWorkState, setLogWorkState] = useState<{ task: TaskItem; targetStatus: TaskStatus } | null>(null)

  // Unified Scope filter (hierarchical tree: all | workspace:id | project_id)
  const currentScopeValue =
    selectedProjectId !== "all"
      ? selectedProjectId
      : selectedWorkspaceId !== "all"
      ? `workspace:${selectedWorkspaceId}`
      : "all"

  const handleScopeFilterChange = (val: string) => {
    if (val === "all") {
      setSelectedWorkspaceId("all")
      setSelectedProjectId("all")
    } else if (val.startsWith("workspace:")) {
      const wsId = val.replace("workspace:", "")
      setSelectedWorkspaceId(wsId)
      setSelectedProjectId("all")
    } else {
      // Specific project selected
      const proj = projects.find((p) => p.id === val)
      setSelectedWorkspaceId(proj?.workspace_id || "all")
      setSelectedProjectId(val)
    }
  }

  // Projects filtered by selected workspace
  const availableProjects = useMemo(() => {
    return selectedWorkspaceId === "all"
      ? projects
      : projects.filter((p: TaskProject) => p.workspace_id === selectedWorkspaceId)
  }, [projects, selectedWorkspaceId])

  // Filter tasks by selected project / workspace
  const projectTasks = useMemo(() => {
    if (selectedProjectId !== "all") {
      return tasks.filter((t: TaskItem) => t.project_id === selectedProjectId)
    }
    if (selectedWorkspaceId !== "all") {
      const allowedProjectIds = new Set(availableProjects.map((p: TaskProject) => p.id))
      return tasks.filter((t: TaskItem) => allowedProjectIds.has(t.project_id))
    }
    return tasks
  }, [tasks, selectedProjectId, selectedWorkspaceId, availableProjects])

  // Real-time reactive metrics computed directly from projectTasks (0 ms latency, 0 server roundtrips)
  const computedMetrics = useMemo<TaskMetrics>(() => {
    const tasksToCompute = projectTasks
    const total = tasksToCompute.length
    let done = 0
    let inProgress = 0
    let inReview = 0
    let blocked = 0
    let todo = 0
    let estHours = 0
    let actHours = 0
    const priorities = { urgent: 0, high: 0, medium: 0, low: 0 }
    const workloadMap = new Map<string, any>()

    tasksToCompute.forEach((t: TaskItem) => {
      if (t.status === "done") done++
      else if (t.status === "in_progress") inProgress++
      else if (t.status === "in_review") inReview++
      else if (t.status === "blocked") blocked++
      else todo++

      if (t.priority && (priorities as any)[t.priority] !== undefined) {
        (priorities as any)[t.priority]++
      }

      estHours += Number(t.estimated_hours || 0)
      actHours += Number(t.actual_hours || 0)

      if (t.assigned_staff) {
        const staffId = t.assigned_staff.id
        const current = workloadMap.get(staffId) || {
          staffId,
          name: `${t.assigned_staff.first_name} ${t.assigned_staff.last_name}`,
          avatar: t.assigned_staff.photo_url,
          role: t.assigned_staff.role || "Colaborador",
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          hours: 0,
        }
        current.totalTasks++
        if (t.status === "done") current.completedTasks++
        if (t.status === "in_progress") current.inProgressTasks++
        current.hours += Number(t.estimated_hours || 0)
        workloadMap.set(staffId, current)
      }
    })

    return {
      totalTasks: total,
      completedTasks: done,
      inProgressTasks: inProgress,
      inReviewTasks: inReview,
      blockedTasks: blocked,
      todoTasks: todo,
      completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
      totalEstimatedHours: estHours,
      totalActualHours: actHours,
      tasksByPriority: priorities,
      collaboratorWorkload: Array.from(workloadMap.values()),
    }
  }, [projectTasks])

  // Base tasks filtered by selected collaborator (when on General tab)
  const baseTasks = useMemo(() => {
    return activeTab === "list" && selectedMemberFilter !== "all"
      ? projectTasks.filter((t: TaskItem) => t.assigned_staff_id === selectedMemberFilter)
      : projectTasks
  }, [activeTab, selectedMemberFilter, projectTasks])

  // Meetings & tickets count in current scope
  const meetingCount = useMemo(() => {
    return baseTasks.filter((t: TaskItem) => t.type === "meeting").length
  }, [baseTasks])

  const ticketCount = useMemo(() => {
    return baseTasks.filter((t: TaskItem) => t.type !== "meeting").length
  }, [baseTasks])

  // Summary counts for filter tabs - segregate by mode
  const summaryCounts = useMemo(() => {
    let backlog = 0
    let todo = 0
    let inProgress = 0
    let inQa = 0
    let blocked = 0
    let completed = 0

    const countableTasks = activeTab === "calendar"
      ? baseTasks
      : (includeMeetings
          ? baseTasks.filter((t: TaskItem) => t.type === "meeting")
          : baseTasks.filter((t: TaskItem) => t.type !== "meeting"))

    countableTasks.forEach((t: TaskItem) => {
      if (t.status === "backlog") backlog++
      else if (t.status === "todo") todo++
      else if (t.status === "in_progress") inProgress++
      else if (t.status === "in_review") inQa++
      else if (t.status === "blocked") blocked++
      else if (t.status === "done") completed++
    })

    const active = todo + inProgress + inQa + blocked

    return {
      total: countableTasks.length,
      active,
      backlog,
      todo,
      inProgress,
      inQa,
      blocked,
      completed,
    }
  }, [baseTasks, includeMeetings, activeTab])

  const {
    total: totalCount,
    active: activeCount,
    backlog: backlogCount,
    todo: todoCount,
    inProgress: inProgressCount,
    inQa: inQaCount,
    blocked: blockedCount,
    completed: completedCount,
  } = summaryCounts

  // Filter by search & status
  const visibleTasks = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return baseTasks.filter((t: TaskItem) => {
      if (includeMeetings ? t.type !== "meeting" : t.type === "meeting") return false

      let matchesStatus = true
      if (!includeMeetings) {
        if (statusFilter === "active") {
          matchesStatus = t.status === "todo" || t.status === "in_progress" || t.status === "in_review" || t.status === "blocked"
        } else if (statusFilter === "all") {
          matchesStatus = true
        } else {
          matchesStatus = t.status === statusFilter
        }
      } else {
        // In meetings view, show all meetings unless an explicit status was chosen
        if (statusFilter !== "all" && statusFilter !== "active") {
          matchesStatus = t.status === statusFilter
        }
      }

      if (!matchesStatus) return false

      if (q) {
        return (
          t.title.toLowerCase().includes(q) ||
          (t.ticket_code && t.ticket_code.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.assigned_staff &&
            `${t.assigned_staff.first_name} ${t.assigned_staff.last_name || ""}`
              .toLowerCase()
              .includes(q))
        )
      }

      return true
    })
  }, [baseTasks, statusFilter, searchTerm, includeMeetings])

  // Listado consolidado para la vista Calendario (sin segregación excluyente de reuniones o entregables)
  const calendarTasks = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return baseTasks.filter((t: TaskItem) => {
      let matchesStatus = true
      if (statusFilter === "active") {
        matchesStatus =
          t.status === "todo" ||
          t.status === "in_progress" ||
          t.status === "in_review" ||
          t.status === "blocked"
      } else if (statusFilter === "all") {
        matchesStatus = true
      } else {
        matchesStatus = t.status === statusFilter
      }

      if (!matchesStatus) return false

      if (q) {
        return (
          t.title.toLowerCase().includes(q) ||
          (t.ticket_code && t.ticket_code.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.assigned_staff &&
            `${t.assigned_staff.first_name} ${t.assigned_staff.last_name || ""}`
              .toLowerCase()
              .includes(q))
        )
      }

      return true
    })
  }, [baseTasks, statusFilter, searchTerm])

  const handleSelectTask = (task: TaskItem) => {
    if (task.type === "meeting") {
      setSelectedMeetingForDetail(task)
      return
    }
    setSelectedTask(task)
    setIsDetailModalOpen(true)
  }

  const handleQuickMoveTask = async (
    taskId: string,
    newStatus: TaskStatus,
    loggedHours?: number,
    note?: string
  ) => {
    const targetTask = tasks.find((t) => t.id === taskId)
    if (targetTask?.type === "meeting") {
      toast.warning("Las reuniones sincrónicas no forman parte del flujo de etapas técnicas.")
      return
    }

    if ((newStatus === "done" || newStatus === "in_review") && targetTask?.blocked_by && targetTask.blocked_by.status !== "done") {
      const actionLabel = newStatus === "in_review" ? "enviar a Revisión / QA" : "completar"
      toast.error(
        `No se puede ${actionLabel} este ticket porque depende de #${targetTask.blocked_by.ticket_code} (${targetTask.blocked_by.title}), el cual aún está pendiente.`
      )
      return
    }

    if (newStatus === "done" && targetTask) {
      const checklist = Array.isArray(targetTask.checklist)
        ? targetTask.checklist
        : parseTaskChecklist(targetTask.checklist)
      const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c: any) => !c.completed)

      if (hasUnfinishedDeliverables) {
        toast.warning("Entregables pendientes", {
          description: "No se puede mover la tarea a 'Completado' porque aún tiene entregables sin finalizar. Debe estar al 100% de entregables."
        })
        return
      }
    }

    // When moving to in_review or done without loggedHours explicitly defined, trigger the agile log work modal!
    if (
      (newStatus === "in_review" || newStatus === "done") &&
      loggedHours === undefined &&
      targetTask &&
      targetTask.status !== newStatus
    ) {
      setLogWorkState({ task: targetTask, targetStatus: newStatus })
      return
    }

    const incrementalHours = loggedHours ? Number(loggedHours) : 0

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus,
              actual_hours: (Number(t.actual_hours) || 0) + incrementalHours,
              progress_percentage: newStatus === "done" ? 100 : t.progress_percentage,
            }
          : t
      )
    )

    try {
      const res = await updateTaskStatus(
        taskId,
        newStatus,
        newStatus === "done" ? 100 : undefined,
        undefined,
        incrementalHours,
        note
      )
      if (res.success) {
        if ((res as any).downgraded) {
          const effectiveStatus = (res as any).effectiveStatus || "in_review"
          const effectiveProgress = (res as any).effectiveProgress ?? 95
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    status: effectiveStatus,
                    progress_percentage: effectiveProgress,
                  }
                : t
            )
          )
          toast.warning(
            (res as any).downgradeReason ||
              "La tarea tiene entregables pendientes en el checklist y fue movida a Revisión / QA (95%)."
          )
        } else {
          const hoursMessage = incrementalHours > 0 ? ` (+${incrementalHours}h imputadas)` : ""
          toast.success(
            `Tarea movida a: ${
              newStatus === "done"
                ? "Completado"
                : newStatus === "in_review"
                ? "Revisión / QA"
                : newStatus === "in_progress"
                ? "En Progreso"
                : newStatus
            }${hoursMessage}`
          )
        }
        if (res.unblockedTasks && res.unblockedTasks.length > 0) {
          const unblockedMap = new Map<string, TaskItem>(res.unblockedTasks.map((u: TaskItem) => [u.id, u]))
          setTasks((prev: TaskItem[]) => prev.map((t) => unblockedMap.get(t.id) || t))
          toast.success(`${res.unblockedTasks.length} ticket(s) dependientes han sido desbloqueados automáticamente`, {
            id: "unblocked-cascade-toast"
          })
        }
      } else {
        // Revert optimistic update
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: targetTask?.status || t.status,
                  actual_hours: Number(targetTask?.actual_hours) || 0,
                  progress_percentage: targetTask?.progress_percentage ?? t.progress_percentage,
                }
              : t
          )
        )
        toast.error(res.error || "Error al mover la tarea")
      }
    } catch (err: any) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: targetTask?.status || t.status,
                actual_hours: Number(targetTask?.actual_hours) || 0,
                progress_percentage: targetTask?.progress_percentage ?? t.progress_percentage,
              }
            : t
        )
      )
      toast.error(err.message || "Error al actualizar estado")
    }
  }

  const handleTaskUpdated = (updatedTask: TaskItem, unblockedTasks?: TaskItem[]) => {
    setTasks((prev: TaskItem[]) => {
      const unblockedMap = unblockedTasks && unblockedTasks.length > 0 ? new Map<string, TaskItem>(unblockedTasks.map((u: TaskItem) => [u.id, u])) : null
      return prev.map((t) => {
        if (t.id === updatedTask.id) return updatedTask
        if (unblockedMap?.has(t.id)) return unblockedMap.get(t.id)!
        return t
      })
    })
    setSelectedTask(updatedTask)
    if (unblockedTasks && unblockedTasks.length > 0) {
      toast.success(`${unblockedTasks.length} ticket(s) dependientes han sido desbloqueados automáticamente`, {
        id: "unblocked-cascade-toast"
      })
    }
  }

  const handleTaskDeleted = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    setSelectedTask(null)
    setIsDetailModalOpen(false)
  }

  const handleTaskCreated = (newTask: TaskItem) => {
    setTasks((prev) => [newTask, ...prev])
  }

  const handleProjectCreated = (newProject: TaskProject) => {
    setProjects((prev) => [newProject, ...prev])
    setSelectedProjectId(newProject.id)
  }

  const handleProjectUpdated = (updatedProject: TaskProject) => {
    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)))
    setTasks((prev) =>
      prev.map((t) =>
        t.project_id === updatedProject.id
          ? {
              ...t,
              project: {
                ...t.project,
                id: updatedProject.id,
                name: updatedProject.name,
                color: updatedProject.color,
              },
            }
          : t
      )
    )
  }

  const handleProjectDeleted = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId))
    if (selectedProjectId === projectId) {
      setSelectedProjectId("all")
    }
  }

  const handleEditCurrentScope = () => {
    if (currentScopeValue.startsWith("workspace:")) {
      const wsId = currentScopeValue.replace("workspace:", "")
      const ws = workspaces.find((w) => w.id === wsId)
      if (ws) handleOpenEditWorkspace(ws)
    } else if (currentScopeValue !== "all") {
      const proj = projects.find((p) => p.id === currentScopeValue)
      if (proj) {
        setProjectToEdit(proj)
        setIsProjectModalOpen(true)
      }
    }
  }

  const handleWorkspaceCreated = (newWs: TaskWorkspace) => {
    setWorkspaces((prev) => [newWs, ...prev])
    setSelectedWorkspaceId(newWs.id)
    setSelectedProjectId("all")
  }

  const handleWorkspaceUpdated = (updatedWs: TaskWorkspace) => {
    setWorkspaces((prev) => prev.map((w) => (w.id === updatedWs.id ? updatedWs : w)))
  }

  const handleWorkspaceDeleted = (workspaceId: string) => {
    setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId))
    if (selectedWorkspaceId === workspaceId) {
      setSelectedWorkspaceId("all")
      setSelectedProjectId("all")
    }
  }

  const handleOpenEditWorkspace = (ws: TaskWorkspace) => {
    setWorkspaceToEdit(ws)
    setIsWorkspaceModalOpen(true)
  }

  const handleOpenCreateWorkspace = () => {
    setWorkspaceToEdit(null)
    setIsWorkspaceModalOpen(true)
  }

  const handleCollaboratorCreated = (newCollab: TaskCollaborator) => {
    setCollaborators((prev) => [...prev, newCollab])
  }

  const handleCollaboratorUpdated = (updatedCollab: TaskCollaborator) => {
    setCollaborators((prev) => prev.map((c) => (c.id === updatedCollab.id ? updatedCollab : c)))
  }

  const handleCollaboratorDeleted = (collabId: string) => {
    setCollaborators((prev) => prev.filter((c) => c.id !== collabId))
    if (selectedMemberFilter === collabId) {
      setSelectedMemberFilter("all")
    }
    getTasks({ orgId: organizationId }).then(setTasks)
    router.refresh()
  }

  // Reset bulk selection whenever tab, search, status filter or scope changes
  useEffect(() => {
    setSelectedTaskIds(new Set())
  }, [activeTab, searchTerm, statusFilter, currentScopeValue, selectedMemberFilter])

  const handleToggleSelectTask = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  const handleToggleSelectAll = () => {
    setSelectedTaskIds((prev) => {
      const allSelected = visibleTasks.length > 0 && visibleTasks.every((t) => prev.has(t.id))
      if (allSelected) {
        return new Set()
      } else {
        return new Set(visibleTasks.map((t) => t.id))
      }
    })
  }

  const handleBulkDelete = async () => {
    if (selectedTaskIds.size === 0) return

    const count = selectedTaskIds.size
    const msg =
      count === 1
        ? "¿Estás seguro de que deseas eliminar la tarea seleccionada? Esta acción no se puede deshacer."
        : `¿Estás seguro de que deseas eliminar permanentemente las ${count} tareas seleccionadas? Esta acción no se puede deshacer.`

    if (!confirm(msg)) return

    setIsBulkDeleting(true)
    try {
      const idsToDelete = Array.from(selectedTaskIds)
      const res = await deleteTasks(idsToDelete, organizationId)
      if (!res.success) {
        throw new Error(res.error || "Error al eliminar tareas")
      }

      toast.success(
        count === 1
          ? "Tarea eliminada correctamente"
          : `${count} tareas eliminadas correctamente`
      )

      const deletedSet = new Set(idsToDelete)
      setTasks((prev) => prev.filter((t) => !deletedSet.has(t.id)))
      setSelectedTaskIds(new Set())

      getTasks({ orgId: organizationId }).then((freshTasks) => {
        if (freshTasks) setTasks(freshTasks)
      })
      router.refresh()
    } catch (err: any) {
      console.error("Error bulk deleting tasks:", err)
      toast.error(err.message || "Error al eliminar tareas en lote")
    } finally {
      setIsBulkDeleting(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Standard Platform SectionHeader */}
      <SectionHeader
        title="Proyectos & Tareas"
        subtitle="Gestión ágil colaborativa, tableros drag & drop y supervisión 360°"
        icon={Kanban}
        action={
          <div className="flex items-center gap-1 bg-zinc-100/70 dark:bg-white/5 p-1 rounded-lg border border-zinc-200/60 dark:border-white/10 overflow-x-auto no-scrollbar">
            <Button
              variant={activeTab === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("list")}
              className="h-8 text-xs font-semibold gap-1.5 rounded-md shrink-0"
            >
              <List className="w-3.5 h-3.5" />
              General
            </Button>
            <Button
              variant={activeTab === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setActiveTab("kanban")
                if (includeMeetings) setIncludeMeetings(false)
              }}
              className="h-8 text-xs font-semibold gap-1.5 rounded-md shrink-0"
            >
              <Kanban className="w-3.5 h-3.5" />
              Tablero Kanban
            </Button>
            <Button
              variant={activeTab === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("calendar")}
              className="h-8 text-xs font-semibold gap-1.5 rounded-md shrink-0"
            >
              <CalendarRange className="w-3.5 h-3.5" />
              Calendario
            </Button>
            <Button
              variant={activeTab === "pacing" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("pacing")}
              className="h-8 text-xs font-semibold gap-1.5 rounded-md shrink-0"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Ritmo Semanal
            </Button>
            <Button
              variant={activeTab === "metrics" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("metrics")}
              className="h-8 text-xs font-semibold gap-1.5 rounded-md shrink-0"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Métricas
            </Button>
            <Button
              variant={activeTab === "collaborators" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("collaborators")}
              className="h-8 text-xs font-semibold gap-1.5 rounded-md shrink-0"
            >
              <Users className="w-3.5 h-3.5" />
              Colaboradores ({collaborators.length})
            </Button>
          </div>
        }
      />

      {/* Collaborator Filter Ribbon - Exclusively in General Tab */}
      {activeTab === "list" && collaborators.length > 0 && (
        <TaskCollaboratorRibbon
          teamMembers={collaborators}
          allTasks={projectTasks}
          selectedMemberId={selectedMemberFilter}
          onSelectMember={setSelectedMemberFilter}
        />
      )}

      {/* Unified SearchFilterBar & Actions Row - For Kanban, List and Calendar views */}
      {(activeTab === "kanban" || activeTab === "list" || activeTab === "calendar") && (
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <SearchFilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Buscar por ticket, título o responsable..."
            filters={[
              { id: "all", label: "Todas", count: totalCount },
              { id: "backlog", label: "Backlog", count: backlogCount, color: "slate" },
              {
                id: "active",
                label: "Activas",
                count: activeCount,
                color: "emerald",
                subOptions: [
                  { id: "todo", label: "Por Hacer", count: todoCount, color: "sky" },
                  { id: "in_progress", label: "En Curso", count: inProgressCount, color: "indigo" },
                  { id: "in_review", label: "En QA", count: inQaCount, color: "amber" },
                  { id: "blocked", label: "Bloqueadas", count: blockedCount, color: "red" },
                ],
              },
              { id: "done", label: "Completadas", count: completedCount, color: "emerald" },
            ]}
            activeFilter={statusFilter}
            onFilterChange={setStatusFilter}
            defaultShowFilters={false}
            className="flex-1"
          />

          <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
            {/* Unified Hierarchical Workspace & Project Tree Selector */}
            <div className="flex items-center gap-1">
              <Select value={currentScopeValue} onValueChange={handleScopeFilterChange}>
                <SelectTrigger className="h-9 text-xs font-medium rounded-lg bg-card border-zinc-200/80 dark:border-white/10 shadow-sm w-[185px] sm:w-[220px] text-left">
                  <div className="flex items-center truncate text-left flex-1 min-w-0">
                    <SelectValue placeholder="Todos los espacios" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-[340px]">
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
                            {/* Parent Workspace: Left-justified at pl-8, font-semibold, NO dot/square, with [KEY] badge & count */}
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
                                <span className="text-[10px] text-muted-foreground font-normal ml-auto pr-1">
                                  ({wsProjects.length})
                                </span>
                              </span>
                            </SelectItem>
                            {/* Child Projects: Indented at pl-12 like tree branch, with colored dot */}
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
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="truncate">{p.name}</span>
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {/* Dynamic Edit button for selected Workspace OR Project */}
              {currentScopeValue !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditCurrentScope}
                  className="h-9 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0 rounded-lg hover:bg-muted/50 cursor-pointer"
                  title={currentScopeValue.startsWith("workspace:") ? "Editar espacio de trabajo" : "Editar proyecto"}
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                </Button>
              )}
            </div>

            {/* Manual Sync Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="h-9 px-2.5 text-xs font-medium rounded-lg border-zinc-200/80 dark:border-white/10 shadow-sm gap-1.5 cursor-pointer bg-card hover:bg-muted/50"
              title="Sincronizar datos con el servidor"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
              <span className="hidden sm:inline font-semibold">Sincronizar</span>
            </Button>

            {/* Alternador exclusivo: Ver reuniones vs Ver Tickets con ancho uniforme y animación moderna */}
            {(meetingCount > 0 || includeMeetings) && (
              <TaskMeetingViewToggle
                includeMeetings={includeMeetings}
                disabled={activeTab === "calendar"}
                size="md"
                onToggle={() => {
                  const nextVal = !includeMeetings
                  setIncludeMeetings(nextVal)
                  if (nextVal && activeTab === "kanban") {
                    setActiveTab("list")
                  }
                }}
              />
            )}

            {/* Unified + Nuevo Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="h-9 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-1.5 px-3.5 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 p-1.5 rounded-xl shadow-xl border border-zinc-200/80 dark:border-white/10 bg-card"
              >
                <DropdownMenuItem
                  onClick={() => {
                    setNewTaskColumnStatus("todo")
                    setNewTaskInitialType("task")
                    setIsTaskModalOpen(true)
                  }}
                  className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-muted/60"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-foreground block">Nueva Tarea</span>
                    <span className="text-[11px] text-muted-foreground block leading-tight">
                      Crear ticket o requerimiento en el tablero
                    </span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setIsMeetingModalOpen(true)}
                  className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-muted/60"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Video className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-foreground block">Nueva Reunión / Actividad</span>
                    <span className="text-[11px] text-muted-foreground block leading-tight">
                      Sesión sincrónica con asistencia y horas automáticas
                    </span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    setSprintModalState({ isOpen: true, mode: "create", sprint: null })
                  }}
                  className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-muted/60"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Rocket className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-foreground block">Nuevo Sprint</span>
                    <span className="text-[11px] text-muted-foreground block leading-tight">
                      Ciclo ágil de trabajo con fechas y meta
                    </span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    setProjectToEdit(null)
                    setIsProjectModalOpen(true)
                  }}
                  className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-muted/60"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 mt-0.5">
                    <FolderPlus className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-foreground block">Nuevo Proyecto</span>
                    <span className="text-[11px] text-muted-foreground block leading-tight">
                      Contenedor o módulo para agrupar tickets
                    </span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 bg-border/60" />

                <DropdownMenuItem
                  onClick={handleOpenCreateWorkspace}
                  className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-muted/60"
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-foreground block">Nuevo Espacio</span>
                    <span className="text-[11px] text-muted-foreground block leading-tight">
                      Espacio padre de jerarquía y prefijo [KEY]
                    </span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 bg-border/60" />

                <DropdownMenuItem
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-muted/60"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-foreground block">Importar Datos / Tareas</span>
                    <span className="text-[11px] text-muted-foreground block leading-tight">
                      Carga masiva desde Pixy JSON, CSV o Jira
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Active View Body */}
      <div>
        {activeTab === "kanban" && (
          <TaskKanbanBoard
            tasks={visibleTasks}
            onSelectTask={handleSelectTask}
            onQuickMoveTask={handleQuickMoveTask}
            onNewTaskInColumn={(colStatus) => {
              setNewTaskColumnStatus(colStatus)
              setIsTaskModalOpen(true)
            }}
          />
        )}

        {activeTab === "list" && (
          <div className="relative">
            <BulkActionsFloatingBar
              selectedCount={selectedTaskIds.size}
              onDelete={handleBulkDelete}
              onClearSelection={() => setSelectedTaskIds(new Set())}
              isDeleting={isBulkDeleting}
            />
            <TaskListView
              tasks={visibleTasks}
              teamMembers={collaborators}
              onSelectTask={handleSelectTask}
              onQuickMoveTask={handleQuickMoveTask}
              selectedTaskIds={selectedTaskIds}
              onToggleSelectTask={handleToggleSelectTask}
              onToggleSelectAll={handleToggleSelectAll}
              includeMeetings={includeMeetings}
              onIncludeMeetingsChange={setIncludeMeetings}
            />
          </div>
        )}

        {activeTab === "calendar" && (
          <TaskCalendarView
            tasks={calendarTasks}
            sprints={sprints}
            includeMeetings={includeMeetings}
            onTaskClick={handleSelectTask}
          />
        )}

        {activeTab === "pacing" && (
          <TaskWeeklyPacingMatrix
            tasks={projectTasks}
            teamMembers={collaborators}
            projects={projects}
            workspaces={workspaces}
            onSelectTask={handleSelectTask}
            tenantBranding={tenantBranding}
          />
        )}

        {activeTab === "metrics" && (
          <TaskMetricsView
            metrics={computedMetrics}
            tasks={projectTasks}
            collaborators={collaborators}
            projects={availableProjects}
            sprints={sprints}
            activeSprint={activeSprintObj}
            onSprintCreated={(newSprint) => {
              setSprints((prev) => [newSprint, ...prev])
              router.refresh()
            }}
            onSprintUpdated={(updated) => {
              setSprints((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
              router.refresh()
            }}
            onSprintCompleted={handleSprintCompleted}
            onSprintDeleted={handleSprintDeleted}
            onSelectTask={handleSelectTask}
            onSwitchToGeneral={() => setActiveTab("list")}
            onCreateTask={() => {
              setNewTaskColumnStatus("todo")
              setIsTaskModalOpen(true)
            }}
            onCreateProject={() => {
              setProjectToEdit(null)
              setIsProjectModalOpen(true)
            }}
            onCreateSprint={() => {
              setSprintModalState({ isOpen: true, mode: "create", sprint: null })
            }}
          />
        )}

        {activeTab === "collaborators" && (
          <TaskCollaboratorsManager
            collaborators={collaborators}
            workspaces={workspaces}
            onCollaboratorCreated={handleCollaboratorCreated}
            onCollaboratorUpdated={handleCollaboratorUpdated}
            onCollaboratorDeleted={handleCollaboratorDeleted}
          />
        )}
      </div>

      {/* Task Detail Sheet / Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedTask(null)
        }}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
        collaborators={collaborators}
        availableTasks={tasks}
        onSelectTask={(t) => setSelectedTask(t)}
      />

      {/* Task Creation Modal */}
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onTaskCreated={handleTaskCreated}
        projects={projects}
        collaborators={collaborators}
        defaultProjectId={selectedProjectId}
        defaultStatus={newTaskColumnStatus}
        defaultType={newTaskInitialType}
      />

      {/* Dedicated Meeting Creation Modal */}
      {isMeetingModalOpen && (
        <TaskMeetingModal
          isOpen={isMeetingModalOpen}
          onClose={() => setIsMeetingModalOpen(false)}
          projects={projects}
          collaborators={collaborators}
          sprints={sprints}
          defaultProjectId={selectedProjectId !== "all" ? selectedProjectId : projects[0]?.id}
          onMeetingCreated={(createdMeeting) => {
            setTasks((prev) => [createdMeeting, ...prev])
            setIsMeetingModalOpen(false)
            router.refresh()
          }}
        />
      )}

      {/* Dedicated Meeting Detail Modal */}
      {selectedMeetingForDetail && (
        <TaskMeetingDetailModal
          meeting={selectedMeetingForDetail}
          isOpen={Boolean(selectedMeetingForDetail)}
          onClose={() => setSelectedMeetingForDetail(null)}
          isLeadOrPm={true}
          collaborators={collaborators}
          onMeetingUpdated={(updated) => {
            handleTaskUpdated(updated)
            setSelectedMeetingForDetail(updated)
          }}
          onMeetingDeleted={(deletedId) => {
            handleTaskDeleted(deletedId)
            setSelectedMeetingForDetail(null)
          }}
        />
      )}

      {/* Project Creation & Edit Modal */}
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
        collaborators={collaborators}
        workspaces={workspaces}
        defaultWorkspaceId={selectedWorkspaceId !== "all" ? selectedWorkspaceId : undefined}
      />

      {/* Workspace Creation & Edit Modal */}
      <WorkspaceFormModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => {
          setIsWorkspaceModalOpen(false)
          setWorkspaceToEdit(null)
        }}
        workspaceToEdit={workspaceToEdit}
        onWorkspaceCreated={handleWorkspaceCreated}
        onWorkspaceUpdated={handleWorkspaceUpdated}
        onWorkspaceDeleted={handleWorkspaceDeleted}
        collaborators={collaborators}
      />

      {/* Agile Work Hours Imputation Modal (Jira-style on transition to QA or Done) */}
      {logWorkState && (
        <TaskLogWorkModal
          isOpen={!!logWorkState}
          onClose={() => setLogWorkState(null)}
          task={logWorkState.task}
          targetStatus={logWorkState.targetStatus}
          onConfirm={(hours, note) => {
            const { task, targetStatus } = logWorkState
            setLogWorkState(null)
            handleQuickMoveTask(task.id, targetStatus, hours, note)
          }}
          onSkip={() => {
            const { task, targetStatus } = logWorkState
            setLogWorkState(null)
            handleQuickMoveTask(task.id, targetStatus, 0)
          }}
        />
      )}

      {/* Task Sprint Management Modal */}
      <TaskSprintModal
        isOpen={sprintModalState.isOpen}
        onClose={() => setSprintModalState((prev) => ({ ...prev, isOpen: false }))}
        mode={sprintModalState.mode}
        sprint={sprintModalState.sprint}
        activeSprint={activeSprintObj}
        allSprints={sprints}
        onSprintCreated={(newSprint) => {
          setSprints((prev) => [newSprint, ...prev])
          router.refresh()
        }}
        onSprintUpdated={(updated) => {
          setSprints((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
          router.refresh()
        }}
        onSprintCompleted={handleSprintCompleted}
        onSprintDeleted={handleSprintDeleted}
      />

      {/* Task & Collaborators Universal Import Modal */}
      <TaskImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        collaborators={collaborators}
        projects={projects}
        workspaces={workspaces}
        sprints={sprints}
        organizationId={organizationId}
        onImportComplete={() => {
          router.refresh()
          getTasks({ orgId: organizationId }).then(setTasks)
        }}
      />
    </div>
  )
}
