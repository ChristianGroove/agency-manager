"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Clock,
  Layers,
  ChevronRight,
} from "lucide-react"
import type { TaskItem, TaskStatus, TaskPriority } from "../../types"

interface TaskListViewProps {
  tasks: TaskItem[]
  onSelectTask: (task: TaskItem) => void
  onQuickMoveTask?: (taskId: string, newStatus: TaskStatus) => void
}

export function TaskListView({ tasks, onSelectTask, onQuickMoveTask }: TaskListViewProps) {
  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case "backlog":
        return "Backlog"
      case "todo":
        return "Por Hacer"
      case "in_progress":
        return "En Progreso"
      case "in_review":
        return "Revisión / QA"
      case "done":
        return "Completado"
      case "blocked":
        return "Bloqueado"
      default:
        return status
    }
  }

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "urgent":
        return (
          <Badge className="w-16 justify-center text-center bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[10px] font-semibold shadow-none">
            Urgente
          </Badge>
        )
      case "high":
        return (
          <Badge className="w-16 justify-center text-center bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold shadow-none">
            Alta
          </Badge>
        )
      case "medium":
        return (
          <Badge variant="outline" className="w-16 justify-center text-center bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] font-medium shadow-none">
            Media
          </Badge>
        )
      case "low":
        return (
          <Badge variant="outline" className="w-16 justify-center text-center text-muted-foreground/70 border-border/40 text-[10px] font-medium shadow-none">
            Baja
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Tasks Table */}
      <div className="border border-border/60 rounded-2xl bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-semibold">
                <th className="p-3.5 pl-4 w-24">Ticket</th>
                <th className="p-3.5">Título</th>
                <th className="p-3.5 w-32">Estado</th>
                <th className="p-3.5 w-24">Prioridad</th>
                <th className="p-3.5 w-36">Progreso</th>
                <th className="p-3.5 w-40">Asignado</th>
                <th className="p-3.5 w-28">Fecha límite</th>
                <th className="p-3.5 w-16 text-right pr-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No se encontraron tareas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    <td className="p-3.5 pl-4 whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/25 rounded-lg px-2.5 py-1 whitespace-nowrap shrink-0 tracking-wide min-w-[70px] inline-flex items-center justify-center shadow-xs"
                      >
                        {task.ticket_code}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {task.title}
                        </span>
                        {task.project && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Layers className="w-3 h-3 text-muted-foreground" />
                            {task.project.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                      {onQuickMoveTask ? (
                        <Select
                          value={task.status}
                          onValueChange={(val: TaskStatus) => onQuickMoveTask(task.id, val)}
                        >
                          <SelectTrigger className="h-7 w-[120px] text-xs font-normal border-transparent bg-transparent hover:bg-muted/50 transition-colors shadow-none px-1.5 focus:ring-0">
                            <SelectValue placeholder="Estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="backlog">Backlog</SelectItem>
                            <SelectItem value="todo">Por Hacer</SelectItem>
                            <SelectItem value="in_progress">En Progreso</SelectItem>
                            <SelectItem value="in_review">Revisión / QA</SelectItem>
                            <SelectItem value="done">Completado</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-foreground px-1.5">
                          {getStatusLabel(task.status)}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">{getPriorityBadge(task.priority)}</td>
                    <td className="p-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-mono font-semibold text-foreground">
                            {task.progress_percentage}%
                          </span>
                        </div>
                        <Progress value={task.progress_percentage} className="h-1.5 w-28" />
                      </div>
                    </td>
                    <td className="p-3.5">
                      {task.assigned_staff ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={task.assigned_staff.photo_url || undefined} />
                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                              {task.assigned_staff.first_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground line-clamp-1">
                            {task.assigned_staff.first_name} {task.assigned_staff.last_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 italic">Sin asignar</span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-muted-foreground">
                      {task.due_date ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(task.due_date).toLocaleDateString("es-ES", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3.5 text-right pr-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
