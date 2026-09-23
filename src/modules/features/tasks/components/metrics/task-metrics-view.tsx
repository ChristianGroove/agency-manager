"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Clock,
  Users,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Layers,
} from "lucide-react"
import type { TaskMetrics, TaskItem, TaskCollaborator, TaskProject, TaskSprint } from "../../types"
import { TaskPmOperationsDashboard } from "../portal/task-pm-operations-dashboard"

interface TaskMetricsViewProps {
  metrics?: TaskMetrics
  tasks?: TaskItem[]
  collaborators?: TaskCollaborator[]
  projects?: TaskProject[]
  brandColor?: string
  sprints?: TaskSprint[]
  activeSprint?: TaskSprint | null
  onSprintCreated?: (sprint: TaskSprint) => void
  onSprintUpdated?: (sprint: TaskSprint) => void
  onSprintCompleted?: (completedSprintId: string, nextSprint?: TaskSprint) => void
  onSprintDeleted?: (deletedSprintId: string) => void
  onSelectTask?: (task: TaskItem) => void
  onSwitchToGeneral?: () => void
  onCreateTask?: () => void
  onCreateProject?: () => void
  onCreateSprint?: () => void
}

export function TaskMetricsView({
  metrics,
  tasks = [],
  collaborators = [],
  projects = [],
  brandColor = "#8ec045",
  sprints = [],
  activeSprint,
  onSprintCreated,
  onSprintUpdated,
  onSprintCompleted,
  onSprintDeleted,
  onSelectTask,
  onSwitchToGeneral,
  onCreateTask,
  onCreateProject,
  onCreateSprint,
}: TaskMetricsViewProps) {
  if (tasks.length > 0 || collaborators.length > 0) {
    return (
      <div className="pt-1">
        <TaskPmOperationsDashboard
          tasks={tasks}
          teamMembers={collaborators}
          projects={projects}
          organization={{ name: "Plataforma" }}
          brandColor={brandColor}
          sprints={sprints}
          activeSprint={activeSprint}
          onSprintCreated={onSprintCreated}
          onSprintUpdated={onSprintUpdated}
          onSprintCompleted={onSprintCompleted}
          onSprintDeleted={onSprintDeleted}
          onSwitchToGestion={onSwitchToGeneral || (() => {})}
          onSelectTask={onSelectTask}
          onCreateTask={onCreateTask}
          onCreateProject={onCreateProject}
          onCreateSprint={onCreateSprint}
        />
      </div>
    )
  }

  if (!metrics) return null
  const totalByPriority =
    (metrics.tasksByPriority.urgent || 0) +
    (metrics.tasksByPriority.high || 0) +
    (metrics.tasksByPriority.medium || 0) +
    (metrics.tasksByPriority.low || 0)

  const urgentPct = totalByPriority > 0 ? Math.round((metrics.tasksByPriority.urgent / totalByPriority) * 100) : 0
  const highPct = totalByPriority > 0 ? Math.round((metrics.tasksByPriority.high / totalByPriority) * 100) : 0
  const medPct = totalByPriority > 0 ? Math.round((metrics.tasksByPriority.medium / totalByPriority) * 100) : 0
  const lowPct = totalByPriority > 0 ? Math.max(0, 100 - urgentPct - highPct - medPct) : 0

  return (
    <div className="space-y-5">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tareas</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground font-mono">
              {metrics.totalTasks}
            </span>
            <span className="text-xs text-muted-foreground">en el proyecto</span>
          </div>
          <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1">
            <span className="font-semibold text-emerald-500">{metrics.completedTasks} completadas</span>
            <span>•</span>
            <span className="font-semibold text-indigo-500">{metrics.inProgressTasks} en curso</span>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Tasa de Entrega</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground font-mono">
              {metrics.completionRate}%
            </span>
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] shadow-none">
              Efectividad
            </Badge>
          </div>
          <div className="pt-2">
            <Progress value={metrics.completionRate} className="h-2 bg-muted/60" />
          </div>
        </div>

        {/* Hours Incurred */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Horas Estimadas vs Reales</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground font-mono">
              {metrics.totalActualHours}h
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              / {metrics.totalEstimatedHours}h est.
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            {metrics.totalActualHours <= metrics.totalEstimatedHours
              ? "Dentro del margen estimado del sprint."
              : "Desviación detectada respecto a estimación inicial."}
          </p>
        </div>

        {/* QA & Blockers */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">En Testing QA / Bloqueadas</span>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-amber-500 font-mono">
                {metrics.inReviewTasks}
              </span>
              <span className="text-[10px] text-muted-foreground">en QA</span>
            </div>
            {metrics.blockedTasks > 0 && (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-red-500 font-mono">
                  {metrics.blockedTasks}
                </span>
                <span className="text-[10px] text-red-400">bloqueadas</span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            {metrics.inReviewTasks > 0
              ? `${metrics.inReviewTasks} tareas listas para validación final.`
              : "No hay tareas pendientes en cola de QA."}
          </p>
        </div>
      </div>

      {/* Priority Breakdown - Slim, low-height, modern SaaS component */}
      <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Distribución por Prioridad
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            {totalByPriority} tareas clasificadas
          </span>
        </div>

        {/* Multi-segment Proportional Bar */}
        <div className="h-2.5 w-full bg-muted/40 rounded-full overflow-hidden flex gap-0.5">
          {urgentPct > 0 && (
            <div
              style={{ width: `${urgentPct}%` }}
              className="bg-red-500 transition-all rounded-sm"
              title={`Urgente: ${metrics.tasksByPriority.urgent} (${urgentPct}%)`}
            />
          )}
          {highPct > 0 && (
            <div
              style={{ width: `${highPct}%` }}
              className="bg-amber-500 transition-all rounded-sm"
              title={`Alta: ${metrics.tasksByPriority.high} (${highPct}%)`}
            />
          )}
          {medPct > 0 && (
            <div
              style={{ width: `${medPct}%` }}
              className="bg-indigo-500 transition-all rounded-sm"
              title={`Media: ${metrics.tasksByPriority.medium} (${medPct}%)`}
            />
          )}
          {lowPct > 0 && (
            <div
              style={{ width: `${lowPct}%` }}
              className="bg-slate-400 transition-all rounded-sm"
              title={`Baja: ${metrics.tasksByPriority.low} (${lowPct}%)`}
            />
          )}
        </div>

        {/* Inline Legend Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-muted/30 border border-border/40 text-xs">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <span className="text-muted-foreground font-medium">Urgente</span>
            <span className="ml-auto font-mono font-bold text-foreground">
              {metrics.tasksByPriority.urgent}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              ({urgentPct}%)
            </span>
          </div>

          <div className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-muted/30 border border-border/40 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="text-muted-foreground font-medium">Alta</span>
            <span className="ml-auto font-mono font-bold text-foreground">
              {metrics.tasksByPriority.high}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              ({highPct}%)
            </span>
          </div>

          <div className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-muted/30 border border-border/40 text-xs">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            <span className="text-muted-foreground font-medium">Media</span>
            <span className="ml-auto font-mono font-bold text-foreground">
              {metrics.tasksByPriority.medium}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              ({medPct}%)
            </span>
          </div>

          <div className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-muted/30 border border-border/40 text-xs">
            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
            <span className="text-muted-foreground font-medium">Baja</span>
            <span className="ml-auto font-mono font-bold text-foreground">
              {metrics.tasksByPriority.low}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              ({lowPct}%)
            </span>
          </div>
        </div>
      </div>

      {/* Team Workload Distribution */}
      <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Distribución de Carga por Colaborador
            </h4>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            {metrics.collaboratorWorkload.length} miembros activos
          </span>
        </div>

        <div className="space-y-3">
          {metrics.collaboratorWorkload.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-6">
              No hay tareas asignadas a colaboradores en este periodo.
            </p>
          ) : (
            metrics.collaboratorWorkload.map((collab) => {
              const completedPercent =
                collab.totalTasks > 0
                  ? Math.round((collab.completedTasks / collab.totalTasks) * 100)
                  : 0

              return (
                <div
                  key={collab.staffId}
                  className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="w-7 h-7 border border-border/60">
                        <AvatarImage src={collab.avatar || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                          {collab.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-xs font-bold text-foreground block">
                          {collab.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {collab.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div className="text-right">
                        <span className="font-mono font-bold text-foreground">
                          {collab.completedTasks} / {collab.totalTasks}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          completadas
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="font-mono text-xs px-2 py-0.5 bg-background font-semibold shadow-none"
                      >
                        {completedPercent}%
                      </Badge>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <Progress value={completedPercent} className="h-1.5 bg-muted/70" />
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
