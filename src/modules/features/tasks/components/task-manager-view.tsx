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
} from "lucide-react"
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
  TaskStatus
} from "../types"
import { TaskKanbanBoard } from "./kanban/task-kanban-board"
import { TaskListView } from "./list/task-list-view"
import { TaskMetricsView } from "./metrics/task-metrics-view"
import { TaskCollaboratorsManager } from "./collaborators/task-collaborators-manager"
import { TaskCollaboratorRibbon } from "./portal/task-collaborator-ribbon"
import { TaskWeeklyPacingMatrix } from "./pacing/task-weekly-pacing-matrix"
import { TaskDetailModal } from "./modals/task-detail-modal"
import { TaskFormModal } from "./modals/task-form-modal"
import { ProjectFormModal } from "./modals/project-form-modal"
import { WorkspaceFormModal } from "./modals/workspace-form-modal"
import { updateTaskStatus, getTasks } from "../actions/task-actions"
import { toast } from "sonner"
import { SearchFilterBar } from "@/modules/core/ui/components/search-filter-bar"
import { SectionHeader } from "@/components/layout/section-header"

interface TaskManagerViewProps {
  initialWorkspaces?: TaskWorkspace[]
  initialProjects: TaskProject[]
  initialTasks: TaskItem[]
  initialCollaborators: TaskCollaborator[]
  initialMetrics?: TaskMetrics
  organizationId: string
}

export function TaskManagerView({
  initialWorkspaces = [],
  initialProjects,
  initialTasks,
  initialCollaborators,
  organizationId,
}: TaskManagerViewProps) {
  const [workspaces, setWorkspaces] = useState<TaskWorkspace[]>(initialWorkspaces)
  const [projects, setProjects] = useState<TaskProject[]>(initialProjects)
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks)
  const [collaborators, setCollaborators] = useState<TaskCollaborator[]>(initialCollaborators)

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("all")
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all")
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<"kanban" | "list" | "pacing" | "metrics" | "collaborators">("list")

  // Search & Status filters
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Modal states
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState<TaskProject | null>(null)
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false)
  const [workspaceToEdit, setWorkspaceToEdit] = useState<TaskWorkspace | null>(null)
  const [newTaskColumnStatus, setNewTaskColumnStatus] = useState<TaskStatus>("todo")

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

  // Summary counts for filter tabs
  const summaryCounts = useMemo(() => {
    let backlog = 0
    let todo = 0
    let inProgress = 0
    let inQa = 0
    let blocked = 0
    let completed = 0

    baseTasks.forEach((t: TaskItem) => {
      if (t.status === "backlog") backlog++
      else if (t.status === "todo") todo++
      else if (t.status === "in_progress") inProgress++
      else if (t.status === "in_review") inQa++
      else if (t.status === "blocked") blocked++
      else if (t.status === "done") completed++
    })

    return {
      total: baseTasks.length,
      backlog,
      todo,
      inProgress,
      inQa,
      blocked,
      completed,
    }
  }, [baseTasks])

  const {
    total: totalCount,
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
      let matchesStatus = true
      if (statusFilter === "backlog") matchesStatus = t.status === "backlog"
      else if (statusFilter === "todo") matchesStatus = t.status === "todo"
      else if (statusFilter === "in_progress") matchesStatus = t.status === "in_progress"
      else if (statusFilter === "in_review") matchesStatus = t.status === "in_review"
      else if (statusFilter === "blocked") matchesStatus = t.status === "blocked"
      else if (statusFilter === "done") matchesStatus = t.status === "done"

      if (!matchesStatus) return false

      if (q) {
        return (
          t.title.toLowerCase().includes(q) ||
          t.ticket_code.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.assigned_staff &&
            `${t.assigned_staff.first_name} ${t.assigned_staff.last_name}`
              .toLowerCase()
              .includes(q))
        )
      }

      return true
    })
  }, [baseTasks, statusFilter, searchTerm])

  const handleSelectTask = (task: TaskItem) => {
    setSelectedTask(task)
    setIsDetailModalOpen(true)
  }

  const handleQuickMoveTask = async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )

    try {
      const res = await updateTaskStatus(taskId, newStatus)
      if (res.success) {
        toast.success(`Tarea movida a: ${newStatus === 'done' ? 'Completado' : newStatus === 'in_review' ? 'Revisión / QA' : newStatus === 'in_progress' ? 'En Progreso' : newStatus}`)
      } else {
        toast.error("Error al mover la tarea")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar estado")
    }
  }

  const handleTaskUpdated = (updatedTask: TaskItem) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)))
    setSelectedTask(updatedTask)
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
              onClick={() => setActiveTab("kanban")}
              className="h-8 text-xs font-semibold gap-1.5 rounded-md shrink-0"
            >
              <Kanban className="w-3.5 h-3.5" />
              Tablero Kanban
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

      {/* Unified SearchFilterBar & Actions Row - Only for Kanban and List views */}
      {(activeTab === "kanban" || activeTab === "list") && (
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <SearchFilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Buscar por código, título o responsable..."
            filters={[
              { id: "all", label: "Todas", count: totalCount },
              { id: "backlog", label: "Backlog", count: backlogCount, color: "slate" },
              { id: "todo", label: "Por Hacer", count: todoCount, color: "sky" },
              { id: "in_progress", label: "En Curso", count: inProgressCount, color: "indigo" },
              { id: "in_review", label: "En QA", count: inQaCount, color: "amber" },
              { id: "blocked", label: "Bloqueadas", count: blockedCount, color: "red" },
              { id: "done", label: "Completadas", count: completedCount, color: "emerald" },
            ]}
            activeFilter={statusFilter}
            onFilterChange={setStatusFilter}
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
                      Sprint o módulo para agrupar tickets
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
          <TaskListView
            tasks={visibleTasks}
            onSelectTask={handleSelectTask}
            onQuickMoveTask={handleQuickMoveTask}
          />
        )}

        {activeTab === "pacing" && (
          <TaskWeeklyPacingMatrix
            tasks={projectTasks}
            teamMembers={collaborators}
            projects={projects}
            workspaces={workspaces}
            onSelectTask={handleSelectTask}
          />
        )}

        {activeTab === "metrics" && (
          <TaskMetricsView
            metrics={computedMetrics}
            tasks={projectTasks}
            collaborators={collaborators}
            projects={availableProjects}
            onSelectTask={handleSelectTask}
            onSwitchToGeneral={() => setActiveTab("list")}
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
      />

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
    </div>
  )
}
