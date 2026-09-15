"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
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
} from "lucide-react"
import type {
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
import { TaskDetailModal } from "./modals/task-detail-modal"
import { TaskFormModal } from "./modals/task-form-modal"
import { ProjectFormModal } from "./modals/project-form-modal"
import { updateTaskStatus, getTaskMetrics } from "../actions/task-actions"
import { toast } from "sonner"
import { SearchFilterBar } from "@/modules/core/ui/components/search-filter-bar"
import { SectionHeader } from "@/components/layout/section-header"

interface TaskManagerViewProps {
  initialProjects: TaskProject[]
  initialTasks: TaskItem[]
  initialCollaborators: TaskCollaborator[]
  initialMetrics: TaskMetrics
  organizationId: string
}

export function TaskManagerView({
  initialProjects,
  initialTasks,
  initialCollaborators,
  initialMetrics,
  organizationId,
}: TaskManagerViewProps) {
  const [projects, setProjects] = useState<TaskProject[]>(initialProjects)
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks)
  const [collaborators, setCollaborators] = useState<TaskCollaborator[]>(initialCollaborators)
  const [metrics, setMetrics] = useState<TaskMetrics>(initialMetrics)

  const [selectedProjectId, setSelectedProjectId] = useState<string>("all")
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<"kanban" | "list" | "metrics" | "collaborators">("list")

  // Search & Status filters
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Update metrics when project or tasks change
  useEffect(() => {
    getTaskMetrics(organizationId, selectedProjectId).then(setMetrics)
  }, [selectedProjectId, tasks.length, organizationId])

  // Modal states
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [newTaskColumnStatus, setNewTaskColumnStatus] = useState<TaskStatus>("todo")

  // Filter tasks by selected project
  const projectTasks =
    selectedProjectId === "all"
      ? tasks
      : tasks.filter((t) => t.project_id === selectedProjectId)

  // Base tasks filtered by selected collaborator (when on General tab)
  const baseTasks =
    activeTab === "list" && selectedMemberFilter !== "all"
      ? projectTasks.filter((t) => t.assigned_staff_id === selectedMemberFilter)
      : projectTasks

  // Recompute quick summary counts
  const totalCount = baseTasks.length
  const todoCount = baseTasks.filter((t) => t.status === "todo" || t.status === "backlog").length
  const inProgressCount = baseTasks.filter((t) => t.status === "in_progress").length
  const inQaCount = baseTasks.filter((t) => t.status === "in_review").length
  const completedCount = baseTasks.filter((t) => t.status === "done").length
  const urgentCount = baseTasks.filter((t) => t.priority === "urgent").length

  // Filter by search & status
  const visibleTasks = baseTasks.filter((t) => {
    let matchesStatus = true
    if (statusFilter === "todo") matchesStatus = t.status === "todo" || t.status === "backlog"
    else if (statusFilter === "in_progress") matchesStatus = t.status === "in_progress"
    else if (statusFilter === "in_review") matchesStatus = t.status === "in_review"
    else if (statusFilter === "done") matchesStatus = t.status === "done"
    else if (statusFilter === "urgent") matchesStatus = t.priority === "urgent"

    let matchesSearch = true
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      matchesSearch = Boolean(
        t.title.toLowerCase().includes(q) ||
        t.ticket_code.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.assigned_staff &&
          `${t.assigned_staff.first_name} ${t.assigned_staff.last_name}`
            .toLowerCase()
            .includes(q))
      )
    }

    return matchesStatus && matchesSearch
  })

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

  const handleCollaboratorCreated = (newCollab: TaskCollaborator) => {
    setCollaborators((prev) => [...prev, newCollab])
  }

  const handleCollaboratorUpdated = (updatedCollab: TaskCollaborator) => {
    setCollaborators((prev) => prev.map((c) => (c.id === updatedCollab.id ? updatedCollab : c)))
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
              { id: "todo", label: "Por Hacer", count: todoCount, color: "slate" },
              { id: "in_progress", label: "En Curso", count: inProgressCount, color: "indigo" },
              { id: "in_review", label: "En QA", count: inQaCount, color: "amber" },
              { id: "done", label: "Completadas", count: completedCount, color: "emerald" },
              { id: "urgent", label: "Urgentes", count: urgentCount, color: "red" },
            ]}
            activeFilter={statusFilter}
            onFilterChange={setStatusFilter}
            className="flex-1"
          />

          <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
            {/* Project dropdown with Radix Select */}
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="h-9 text-xs font-medium rounded-lg bg-card border-zinc-200/80 dark:border-white/10 shadow-sm w-[180px] sm:w-[210px]">
                <div className="flex items-center gap-2 truncate">
                  <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                  <SelectValue placeholder="Filtrar por proyecto" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="all" className="text-xs">
                  Todos los proyectos ({tasks.length})
                </SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="truncate">{p.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsProjectModalOpen(true)}
              className="h-9 text-xs font-medium rounded-md bg-card shadow-sm hover:border-primary/50"
            >
              <FolderPlus className="w-3.5 h-3.5 mr-1.5 text-primary" />
              Nuevo Proyecto
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setNewTaskColumnStatus("todo")
                setIsTaskModalOpen(true)
              }}
              className="h-9 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Nueva Tarea
            </Button>
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

        {activeTab === "metrics" && (
          <TaskMetricsView
            metrics={metrics}
            tasks={tasks}
            collaborators={collaborators}
            projects={projects}
            onSelectTask={handleSelectTask}
            onSwitchToGeneral={() => setActiveTab("list")}
          />
        )}

        {activeTab === "collaborators" && (
          <TaskCollaboratorsManager
            collaborators={collaborators}
            onCollaboratorCreated={handleCollaboratorCreated}
            onCollaboratorUpdated={handleCollaboratorUpdated}
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

      {/* Project Creation Modal */}
      <ProjectFormModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onProjectCreated={handleProjectCreated}
        collaborators={collaborators}
      />
    </div>
  )
}
