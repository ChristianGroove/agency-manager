"use client"

import React from "react"
import { CheckSquare, CheckCircle2, Circle, AtSign } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { TaskChecklistItem } from "../../types"
import { parseTaskChecklist } from "../../types"
import { cn } from "@/modules/infrastructure/utils/utils"

export interface TaskSubtasksTooltipBadgeProps {
  checklist: TaskChecklistItem[] | string | null | undefined
  teamMembers?: Array<{
    id: string
    first_name: string
    last_name?: string
  }>
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

export function TaskSubtasksTooltipBadge({
  checklist,
  teamMembers = [],
  className,
  onClick,
}: TaskSubtasksTooltipBadgeProps) {
  const items = parseTaskChecklist(checklist)
  if (!items || items.length === 0) return null

  const total = items.length
  const completedCount = items.filter((i) => i.completed).length
  const isAllDone = total > 0 && completedCount === total
  const percentage = Math.round((completedCount / total) * 100)

  const memberMap = new Map<string, string>()
  teamMembers.forEach((m) => {
    memberMap.set(m.id, `${m.first_name}${m.last_name ? ` ${m.last_name[0]}.` : ""}`)
  })

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              if (onClick) {
                e.stopPropagation()
                onClick(e)
              }
            }}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && onClick) {
                e.stopPropagation()
                onClick(e as any)
              }
            }}
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold tracking-tight select-none cursor-pointer transition-all shadow-2xs shrink-0 align-middle",
              isAllDone
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                : completedCount > 0
                ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 hover:bg-sky-500/25"
                : "bg-muted/80 text-muted-foreground border border-border/60 hover:border-primary/40 hover:text-foreground",
              className
            )}
            title={`Subtareas: ${completedCount} de ${total} completadas (${percentage}%)`}
          >
            {isAllDone ? (
              <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-500" />
            ) : (
              <CheckSquare className="w-3 h-3 shrink-0" />
            )}
            <span>
              {completedCount}/{total}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="p-3 max-w-xs sm:max-w-sm rounded-2xl bg-popover/95 backdrop-blur-md border border-border/80 shadow-2xl z-50 text-xs space-y-2.5 text-popover-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Title & Percentage */}
          <div className="space-y-1.5 border-b border-border/50 pb-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                Subtareas & Entregables
              </span>
              <span
                className={cn(
                  "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md border",
                  isAllDone
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                    : "bg-muted text-muted-foreground border-border/60"
                )}
              >
                {completedCount}/{total} ({percentage}%)
              </span>
            </div>

            {/* Mini Progress Bar */}
            <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300 rounded-full",
                  isAllDone ? "bg-emerald-500" : "bg-primary"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Subtasks List */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {items.map((item) => {
              const assignedName = item.assigned_staff_id
                ? memberMap.get(item.assigned_staff_id) || "Colaborador"
                : null

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-2 py-1 px-1.5 rounded-lg transition-colors text-[11px]",
                    item.completed
                      ? "bg-muted/30 opacity-60"
                      : "bg-background/80 hover:bg-muted/40"
                  )}
                >
                  <div className="pt-0.5 shrink-0">
                    {item.completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-muted-foreground/60" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "leading-snug break-words",
                        item.completed
                          ? "line-through text-muted-foreground font-normal"
                          : "text-foreground font-medium"
                      )}
                    >
                      {item.title}
                    </p>

                    {/* Metadata tags: Week & Assignee */}
                    {(!item.completed || assignedName || item.target_week) && (
                      <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                        {item.target_week && (
                          <span className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                            S{item.target_week}
                          </span>
                        )}

                        {assignedName && (
                          <span
                            className={cn(
                              "text-[9px] font-medium px-1 py-0.2 rounded inline-flex items-center gap-0.5",
                              item.completed
                                ? "bg-muted text-muted-foreground/80"
                                : "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 font-semibold"
                            )}
                          >
                            <AtSign className="w-2.5 h-2.5 shrink-0" />
                            <span>{assignedName}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-1 border-t border-border/40 text-[10px] text-muted-foreground/80 text-center italic">
            Clic en el ticket para abrir y gestionar
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
