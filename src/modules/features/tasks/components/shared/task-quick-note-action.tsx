"use client"

import React, { useState, useEffect, useRef } from "react"
import { StickyNote, Trash2, Check, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/modules/infrastructure/utils/utils"
import { toast } from "sonner"
import type { TaskItem, TaskQuickNote } from "../../types"
import { portalUpdateTaskQuickNote } from "../../actions/collaborator-portal-actions"
import { updateTaskQuickNote } from "../../actions/task-actions"

interface TaskQuickNoteActionProps {
  task: TaskItem
  portalToken?: string
  currentAuthorName?: string
  currentAuthorId?: string
  onNoteUpdate?: (taskId: string, newNote: TaskQuickNote | null) => void
  className?: string
}

function formatNoteDate(dateStr?: string): string {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr)
    const day = d.getDate()
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    const month = months[d.getMonth()] || "mes"
    const hours = d.getHours().toString().padStart(2, "0")
    const minutes = d.getMinutes().toString().padStart(2, "0")
    return `${day} ${month}, ${hours}:${minutes}`
  } catch {
    return ""
  }
}

/**
 * Regex parser for detecting clickable URLs within quick note text
 */
function renderTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
  const parts = text.split(urlRegex)

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      const href = part.toLowerCase().startsWith("www.") ? `https://${part}` : part
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-primary underline underline-offset-2 break-all hover:text-primary/80 transition-opacity inline-flex items-center gap-0.5"
        >
          <span>{part}</span>
          <ExternalLink className="w-2.5 h-2.5 inline-block shrink-0 opacity-70" />
        </a>
      )
    }
    return <React.Fragment key={index}>{part}</React.Fragment>
  })
}

export function TaskQuickNoteAction({
  task,
  portalToken,
  currentAuthorName = "Tú",
  currentAuthorId,
  onNoteUpdate,
  className,
}: TaskQuickNoteActionProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [isTooltipOpen, setIsTooltipOpen] = useState(false)
  const [noteContent, setNoteContent] = useState(task.quick_note?.content || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Keep local note draft synchronized when the task prop changes
  useEffect(() => {
    if (!isPopoverOpen) {
      setNoteContent(task.quick_note?.content || "")
    }
  }, [task.quick_note, isPopoverOpen])

  // Focus textarea when popover opens
  useEffect(() => {
    if (isPopoverOpen) {
      setIsTooltipOpen(false)
      setTimeout(() => {
        textareaRef.current?.focus()
        textareaRef.current?.select()
      }, 50)
    }
  }, [isPopoverOpen])

  const hasActiveNote = Boolean(task.quick_note?.content?.trim())

  const handleSaveNote = async () => {
    const trimmed = noteContent.trim()
    if (!trimmed) {
      handleDeleteNote()
      return
    }

    setIsSubmitting(true)
    const optimisticNote: TaskQuickNote = {
      content: trimmed,
      author_name: currentAuthorName,
      author_id: currentAuthorId,
      updated_at: new Date().toISOString(),
    }

    // Optimistic UI update
    onNoteUpdate?.(task.id, optimisticNote)
    setIsPopoverOpen(false)

    try {
      if (portalToken) {
        const res = await portalUpdateTaskQuickNote(portalToken, task.id, trimmed)
        if (!res.success) {
          toast.error(res.error || "No se pudo guardar la nota rápida")
          onNoteUpdate?.(task.id, task.quick_note || null)
        } else {
          toast.success("Nota rápida guardada", { duration: 2000 })
        }
      } else {
        const res = await updateTaskQuickNote(task.id, trimmed)
        if (!res.success) {
          toast.error(res.error || "No se pudo guardar la nota rápida")
          onNoteUpdate?.(task.id, task.quick_note || null)
        } else {
          toast.success("Nota rápida guardada", { duration: 2000 })
        }
      }
    } catch {
      toast.error("Error al actualizar la nota rápida")
      onNoteUpdate?.(task.id, task.quick_note || null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteNote = async () => {
    setIsSubmitting(true)
    // Optimistic delete
    onNoteUpdate?.(task.id, null)
    setNoteContent("")
    setIsPopoverOpen(false)

    try {
      if (portalToken) {
        const res = await portalUpdateTaskQuickNote(portalToken, task.id, null)
        if (!res.success) {
          toast.error(res.error || "No se pudo eliminar la nota")
          onNoteUpdate?.(task.id, task.quick_note || null)
        } else {
          toast.success("Nota rápida eliminada", { duration: 2000 })
        }
      } else {
        const res = await updateTaskQuickNote(task.id, null)
        if (!res.success) {
          toast.error(res.error || "No se pudo eliminar la nota")
          onNoteUpdate?.(task.id, task.quick_note || null)
        } else {
          toast.success("Nota rápida eliminada", { duration: 2000 })
        }
      }
    } catch {
      toast.error("Error al eliminar la nota rápida")
      onNoteUpdate?.(task.id, task.quick_note || null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      handleSaveNote()
    } else if (e.key === "Escape") {
      e.preventDefault()
      setIsPopoverOpen(false)
    }
  }

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <TooltipProvider delayDuration={150}>
        <Tooltip
          open={isPopoverOpen ? false : isTooltipOpen}
          onOpenChange={(open) => {
            if (!isPopoverOpen) setIsTooltipOpen(open)
          }}
        >
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsPopoverOpen(!isPopoverOpen)
                }}
                className={cn(
                  "w-7 h-7 p-0 rounded-lg flex items-center justify-center shrink-0 transition-all cursor-pointer",
                  hasActiveNote
                    ? "text-amber-500 hover:text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 shadow-2xs"
                    : "text-muted-foreground/45 hover:text-foreground hover:bg-muted/60 border border-transparent",
                  className
                )}
                aria-label="Nota"
              >
                <StickyNote
                  className={cn(
                    "w-3.5 h-3.5 transition-transform",
                    hasActiveNote && "fill-amber-500/20 scale-105"
                  )}
                />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>

          <TooltipContent
            side="top"
            align="end"
            className="max-w-[280px] p-2.5 rounded-xl border border-zinc-200/90 dark:border-white/10 bg-popover/95 backdrop-blur-md shadow-xl text-left select-text"
            onClick={(e) => e.stopPropagation()}
          >
            {hasActiveNote && task.quick_note ? (
              <div className="space-y-1.5">
                <div className="text-xs text-foreground font-normal whitespace-pre-wrap leading-relaxed break-words max-h-36 overflow-y-auto">
                  {renderTextWithLinks(task.quick_note.content)}
                </div>
                <div className="pt-1.5 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground/75 font-mono">
                  <span className="truncate max-w-[150px]">
                    Por {task.quick_note.author_name}
                  </span>
                  {task.quick_note.updated_at && (
                    <span className="shrink-0 ml-2">
                      {formatNoteDate(task.quick_note.updated_at)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-xs font-medium text-foreground">
                Nota
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        side="top"
        align="end"
        className="w-72 p-2.5 rounded-2xl border border-zinc-200/90 dark:border-white/10 bg-card/98 backdrop-blur-md shadow-2xl space-y-2 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between text-[11px] font-semibold text-foreground px-0.5">
          <span className="flex items-center gap-1.5">
            <StickyNote className="w-3.5 h-3.5 text-amber-500" />
            <span>Nota</span>
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/60 font-normal">
            Privada
          </span>
        </div>

        <Textarea
          ref={textareaRef}
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un recordatorio o pega un enlace..."
          rows={3}
          disabled={isSubmitting}
          className="text-xs resize-none bg-muted/30 focus-visible:ring-1 focus-visible:ring-primary rounded-xl p-2.5 min-h-[70px]"
        />

        <div className="flex items-center justify-between pt-0.5">
          {hasActiveNote || noteContent.trim().length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSubmitting}
              onClick={handleDeleteNote}
              className="h-7 w-7 p-0 text-muted-foreground/60 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg shrink-0 cursor-pointer"
              title="Eliminar nota"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <div className="w-7" />
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground/50 font-mono hidden sm:inline-block">
              Ctrl+Enter
            </span>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting || (!noteContent.trim() && !hasActiveNote)}
              onClick={handleSaveNote}
              className="h-7 px-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Guardar</span>
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
