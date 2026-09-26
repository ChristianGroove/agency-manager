"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Video, Ticket } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"

export interface TaskMeetingViewToggleProps {
  includeMeetings: boolean
  onToggle: () => void
  size?: "default" | "md" | "sm"
  className?: string
}

export function TaskMeetingViewToggle({
  includeMeetings,
  onToggle,
  size = "default",
  className,
}: TaskMeetingViewToggleProps) {
  const sizeClasses = {
    default: "h-10 rounded-2xl text-xs",
    md: "h-9 rounded-lg text-xs",
    sm: "h-8 rounded-xl text-xs",
  }[size]

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={includeMeetings ? "Ver Tickets" : "Ver reuniones"}
      className={cn(
        "group relative w-[140px] min-w-[140px] max-w-[140px] shrink-0 font-semibold",
        "flex items-center justify-center border transition-colors duration-200",
        "cursor-pointer select-none overflow-hidden outline-none",
        includeMeetings
          ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/15 dark:border-primary/40 shadow-xs ring-1 ring-primary/20 hover:bg-primary/20"
          : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-white/10 text-muted-foreground hover:text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800/60 shadow-2xs",
        sizeClasses,
        className
      )}
    >
      {/* Dynamic Ambient Glow on Active Meetings Mode */}
      {includeMeetings && (
        <motion.div
          layoutId="meeting-toggle-glow"
          className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        />
      )}

      {/* Animated Sliding Content (Icon + Text) */}
      <AnimatePresence mode="wait" initial={false}>
        {includeMeetings ? (
          <motion.div
            key="tickets-mode"
            initial={{ y: -10, opacity: 0, filter: "blur(3px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: 10, opacity: 0, filter: "blur(3px)" }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <motion.div
              initial={{ rotate: -20 }}
              animate={{ rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 26 }}
              className="shrink-0"
            >
              <Ticket className="w-3.5 h-3.5 text-primary" />
            </motion.div>
            <span className="tracking-tight">Ver Tickets</span>
          </motion.div>
        ) : (
          <motion.div
            key="meetings-mode"
            initial={{ y: 10, opacity: 0, filter: "blur(3px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: -10, opacity: 0, filter: "blur(3px)" }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <motion.div
              initial={{ rotate: 20 }}
              animate={{ rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 26 }}
              className="shrink-0"
            >
              <Video className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover:text-primary transition-colors" />
            </motion.div>
            <span className="tracking-tight">Ver reuniones</span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}
