"use client"

import React from "react"
import { Timer, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface TaskTimeCompactStripProps {
  estimatedHours: number
  actualHours: number
  isTerminalLocked?: boolean
  canEditEstimated?: boolean
  showLogWorkButton?: boolean
  onUpdateEstimatedHours?: (hours: number) => void
  onOpenLogWork?: () => void
}

export function TaskTimeCompactStrip({
  estimatedHours,
  actualHours,
  isTerminalLocked = false,
  canEditEstimated = true,
  showLogWorkButton = true,
  onUpdateEstimatedHours,
  onOpenLogWork,
}: TaskTimeCompactStripProps) {
  const overHours = Math.max(0, actualHours - estimatedHours)

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
        Tiempo
      </label>

      {/* Single-line compact strip */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-muted/20 border border-border/60 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-muted-foreground text-[11px] font-medium">Estimado:</span>
          {canEditEstimated && !isTerminalLocked && onUpdateEstimatedHours ? (
            <div className="flex items-center gap-0.5">
              <Input
                type="number"
                min="0"
                step="0.5"
                value={estimatedHours || ""}
                onChange={(e) => onUpdateEstimatedHours(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="h-6 w-14 text-xs font-semibold bg-background/80 text-foreground px-1.5 py-0 text-center rounded-md border-border/60 focus-visible:ring-1"
              />
              <span className="text-[11px] font-mono text-muted-foreground">h</span>
            </div>
          ) : (
            <span className="font-semibold font-mono text-foreground text-xs">
              {estimatedHours}h
            </span>
          )}
        </div>

        <span className="text-muted-foreground/40 font-light">|</span>

        <div className="flex items-center gap-1.5 min-w-0 justify-end">
          <span className="text-muted-foreground text-[11px] font-medium">Registrado:</span>
          <span className="font-semibold font-mono text-foreground text-xs">
            {actualHours}h
          </span>
          {overHours > 0 && (
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono">
              (+{Math.round(overHours * 10) / 10}h)
            </span>
          )}
        </div>
      </div>

      {/* Action button or terminal lock pill */}
      {showLogWorkButton && (
        isTerminalLocked ? (
          <div className="w-full h-8 px-3 rounded-xl bg-muted/30 border border-border/60 text-muted-foreground text-xs flex items-center justify-center gap-1.5 select-none font-medium">
            <Lock className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>Registro cerrado (Ticket completado)</span>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenLogWork}
            className="w-full h-8 text-xs font-medium rounded-xl border border-primary/25 bg-primary/5 hover:bg-primary/10 text-primary transition-colors flex items-center justify-center gap-1.5"
          >
            <Timer className="w-3.5 h-3.5 text-primary" />
            <span>Registrar Horas de Trabajo</span>
          </Button>
        )
      )}
    </div>
  )
}
