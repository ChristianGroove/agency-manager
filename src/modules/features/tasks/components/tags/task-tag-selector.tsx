"use client"

import React, { useState } from "react"
import { Tag, Plus, X, Check } from "lucide-react"
import { SYSTEM_STAGE_TAGS } from "../../types"
import { cn } from "@/modules/infrastructure/utils/utils"

interface TaskTagSelectorProps {
  tags: string[]
  onChange: (tags: string[]) => void
  readOnly?: boolean
  className?: string
}

export function TaskTagSelector({
  tags = [],
  onChange,
  readOnly = false,
  className,
}: TaskTagSelectorProps) {
  const [customTagInput, setCustomTagInput] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const currentTags = Array.isArray(tags) ? tags : []

  // Toggle a system tag
  const handleToggleSystemTag = (tagKey: string) => {
    if (readOnly) return
    if (currentTags.includes(tagKey)) {
      onChange(currentTags.filter((t) => t !== tagKey))
    } else {
      onChange([...currentTags, tagKey])
    }
  }

  // Remove any tag
  const handleRemoveTag = (tagToRemove: string) => {
    if (readOnly) return
    onChange(currentTags.filter((t) => t !== tagToRemove))
  }

  // Add custom tag
  const handleAddCustomTag = () => {
    if (readOnly) return
    const clean = customTagInput
      .trim()
      .toLowerCase()
      .replace(/^[#@]+/, "") // remove leading # or @ if user typed them
      .replace(/\s+/g, "-") // normalize spaces to dashes

    if (!clean) return

    if (!currentTags.includes(clean)) {
      onChange([...currentTags, clean])
    }
    setCustomTagInput("")
    setIsAdding(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddCustomTag()
    } else if (e.key === "Escape") {
      setIsAdding(false)
      setCustomTagInput("")
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Tag className="w-3 h-3 text-muted-foreground" />
          Etiquetas & Etapas
        </label>
        {!readOnly && !isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Añadir tag
          </button>
        )}
      </div>

      {/* Quick System Stage Tags (QA, UAT, Bloqueos, Release) */}
      {!readOnly && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-medium text-muted-foreground/80 block">
            Etapas clave de flujo:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(SYSTEM_STAGE_TAGS).map(([key, info]) => {
              const isSelected = currentTags.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleToggleSystemTag(key)}
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all flex items-center gap-1",
                    isSelected
                      ? cn(info.badgeClass, "ring-1 ring-primary/40 shadow-2xs font-bold")
                      : "border-border/60 bg-background/50 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                  title={info.label}
                >
                  <span>{info.shortLabel || info.label}</span>
                  {isSelected && <Check className="w-2.5 h-2.5 ml-0.5 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Inline Input for Adding Custom Tags */}
      {!readOnly && isAdding && (
        <div className="flex items-center gap-1.5 pt-0.5">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
              #
            </span>
            <input
              type="text"
              autoFocus
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="frontend, api, bug..."
              className="w-full bg-background border border-primary/50 text-xs rounded-lg pl-6 pr-2 h-7 focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-medium"
            />
          </div>
          <button
            type="button"
            onClick={handleAddCustomTag}
            disabled={!customTagInput.trim()}
            className="h-7 px-2.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
          >
            Añadir
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false)
              setCustomTagInput("")
            }}
            className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors shrink-0"
            title="Cancelar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active Tags Pills List */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {currentTags.length === 0 ? (
          <span className="text-[11px] text-muted-foreground/70 italic">
            Sin etiquetas asignadas
          </span>
        ) : (
          currentTags.map((tag) => {
            const sysTag = SYSTEM_STAGE_TAGS[tag]
            if (sysTag) {
              return (
                <span
                  key={tag}
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 shadow-2xs",
                    sysTag.badgeClass
                  )}
                >
                  <span>{sysTag.shortLabel || sysTag.label}</span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:opacity-75 focus:outline-none ml-0.5 rounded-full"
                      title={`Quitar etiqueta ${sysTag.label}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              )
            }

            return (
              <span
                key={tag}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-border/80 bg-secondary text-secondary-foreground flex items-center gap-1 shadow-2xs"
              >
                <span>#{tag}</span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:opacity-75 focus:outline-none ml-0.5 rounded-full text-muted-foreground hover:text-foreground"
                    title={`Quitar etiqueta ${tag}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            )
          })
        )}
      </div>
    </div>
  )
}
