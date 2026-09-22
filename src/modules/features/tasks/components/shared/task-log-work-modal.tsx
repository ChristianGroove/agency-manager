"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  CheckCircle2,
  ShieldCheck,
  Timer,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import type { TaskItem, TaskStatus } from "../../types"

interface TaskLogWorkModalProps {
  isOpen: boolean
  onClose: () => void
  task: TaskItem | null
  targetStatus: TaskStatus
  targetLabel?: string
  currentUserId?: string
  onConfirm: (loggedHours: number, note?: string) => Promise<void> | void
  onSkip: () => Promise<void> | void
}

export function TaskLogWorkModal({
  isOpen,
  onClose,
  task,
  targetStatus,
  targetLabel,
  currentUserId,
  onConfirm,
  onSkip,
}: TaskLogWorkModalProps) {
  const [hoursInput, setHoursInput] = useState<string>("")
  const [note, setNote] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Smart suggestion: calculate suggested hours when modal opens
  useEffect(() => {
    if (!task) return

    const estimated = Number(task.estimated_hours) || 0
    const alreadyLogged = Number(task.actual_hours) || 0

    // Check if current user has assigned subtasks
    let userSubtasksRemaining = 0
    if (currentUserId && Array.isArray(task.checklist)) {
      const mySubtasks = task.checklist.filter((c) => c.assigned_staff_id === currentUserId)
      if (mySubtasks.length > 0) {
        const myEst = mySubtasks.reduce((sum, c) => sum + (Number(c.estimated_hours) || 0), 0)
        const myAct = mySubtasks.reduce((sum, c) => sum + (Number(c.actual_hours) || 0), 0)
        userSubtasksRemaining = Math.max(0, myEst - myAct)
      }
    }

    if (userSubtasksRemaining > 0) {
      setHoursInput(String(userSubtasksRemaining))
    } else if (estimated > alreadyLogged) {
      // Suggest remaining estimate
      const diff = Math.round((estimated - alreadyLogged) * 10) / 10
      setHoursInput(String(diff))
    } else if (alreadyLogged > 0) {
      // Default to +1h if already at or past estimate
      setHoursInput("1")
    } else if (estimated > 0) {
      setHoursInput(String(estimated))
    } else {
      setHoursInput("1")
    }
    setNote("")
  }, [task, isOpen, currentUserId])

  if (!task) return null

  const estimated = Number(task.estimated_hours) || 0
  const alreadyLogged = Number(task.actual_hours) || 0
  const parsedHours = parseFloat(hoursInput) || 0
  const projectedTotal = Math.round((alreadyLogged + parsedHours) * 10) / 10
  const isOverBudget = estimated > 0 && projectedTotal > estimated

  const handleQuickAdd = (delta: number) => {
    const current = parseFloat(hoursInput) || 0
    const updated = Math.max(0, Math.round((current + delta) * 10) / 10)
    setHoursInput(String(updated))
  }

  const handleSetExactRemaining = () => {
    const remaining = Math.max(0, Math.round((estimated - alreadyLogged) * 10) / 10)
    setHoursInput(String(remaining > 0 ? remaining : 1))
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm(parsedHours, note.trim() || undefined)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkipHours = async () => {
    setIsSubmitting(true)
    try {
      await onSkip()
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const isTransitionToQA = targetStatus === "in_review"
  const isTransitionToDone = targetStatus === "done"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="z-[80] sm:max-w-[440px] rounded-3xl border-border/80 bg-background/95 backdrop-blur-xl p-6 shadow-2xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="font-mono text-xs font-bold text-primary bg-primary/10 border-primary/25 rounded-lg px-2 py-0.5"
              >
                {task.ticket_code}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1",
                  isTransitionToDone
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : isTransitionToQA
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                )}
              >
                {isTransitionToDone ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <ShieldCheck className="w-3 h-3" />
                )}
                <span>{targetLabel || (isTransitionToDone ? "Completar" : "Enviar a QA")}</span>
              </Badge>
            </div>
          </div>

          <DialogTitle className="text-base font-bold text-foreground line-clamp-1">
            {task.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Registra el tiempo real invertido antes de mover la tarea para alimentar la telemetría del equipo.
          </DialogDescription>
        </DialogHeader>

        {/* Balance Card: Presupuesto vs Registrado */}
        <div className="my-2 p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              Presupuesto estimado:
            </span>
            <span className="font-mono font-bold text-foreground">
              {estimated > 0 ? `${estimated}h` : "Sin estimar"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
              <Timer className="w-3.5 h-3.5 text-muted-foreground" />
              Horas registradas previas:
            </span>
            <span className="font-mono font-bold text-foreground">
              {alreadyLogged}h
            </span>
          </div>

          <div className="pt-2 border-t border-border/40 flex items-center justify-between font-semibold">
            <span className="text-muted-foreground">Proyección con este registro:</span>
            <span
              className={cn(
                "font-mono font-bold",
                isOverBudget
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {projectedTotal}h {estimated > 0 && `(${Math.round((projectedTotal / estimated) * 100)}%)`}
            </span>
          </div>
        </div>

        {/* Input Section */}
        <div className="space-y-3 py-1">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Horas a imputar en este entregable:
              </label>
              {estimated > alreadyLogged && (
                <button
                  type="button"
                  onClick={handleSetExactRemaining}
                  className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                >
                  Restante ({Math.round((estimated - alreadyLogged) * 10) / 10}h)
                </button>
              )}
            </div>

            <div className="relative">
              <Input
                type="number"
                step="0.25"
                min="0"
                max="999"
                value={hoursInput}
                onChange={(e) => setHoursInput(e.target.value)}
                placeholder="0.0"
                className="h-11 text-base font-mono font-bold pr-12 rounded-2xl bg-card border-border/80 focus-visible:ring-primary shadow-xs"
                autoFocus
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-muted-foreground">
                horas
              </span>
            </div>
          </div>

          {/* Quick Increment Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mr-1">
              Añadir:
            </span>
            <button
              type="button"
              onClick={() => handleQuickAdd(0.5)}
              className="px-2.5 py-1 text-xs font-mono font-medium rounded-xl bg-muted/60 hover:bg-muted text-foreground border border-border/50 transition-colors cursor-pointer"
            >
              +30m
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(1)}
              className="px-2.5 py-1 text-xs font-mono font-medium rounded-xl bg-muted/60 hover:bg-muted text-foreground border border-border/50 transition-colors cursor-pointer"
            >
              +1h
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(2)}
              className="px-2.5 py-1 text-xs font-mono font-medium rounded-xl bg-muted/60 hover:bg-muted text-foreground border border-border/50 transition-colors cursor-pointer"
            >
              +2h
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(4)}
              className="px-2.5 py-1 text-xs font-mono font-medium rounded-xl bg-muted/60 hover:bg-muted text-foreground border border-border/50 transition-colors cursor-pointer"
            >
              +4h
            </button>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-border/50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSkipHours}
            disabled={isSubmitting}
            className="text-xs text-muted-foreground hover:text-foreground h-9 rounded-xl font-medium order-2 sm:order-1"
          >
            Omitir horas y avanzar
          </Button>

          <div className="flex items-center gap-2 order-1 sm:order-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs h-9 rounded-xl font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSubmitting}
              className="text-xs h-9 px-4 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-1.5"
            >
              <span>Guardar y avanzar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
