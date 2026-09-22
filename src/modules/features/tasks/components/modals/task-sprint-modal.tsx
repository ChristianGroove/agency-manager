"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Zap,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCw,
  Archive,
  AlertTriangle,
  Play,
  Pencil,
  Trash2,
  Sparkles,
  Layers
} from "lucide-react"
import type { TaskSprint, TaskSprintStatus } from "../../types"
import {
  createSprint,
  updateSprint,
  completeSprint,
  deleteSprint,
  startSprint
} from "../../actions/task-sprint-actions"
import { toast } from "sonner"

interface TaskSprintModalProps {
  isOpen: boolean
  onClose: () => void
  mode: "create" | "edit" | "complete"
  sprint?: TaskSprint | null
  activeSprint?: TaskSprint | null
  allSprints?: TaskSprint[]
  token?: string
  workspaceId?: string | null
  projectId?: string | null
  onSprintCreated?: (sprint: TaskSprint) => void
  onSprintUpdated?: (sprint: TaskSprint) => void
  onSprintCompleted?: (completedSprintId: string, nextSprint?: TaskSprint) => void
  onSprintDeleted?: (deletedSprintId: string) => void
}

const DURATION_PRESETS = [
  { label: "1 Semana (7d)", days: 7 },
  { label: "2 Semanas (14d)", days: 14, recommended: true },
  { label: "3 Semanas (21d)", days: 21 },
  { label: "1 Mes (30d)", days: 30 },
]

export function TaskSprintModal({
  isOpen,
  onClose,
  mode,
  sprint,
  activeSprint,
  allSprints = [],
  token,
  workspaceId,
  projectId,
  onSprintCreated,
  onSprintUpdated,
  onSprintCompleted,
  onSprintDeleted,
}: TaskSprintModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states for Create / Edit
  const [name, setName] = useState("")
  const [goal, setGoal] = useState("")
  const [durationDays, setDurationDays] = useState(14)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [autoRollover, setAutoRollover] = useState(false)
  const [startImmediately, setStartImmediately] = useState(false)

  // Form states for Complete
  const [rolloverAction, setRolloverAction] = useState<"next_sprint" | "backlog">("next_sprint")
  const [rolloverDestination, setRolloverDestination] = useState<"new_sprint" | "existing_sprint">("new_sprint")
  const [selectedTargetSprintId, setSelectedTargetSprintId] = useState<string>("")
  const [nextSprintName, setNextSprintName] = useState("")

  // Available planning sprints for rollover
  const planningSprints = allSprints.filter(
    (s) => s.status === "planning" && s.id !== sprint?.id
  )

  useEffect(() => {
    if (!isOpen) return

    if (mode === "create") {
      // Suggest next sprint number
      const existingCount = allSprints.length
      const suggestedName = `Sprint ${existingCount + 1}`
      setName(suggestedName)
      setGoal("")

      // If active sprint exists, suggest starting the day after it ends; otherwise today
      let startObj = new Date()
      if (activeSprint?.end_date) {
        const afterActive = new Date(activeSprint.end_date)
        afterActive.setDate(afterActive.getDate() + 1)
        startObj = afterActive
      }
      const startStr = startObj.toISOString().slice(0, 10)
      setStartDate(startStr)

      const endObj = new Date(startObj)
      endObj.setDate(endObj.getDate() + 13) // 14 days total inclusive
      setEndDate(endObj.toISOString().slice(0, 10))
      setDurationDays(14)
      setAutoRollover(false)
      setStartImmediately(!activeSprint) // planning if active sprint exists, active otherwise
    } else if (mode === "edit" && sprint) {
      setName(sprint.name)
      setGoal(sprint.goal || "")
      setStartDate(sprint.start_date)
      setEndDate(sprint.end_date)
      setDurationDays(sprint.duration_days || 14)
      setAutoRollover(sprint.auto_rollover || false)
      setStartImmediately(sprint.status === "active")
    } else if (mode === "complete" && sprint) {
      setRolloverAction("next_sprint")
      setRolloverDestination(planningSprints.length > 0 ? "existing_sprint" : "new_sprint")
      if (planningSprints.length > 0) {
        setSelectedTargetSprintId(planningSprints[0].id)
      }
      const numMatch = sprint.name.match(/\d+/)
      const nextNum = numMatch ? parseInt(numMatch[0], 10) + 1 : allSprints.length + 1
      setNextSprintName(`Sprint ${nextNum}`)
    }
  }, [isOpen, mode, sprint, activeSprint, allSprints.length])

  // Recalculate end date when start date or duration changes
  const handleDurationPresetClick = (days: number) => {
    setDurationDays(days)
    if (startDate) {
      const start = new Date(startDate)
      const end = new Date(start)
      end.setDate(end.getDate() + days - 1)
      setEndDate(end.toISOString().slice(0, 10))
    }
  }

  const handleStartDateChange = (val: string) => {
    setStartDate(val)
    if (val && durationDays > 0) {
      const start = new Date(val)
      const end = new Date(start)
      end.setDate(end.getDate() + durationDays - 1)
      setEndDate(end.toISOString().slice(0, 10))
    }
  }

  const handleSaveCreateOrEdit = async () => {
    if (!name.trim()) {
      toast.error("Ingresa el nombre del sprint")
      return
    }
    if (!startDate || !endDate) {
      toast.error("Selecciona las fechas de inicio y fin")
      return
    }

    setIsSubmitting(true)
    try {
      if (mode === "create") {
        const res = await createSprint({
          name: name.trim(),
          goal: goal.trim() || null,
          start_date: startDate,
          end_date: endDate,
          duration_days: durationDays,
          auto_rollover: autoRollover,
          start_immediately: startImmediately,
          workspace_id: workspaceId || null,
          project_id: projectId || null,
          token
        })

        if (!res.success || !res.sprint) {
          toast.error(res.error || "No se pudo crear el sprint")
          return
        }

        toast.success(`Sprint "${res.sprint.name}" creado con éxito`)
        onSprintCreated?.(res.sprint)
        onClose()
      } else if (mode === "edit" && sprint) {
        const res = await updateSprint({
          sprintId: sprint.id,
          updates: {
            name: name.trim(),
            goal: goal.trim() || null,
            start_date: startDate,
            end_date: endDate,
            duration_days: durationDays,
            auto_rollover: autoRollover,
          },
          token
        })

        if (!res.success) {
          toast.error(res.error || "No se pudo actualizar el sprint")
          return
        }

        toast.success("Sprint actualizado correctamente")
        onSprintUpdated?.({
          ...sprint,
          name: name.trim(),
          goal: goal.trim() || null,
          start_date: startDate,
          end_date: endDate,
          duration_days: durationDays,
          auto_rollover: autoRollover,
        })
        onClose()
      }
    } catch (err: any) {
      toast.error(err.message || "Error al guardar el sprint")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCompleteSprint = async () => {
    if (!sprint) return

    setIsSubmitting(true)
    try {
      const res = await completeSprint({
        sprintId: sprint.id,
        rolloverAction,
        targetSprintId:
          rolloverAction === "next_sprint" && rolloverDestination === "existing_sprint"
            ? selectedTargetSprintId
            : null,
        createNewSprint: rolloverAction === "next_sprint" && rolloverDestination === "new_sprint",
        nextSprintName: nextSprintName.trim() || undefined,
        token
      })

      if (!res.success) {
        toast.error(res.error || "No se pudo finalizar el sprint")
        return
      }

      toast.success(
        `Sprint "${sprint.name}" completado.` +
          (res.movedTasksCount && res.movedTasksCount > 0
            ? ` ${res.movedTasksCount} tareas transferidas.`
            : "")
      )
      onSprintCompleted?.(sprint.id, res.nextSprint)
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Error al completar sprint")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!sprint) return
    if (!confirm(`¿Eliminar el "${sprint.name}"? Sus tareas asignadas volverán al backlog.`)) return

    setIsSubmitting(true)
    try {
      const res = await deleteSprint({ sprintId: sprint.id, token })
      if (!res.success) {
        toast.error(res.error || "Error al eliminar el sprint")
        return
      }

      toast.success(`Sprint "${sprint.name}" eliminado`)
      onSprintDeleted?.(sprint.id)
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Error inesperado")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculated stats for 'complete' mode
  const totalTasks = sprint?.total_tasks || 0
  const completedTasks = sprint?.completed_tasks || 0
  const incompleteTasks = Math.max(0, totalTasks - completedTasks)
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="relative p-6 border-b border-slate-100 dark:border-zinc-800/80 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/30 dark:from-indigo-950/20 dark:via-zinc-950 dark:to-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-500/30">
              {mode === "complete" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : mode === "edit" ? (
                <Pencil className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                {mode === "complete"
                  ? `Finalizar Sprint: ${sprint?.name}`
                  : mode === "edit"
                  ? `Editar Sprint: ${sprint?.name}`
                  : "Crear Nuevo Sprint / Ciclo"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {mode === "complete"
                  ? "Revisa las métricas alcanzadas y decide el destino de las tareas no concluidas."
                  : "Define el período de entrega, objetivo estratégico y automatizaciones de ciclo."}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content for Create / Edit */}
        {mode !== "complete" ? (
          <div className="p-6 space-y-5">
            {/* Sprint Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                Nombre del Sprint <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Ej. Sprint 1, Sprint Q4 - Pagos..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-sm font-medium"
              />
            </div>

            {/* Goal */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                Meta u Objetivo del Sprint (Opcional)
              </label>
              <Textarea
                placeholder="¿Qué resultado tangible o valor de negocio debe alcanzar el equipo al finalizar este sprint?"
                rows={2}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-xs"
              />
            </div>

            {/* Duration Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2">
                Duración del Sprint
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DURATION_PRESETS.map((p) => {
                  const isSelected = durationDays === p.days
                  return (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => handleDurationPresetClick(p.days)}
                      className={`relative flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300 shadow-sm"
                          : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      <span>{p.label}</span>
                      {p.recommended && (
                        <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                          Estándar
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Fecha de Inicio <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-xs font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Fecha de Fin <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Automation & Options */}
            <div className="space-y-3 pt-2">
              {/* Auto Rollover (Linear Cycles style) */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/40 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900/70 transition-colors">
                <input
                  type="checkbox"
                  checked={autoRollover}
                  onChange={(e) => setAutoRollover(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Auto-ciclado continuo (Estilo Linear Cycles)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    Al llegar la fecha límite, el sistema cierra el ciclo y transfiere automáticamente las tareas pendientes al siguiente sprint sin detener la operación del equipo.
                  </p>
                </div>
              </label>

              {/* Start Immediately (only for create mode) */}
              {mode === "create" && (
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/40 dark:bg-indigo-950/20 cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={startImmediately}
                    onChange={(e) => setStartImmediately(e.target.checked)}
                    className="mt-0.5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 fill-indigo-600/30" />
                      <span className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                        Iniciar inmediatamente como Sprint Activo
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/70 mt-0.5 leading-relaxed">
                      El sprint pasará de estado &quot;En Planificación&quot; a &quot;Activo&quot;, gobernando el panel de control y las métricas operativas.
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>
        ) : (
          /* Content for Complete Sprint */
          <div className="p-6 space-y-5">
            {/* Sprint Summary Cards */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Resumen de Entrega
                </span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {progressPct}% Completitud
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800">
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{totalTasks}</div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-medium">Total Tareas</div>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{completedTasks}</div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-medium">Completadas</div>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{incompleteTasks}</div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-medium">Incompletas</div>
                </div>
              </div>
            </div>

            {/* Incomplete Tasks Handling */}
            {incompleteTasks > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-zinc-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>¿Qué hacer con las {incompleteTasks} tareas incompletas?</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {/* Option 1: Move to next sprint */}
                  <div
                    onClick={() => setRolloverAction("next_sprint")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      rolloverAction === "next_sprint"
                        ? "border-indigo-600 bg-indigo-50/40 dark:border-indigo-500 dark:bg-indigo-950/30"
                        : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-slate-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="rolloverAction"
                        checked={rolloverAction === "next_sprint"}
                        onChange={() => setRolloverAction("next_sprint")}
                        className="mt-1 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Transferir al siguiente Sprint (Recomendado)
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                            Flujo Continuo
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          Mueve las {incompleteTasks} tareas sin perder contexto ni progreso acumulado.
                        </p>

                        {/* Sub-options when next_sprint selected */}
                        {rolloverAction === "next_sprint" && (
                          <div className="mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-900/40 space-y-2.5">
                            <div className="flex items-center gap-4 text-xs font-medium text-slate-700 dark:text-zinc-300">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name="rolloverDest"
                                  checked={rolloverDestination === "new_sprint"}
                                  onChange={() => setRolloverDestination("new_sprint")}
                                  className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>Crear nuevo sprint</span>
                              </label>

                              {planningSprints.length > 0 && (
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="rolloverDest"
                                    checked={rolloverDestination === "existing_sprint"}
                                    onChange={() => setRolloverDestination("existing_sprint")}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span>Sprint existente</span>
                                </label>
                              )}
                            </div>

                            {rolloverDestination === "new_sprint" ? (
                              <Input
                                placeholder="Nombre del nuevo sprint"
                                value={nextSprintName}
                                onChange={(e) => setNextSprintName(e.target.value)}
                                className="h-8 text-xs bg-white dark:bg-zinc-900 border-indigo-200 dark:border-indigo-800"
                              />
                            ) : (
                              <Select
                                value={selectedTargetSprintId}
                                onValueChange={setSelectedTargetSprintId}
                              >
                                <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-900 border-indigo-200 dark:border-indigo-800">
                                  <SelectValue placeholder="Seleccionar sprint destino" />
                                </SelectTrigger>
                                <SelectContent>
                                  {planningSprints.map((ps) => (
                                    <SelectItem key={ps.id} value={ps.id} className="text-xs">
                                      {ps.name} ({ps.start_date} al {ps.end_date})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Move to Backlog */}
                  <div
                    onClick={() => setRolloverAction("backlog")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      rolloverAction === "backlog"
                        ? "border-amber-600 bg-amber-50/40 dark:border-amber-500 dark:bg-amber-950/30"
                        : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-slate-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="rolloverAction"
                        checked={rolloverAction === "backlog"}
                        onChange={() => setRolloverAction("backlog")}
                        className="mt-1 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Devolver al Backlog general
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                            Repriorización
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          Las tareas incompletas saldrán del sprint y quedarán en la bandeja de backlog listas para futuras revisiones.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  ¡Sprint Completado al 100%!
                </h4>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-1">
                  Todas las {totalTasks} tareas fueron entregadas exitosamente. No se requiere rollover.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
          <div>
            {mode === "edit" && sprint && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Eliminar Sprint
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs border-slate-200 dark:border-zinc-800"
            >
              Cancelar
            </Button>

            {mode === "complete" ? (
              <Button
                type="button"
                size="sm"
                onClick={handleCompleteSprint}
                disabled={isSubmitting}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
              >
                {isSubmitting ? (
                  "Finalizando..."
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Finalizar Sprint & Cerrar Ciclo
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSaveCreateOrEdit}
                disabled={isSubmitting}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold"
              >
                {isSubmitting
                  ? "Guardando..."
                  : mode === "create"
                  ? startImmediately
                    ? "Crear e Iniciar Sprint"
                    : "Crear Sprint Planificado"
                  : "Guardar Cambios"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}