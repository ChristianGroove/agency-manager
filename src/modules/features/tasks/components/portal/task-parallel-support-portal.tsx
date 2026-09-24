"use client"

import React, { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Headset,
  Plus,
  Search,
  MessageSquare,
  CheckCircle2,
  Clock,
  Sparkles,
  Inbox,
  Send,
  Upload,
  Paperclip,
  X,
  Loader2,
  Calendar,
  AlertCircle,
  Sun,
  Moon,
  TrendingUp,
  User,
} from "lucide-react"
import { GlobalParticles } from "@/components/layout/global-particles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/modules/infrastructure/utils/utils"
import { formatDistanceToNow, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { TASK_PRIORITY_LABELS, type TaskItem, type TaskWorkspace, type TaskProject, type TaskPriority, type TaskAttachment } from "../../types"
import type { CollaboratorPortalData } from "../../actions/collaborator-portal-actions"
import { portalCreateTask, portalUploadTaskAttachment } from "../../actions/collaborator-portal-actions"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"
import { TaskSupportTicketDetailModal } from "./task-support-ticket-detail-modal"
import { SearchFilterBar } from "@/modules/core/ui/components/search-filter-bar"
import { getTicketReadState, getUnreadCommentCount, type SupportReadState } from "../../utils/support-thread-read-state"
import { toast } from "sonner"

interface TaskParallelSupportPortalProps {
  portalData: CollaboratorPortalData
  token: string
  supportTickets: TaskItem[]
  onTicketsChange: React.Dispatch<React.SetStateAction<TaskItem[]>>
  workspaces: TaskWorkspace[]
  projects: TaskProject[]
  brandColor?: string
  portalTheme: "light" | "dark"
  togglePortalTheme: () => void
}

const ODOMETER_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

const OdometerDigit = React.memo(function OdometerDigit({
  digit,
  index,
}: {
  digit: string
  index: number
}) {
  const num = parseInt(digit, 10)
  const isNumber = !isNaN(num)

  if (!isNumber) return <span>{digit}</span>

  const targetPercent = (10 + num) * 5

  return (
    <span className="relative inline-block h-[1.3em] overflow-hidden leading-none select-none [mask-image:linear-gradient(to_bottom,transparent_0%,black_20%,black_80%,transparent_100%)]">
      <motion.span
        className="flex flex-col"
        initial={{ y: "0%" }}
        animate={{ y: `-${targetPercent}%` }}
        transition={{
          duration: 1.3 + index * 0.15,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {ODOMETER_DIGITS.map((d, i) => (
          <span key={i} className="h-[1.3em] flex items-center justify-center leading-none">
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  )
})

const RollingOdometer = React.memo(function RollingOdometer({ value }: { value: number }) {
  const digits = value.toString().split("")

  return (
    <span className="inline-flex items-start -space-x-[0.06em]">
      {digits.map((digit, idx) => {
        const isRightmost = idx === digits.length - 1
        if (isRightmost) {
          return (
            <span key={idx} className="inline-flex flex-col items-center">
              <OdometerDigit digit={digit} index={idx} />
              <span className="text-[17px] sm:text-[20px] md:text-[22px] font-black font-sans leading-none opacity-80 select-none -mt-1.5 sm:-mt-2">
                %
              </span>
            </span>
          )
        }
        return <OdometerDigit key={idx} digit={digit} index={idx} />
      })}
    </span>
  )
})

export function TaskParallelSupportPortal({
  portalData,
  token,
  supportTickets,
  onTicketsChange,
  workspaces,
  projects,
  brandColor = "#0284c7",
  portalTheme,
  togglePortalTheme,
}: TaskParallelSupportPortalProps) {
  const { staff, organization } = portalData

  // Dynamic greeting based on hour of day
  const timeGreeting = useMemo(() => {
    const currentHour = new Date().getHours()
    if (currentHour >= 5 && currentHour < 12) {
      return "Buenos días"
    } else if (currentHour >= 12 && currentHour < 19) {
      return "Buenas tardes"
    } else {
      return "Buenas noches"
    }
  }, [])

  // Dynamic Logo Selection based on Portal Color Mode (Dark vs Light from ADN de Marca)
  const activeLogo =
    portalTheme === "dark"
      ? organization?.logo_dark_url || organization?.logo_url
      : organization?.logo_light_url || organization?.logo_url

  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWorkspaceFilter, setSelectedWorkspaceFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "received" | "in_progress" | "resolved">("all")
  const [selectedTicket, setSelectedTicket] = useState<TaskItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [readState, setReadState] = useState<SupportReadState>(() => getTicketReadState(staff.id))

  useEffect(() => {
    setReadState(getTicketReadState(staff.id))
  }, [staff.id])

  useEffect(() => {
    const handleReadUpdate = (e: Event) => {
      const customEvent = e as CustomEvent
      if (!customEvent.detail || customEvent.detail.staffId === staff.id) {
        setReadState(getTicketReadState(staff.id))
      }
    }
    window.addEventListener("support-thread-read-update", handleReadUpdate)
    window.addEventListener("storage", handleReadUpdate)
    return () => {
      window.removeEventListener("support-thread-read-update", handleReadUpdate)
      window.removeEventListener("storage", handleReadUpdate)
    }
  }, [staff.id])

  // Create Support Ticket Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [targetWorkspaceId, setTargetWorkspaceId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Workspaces enabled for support
  const enabledWorkspaces = useMemo(() => {
    return workspaces.filter((w) => w.parallel_team_enabled)
  }, [workspaces])

  // Map workspace id to workspace
  const workspaceMap = useMemo(() => {
    const map = new Map<string, TaskWorkspace>()
    workspaces.forEach((w) => map.set(w.id, w))
    return map
  }, [workspaces])

  // Map project id to workspace id
  const projectWorkspaceMap = useMemo(() => {
    const map = new Map<string, string>()
    projects.forEach((p) => {
      if (p.workspace_id) map.set(p.id, p.workspace_id)
    })
    return map
  }, [projects])

  // Metrics calculation
  const totalCount = supportTickets.length
  const receivedCount = supportTickets.filter((t) => t.status === "backlog" || t.status === "todo").length
  const inProgressCount = supportTickets.filter(
    (t) => t.status === "in_progress" || t.status === "in_review" || t.status === "blocked"
  ).length
  const resolvedCount = supportTickets.filter((t) => t.status === "done").length
  const resolutionPercentage = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return supportTickets.filter((ticket) => {
      // Workspace filter
      if (selectedWorkspaceFilter !== "all") {
        const wsId = projectWorkspaceMap.get(ticket.project_id)
        if (wsId !== selectedWorkspaceFilter) return false
      }

      // Status filter
      if (statusFilter === "received") {
        if (ticket.status !== "backlog" && ticket.status !== "todo") return false
      } else if (statusFilter === "in_progress") {
        if (ticket.status !== "in_progress" && ticket.status !== "in_review" && ticket.status !== "blocked") return false
      } else if (statusFilter === "resolved") {
        if (ticket.status !== "done") return false
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTitle = ticket.title.toLowerCase().includes(q)
        const matchCode = ticket.ticket_code.toLowerCase().includes(q)
        const matchDesc = (ticket.description || "").toLowerCase().includes(q)
        if (!matchTitle && !matchCode && !matchDesc) return false
      }

      return true
    })
  }, [supportTickets, selectedWorkspaceFilter, statusFilter, searchQuery, projectWorkspaceMap])

  // Open Create Modal
  const handleOpenCreateModal = () => {
    if (enabledWorkspaces.length === 0) {
      toast.error("No hay espacios con canal de soporte habilitado actualmente.")
      return
    }
    setTargetWorkspaceId(enabledWorkspaces[0]?.id || "")
    setTitle("")
    setDescription("")
    setPriority("medium")
    setAttachments([])
    setIsCreateModalOpen(true)
  }

  // Handle Create Support Ticket Submit
  const handleCreateSubmit = async () => {
    if (!title.trim()) {
      toast.error("Por favor ingresa el título del ticket")
      return
    }
    if (!targetWorkspaceId) {
      toast.error("Por favor selecciona un espacio de trabajo")
      return
    }

    // Find first project in that workspace or any project
    const targetProject = projects.find((p) => p.workspace_id === targetWorkspaceId) || projects[0]
    if (!targetProject) {
      toast.error("El espacio seleccionado no tiene proyectos asociados")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await portalCreateTask(token, {
        projectId: targetProject.id,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        type: "task",
        attachments,
      })

      if (res.success && res.task) {
        toast.success("Ticket de soporte enviado al PM")
        onTicketsChange((prev) => [res.task!, ...prev])
        setIsCreateModalOpen(false)
      } else {
        toast.error(res.error || "No se pudo crear el ticket")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al enviar el ticket")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle file attachment upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await portalUploadTaskAttachment(token, formData)
      if (res.success && res.attachment) {
        setAttachments((prev) => [...prev, res.attachment!])
        toast.success("Archivo adjunto subido")
      } else {
        toast.error(res.error || "Error al subir archivo")
      }
    } catch {
      toast.error("Error al subir archivo")
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
  }

  return (
    <div
      className={cn(
        "min-h-screen relative bg-gray-100 dark:bg-[#0a0a0a] text-foreground font-sans selection:bg-primary/20 transition-colors duration-200 flex flex-col",
        portalTheme === "dark" ? "dark" : ""
      )}
    >
      {/* Partículas animadas globales de la plataforma */}
      <div className="fixed inset-0 z-0 opacity-100 pointer-events-none overflow-hidden">
        <GlobalParticles orgId={organization?.id} primaryColor={brandColor} />
      </div>

      {/* Header: Logo del Tenant a la izquierda y Perfil a la derecha */}
      <header className="border-b border-zinc-200/80 dark:border-white/10 bg-card/70 backdrop-blur-md sticky top-0 z-30">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-3 flex items-center justify-between gap-4">
          {/* Logo del tenant a la izquierda (cambia reactivamente en modo oscuro/claro) */}
          <div className="flex items-center gap-3">
            {activeLogo ? (
              <img
                key={portalTheme}
                src={activeLogo}
                alt={organization?.name || "Logo"}
                className="h-8 md:h-9 w-auto max-w-[200px] object-contain transition-opacity duration-200"
              />
            ) : (
              <span className="font-extrabold text-base tracking-tight text-foreground">
                {organization?.name || "Portal"}
              </span>
            )}
            <div className="hidden sm:block">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                <Headset className="w-3 h-3 text-sky-500" />
                Canal de Soporte Autónomo
              </span>
            </div>
          </div>

          {/* Tema y Colaborador a la derecha */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Botón Modo Claro / Oscuro */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={togglePortalTheme}
                  className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  aria-label={portalTheme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                >
                  {portalTheme === "dark" ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-zinc-600" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <span>{portalTheme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}</span>
              </TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-zinc-200 dark:bg-white/10" />

            {/* Colaborador a la derecha */}
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-sm font-semibold text-foreground hidden sm:inline">
                {staff.first_name} {staff.last_name}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="w-8 h-8 rounded-full border border-zinc-200/80 dark:border-white/10 shadow-xs flex items-center justify-center transition-colors bg-zinc-100 dark:bg-white/10 text-muted-foreground cursor-pointer"
                    aria-label={`Perfil de ${staff.first_name} ${staff.last_name}`}
                  >
                    <User className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground">{staff.first_name} {staff.last_name}</span>
                    <span className="text-[10px] text-muted-foreground">{staff.role || "Equipo de Soporte"}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6 relative z-10 flex-1">
        {/* Hero Section: Card compacta con Avatar 3D en posición absoluta y efecto pop-out flotante */}
        <section className="w-full relative overflow-visible rounded-3xl border border-zinc-200/80 dark:border-white/10 shadow-sm bg-gradient-to-br from-card via-card to-primary/[0.03] dark:to-primary/[0.06] p-4 sm:p-5 md:py-5 md:px-7 transition-all flex items-center min-h-[140px] sm:min-h-[155px]">
          {/* Ambient Glow Orbs & Watermark Active Progress */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none z-10">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 -mb-16 w-48 h-48 rounded-full bg-sky-500/5 blur-3xl" />

            {/* Watermark Rolling Odometer Active Progress in Top-Right Corner */}
            <div className="absolute top-0 right-[12px] flex items-start select-none pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="flex items-start text-foreground/[0.11] dark:text-white/[0.13]"
              >
                <div className="text-[40px] sm:text-[53px] md:text-[66px] font-black font-sans leading-none">
                  <RollingOdometer value={resolutionPercentage} />
                </div>
              </motion.div>
            </div>
          </div>

          {/* Contenido Principal a la izquierda */}
          <div className="relative z-10 w-full max-w-2xl pr-28 sm:pr-40 md:pr-48 lg:pr-56 space-y-2.5 sm:space-y-3">
            {/* Fecha sutil sin badges innecesarios */}
            <div className="text-[11px] sm:text-xs text-muted-foreground font-medium capitalize flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
              {new Date().toLocaleDateString("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </div>

            {/* Saludo dinámico tipo Dashboard y descripción clara */}
            <div className="space-y-0.5 sm:space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-snug">
                {timeGreeting}, {staff.first_name}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
                Canal de soporte y atención. Reporta incidencias y da seguimiento a tus tickets directamente con el equipo de gestión.
              </p>
            </div>

            {/* Botón de acción */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <Button
                size="sm"
                onClick={handleOpenCreateModal}
                className="rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:bg-primary/90 h-8 px-3 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Reportar Ticket de Soporte
              </Button>
            </div>
          </div>

          {/* 3D Floating Avatar / Custom Round Avatar: Posición absoluta, sobresaliendo libremente por encima del marco */}
          <div
            className="absolute right-2 sm:right-6 md:right-8 lg:right-12 bottom-0 flex items-end justify-center pointer-events-none select-none z-20"
          >
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="relative flex items-end justify-center"
            >
              {staff.photo_url &&
              !staff.photo_url.includes("avatar%20task%20pack") &&
              !staff.photo_url.includes("avatar task pack") ? (
                <div className="rounded-full border-4 border-white/80 dark:border-white/20 shadow-[0_16px_32px_rgba(0,0,0,0.22)] overflow-hidden aspect-square h-[126px] sm:h-[155px] md:h-[172px] lg:h-[190px] w-[126px] sm:w-[155px] md:w-[172px] lg:w-[190px] bg-background/60 backdrop-blur-xs flex items-center justify-center">
                  <img
                    src={staff.photo_url}
                    alt={`${staff.first_name} ${staff.last_name}`}
                    className="w-full h-full object-cover pointer-events-none select-none rounded-full"
                  />
                </div>
              ) : (
                <img
                  src={getCollaboratorAvatar(staff.photo_url, staff.first_name || staff.id)}
                  alt={`${staff.first_name} ${staff.last_name}`}
                  className="h-[142px] sm:h-[176px] md:h-[194px] lg:h-[212px] w-auto object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.18)]"
                />
              )}
            </motion.div>
          </div>
        </section>

        {/* 4 Insights Cards - Upgraded Dashboard Style */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: Total */}
          <div className="p-3.5 sm:p-4 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-card to-card dark:from-indigo-500/20 relative overflow-hidden group shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Total
              </span>
              <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                <Headset className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1">
              <h3 className="text-2xl font-black text-foreground font-mono tracking-tight">
                {totalCount}
              </h3>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground font-medium">
              Tus solicitudes enviadas
            </div>
          </div>

          {/* Card 2: Recibidos */}
          <div className="p-3.5 sm:p-4 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-card to-card dark:from-sky-500/20 relative overflow-hidden group shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Recibidos
              </span>
              <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
                <Inbox className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1">
              <h3 className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono tracking-tight">
                {receivedCount}
              </h3>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground font-medium">
              Por ser revisados por PM
            </div>
          </div>

          {/* Card 3: En Atención */}
          <div className="p-3.5 sm:p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-card dark:from-amber-500/20 relative overflow-hidden group shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                En Atención
              </span>
              <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1">
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
                {inProgressCount}
              </h3>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground font-medium">
              En proceso de solución
            </div>
          </div>

          {/* Card 4: Resueltos */}
          <div className="p-3.5 sm:p-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-card dark:from-emerald-500/20 relative overflow-hidden group shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Resueltos
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1">
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                {resolvedCount}
              </h3>
            </div>
            <div className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium font-mono">
              {resolutionPercentage}% resueltos
            </div>
          </div>
        </section>

        {/* Toolbar: SearchFilterBar Combobox + Espacio Radix Select */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <SearchFilterBar
            searchTerm={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Buscar por código, título o descripción..."
            filters={[
              { id: "all", label: "Todos", count: totalCount },
              { id: "received", label: "Recibidos", count: receivedCount, color: "sky" },
              { id: "in_progress", label: "En Atención", count: inProgressCount, color: "amber" },
              { id: "resolved", label: "Resueltos", count: resolvedCount, color: "emerald" },
            ]}
            activeFilter={statusFilter}
            onFilterChange={(f) => setStatusFilter(f as any)}
            defaultShowFilters={true}
            className="flex-1"
          />

          {/* Workspace Filter if multi-workspace */}
          {enabledWorkspaces.length > 1 && (
            <Select value={selectedWorkspaceFilter} onValueChange={setSelectedWorkspaceFilter}>
              <SelectTrigger className="h-10 text-xs w-[190px] sm:w-[220px] rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-white/10 shadow-xs font-medium text-left">
                <div className="flex items-center truncate text-left flex-1 min-w-0">
                  <SelectValue placeholder="Todos los espacios" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl max-h-[320px]">
                <SelectItem value="all" className="text-xs font-medium">
                  Todos los Espacios
                </SelectItem>
                {enabledWorkspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: ws.color || brandColor }}
                      />
                      <span className="truncate">{ws.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Tickets List */}
        <section className="space-y-3">
          {filteredTickets.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border/70 bg-card/40 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-center mx-auto text-muted-foreground">
                <Inbox className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No tienes tickets en esta vista</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {searchQuery || statusFilter !== "all"
                    ? "Prueba cambiando los filtros de búsqueda."
                    : "Haz clic en 'Reportar Ticket de Soporte' para enviar una nueva incidencia al equipo."}
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleOpenCreateModal}
                className="text-xs gap-1.5 bg-primary text-primary-foreground font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Reportar Nuevo Ticket</span>
              </Button>
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const isResolved = ticket.status === "done"
              const isReceived = ticket.status === "backlog" || ticket.status === "todo"
              const wsId = projectWorkspaceMap.get(ticket.project_id)
              const ws = wsId ? workspaceMap.get(wsId) : null
              const createdAtDate = parseISO(ticket.created_at)
              const unreadComments = getUnreadCommentCount(ticket, staff.id, readState)
              const totalComments = ticket.comments_count || 0

              return (
                <div
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicket(ticket)
                    setIsDetailModalOpen(true)
                  }}
                  className={cn(
                    "p-4 rounded-2xl border transition-all bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:shadow-xs",
                    isResolved
                      ? "border-emerald-500/20 bg-emerald-500/5 opacity-85"
                      : "border-border/60 hover:border-border"
                  )}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                        {ticket.ticket_code}
                      </span>

                      {ws && (
                        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: ws.color || "#0284c7" }}
                          />
                          <span>{ws.name}</span>
                        </span>
                      )}

                      {/* Status Badge */}
                      {isResolved ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                          Resuelto
                        </Badge>
                      ) : isReceived ? (
                        <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 text-[10px]">
                          Recibido
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                          En Atención
                        </Badge>
                      )}

                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider",
                          ticket.priority === "urgent"
                            ? "bg-red-500/10 text-red-600 border border-red-500/30"
                            : ticket.priority === "high"
                            ? "bg-orange-500/10 text-orange-600 border border-orange-500/30"
                            : ticket.priority === "medium"
                            ? "bg-sky-500/10 text-sky-600 border border-sky-500/30"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {TASK_PRIORITY_LABELS[ticket.priority] || ticket.priority}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-foreground tracking-tight line-clamp-1">
                      {ticket.title}
                    </h3>

                    {ticket.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {ticket.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
                      <span>Reportado hace {formatDistanceToNow(createdAtDate, { locale: es })}</span>
                      {totalComments > 0 && (
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <MessageSquare className="w-3 h-3" />
                          {totalComments} {totalComments === 1 ? "mensaje" : "mensajes"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 transition-all pointer-events-none",
                        unreadComments > 0
                          ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/40 shadow-xs"
                          : totalComments > 0
                          ? "bg-card text-foreground border-border/80"
                          : "bg-muted/20 text-muted-foreground border-border/60"
                      )}
                    >
                      {unreadComments > 0 ? (
                        <>
                          <MessageSquare className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          <span>Mensaje nuevo</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Ver Hilo</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </section>
      </main>

      {/* Modal: Report Support Ticket */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 rounded-2xl border-border bg-card shadow-2xl">
          <div className="p-5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Headset className="w-4 h-4 text-sky-500" />
              <DialogTitle className="text-sm font-bold text-foreground">
                Reportar Ticket de Soporte
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Target Workspace */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Espacio de Destino *
              </label>
              <Select value={targetWorkspaceId} onValueChange={setTargetWorkspaceId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Seleccionar espacio..." />
                </SelectTrigger>
                <SelectContent>
                  {enabledWorkspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ws.color || "#0284c7" }}
                        />
                        <span className="font-semibold">{ws.name}</span>
                        {ws.key_prefix && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            [{ws.key_prefix}]
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Título o Asunto del Ticket *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Error al procesar pago en pasarela"
                className="h-9 text-xs"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Descripción Detallada
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explica qué ocurrió, pasos para reproducir o contexto para el PM..."
                rows={4}
                className="text-xs resize-none"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Prioridad
              </label>
              <Select value={priority} onValueChange={(val: TaskPriority) => setPriority(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Seleccionar prioridad...">
                    {TASK_PRIORITY_LABELS[priority]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="text-xs">Baja</SelectItem>
                  <SelectItem value="medium" className="text-xs">Media</SelectItem>
                  <SelectItem value="high" className="text-xs">Alta</SelectItem>
                  <SelectItem value="urgent" className="text-xs">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Attachments */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" />
                  Archivos Adjuntos ({attachments.length})
                </span>
                <label className="cursor-pointer text-[11px] text-primary hover:underline flex items-center gap-1">
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Subiendo...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3 h-3" />
                      <span>Subir archivo</span>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-muted border border-border/60 text-xs flex items-center gap-1.5"
                    >
                      <span className="truncate max-w-[140px] text-[11px]">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 px-6 border-t border-border/50 bg-muted/20 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateSubmit}
              disabled={isSubmitting || isUploading}
              className="text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Enviando...
                </>
              ) : (
                "Enviar Ticket al PM"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal for chatting with PM and viewing ticket details (Clean, no developer controls) */}
      {selectedTicket && isDetailModalOpen && (
        <TaskSupportTicketDetailModal
          ticket={selectedTicket}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false)
            setSelectedTicket(null)
          }}
          token={token}
          isLeadOrPm={false}
          currentStaffId={staff.id}
          workspace={(() => {
            const wsId = projectWorkspaceMap.get(selectedTicket.project_id)
            return wsId ? workspaceMap.get(wsId) || null : null
          })()}
          teamMembers={portalData.teamMembers || []}
          brandColor={brandColor}
          onTicketUpdated={(updatedTicket) => {
            onTicketsChange((prev) =>
              prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
            )
            setSelectedTicket(updatedTicket)
          }}
        />
      )}
    </div>
  )
}
