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
import { toast } from "sonner"
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
  phone?: string | null
  access_token?: string | null
}

interface TaskCollaboratorRibbonProps {
  teamMembers: StaffMember[]
  allTasks: TaskItem[]
  selectedMemberId: string
  onSelectMember: (memberId: string) => void
  brandColor?: string
  organizationName?: string
  className?: string
}

function WhatsAppIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.004c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
    </svg>
  )
}

function formatWhatsAppNumber(phone?: string | null): string {
  if (!phone) return ""
  let cleaned = phone.trim().replace(/[^\d+]/g, "")
  if (!cleaned) return ""

  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1)
  }

  // Si es número móvil colombiano de 10 dígitos que inicia en 3 (ej. 3001234567, 310..., 320...)
  if (/^3\d{9}$/.test(cleaned)) {
    return `57${cleaned}`
  }

  return cleaned
}

export function TaskCollaboratorRibbon({
  teamMembers,
  allTasks,
  selectedMemberId,
  onSelectMember,
  brandColor = "#8ec045",
  organizationName = "",
  className,
}: TaskCollaboratorRibbonProps) {
  // Aggregate stats per member
  const memberStats = React.useMemo(() => {
    const map: Record<
      string,
      {
        total: number
        activeTotal: number
        completed: number
        inProgress: number
        inReview: number
        hours: number
        progress: number
      }
    > = {}

    teamMembers.forEach((m) => {
      const mTasks = allTasks.filter((t) => t.assigned_staff_id === m.id)
      const mActiveTasks = mTasks.filter(
        (t) =>
          t.status === "todo" ||
          t.status === "in_progress" ||
          t.status === "in_review" ||
          t.status === "blocked"
      )
      const completed = mTasks.filter((t) => t.status === "done").length
      const inProgress = mTasks.filter((t) => t.status === "in_progress").length
      const inReview = mTasks.filter((t) => t.status === "in_review").length
      const hours = mActiveTasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || 0), 0)
      const progress =
        mActiveTasks.length > 0
          ? Math.round(
              mActiveTasks.reduce((sum, t) => sum + (t.progress_percentage || 0), 0) /
                mActiveTasks.length
            )
          : completed > 0
          ? 100
          : 0

      map[m.id] = {
        total: mTasks.length,
        activeTotal: mActiveTasks.length,
        completed,
        inProgress,
        inReview,
        hours,
        progress,
      }
    })

    return map
  }, [teamMembers, allTasks])

  // Active tasks metrics for the ribbon header (strictly active tasks, excluding backlog and done)
  const activeMetrics = React.useMemo(() => {
    const isAll = selectedMemberId === "all"
    const relevantTasks = isAll
      ? allTasks
      : allTasks.filter((t) => t.assigned_staff_id === selectedMemberId)

    const activeTasks = relevantTasks.filter(
      (t) =>
        t.status === "todo" ||
        t.status === "in_progress" ||
        t.status === "in_review" ||
        t.status === "blocked"
    )

    const totalActive = activeTasks.length
    const inProgress = activeTasks.filter((t) => t.status === "in_progress").length
    const inReview = activeTasks.filter((t) => t.status === "in_review").length
    const completed = relevantTasks.filter((t) => t.status === "done").length

    const progress =
      totalActive > 0
        ? Math.round(
            activeTasks.reduce((sum, t) => sum + (t.progress_percentage || 0), 0) /
              totalActive
          )
        : completed > 0
        ? 100
        : 0

    const selectedMember = !isAll
      ? teamMembers.find((m) => m.id === selectedMemberId)
      : null

    const label = isAll
      ? "Avance Global en Activas"
      : `Avance de ${selectedMember ? selectedMember.first_name : "Colaborador"}`

    return {
      label,
      totalActive,
      inProgress,
      inReview,
      progress,
    }
  }, [allTasks, selectedMemberId, teamMembers])

  const totalSprintTasks = allTasks.length
  const totalActiveTasks = allTasks.filter(
    (t) =>
      t.status === "todo" ||
      t.status === "in_progress" ||
      t.status === "in_review" ||
      t.status === "blocked"
  ).length
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

  const handleShareWhatsApp = (member: StaffMember) => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const token = member.access_token
    const portalUrl = token ? `${origin}/portal/tasks/${token}` : `${origin}/portal/tasks`
    const org = organizationName || "la agencia"

    const message = `Hola *${member.first_name}* 👋\n\nTe comparto el enlace directo a tu *Portal de Tareas y Entregables* en *${org}*:\n\n🔗 ${portalUrl}\n\nDesde tu portal podrás:\n📋 Ver tus requerimientos y entregables asignados\n⏱️ Registrar avances y horas de trabajo\n💬 Comentar y coordinar revisiones de QA\n📊 Consultar el ritmo semanal del sprint\n\n_Acceso seguro y directo (no requiere contraseña)._`

    const formattedPhone = formatWhatsAppNumber(member.phone)

    const waUrl = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`

    window.open(waUrl, "_blank", "noopener,noreferrer")

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(message).catch(() => {})
    }

    toast.success(`Enlace preparado para ${member.first_name}`, {
      description: formattedPhone
        ? `Abriendo WhatsApp (+${formattedPhone})...`
        : "Mensaje copiado al portapapeles. Selecciona el chat en WhatsApp.",
    })
  }

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="flex items-center justify-between px-1 gap-2 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 shrink-0">
          <Users className="w-3.5 h-3.5 text-primary" />
          Monitor de Equipo & Especialistas ({teamMembers.length})
        </span>
        <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] text-muted-foreground flex-wrap justify-end">
          <span>{activeMetrics.label}:</span>
          <span className="font-mono font-bold text-foreground">
            {activeMetrics.progress}%
          </span>
          <span className="text-muted-foreground/60 font-normal">
            ({activeMetrics.totalActive} {activeMetrics.totalActive === 1 ? "activa" : "activas"}
            {activeMetrics.inProgress > 0 ? ` • ${activeMetrics.inProgress} en curso` : ""}
            {activeMetrics.inReview > 0 ? ` • ${activeMetrics.inReview} en QA` : ""})
          </span>
        </div>
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
                  {totalActiveTasks > 0 && (
                    <div className="absolute -top-1 -right-1.5 h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-mono font-bold bg-zinc-800 dark:bg-zinc-700 text-white shadow-xs">
                      {totalActiveTasks}
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-zinc-900/95 text-white p-3 rounded-2xl border-white/10 z-50 text-xs">
                <p className="font-bold">Todo el Equipo</p>
                <p className="text-[10px] text-zinc-400">Ver tareas activas del equipo ({totalActiveTasks} tickets)</p>
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
                      className="bg-zinc-900/95 text-white p-3 rounded-2xl border-white/10 z-50 text-xs max-w-xs shadow-2xl pointer-events-auto"
                    >
                      <div className="space-y-2">
                        {/* Header: Name + Role on Left, WhatsApp Share Button on Right */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <p className="font-bold text-sm truncate text-white leading-tight">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-[10px] text-primary font-semibold flex items-center gap-1">
                              {getRoleIcon(member.role)}
                              <span className="truncate">{member.role || "Colaborador"}</span>
                            </p>
                          </div>

                          {/* Botón WhatsApp para compartir portal al colaborador */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleShareWhatsApp(member)
                            }}
                            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#25D366]/30 hover:border-[#25D366] transition-all duration-150 cursor-pointer shadow-xs active:scale-90"
                            title="Compartir portal"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>

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
