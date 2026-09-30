"use client"

import React, { useState, useMemo } from "react"
import { Check, ChevronDown, Ban } from "lucide-react"
import {
  TaskStatus,
  TaskType,
  isDisallowedStatusRegression,
} from "../../types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/modules/infrastructure/utils/utils"

export interface TaskStatusInteractiveBadgeProps {
  status: TaskStatus
  taskId: string
  taskType?: TaskType
  isLeadOrPm: boolean
  isQa?: boolean
  disabled?: boolean
  readOnly?: boolean
  blockedReason?: string | null
  blockedBy?: { id: string; ticket_code?: string; title?: string; status: TaskStatus } | null
  onStatusChange?: (newStatus: TaskStatus) => void
  className?: string
}

interface StatusConfig {
  value: TaskStatus
  label: string
  badgeClass: string
  dotClass: string
  activeRingClass: string
}

const STATUS_CONFIGS: Record<TaskStatus, StatusConfig> = {
  backlog: {
    value: "backlog",
    label: "Backlog",
    badgeClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25 hover:bg-slate-500/20",
    dotClass: "bg-slate-400",
    activeRingClass: "ring-slate-500/30",
  },
  todo: {
    value: "todo",
    label: "Por Hacer",
    badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25 hover:bg-sky-500/20",
    dotClass: "bg-sky-500",
    activeRingClass: "ring-sky-500/30",
  },
  in_progress: {
    value: "in_progress",
    label: "En Curso",
    badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25 hover:bg-indigo-500/20",
    dotClass: "bg-indigo-500",
    activeRingClass: "ring-indigo-500/30",
  },
  in_review: {
    value: "in_review",
    label: "En QA",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/20",
    dotClass: "bg-amber-500",
    activeRingClass: "ring-amber-500/30",
  },
  done: {
    value: "done",
    label: "Completado",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20",
    dotClass: "bg-emerald-500",
    activeRingClass: "ring-emerald-500/30",
  },
  blocked: {
    value: "blocked",
    label: "Bloqueado",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 hover:bg-rose-500/20",
    dotClass: "bg-rose-500",
    activeRingClass: "ring-rose-500/30",
  },
}

const ORDERED_STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
]

export function TaskStatusInteractiveBadge({
  status,
  taskId,
  taskType,
  isLeadOrPm,
  isQa = false,
  disabled = false,
  readOnly = false,
  blockedReason,
  blockedBy,
  onStatusChange,
  className,
}: TaskStatusInteractiveBadgeProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const currentConfig = STATUS_CONFIGS[status] || STATUS_CONFIGS.todo
  const isMeeting = taskType === "meeting"
  const isTerminalDone = status === "done" && !isLeadOrPm
  const canInteract = Boolean(onStatusChange && !disabled && !readOnly && !isMeeting && !isTerminalDone)
  const isBlocked = status === "blocked"

  const blockedReasonText = useMemo(() => {
    if (!isBlocked) return null
    if (blockedBy && blockedBy.status !== "done") {
      return `Bloqueado por dependencia #${blockedBy.ticket_code}: ${blockedBy.title}`
    }
    return blockedReason ? `Motivo: ${blockedReason}` : "Esta tarea se encuentra bloqueada."
  }, [isBlocked, blockedBy, blockedReason])

  // Mensaje para tooltip en caso no interactivo
  const nonInteractiveReason = useMemo(() => {
    if (isMeeting) return "Las reuniones sincrónicas se gestionan mediante su propia consola de sesión."
    if (isTerminalDone) return "Tarea completada: solo un Project Manager tiene permiso para reabrirla o modificar su estado."
    if (isBlocked) return blockedReasonText
    return null
  }, [isMeeting, isTerminalDone, isBlocked, blockedReasonText])

  const renderBadgeBody = (
    <span
      className={cn(
        "h-6.5 w-24 shrink-0 rounded-lg text-[10px] font-bold tracking-tight inline-flex items-center justify-center gap-1 border transition-all select-none shadow-2xs",
        currentConfig.badgeClass,
        canInteract ? "cursor-pointer group hover:shadow-xs active:scale-[0.98]" : "cursor-default opacity-90",
        className
      )}
    >
      {status === "blocked" ? (
        <Ban className="w-2.5 h-2.5 shrink-0" />
      ) : (
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", currentConfig.dotClass)} />
      )}
      <span className="truncate max-w-[56px]">{currentConfig.label}</span>
      {canInteract && (
        <ChevronDown className="w-2.5 h-2.5 opacity-50 shrink-0 transition-transform group-hover:opacity-80" />
      )}
    </span>
  )

  const blockedTooltipContent = (
    <TooltipContent
      side="top"
      className="max-w-[300px] p-3 rounded-xl border border-border/80 bg-popover/95 text-popover-foreground shadow-xl backdrop-blur-md space-y-1.5 z-[80]"
    >
      <div className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400 text-xs">
        <Ban className="w-3.5 h-3.5 shrink-0" />
        <span>Motivo del Bloqueo</span>
      </div>
      <p className="text-xs text-foreground/90 font-normal leading-relaxed whitespace-pre-wrap">
        {blockedReasonText}
      </p>
    </TooltipContent>
  )

  // Si no puede interactuar (solo lectura, reunión o completada sin rol PM)
  if (!canInteract) {
    if (isBlocked && blockedReasonText) {
      return (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex cursor-help" onClick={(e) => e.stopPropagation()}>
                {renderBadgeBody}
              </div>
            </TooltipTrigger>
            {blockedTooltipContent}
          </Tooltip>
        </TooltipProvider>
      )
    }

    if (nonInteractiveReason) {
      return (
        <TooltipProvider delayDuration={400}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex cursor-help" onClick={(e) => e.stopPropagation()}>
                {renderBadgeBody}
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-[280px] p-2.5 rounded-xl border border-border/80 bg-popover/95 text-popover-foreground shadow-xl backdrop-blur-md text-xs leading-relaxed z-[80]"
            >
              <p>{nonInteractiveReason}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return (
      <div className="inline-flex" onClick={(e) => e.stopPropagation()}>
        {renderBadgeBody}
      </div>
    )
  }

  // Interactivo con Menú Desplegable de Estados
  const renderTriggerButton = (
    <button
      type="button"
      className="focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-lg cursor-pointer"
      aria-label={`Cambiar estado de tarea, estado actual: ${currentConfig.label}`}
    >
      {renderBadgeBody}
    </button>
  )

  return (
    <div className="inline-flex" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        {isBlocked && blockedReasonText ? (
          <TooltipProvider delayDuration={300}>
            <Tooltip open={dropdownOpen ? false : undefined}>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  {renderTriggerButton}
                </DropdownMenuTrigger>
              </TooltipTrigger>
              {blockedTooltipContent}
            </Tooltip>
          </TooltipProvider>
        ) : (
          <DropdownMenuTrigger asChild>
            {renderTriggerButton}
          </DropdownMenuTrigger>
        )}

        <DropdownMenuContent
          align="start"
          sideOffset={4}
          className="w-48 p-1 rounded-xl shadow-xl border border-zinc-200/80 dark:border-white/10 bg-popover/95 backdrop-blur-md z-[75]"
        >
          <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1 tracking-wider">
            Cambiar Estado
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1" />

          {ORDERED_STATUSES.map((targetStatus) => {
            const cfg = STATUS_CONFIGS[targetStatus]
            const isCurrent = targetStatus === status
            const isRegression = isDisallowedStatusRegression(status, targetStatus, isLeadOrPm, isQa)
            const isBlockedDependency =
              (targetStatus === "done" || targetStatus === "in_review") &&
              Boolean(blockedBy && blockedBy.status !== "done")
            const isDisabled = isRegression || isBlockedDependency

            let disabledLabel: string | null = null
            if (isRegression) disabledLabel = "Solo PM"
            else if (isBlockedDependency) disabledLabel = "Bloqueado"

            return (
              <DropdownMenuItem
                key={targetStatus}
                disabled={isDisabled}
                onClick={(e) => {
                  e.stopPropagation()
                  if (isDisabled || isCurrent) return
                  onStatusChange?.(targetStatus)
                }}
                className={cn(
                  "flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors",
                  isCurrent && "font-bold bg-muted/50",
                  isDisabled && "opacity-40 cursor-not-allowed text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dotClass)} />
                  <span className="truncate">{cfg.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {disabledLabel && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-muted text-muted-foreground border border-border/50">
                      {disabledLabel}
                    </span>
                  )}
                  {isCurrent && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </div>
              </DropdownMenuItem>
            )
          })}

          <DropdownMenuSeparator className="my-1" />

          {/* Opción Bloqueado */}
          {(() => {
            const cfg = STATUS_CONFIGS.blocked
            const isCurrent = status === "blocked"
            return (
              <DropdownMenuItem
                key="blocked"
                onClick={(e) => {
                  e.stopPropagation()
                  if (isCurrent) return
                  onStatusChange?.("blocked")
                }}
                className={cn(
                  "flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20",
                  isCurrent && "font-bold bg-rose-500/10"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Ban className="w-3 h-3 shrink-0" />
                  <span className="truncate">{cfg.label}</span>
                </div>
                {isCurrent && <Check className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />}
              </DropdownMenuItem>
            )
          })()}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
