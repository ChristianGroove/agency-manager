"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, Ban, Edit3, CheckCircle2, AlertTriangle, X } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover"
import { TaskItem, TASK_STATUS_LABELS } from "../../types"

export interface TaskBlockerSelectorProps {
  blockedByTaskId?: string | null
  blockedReason?: string | null
  onChange: (data: { blockedByTaskId: string | null; blockedReason: string | null }) => void
  availableTasks: TaskItem[]
  currentTaskId?: string
  disabled?: boolean
  className?: string
  isBlockedStatus?: boolean
}

const MAX_DISPLAY_TASKS = 25

export function TaskBlockerSelector({
  blockedByTaskId,
  blockedReason,
  onChange,
  availableTasks = [],
  currentTaskId,
  disabled = false,
  className,
  isBlockedStatus = false,
}: TaskBlockerSelectorProps) {
  // Normalize inputs
  const activeBlockerId = blockedByTaskId && blockedByTaskId !== "none" ? blockedByTaskId : null
  const activeReason = blockedReason && blockedReason.trim() ? blockedReason.trim() : null
  const hasBlocker = Boolean(activeBlockerId || activeReason)

  // Current task context for smart prioritization (same project first)
  const currentTask = React.useMemo(() => {
    if (!currentTaskId) return null
    return availableTasks.find((t) => t.id === currentTaskId) || null
  }, [availableTasks, currentTaskId])

  const currentProjectId = currentTask?.project_id || currentTask?.project?.id || null

  // Predecessor task if linked
  const selectedTask = React.useMemo(() => {
    if (!activeBlockerId) return null
    return availableTasks.find((t) => t.id === activeBlockerId) || null
  }, [activeBlockerId, availableTasks])

  const isPredecessorDone = selectedTask?.status === "done"

  // Component states
  const [open, setOpen] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const popoverContentRef = React.useRef<HTMLDivElement>(null)

  // Filter & smartly sort tasks (Limit to top 25 for instant UI performance)
  const { filteredTasks, displayedTasks, totalMatches } = React.useMemo(() => {
    const list = availableTasks.filter((t) => !currentTaskId || t.id !== currentTaskId)
    const q = inputValue.trim().toLowerCase()

    let matched = list
    if (q) {
      matched = list.filter((t) => {
        const code = (t.ticket_code || "").toLowerCase()
        const title = (t.title || "").toLowerCase()
        const proj = (t.project?.name || "").toLowerCase()
        return code.includes(q) || title.includes(q) || proj.includes(q)
      })
    }

    // Smart Prioritization:
    // 1. Exact or prefix match on ticket code (if searching)
    // 2. Same project first (most blockers belong to the same project)
    // 3. Incomplete tasks (in_progress, todo, in_review, blocked) before completed (done)
    // 4. Most recently updated / created
    const sorted = [...matched].sort((a, b) => {
      if (q) {
        const aCodeMatch = (a.ticket_code || "").toLowerCase().startsWith(q)
        const bCodeMatch = (b.ticket_code || "").toLowerCase().startsWith(q)
        if (aCodeMatch && !bCodeMatch) return -1
        if (!aCodeMatch && bCodeMatch) return 1
      }

      if (currentProjectId) {
        const aProj = a.project_id || a.project?.id
        const bProj = b.project_id || b.project?.id
        const aSameProj = aProj === currentProjectId ? 1 : 0
        const bSameProj = bProj === currentProjectId ? 1 : 0
        if (aSameProj !== bSameProj) return bSameProj - aSameProj
      }

      const aDone = a.status === "done" ? 1 : 0
      const bDone = b.status === "done" ? 1 : 0
      if (aDone !== bDone) return aDone - bDone

      const aDate = new Date(a.updated_at || a.created_at || 0).getTime()
      const bDate = new Date(b.updated_at || b.created_at || 0).getTime()
      return bDate - aDate
    })

    const displayed = sorted.slice(0, MAX_DISPLAY_TASKS)

    return {
      filteredTasks: sorted,
      displayedTasks: displayed,
      totalMatches: sorted.length
    }
  }, [availableTasks, currentTaskId, inputValue, currentProjectId])

  // Save text entered by user as custom blocker reason
  const handleSaveCustomText = React.useCallback(
    (text?: string) => {
      const textToSave = (text ?? inputValue).trim()
      if (!textToSave) {
        // If empty, clear
        onChange({ blockedByTaskId: null, blockedReason: null })
      } else {
        onChange({ blockedByTaskId: null, blockedReason: textToSave })
      }
      setIsEditing(false)
      setInputValue("")
      setOpen(false)
    },
    [inputValue, onChange]
  )

  // Select a system ticket as blocker
  const handleSelectTask = React.useCallback(
    (task: TaskItem) => {
      onChange({
        blockedByTaskId: task.id,
        blockedReason: null,
      })
      setIsEditing(false)
      setInputValue("")
      setOpen(false)
    },
    [onChange]
  )

  // Clear blocker completely
  const handleClear = React.useCallback(() => {
    onChange({ blockedByTaskId: null, blockedReason: null })
    setIsEditing(false)
    setInputValue("")
    setOpen(false)
  }, [onChange])

  // Start editing existing blocker
  const handleStartEdit = React.useCallback(() => {
    if (disabled) return
    setIsEditing(true)
    setInputValue(activeReason || selectedTask?.ticket_code || "")
    setOpen(true)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 50)
  }, [disabled, activeReason, selectedTask])

  // Fix vertical scroll inside modal dialogs (Radix react-remove-scroll blocks wheel events on portal contents)
  React.useEffect(() => {
    const el = scrollContainerRef.current
    if (!el || !open) return

    let touchStartY = 0

    const handleWheel = (e: WheelEvent) => {
      // Prevent parent dialog's react-remove-scroll on document from intercepting and cancelling the wheel event
      e.stopPropagation()

      if (el.scrollHeight > el.clientHeight) {
        let delta = e.deltaY
        if (e.deltaMode === 1) delta *= 33 // lines
        else if (e.deltaMode === 2) delta *= el.clientHeight // pages

        const prevScroll = el.scrollTop
        el.scrollTop += delta

        if (el.scrollTop !== prevScroll) {
          e.preventDefault()
        }
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY || 0
      e.stopPropagation()
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.stopPropagation()
      if (el.scrollHeight > el.clientHeight && e.touches.length === 1) {
        const currentY = e.touches[0].clientY
        const delta = touchStartY - currentY
        touchStartY = currentY
        el.scrollTop += delta
        e.preventDefault()
      }
    }

    el.addEventListener("wheel", handleWheel, { passive: false })
    el.addEventListener("touchstart", handleTouchStart, { passive: false })
    el.addEventListener("touchmove", handleTouchMove, { passive: false })

    return () => {
      el.removeEventListener("wheel", handleWheel)
      el.removeEventListener("touchstart", handleTouchStart)
      el.removeEventListener("touchmove", handleTouchMove)
    }
  }, [open, displayedTasks.length])

  // Should we show the editable input or the saved blocker badge?
  const showDisplayMode = hasBlocker && !isEditing

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        {showDisplayMode ? (
          /* DISPLAY MODE: Blocker is saved, show clean badge with inline pencil and clear icon */
          <PopoverAnchor asChild>
            <div
              className={cn(
                "flex items-center justify-between gap-1.5 min-h-[38px] px-2.5 py-1.5 rounded-xl border transition-all text-xs",
                selectedTask
                  ? isPredecessorDone
                    ? "bg-emerald-500/5 border-emerald-500/25 text-foreground"
                    : "bg-destructive/5 border-destructive/25 text-foreground"
                  : "bg-destructive/5 border-destructive/25 text-foreground"
              )}
            >
              {/* Blocker Content */}
              <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                {selectedTask ? (
                  <>
                    {isPredecessorDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                    <span className="font-mono text-[10px] font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 shrink-0">
                      {selectedTask.ticket_code || `TK-${selectedTask.id.slice(0, 4)}`}
                    </span>
                    <span className="truncate text-xs font-medium text-foreground">
                      {selectedTask.title}
                    </span>
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5 text-destructive shrink-0" />
                    <span className="truncate text-xs font-normal text-foreground/90 italic">
                      "{activeReason}"
                    </span>
                  </>
                )}
              </div>

              {/* Discrete Icon Actions */}
              {!disabled && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    title="Editar causa o cambiar ticket"
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    title="Quitar bloqueo / dependencia"
                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </PopoverAnchor>
        ) : (
          /* INPUT / SEARCH MODE: Single versatile input that searches or saves reason */
          <PopoverAnchor asChild>
            <div
              className={cn(
                "relative flex items-center min-h-[38px] w-full rounded-xl border bg-background px-2.5 transition-all focus-within:ring-1",
                isBlockedStatus && !hasBlocker
                  ? "border-destructive/40 bg-destructive/5 focus-within:ring-destructive/30"
                  : "border-input focus-within:ring-ring",
                disabled && "opacity-60 pointer-events-none"
              )}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {isBlockedStatus && !hasBlocker ? (
                  <Ban className="w-3.5 h-3.5 text-destructive shrink-0" />
                ) : (
                  <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  disabled={disabled}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value)
                    if (!open) setOpen(true)
                  }}
                  onFocus={() => {
                    if (!disabled) setOpen(true)
                  }}
                  onClick={() => {
                    if (!disabled && !open) setOpen(true)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      if (inputValue.trim()) {
                        handleSaveCustomText()
                      }
                    } else if (e.key === "Escape") {
                      setOpen(false)
                      setIsEditing(false)
                    }
                  }}
                  placeholder="Escribir motivo / buscar ticket..."
                  className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none border-none focus:ring-0 p-0"
                />
              </div>

              {/* Action Icons right inside the input */}
              <div className="flex items-center gap-0.5 shrink-0 pl-1">
                {inputValue.trim() ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveCustomText()}
                      title="Guardar motivo del bloqueo"
                      className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setInputValue("")
                        inputRef.current?.focus()
                      }}
                      title="Limpiar texto"
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : isEditing ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false)
                      setOpen(false)
                    }}
                    title="Cancelar edición"
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setOpen(!open)
                      if (!open) {
                        inputRef.current?.focus()
                      }
                    }}
                    className="p-1 text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
                  >
                    <ChevronsUpDown className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </PopoverAnchor>
        )}

        {/* DROPDOWN MENU: Only rendered when there are matching system tickets */}
        {displayedTasks.length > 0 && (
          <PopoverContent
            ref={popoverContentRef}
            align="start"
            sideOffset={4}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onWheel={(e) => e.stopPropagation()}
            onInteractOutside={(e) => {
              if (
                containerRef.current?.contains(e.target as Node) ||
                popoverContentRef.current?.contains(e.target as Node)
              ) {
                e.preventDefault()
              }
            }}
            onPointerDownOutside={(e) => {
              if (
                containerRef.current?.contains(e.target as Node) ||
                popoverContentRef.current?.contains(e.target as Node)
              ) {
                e.preventDefault()
              }
            }}
            onFocusOutside={(e) => {
              if (
                containerRef.current?.contains(e.target as Node) ||
                popoverContentRef.current?.contains(e.target as Node)
              ) {
                e.preventDefault()
              }
            }}
            className="w-[320px] sm:w-[360px] p-0 z-[80] rounded-xl border border-border/80 bg-popover shadow-2xl overflow-hidden"
          >
            <div
              ref={scrollContainerRef}
              onWheel={(e) => e.stopPropagation()}
              className="max-h-64 overflow-y-auto overscroll-contain p-1.5 space-y-0.5 scrollbar-thin"
              style={{
                WebkitOverflowScrolling: "touch",
              }}
            >
              <div className="px-2 py-1 mb-0.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Tickets del Sistema
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/60">
                  {totalMatches} {totalMatches === 1 ? "ticket" : "tickets"}
                </span>
              </div>

              {displayedTasks.map((t) => {
                const isSelected = activeBlockerId === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTask(t)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors group",
                      isSelected
                        ? "bg-primary/10 text-foreground font-semibold"
                        : "hover:bg-muted/80 text-foreground"
                    )}
                  >
                    <div className="min-w-0 flex-1 truncate">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-mono text-[10px] font-bold text-primary px-1.5 py-0.2 bg-primary/10 rounded border border-primary/20 shrink-0">
                          {t.ticket_code || `TK-${t.id.slice(0, 4)}`}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          ({TASK_STATUS_LABELS[t.status] || t.status})
                        </span>
                      </div>
                      <p className="truncate text-xs font-medium group-hover:text-primary transition-colors">
                        {t.title}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1" />
                    )}
                  </button>
                )
              })}

              {totalMatches > MAX_DISPLAY_TASKS && (
                <div className="px-2.5 py-2 mt-1 border-t border-border/40 text-center bg-muted/20 rounded-b-lg">
                  <p className="text-[10px] text-muted-foreground">
                    Mostrando los primeros <strong className="text-foreground">{MAX_DISPLAY_TASKS}</strong> de <strong className="text-foreground">{totalMatches}</strong> tickets.
                  </p>
                  <p className="text-[9px] text-muted-foreground/75 mt-0.5">
                    Escribe para afinar la búsqueda.
                  </p>
                </div>
              )}
            </div>
          </PopoverContent>
        )}
      </Popover>
    </div>
  )
}
