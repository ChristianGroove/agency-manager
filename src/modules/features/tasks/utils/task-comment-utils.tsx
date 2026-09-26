"use client"

import React from "react"
import { Hash, AtSign, ExternalLink } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { toast } from "sonner"
import type { TaskItem } from "../types"

export function renderFormattedComment(
  content: string,
  availableTasks?: TaskItem[],
  onSelectTask?: (task: TaskItem) => void
) {
  const regex = /(#[A-Za-z0-9_-]+|@[A-Za-z0-9_\u00C0-\u017F]+|https?:\/\/[^\s]+)/g
  const parts = content.split(regex)

  return parts.map((part, index) => {
    if (!part) return null

    if (part.startsWith("#")) {
      const code = part.slice(1)
      const matchedTask = availableTasks?.find(
        (t) =>
          (t.ticket_code && t.ticket_code.toLowerCase() === code.toLowerCase()) ||
          t.id.toLowerCase() === code.toLowerCase() ||
          `tk-${t.id.slice(0, 4)}`.toLowerCase() === code.toLowerCase()
      )

      return (
        <button
          key={index}
          type="button"
          onClick={() => {
            if (matchedTask && onSelectTask) {
              onSelectTask(matchedTask)
              toast.info(`Abriendo ticket ${matchedTask.ticket_code || code}`)
            }
          }}
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[11px] font-semibold transition-all shadow-2xs mx-0.5 align-baseline",
            matchedTask && onSelectTask
              ? "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 cursor-pointer"
              : "bg-muted text-foreground/90 border border-border/60"
          )}
          title={matchedTask ? `${matchedTask.ticket_code || code}: ${matchedTask.title}` : `Ticket #${code}`}
        >
          <Hash className="w-3 h-3 text-primary shrink-0" />
          <span>{matchedTask?.ticket_code || code}</span>
        </button>
      )
    }

    if (part.startsWith("@")) {
      const name = part.slice(1)
      return (
        <span
          key={index}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 font-medium text-[11px] mx-0.5 align-baseline"
        >
          <AtSign className="w-2.5 h-2.5 shrink-0" />
          <span>{name}</span>
        </span>
      )
    }

    if (part.startsWith("http://") || part.startsWith("https://")) {
      const isImage =
        /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(part) ||
        (part.includes("/tasks/") && !part.endsWith(".pdf") && !part.endsWith(".xlsx"))
      if (isImage) {
        return (
          <div key={index} className="my-1.5 block">
            <a
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-xl overflow-hidden border border-border/70 hover:ring-2 hover:ring-primary/40 transition-all max-w-sm shadow-2xs group bg-black/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={part}
                alt="Captura adjunta"
                className="max-h-56 max-w-full w-auto object-contain rounded-xl group-hover:scale-[1.01] transition-transform"
                loading="lazy"
              />
            </a>
          </div>
        )
      }

      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-primary hover:underline font-mono text-[11px] mx-0.5 align-baseline"
        >
          <ExternalLink className="w-2.5 h-2.5 inline" />
          <span>{part.replace(/^https?:\/\/(www\.)?/, "").slice(0, 30)}</span>
        </a>
      )
    }

    return <span key={index}>{part}</span>
  })
}

export function parseProgressAudit(content: string) {
  const isProgress =
    content.toLowerCase().includes("avance de tarea actualizado") ||
    content.toLowerCase().includes("regresión de tarea actualizado") ||
    content.toLowerCase().includes("regresion de tarea actualizado")

  if (!isProgress) {
    return { isProgress: false, isRegression: false, formattedContent: content }
  }

  const match = content.match(/del\s+(\d+)%\s+al\s+(\d+)%/i)
  let isRegression =
    content.toLowerCase().includes("regresión") ||
    content.toLowerCase().includes("regresion")

  if (match) {
    const fromVal = parseInt(match[1], 10)
    const toVal = parseInt(match[2], 10)
    if (toVal < fromVal) {
      isRegression = true
    } else if (toVal > fromVal) {
      isRegression = false
    }
  }

  let formattedContent = content
  if (isRegression) {
    formattedContent = content.replace(/Avance de tarea/gi, "Regresión de tarea")
  } else {
    formattedContent = content
      .replace(/Regresión de tarea/gi, "Avance de tarea")
      .replace(/Regresion de tarea/gi, "Avance de tarea")
  }

  return { isProgress: true, isRegression, formattedContent }
}
