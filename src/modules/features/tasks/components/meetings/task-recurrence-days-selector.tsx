"use client"

import React from "react"
import { cn } from "@/modules/infrastructure/utils/utils"

interface TaskRecurrenceDaysSelectorProps {
  selectedDays: number[]
  onChange: (days: number[]) => void
}

const DAYS_OF_WEEK = [
  { day: 1, short: "L", label: "Lunes" },
  { day: 2, short: "M", label: "Martes" },
  { day: 3, short: "X", label: "Miércoles" },
  { day: 4, short: "J", label: "Jueves" },
  { day: 5, short: "V", label: "Viernes" },
  { day: 6, short: "S", label: "Sábado" },
  { day: 7, short: "D", label: "Domingo" },
]

export function TaskRecurrenceDaysSelector({
  selectedDays,
  onChange,
}: TaskRecurrenceDaysSelectorProps) {
  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      const next = selectedDays.filter((d) => d !== day)
      onChange(next.length > 0 ? next : [day])
    } else {
      onChange([...selectedDays, day].sort((a, b) => a - b))
    }
  }

  const setBusinessDays = () => {
    onChange([1, 2, 3, 4, 5])
  }

  const setMonWed = () => {
    onChange([1, 3])
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
          Días de la semana
        </label>
        <div className="flex items-center gap-1.5 text-[10px]">
          <button
            type="button"
            onClick={setBusinessDays}
            className="text-primary hover:underline cursor-pointer font-medium"
          >
            Lun-Vie
          </button>
          <span className="text-muted-foreground">•</span>
          <button
            type="button"
            onClick={setMonWed}
            className="text-primary hover:underline cursor-pointer font-medium"
          >
            Lun y Mié
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DAYS_OF_WEEK.map(({ day, short, label }) => {
          const isSelected = selectedDays.includes(day)
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              title={label}
              className={cn(
                "h-8 rounded-lg text-xs font-bold font-mono transition-all border flex items-center justify-center cursor-pointer",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-2xs scale-102"
                  : "bg-background text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted/50"
              )}
            >
              {short}
            </button>
          )
        })}
      </div>
    </div>
  )
}
