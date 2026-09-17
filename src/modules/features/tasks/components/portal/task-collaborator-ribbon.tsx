"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/modules/infrastructure/utils/utils"
import { Users, CheckCircle2, Clock, ShieldCheck, Code2, Palette, Briefcase } from "lucide-react"
import type { TaskItem } from "../../types"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  photo_url?: string | null
  email?: string | null
  role?: string
}

interface TaskCollaboratorRibbonProps {
  teamMembers: StaffMember[]
  allTasks: TaskItem[]
  selectedMemberId: string
  onSelectMember: (memberId: string) => void
  brandColor?: string
  className?: string
}

export function TaskCollaboratorRibbon({
  teamMembers,
  allTasks,
  selectedMemberId,
  onSelectMember,
  brandColor = "#8ec045",
  className,
}: TaskCollaboratorRibbonProps) {
  // Aggregate stats per member
  const memberStats = React.useMemo(() => {
    const map: Record<
      string,
      {
        total: number
        completed: number
        inProgress: number
        inReview: number
        hours: number
        progress: number
      }
    > = {}

    teamMembers.forEach((m) => {
      const mTasks = allTasks.filter((t) => t.assigned_staff_id === m.id)
      const completed = mTasks.filter((t) => t.status === "done").length
      const inProgress = mTasks.filter((t) => t.status === "in_progress").length
      const inReview = mTasks.filter((t) => t.status === "in_review").length
      const hours = mTasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || 0), 0)
      const progress =
        mTasks.length > 0
          ? Math.round(
              mTasks.reduce((sum, t) => sum + (t.progress_percentage || 0), 0) /
                mTasks.length
            )
          : 0

      map[m.id] = {
        total: mTasks.length,
        completed,
        inProgress,
        inReview,
        hours,
        progress,
      }
    })

    return map
  }, [teamMembers, allTasks])

  const totalSprintTasks = allTasks.length
  const isAllSelected = selectedMemberId === "all"
  const isAnySpecificSelected = selectedMemberId !== "all"

  const ribbonRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = ribbonRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }

    el.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      el.removeEventListener("wheel", onWheel)
    }
  }, [])

  const getRoleIcon = (roleName?: string) => {
    const lower = (roleName || "").toLowerCase()
    if (lower.includes("pm") || lower.includes("lead")) {
      return <Briefcase className="w-3 h-3 text-indigo-500" />
    }
    if (lower.includes("qa") || lower.includes("test")) {
      return <ShieldCheck className="w-3 h-3 text-amber-500" />
    }
    if (lower.includes("design") || lower.includes("ux") || lower.includes("ui")) {
      return <Palette className="w-3 h-3 text-pink-500" />
    }
    return <Code2 className="w-3 h-3 text-sky-500" />
  }

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-primary" />
          Monitor de Equipo & Especialistas ({teamMembers.length})
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">
          Haz clic en un colaborador para enfocar sus entregables
        </span>
      </div>

      {/* Horizontal Scroll Ribbon Container */}
      <div
        ref={ribbonRef}
        className="bg-card/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/80 dark:border-white/10 rounded-2xl p-2.5 sm:p-3 shadow-xs relative flex flex-nowrap overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700/60 pb-2 snap-x items-center gap-2.5 sm:gap-3"
      >
        <TooltipProvider delayDuration={100}>
          {/* 1. "Todo el Equipo" Master Bubble */}
          <motion.div
            whileHover={{ scale: 1.03, transition: { duration: 0.12, ease: "easeOut" } }}
            whileTap={{ scale: 0.98, transition: { duration: 0.08 } }}
            onClick={() => onSelectMember("all")}
            className={cn(
              "flex flex-col items-center justify-between p-2 rounded-2xl cursor-pointer shrink-0 snap-start select-none w-20 sm:w-22 h-[114px] sm:h-[118px] text-center transition-colors duration-150",
              isAllSelected
                ? "border-2 border-primary bg-primary/[0.04] dark:bg-primary/[0.08] shadow-xs"
                : "bg-white/70 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 hover:bg-white dark:hover:bg-white/10",
              isAnySpecificSelected && "opacity-60 hover:opacity-100"
            )}
            style={isAllSelected ? { borderColor: brandColor } : undefined}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative flex items-center justify-center pt-1">
                  <div
                    className={cn(
                      "w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-colors duration-150",
                      isAllSelected
                        ? "text-white shadow-xs"
                        : "bg-zinc-100/90 dark:bg-white/10 text-muted-foreground"
                    )}
                    style={isAllSelected ? { backgroundColor: brandColor } : undefined}
                  >
                    <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  {totalSprintTasks > 0 && (
                    <div className="absolute -top-1 -right-1.5 h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-mono font-bold bg-zinc-800 dark:bg-zinc-700 text-white shadow-xs">
                      {totalSprintTasks}
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-zinc-900/95 text-white p-3 rounded-2xl border-white/10 z-50 text-xs">
                <p className="font-bold">Todo el Equipo</p>
                <p className="text-[10px] text-zinc-400">Ver todas las tareas del sprint ({totalSprintTasks} tickets)</p>
              </TooltipContent>
            </Tooltip>

            <div className="flex flex-col items-center justify-center w-full min-h-[30px]">
              <span className="text-[11px] font-bold text-foreground truncate w-full leading-tight">
                Todo el Equipo
              </span>
              <span className="text-[10px] text-muted-foreground/75 font-mono leading-tight">
                Global
              </span>
            </div>
          </motion.div>

          {/* Separator Line */}
          <div className="h-14 w-[1px] bg-zinc-200/80 dark:bg-white/10 shrink-0 my-auto" />

          {/* 2. Individual Member Bubbles */}
          <AnimatePresence mode="popLayout">
            {teamMembers.map((member) => {
              const stats = memberStats[member.id] || {
                total: 0,
                completed: 0,
                inProgress: 0,
                inReview: 0,
                hours: 0,
                progress: 0,
              }
              const isSelected = selectedMemberId === member.id

              return (
                <motion.div
                  key={member.id}
                  whileHover={{ scale: 1.03, transition: { duration: 0.12, ease: "easeOut" } }}
                  whileTap={{ scale: 0.98, transition: { duration: 0.08 } }}
                  onClick={() => onSelectMember(isSelected ? "all" : member.id)}
                  className={cn(
                    "flex flex-col items-center justify-between p-2 rounded-2xl cursor-pointer shrink-0 snap-start select-none w-22 sm:w-24 h-[114px] sm:h-[118px] text-center group transition-colors duration-150 relative",
                    isSelected
                      ? "border-2 border-primary bg-primary/[0.04] dark:bg-primary/[0.08] shadow-xs"
                      : "bg-white/70 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 hover:bg-white dark:hover:bg-white/10",
                    isAnySpecificSelected && !isSelected && "opacity-60 hover:opacity-100"
                  )}
                  style={isSelected ? { borderColor: brandColor } : undefined}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative flex items-center justify-center w-full flex-1 min-h-[52px]">
                        {/* Free-floating 3D Avatar Bust - No container, no background fill */}
                        <img
                          src={getCollaboratorAvatar(member.photo_url, member.first_name)}
                          alt={`${member.first_name} ${member.last_name}`}
                          className={cn(
                            "object-contain select-none pointer-events-none transition-all duration-150 ease-out",
                            isSelected
                              ? "h-16 w-16 sm:h-[68px] sm:w-[68px] drop-shadow-[0_6px_14px_rgba(0,0,0,0.12)] scale-105"
                              : "h-12 w-12 sm:h-[50px] sm:w-[50px] group-hover:scale-105 drop-shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                          )}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "/avatar%20task%20pack/Frame%2010.png"
                          }}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="bg-zinc-900/95 text-white p-3 rounded-2xl border-white/10 z-50 text-xs max-w-xs shadow-2xl"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-sm">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-[10px] text-primary font-semibold flex items-center gap-1">
                          {getRoleIcon(member.role)}
                          <span>{member.role || "Colaborador"}</span>
                        </p>
                        <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-zinc-400 block text-[10px]">Tickets:</span>
                            <span className="font-mono font-bold">
                              {stats.completed}/{stats.total} ({stats.progress}%)
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-400 block text-[10px]">Estimado:</span>
                            <span className="font-mono font-bold">{stats.hours}h</span>
                          </div>
                        </div>
                        {isSelected ? (
                          <p className="text-[10px] text-primary font-bold pt-1">
                            * Filtro activo (clic para quitar)
                          </p>
                        ) : (
                          <p className="text-[10px] text-zinc-400 pt-1">
                            Clic para filtrar sus entregables
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>

                  {/* Name and Role/Progress Container */}
                  <div className="flex flex-col items-center justify-center w-full min-h-[30px]">
                    <span
                      className={cn(
                        "truncate w-full leading-tight",
                        isSelected
                          ? "text-xs sm:text-[13px] font-black text-foreground"
                          : "text-[11px] font-bold text-foreground"
                      )}
                    >
                      {member.first_name}
                    </span>

                    {!isSelected && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/75 truncate max-w-full font-mono leading-tight mt-0.5">
                        <span>{stats.progress}%</span>
                        <span className="text-zinc-300 dark:text-zinc-700">•</span>
                        <span className="truncate max-w-[45px]">
                          {member.role?.split(" ")[0] || "Staff"}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </TooltipProvider>
      </div>
    </div>
  )
}
