"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Headset,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Paperclip,
  Download,
  Send,
  Loader2,
  X,
  FileText,
  Image as ImageIcon,
  AtSign,
} from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { formatDistanceToNow, parseISO, format, differenceInHours } from "date-fns"
import { es } from "date-fns/locale"
import { TASK_PRIORITY_LABELS, type TaskItem, type TaskWorkspace, type TaskProject, type TaskStatus, type TaskComment, type TaskAttachment } from "../../types"
import { portalGetTaskComments, portalAddTaskComment } from "../../actions/collaborator-portal-actions"
import { markTicketThreadAsRead } from "../../utils/support-thread-read-state"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"
import { toast } from "sonner"

interface TaskSupportTicketDetailModalProps {
  ticket: TaskItem | null
  isOpen: boolean
  onClose: () => void
  token: string
  isLeadOrPm: boolean
  currentStaffId?: string
  workspace?: TaskWorkspace | null
  onStatusChange?: (ticketId: string, newStatus: TaskStatus) => Promise<void>
  onPromoteTicket?: (ticket: TaskItem) => void
  onTicketUpdated?: (ticket: TaskItem) => void
  teamMembers?: {
    id: string
    first_name: string
    last_name?: string | null
    role?: string | null
    photo_url?: string | null
  }[]
  brandColor?: string
}

export function TaskSupportTicketDetailModal({
  ticket,
  isOpen,
  onClose,
  token,
  isLeadOrPm,
  currentStaffId,
  workspace,
  onStatusChange,
  onPromoteTicket,
  onTicketUpdated,
  teamMembers = [],
  brandColor = "#0284c7",
}: TaskSupportTicketDetailModalProps) {
  const [comments, setComments] = useState<TaskComment[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionCursorPos, setMentionCursorPos] = useState<number>(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isSendingComment, setIsSendingComment] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // Fetch comments when ticket changes
  useEffect(() => {
    if (!ticket || !isOpen) return

    let isMounted = true
    setIsLoadingComments(true)

    portalGetTaskComments(token, ticket.id)
      .then((data) => {
        if (isMounted) {
          setComments(data)
          setIsLoadingComments(false)
          if (currentStaffId) {
            markTicketThreadAsRead(currentStaffId, ticket.id, data.length)
          }
        }
      })
      .catch((err) => {
        console.error("Error al cargar comentarios del ticket:", err)
        if (isMounted) setIsLoadingComments(false)
      })

    return () => {
      isMounted = false
    }
  }, [ticket, isOpen, token, currentStaffId])

  // Scroll to bottom of comments on load or new comment
  useEffect(() => {
    if (comments.length > 0) {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [comments.length])

  if (!ticket) return null

  const isResolved = ticket.status === "done"
  const isReceived = ticket.status === "backlog" || ticket.status === "todo"
  const isInProgress = ticket.status === "in_progress" || ticket.status === "in_review" || ticket.status === "blocked"

  const createdAtDate = parseISO(ticket.created_at)
  const hoursElapsed = differenceInHours(new Date(), createdAtDate)
  const slaHours = ticket.priority === "urgent" ? 4 : ticket.priority === "high" ? 12 : 24
  const isSlaBreached = !isResolved && hoursElapsed > slaHours

  // Handle comment submit
  const handleSendComment = async () => {
    if (!commentText.trim()) return

    setIsSendingComment(true)
    try {
      const res = await portalAddTaskComment(token, ticket.id, commentText.trim())
      if (res.success && res.comment) {
        const nextComments = [res.comment!, ...comments]
        setComments(nextComments)
        setCommentText("")
        if (currentStaffId) {
          markTicketThreadAsRead(currentStaffId, ticket.id, nextComments.length)
        }
        toast.success("Mensaje enviado")
      } else {
        toast.error(res.error || "No se pudo enviar el mensaje")
      }
    } catch {
      toast.error("Error al enviar el mensaje")
    } finally {
      setIsSendingComment(false)
    }
  }

  const isConsultant = !isLeadOrPm && ticket.created_by_staff_id !== currentStaffId

  const filteredMembers = useMemo(() => {
    if (!mentionQuery || !teamMembers || teamMembers.length === 0) return []
    const q = mentionQuery.toLowerCase()
    return teamMembers
      .filter((m) => {
        const full = `${m.first_name} ${m.last_name || ""}`.toLowerCase()
        return full.includes(q)
      })
      .slice(0, 6)
  }, [mentionQuery, teamMembers])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setCommentText(val)
    const cursor = e.target.selectionStart || val.length
    const textBeforeCursor = val.slice(0, cursor)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")

    if (lastAtIndex !== -1) {
      const query = textBeforeCursor.slice(lastAtIndex + 1)
      if (!/\s/.test(query)) {
        setMentionQuery(query.toLowerCase())
        setMentionCursorPos(lastAtIndex)
        return
      }
    }
    setMentionQuery(null)
  }

  const handleSelectMention = (member: { first_name: string; last_name?: string | null }) => {
    const mentionTag = `@${member.first_name} `
    const before = commentText.slice(0, mentionCursorPos)
    const after = commentText.slice(mentionCursorPos + (mentionQuery?.length || 0) + 1)
    const nextText = before + mentionTag + after
    setCommentText(nextText)
    setMentionQuery(null)
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const newPos = before.length + mentionTag.length
        textareaRef.current.setSelectionRange(newPos, newPos)
      }
    }, 50)
  }

  // Handle status update
  const handleStatusSelect = async (newStatus: TaskStatus) => {
    if (isUpdatingStatus || !onStatusChange) return

    setIsUpdatingStatus(true)
    try {
      await onStatusChange(ticket.id, newStatus)
      if (onTicketUpdated) {
        onTicketUpdated({
          ...ticket,
          status: newStatus,
          progress_percentage: newStatus === "done" ? 100 : newStatus === "in_progress" ? 20 : 0,
        })
      }
      toast.success("Estado del ticket actualizado")
    } catch {
      toast.error("No se pudo actualizar el estado")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Safe attachments array
  const attachments: TaskAttachment[] = Array.isArray(ticket.attachments) ? ticket.attachments : []

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 gap-0 rounded-2xl border-border bg-card shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
              {ticket.ticket_code}
            </span>

            {workspace && (
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: workspace.color || brandColor }}
                />
                <span className="truncate max-w-[160px]">{workspace.name}</span>
              </span>
            )}

            {/* Status Badge */}
            {isResolved ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                Resuelto
              </Badge>
            ) : isInProgress ? (
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">
                En Atención
              </Badge>
            ) : (
              <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 text-xs">
                Recibido
              </Badge>
            )}

            {/* Priority Badge */}
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
              Prioridad {TASK_PRIORITY_LABELS[ticket.priority] || ticket.priority}
            </span>

            {/* SLA Badge */}
            {!isResolved && (
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded font-mono flex items-center gap-1",
                  isSlaBreached
                    ? "bg-red-500/10 text-red-600 font-bold border border-red-500/30"
                    : "bg-muted/60 text-muted-foreground"
                )}
              >
                {isSlaBreached ? (
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                ) : (
                  <Clock className="w-3 h-3" />
                )}
                <span>
                  {isSlaBreached
                    ? `SLA Excedido (${hoursElapsed}h)`
                    : `SLA: ${hoursElapsed}h / ${slaHours}h`}
                </span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Split into Left (Ticket Info) and Right (Comments & Discussion) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-border/60">
          {/* Left Column: Details & Attachments (7 of 12 columns) */}
          <div className="lg:col-span-7 p-6 overflow-y-auto space-y-5">
            {/* Title */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Asunto del Ticket
              </span>
              <h2 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                {ticket.title}
              </h2>
            </div>

            {/* Reporter Card */}
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {ticket.assigned_staff?.photo_url ? (
                    <img
                      src={ticket.assigned_staff.photo_url}
                      alt={ticket.assigned_staff.first_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={getCollaboratorAvatar(null, ticket.assigned_staff?.first_name || "Soporte")}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground block leading-tight">
                    {ticket.assigned_staff?.first_name
                      ? `${ticket.assigned_staff.first_name} ${ticket.assigned_staff.last_name || ""}`
                      : "Especialista de Soporte"}
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Reportado hace {formatDistanceToNow(createdAtDate, { locale: es })} ({format(createdAtDate, "dd MMM yyyy, HH:mm", { locale: es })})
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Descripción Detallada
              </span>
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {ticket.description || "Sin descripción proporcionada."}
              </div>
            </div>

            {/* Attachments Section */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" />
                  Archivos y Capturas Adjuntas ({attachments.length})
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {attachments.map((att, idx) => {
                    const isImg = att.type?.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(att.name)
                    return (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-all flex items-center gap-3 group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-background border border-border/50 flex items-center justify-center text-muted-foreground shrink-0 group-hover:text-primary">
                          {isImg ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-foreground truncate block">
                            {att.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            {att.size ? `${Math.round(att.size / 1024)} KB` : "Adjunto"}
                          </span>
                        </div>
                        <Download className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0 opacity-70 group-hover:opacity-100" />
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {/* PM Status Selector (Segmented Control for Triage) */}
            {isLeadOrPm && (
              <div className="p-3.5 rounded-2xl border border-border/60 bg-muted/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Estado del Ticket (Triaje)
                  </span>
                  {isUpdatingStatus && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Actualizando...
                    </span>
                  )}
                </div>

                <div className="p-1 rounded-xl bg-muted/40 border border-border/60 grid grid-cols-3 gap-1">
                  {/* Recibido */}
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusSelect("todo")}
                    className={cn(
                      "h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      isReceived
                        ? "bg-sky-500/15 text-sky-800 dark:text-sky-200 border border-sky-500/30 shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/60 border border-transparent"
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        isReceived ? "bg-sky-500" : "bg-muted-foreground/40"
                      )}
                    />
                    <span>Recibido</span>
                  </button>

                  {/* En Atención */}
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusSelect("in_progress")}
                    className={cn(
                      "h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      isInProgress
                        ? "bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30 shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/60 border border-transparent"
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        isInProgress ? "bg-amber-500" : "bg-muted-foreground/40"
                      )}
                    />
                    <span>En Atención</span>
                  </button>

                  {/* Resuelto */}
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusSelect("done")}
                    className={cn(
                      "h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      isResolved
                        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/60 border border-transparent"
                    )}
                  >
                    <CheckCircle2
                      className={cn(
                        "w-3.5 h-3.5 shrink-0",
                        isResolved ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50"
                      )}
                    />
                    <span>Resuelto</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Discussion & Messages Thread (5 of 12 columns) */}
          <div className="lg:col-span-5 flex flex-col bg-muted/10 min-h-[360px] lg:min-h-0">
            {/* Thread Header */}
            <div className="p-3.5 px-4 border-b border-border/50 bg-background/50 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span>Hilo de Conversación ({comments.length})</span>
              </span>
              <span className="text-[10px] text-muted-foreground">
                Soporte y Gestión
              </span>
            </div>

            {/* Consulta Técnica Banner for Consulted Collaborators */}
            {isConsultant && (
              <div className="m-3 p-3 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-start gap-2.5 text-sky-800 dark:text-sky-300 text-xs shrink-0">
                <Headset className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-0.5 leading-snug">
                  <span className="font-bold block text-foreground">Consulta Técnica de Soporte</span>
                  <span className="text-[11px] text-muted-foreground block">
                    Has sido consultado en esta incidencia. Comparte tu criterio técnico en este hilo para orientar al equipo. El PM evaluará si promueve el caso a una tarea interna formal.
                  </span>
                </div>
              </div>
            )}

            {/* Messages List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[380px] lg:max-h-none">
              {isLoadingComments ? (
                <div className="h-full flex items-center justify-center p-6 text-muted-foreground text-xs gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Cargando mensajes...</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-1">
                  <MessageSquare className="w-8 h-8 opacity-40 mb-1" />
                  <p className="text-xs font-semibold text-foreground">Sin mensajes aún</p>
                  <p className="text-[11px] max-w-xs">
                    Inicia la conversación para coordinar o solicitar detalles adicionales sobre este ticket.
                  </p>
                </div>
              ) : (
                comments
                  .slice()
                  .reverse()
                  .map((comment) => {
                    const isSystem = comment.author_type === "system"
                    const isAuthorMe = comment.author_id === currentStaffId
                    const commentDate = parseISO(comment.created_at)

                    if (isSystem) {
                      return (
                        <div key={comment.id} className="text-center my-2">
                          <span className="inline-block px-2.5 py-1 rounded-full bg-muted border border-border/50 text-[10px] font-mono text-muted-foreground">
                            {comment.content}
                          </span>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={comment.id}
                        className={cn(
                          "flex flex-col space-y-1 max-w-[88%]",
                          isAuthorMe ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
                          <span className="font-semibold text-foreground">
                            {isAuthorMe ? "Tú" : comment.author_name}
                          </span>
                          <span>•</span>
                          <span>{formatDistanceToNow(commentDate, { locale: es })}</span>
                        </div>

                        <div
                          className={cn(
                            "p-3 rounded-2xl text-xs leading-relaxed break-words whitespace-pre-wrap",
                            isAuthorMe
                              ? "bg-primary text-primary-foreground rounded-tr-xs"
                              : "bg-card border border-border/70 text-foreground rounded-tl-xs shadow-2xs"
                          )}
                        >
                          {comment.content}
                        </div>
                      </div>
                    )
                  })
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Comment Input Box */}
            <div className="p-3 border-t border-border/50 bg-background/80 space-y-2 shrink-0 relative">
              {/* Mention Suggestions Popover */}
              {mentionQuery !== null && filteredMembers.length > 0 && (
                <div className="p-1 rounded-xl bg-popover border border-border/80 shadow-xl space-y-0.5 max-h-48 overflow-y-auto mb-1">
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1 border-b border-border/40">
                    <AtSign className="w-3 h-3 text-sky-500" />
                    Mencionar Colaborador (Consulta Técnica)
                  </div>
                  {filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleSelectMention(member)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-muted/80 text-xs transition-colors cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                        {member.photo_url ? (
                          <img src={member.photo_url} alt={member.first_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {member.first_name.slice(0, 1)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-foreground text-xs block truncate">
                          {member.first_name} {member.last_name || ""}
                        </span>
                        <span className="text-[10px] text-muted-foreground block truncate">
                          {member.role || "Colaborador"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <Textarea
                ref={textareaRef}
                value={commentText}
                onChange={handleTextChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && mentionQuery === null) {
                    e.preventDefault()
                    handleSendComment()
                  } else if (e.key === "Escape") {
                    setMentionQuery(null)
                  }
                }}
                placeholder="Escribe una respuesta o usa @ para consultar a un colaborador..."
                rows={2}
                className="text-xs resize-none bg-card"
              />

              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  Usa @ para consultar a otros colaboradores
                </span>
                <Button
                  size="sm"
                  onClick={handleSendComment}
                  disabled={isSendingComment || !commentText.trim()}
                  className="h-8 text-xs font-semibold gap-1.5 ml-auto bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                >
                  {isSendingComment ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Enviar</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground">
            {!isLeadOrPm && (
              <span>
                Canal directo con el Gestor de Proyecto. Las respuestas se sincronizan en tiempo real.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-semibold cursor-pointer"
            >
              Cerrar
            </Button>

            {/* If PM: option to promote to task */}
            {isLeadOrPm && !isResolved && onPromoteTicket && (
              <Button
                size="sm"
                onClick={() => {
                  onClose()
                  onPromoteTicket(ticket)
                }}
                className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Promover a Ticket</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
