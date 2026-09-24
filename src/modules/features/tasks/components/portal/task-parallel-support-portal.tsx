"use client"

import React, { useState, useMemo } from "react"
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
} from "lucide-react"
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
import type { TaskItem, TaskWorkspace, TaskProject, TaskPriority, TaskAttachment } from "../../types"
import type { CollaboratorPortalData } from "../../actions/collaborator-portal-actions"
import { portalCreateTask, portalUploadTaskAttachment } from "../../actions/collaborator-portal-actions"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"
import { TaskPortalDetailModal } from "./task-portal-detail-modal"
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

function ShimmerText({ children, active = true }: { children: React.ReactNode; active?: boolean }) {
  if (!active) return <>{children}</>
  return (
    <span
      className="inline-block bg-[linear-gradient(110deg,#52525b,35%,#a1a1aa,50%,#52525b,65%)] dark:bg-[linear-gradient(110deg,#a1a1aa,35%,#ffffff,50%,#a1a1aa,65%)] bg-[length:250%_100%] bg-clip-text text-transparent animate-shimmer"
      style={{ animationDuration: "3.5s" }}
    >
      {children}
    </span>
  )
}

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

  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWorkspaceFilter, setSelectedWorkspaceFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "received" | "in_progress" | "resolved">("all")
  const [selectedTicket, setSelectedTicket] = useState<TaskItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/60 px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {organization?.logo_url ? (
            <img
              src={organization.logo_url}
              alt={organization.name}
              className="h-7 w-auto object-contain"
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
              {organization?.name?.charAt(0) || "P"}
            </div>
          )}
          <div className="hidden sm:block">
            <h1 className="text-xs font-bold text-foreground leading-none">{organization?.name}</h1>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Headset className="w-3 h-3 text-sky-500" />
              Canal de Soporte Autónomo
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={togglePortalTheme}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all cursor-pointer"
            aria-label="Cambiar tema"
          >
            {portalTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile Chip */}
          <div className="flex items-center gap-2 pl-3 border-l border-border/60">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-muted flex items-center justify-center border border-border/60 shrink-0">
              <img
                src={getCollaboratorAvatar(staff.photo_url, staff.first_name)}
                alt={staff.first_name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-semibold text-foreground block leading-none">
                {staff.first_name} {staff.last_name}
              </span>
              <span className="text-[10px] text-muted-foreground block font-mono mt-0.5">
                {staff.role}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl border border-zinc-200/90 dark:border-white/10 bg-gradient-to-br from-white via-zinc-50/80 to-zinc-100/90 dark:from-zinc-900 dark:via-zinc-900/90 dark:to-zinc-950 p-6 sm:p-8 shadow-sm">
          {/* Subtle Glows */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          {/* Watermark Odometer in Top Right */}
          <div className="absolute top-4 right-6 flex items-start select-none pointer-events-none">
            <div className="flex items-start text-foreground/[0.08] dark:text-white/[0.12]">
              <div className="text-[44px] sm:text-[60px] md:text-[72px] font-black font-sans leading-none">
                <RollingOdometer value={resolutionPercentage} />
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="text-[11px] sm:text-xs text-muted-foreground font-medium capitalize flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                {new Date().toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  Hola, {staff.first_name}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  <ShimmerText active>
                    Canal de soporte y atención. Reporta incidencias y da seguimiento a tus tickets directamente con el equipo de gestión.
                  </ShimmerText>
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex items-center gap-3">
                <Button
                  size="default"
                  onClick={handleOpenCreateModal}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-2 px-4 shadow-sm rounded-xl cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Reportar Ticket de Soporte</span>
                </Button>
              </div>
            </div>

            {/* Avatar 3D Display */}
            <div className="hidden md:flex items-center justify-center shrink-0 pr-4">
              <img
                src={getCollaboratorAvatar(staff.photo_url, staff.first_name)}
                alt={`${staff.first_name} ${staff.last_name}`}
                className="h-[140px] lg:h-[165px] w-auto object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.15)]"
              />
            </div>
          </div>
        </section>

        {/* 4 Insights Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl border border-border/70 bg-card shadow-2xs space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Total Reportados
            </span>
            <span className="text-2xl font-black text-foreground font-mono">{totalCount}</span>
          </div>

          <div className="p-4 rounded-2xl border border-sky-500/30 bg-sky-500/5 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">
              Recibidos
            </span>
            <span className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">
              {receivedCount}
            </span>
          </div>

          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              En Atención
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {inProgressCount}
            </span>
          </div>

          <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Resueltos
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {resolvedCount}
            </span>
          </div>
        </section>

        {/* Filters Bar */}
        <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/60 shadow-2xs">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por código, título..."
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            {/* Workspace Filter if multi-workspace */}
            {enabledWorkspaces.length > 1 && (
              <Select value={selectedWorkspaceFilter} onValueChange={setSelectedWorkspaceFilter}>
                <SelectTrigger className="h-8 text-xs bg-background w-[180px]">
                  <SelectValue placeholder="Espacio..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Todos los Espacios
                  </SelectItem>
                  {enabledWorkspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: ws.color || "#0284c7" }}
                        />
                        <span className="truncate">{ws.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/50 shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                statusFilter === "all" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Todos ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("received")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                statusFilter === "received"
                  ? "bg-background text-sky-600 dark:text-sky-400 shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Recibidos ({receivedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("in_progress")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                statusFilter === "in_progress"
                  ? "bg-background text-amber-600 dark:text-amber-400 shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              En Atención ({inProgressCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("resolved")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                statusFilter === "resolved"
                  ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Resueltos ({resolvedCount})
            </button>
          </div>
        </section>

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
                          "text-[10px] px-2 py-0.2 rounded font-semibold uppercase tracking-wider",
                          ticket.priority === "urgent"
                            ? "bg-red-500/10 text-red-600 border border-red-500/30"
                            : ticket.priority === "high"
                            ? "bg-orange-500/10 text-orange-600 border border-orange-500/30"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {ticket.priority}
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
                      {ticket.comments_count !== undefined && ticket.comments_count > 0 && (
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <MessageSquare className="w-3 h-3" />
                          {ticket.comments_count} {ticket.comments_count === 1 ? "mensaje" : "mensajes"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5 pointer-events-none"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Ver Respuestas</span>
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
                  <SelectValue />
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

      {/* Detail Modal for chatting with PM and viewing progress */}
      {selectedTicket && isDetailModalOpen && (
        <TaskPortalDetailModal
          task={selectedTicket}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false)
            setSelectedTicket(null)
          }}
          token={token}
          isLeadOrPm={false}
          isQa={false}
          currentStaffId={staff.id}
          projects={projects}
          teamMembers={[]}
          brandColor={brandColor}
          availableTasks={supportTickets}
          sprints={[]}
          defaultStatus="backlog"
          onTaskUpdated={(updatedTicket) => {
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
