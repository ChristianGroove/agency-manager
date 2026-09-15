"use client"

import React, { useState, useMemo, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Flame,
  Bug,
  Sparkles,
  Layers,
  ArrowRight,
  Plus,
  CheckSquare,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  GripVertical
} from "lucide-react"
import type { TaskItem, TaskStatus, TaskPriority } from "../../types"
import { parseTaskChecklist } from "../../types"
import { toast } from "sonner"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/modules/infrastructure/utils/utils"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"

interface TaskKanbanBoardProps {
  tasks: TaskItem[]
  onSelectTask: (task: TaskItem) => void
  onQuickMoveTask: (taskId: string, newStatus: TaskStatus) => void
  onNewTaskInColumn?: (status: TaskStatus) => void
  brandColor?: string
}

const COLUMNS: {
  id: TaskStatus
  label: string
  color: string
  headerBg: string
  dotColor: string
}[] = [
  {
    id: "backlog",
    label: "Backlog",
    color: "border-slate-500/20 bg-slate-500/5",
    headerBg: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
    dotColor: "bg-slate-400",
  },
  {
    id: "todo",
    label: "Por Hacer",
    color: "border-sky-500/20 bg-sky-500/5",
    headerBg: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    dotColor: "bg-sky-500",
  },
  {
    id: "in_progress",
    label: "En Progreso",
    color: "border-indigo-500/20 bg-indigo-500/5",
    headerBg: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    dotColor: "bg-indigo-500",
  },
  {
    id: "in_review",
    label: "Revisión / QA",
    color: "border-amber-500/20 bg-amber-500/5",
    headerBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dotColor: "bg-amber-500",
  },
  {
    id: "blocked",
    label: "Bloqueadas",
    color: "border-rose-500/20 bg-rose-500/5",
    headerBg: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    dotColor: "bg-rose-500",
  },
  {
    id: "done",
    label: "Completado",
    color: "border-emerald-500/20 bg-emerald-500/5",
    headerBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dotColor: "bg-emerald-500",
  },
]

// Droppable Column Component
function DroppableColumn({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 flex flex-col min-h-[420px] transition-colors rounded-2xl",
        isOver && "bg-primary/5 ring-2 ring-primary/30"
      )}
    >
      {children}
    </div>
  )
}

// Draggable & Sortable Task Card
function SortableTaskCard({
  task,
  onSelectTask,
  isOverlay = false,
  brandColor = "#8ec045",
}: {
  task: TaskItem
  onSelectTask?: (task: TaskItem) => void
  isOverlay?: boolean
  brandColor?: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: isOverlay })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  const safeChecklist = Array.isArray(task.checklist)
    ? task.checklist
    : parseTaskChecklist(task.checklist)
  const checklistTotal = safeChecklist.length
  const checklistDone = safeChecklist.filter((c) => c.completed).length
  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== "done"

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && onSelectTask && onSelectTask(task)}
      className={cn(
        "group p-3.5 rounded-2xl bg-card border border-zinc-200/80 dark:border-white/10 shadow-sm transition-all duration-150 space-y-2.5 relative touch-none select-none",
        !isDragging && "cursor-grab active:cursor-grabbing hover:border-zinc-300 dark:hover:border-white/20",
        isDragging && "z-50 shadow-xl opacity-35 scale-95",
        isOverlay && "cursor-grabbing shadow-2xl border-primary ring-2 ring-primary/40 bg-card rotate-1"
      )}
    >
      {/* Top Bar: Code, Project & Priority */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 truncate">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
          <Badge
            variant="outline"
            className="font-mono text-xs font-bold text-primary bg-primary/10 border-primary/25 dark:bg-primary/15 dark:text-primary dark:border-primary/30 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 tracking-wide"
          >
            {task.ticket_code}
          </Badge>
          {task.project && (
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 truncate max-w-[100px]">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: task.project.color }}
              />
              <span className="truncate">{task.project.name}</span>
            </span>
          )}
        </div>

        <div>
          {task.priority === "urgent" ? (
            <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px] px-1.5 py-0 font-bold rounded-md">
              Urgente
            </Badge>
          ) : task.priority === "high" ? (
            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] px-1.5 py-0 font-semibold rounded-md">
              Alta
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Title */}
      <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-snug">
        {task.title}
      </h4>

      {/* Progress Bar & Percentage */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="font-medium">Progreso</span>
          <span className="font-mono font-bold text-foreground">
            {task.progress_percentage}%
          </span>
        </div>
        <Progress value={task.progress_percentage} className="h-1 bg-zinc-100 dark:bg-white/10" />
      </div>

      {/* Meta Footer: Checklist, QA Badge, Due Date, Assignee */}
      <div className="flex items-center justify-between pt-1.5 text-[11px] text-muted-foreground border-t border-zinc-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          {checklistTotal > 0 && (
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <CheckSquare className="w-3 h-3 text-primary" />
              {checklistDone}/{checklistTotal}
            </span>
          )}

          {task.due_date && (
            <span
              className={cn(
                "flex items-center gap-1 text-[10px] font-mono",
                isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground"
              )}
            >
              <Clock className="w-3 h-3" />
              {new Date(task.due_date).toLocaleDateString("es-ES", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>

        {task.assigned_staff ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="w-5 h-5 border border-border shrink-0 shadow-2xs" style={{ backgroundColor: brandColor }}>
              <AvatarImage src={getCollaboratorAvatar(task.assigned_staff.photo_url, task.assigned_staff.first_name)} className="object-cover" />
              <AvatarFallback className="text-[8px] text-white font-bold" style={{ backgroundColor: brandColor }}>
                {task.assigned_staff.first_name[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] font-medium text-foreground truncate max-w-[70px]">
              {task.assigned_staff.first_name}
            </span>
          </div>
        ) : (
          <span className="text-[10px] italic text-muted-foreground/60">Sin asignar</span>
        )}
      </div>
    </div>
  )
}

export function TaskKanbanBoard({
  tasks,
  onSelectTask,
  onQuickMoveTask,
  onNewTaskInColumn,
  brandColor = "#8ec045",
}: TaskKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  // Configure sensors for drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px drag allows clicks to open modal smoothly
      },
    })
  )

  const activeTask = useMemo(
    () => (activeId ? tasks.find((t) => t.id === activeId) : null),
    [activeId, tasks]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)

      if (!over) return

      const taskId = active.id as string
      let targetStatus: TaskStatus | null = null

      // Check if dropped directly onto a column ID
      if (COLUMNS.some((c) => c.id === over.id)) {
        targetStatus = over.id as TaskStatus
      } else {
        // Dropped onto another task card
        const overTask = tasks.find((t) => t.id === over.id)
        if (overTask) {
          targetStatus = overTask.status
        }
      }

      const currentTask = tasks.find((t) => t.id === taskId)
      if (!currentTask || !targetStatus || currentTask.status === targetStatus) return

      const checklist = Array.isArray(currentTask.checklist)
        ? currentTask.checklist
        : parseTaskChecklist(currentTask.checklist)
      const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c) => !c.completed)

      if (targetStatus === "done" && hasUnfinishedDeliverables) {
        toast.warning("Entregables pendientes", {
          description: "No se puede mover la tarea a 'Completado' porque aún tiene entregables sin finalizar. Debe estar al 100% de entregables."
        })
        return
      }

      onQuickMoveTask(taskId, targetStatus)
    },
    [tasks, onQuickMoveTask]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Kanban Rail: Continuous horizontal track with horizontal scroll just like CRM Pipeline */}
      <div className="w-full overflow-x-auto scrollbar-modern pb-4">
        <div className="flex flex-nowrap gap-4 items-stretch min-w-max">
          {COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.id)
            const totalEstimated = columnTasks.reduce(
              (acc, curr) => acc + Number(curr.estimated_hours || 0),
              0
            )

            return (
              <SortableContext
                key={col.id}
                id={col.id}
                items={columnTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  className="flex flex-col shrink-0 w-[300px] sm:w-[320px] rounded-3xl border border-zinc-200/80 dark:border-white/10 p-3.5 bg-card shadow-sm"
                >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2.5 h-2.5 rounded-full", col.dotColor)} />
                    <h3 className="text-xs font-bold tracking-wide uppercase text-foreground">
                      {col.label}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-mono font-bold px-2 py-0 rounded-full bg-zinc-100 dark:bg-white/10 text-foreground"
                    >
                      {columnTasks.length}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1">
                    {totalEstimated > 0 && (
                      <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-0.5 mr-1">
                        <Clock className="w-3 h-3" />
                        {totalEstimated}h
                      </span>
                    )}
                    {onNewTaskInColumn && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground"
                        onClick={() => onNewTaskInColumn(col.id)}
                        title="Añadir tarea a esta columna"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Droppable Column Area */}
                <DroppableColumn id={col.id}>
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-0.5">
                    {columnTasks.length === 0 ? (
                      <div
                        onClick={() => onNewTaskInColumn && onNewTaskInColumn(col.id)}
                        className="flex-1 flex flex-col items-center justify-center text-muted-foreground/50 text-xs p-8 border-2 border-dashed border-zinc-200/80 dark:border-white/10 rounded-2xl cursor-pointer hover:border-primary/40 hover:bg-zinc-50/50 dark:hover:bg-white/5 transition-all text-center space-y-1.5 m-0.5"
                      >
                        <Plus className="w-4 h-4 opacity-40" />
                        <span className="text-[11px] font-medium">Sin tareas</span>
                        <span className="text-[10px] text-muted-foreground/60">+ Crear aquí</span>
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          onSelectTask={onSelectTask}
                          brandColor={brandColor}
                        />
                      ))
                    )}
                  </div>
                </DroppableColumn>
              </div>
            </SortableContext>
          )
        })}
        </div>
      </div>

      {/* Drag Overlay for smooth dragging preview */}
      <DragOverlay>
        {activeTask ? (
          <SortableTaskCard task={activeTask} isOverlay brandColor={brandColor} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
