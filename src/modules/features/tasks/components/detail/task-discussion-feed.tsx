"use client"

import React, { useState, useRef, useMemo } from "react"
import {
  Activity,
  Send,
  Loader2,
  ChevronDown,
  AtSign,
  Hash,
  Paperclip,
  X,
  Image as ImageIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import type { TaskComment, TaskCollaborator, TaskItem, TaskAttachment } from "../../types"
import { parseSystemAuditNote } from "../../types"
import { renderFormattedComment } from "../../utils/task-comment-utils"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"

export interface TaskDiscussionFeedProps {
  comments: TaskComment[]
  loadingComments: boolean
  collaborators: TaskCollaborator[]
  availableTasks?: TaskItem[]
  onSelectTask?: (task: TaskItem) => void
  onAddComment: (content: string, stagedAttachments: TaskAttachment[]) => Promise<void>
  onUploadCommentAttachment?: (file: File) => Promise<TaskAttachment | null>
  brandColor?: string
  disabled?: boolean
}

export function TaskDiscussionFeed({
  comments,
  loadingComments,
  collaborators,
  availableTasks = [],
  onSelectTask,
  onAddComment,
  onUploadCommentAttachment,
  brandColor = "#8ec045",
  disabled = false,
}: TaskDiscussionFeedProps) {
  const [newCommentText, setNewCommentText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [stagedAttachments, setStagedAttachments] = useState<TaskAttachment[]>([])
  const [visibleCommentsCount, setVisibleCommentsCount] = useState(10)

  // Mentions (@) and Ticket Linking (#) autocomplete popover state
  const [mentionType, setMentionType] = useState<"none" | "collaborator" | "ticket">("none")
  const [mentionQuery, setMentionQuery] = useState("")
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null)
  const commentFileInputRef = useRef<HTMLInputElement>(null)

  // Sort comments chronologically descending
  const sortedComments = useMemo(() => {
    return [...comments].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [comments])

  const displayedComments = useMemo(() => {
    return sortedComments.slice(0, visibleCommentsCount)
  }, [sortedComments, visibleCommentsCount])

  // Filter autocomplete lists
  const filteredCollaborators = useMemo(() => {
    if (!mentionQuery) return collaborators.slice(0, 8)
    const q = mentionQuery.toLowerCase()
    return collaborators
      .filter(
        (c) =>
          c.first_name.toLowerCase().includes(q) ||
          c.last_name.toLowerCase().includes(q) ||
          (c.role && c.role.toLowerCase().includes(q))
      )
      .slice(0, 8)
  }, [collaborators, mentionQuery])

  const filteredTickets = useMemo(() => {
    if (!mentionQuery) return availableTasks.slice(0, 8)
    const q = mentionQuery.toLowerCase()
    return availableTasks
      .filter(
        (t) =>
          (t.ticket_code && t.ticket_code.toLowerCase().includes(q)) ||
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [availableTasks, mentionQuery])

  // Handle textarea text change and detect @ or #
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setNewCommentText(val)

    const cursorPos = e.target.selectionStart || 0
    const textBeforeCursor = val.slice(0, cursorPos)
    const lastWord = textBeforeCursor.split(/\s/).pop() || ""

    if (lastWord.startsWith("@")) {
      setMentionType("collaborator")
      setMentionQuery(lastWord.slice(1))
    } else if (lastWord.startsWith("#")) {
      setMentionType("ticket")
      setMentionQuery(lastWord.slice(1))
    } else {
      setMentionType("none")
      setMentionQuery("")
    }
  }

  // Insert mention token into textarea
  const insertMentionToken = (prefix: "@" | "#", token: string) => {
    if (!commentTextareaRef.current) return
    const textarea = commentTextareaRef.current
    const cursorPos = textarea.selectionStart || 0
    const textBeforeCursor = newCommentText.slice(0, cursorPos)
    const textAfterCursor = newCommentText.slice(cursorPos)

    const words = textBeforeCursor.split(/\s/)
    words.pop() // remove partial mention
    const newPrefix = words.length > 0 ? words.join(" ") + " " : ""
    const updatedText = `${newPrefix}${prefix}${token} ${textAfterCursor}`

    setNewCommentText(updatedText)
    setMentionType("none")
    setMentionQuery("")

    setTimeout(() => {
      textarea.focus()
      const newPos = newPrefix.length + token.length + 2
      textarea.setSelectionRange(newPos, newPos)
    }, 50)
  }

  const handleSelectCollaborator = (member: TaskCollaborator) => {
    insertMentionToken("@", `${member.first_name}_${member.last_name}`.replace(/\s+/g, "_"))
  }

  const handleSelectTicket = (t: TaskItem) => {
    insertMentionToken("#", t.ticket_code || t.id.slice(0, 8))
  }

  // Handle staging files for comment
  const handleCommentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onUploadCommentAttachment) return

    setIsUploadingAttachment(true)
    try {
      const att = await onUploadCommentAttachment(file)
      if (att) {
        setStagedAttachments((prev) => [...prev, att])
        toast.success("Archivo adjunto listo")
      }
    } catch {
      toast.error("Error al subir archivo")
    } finally {
      setIsUploadingAttachment(false)
      if (commentFileInputRef.current) commentFileInputRef.current.value = ""
    }
  }

  const handleRemoveStagedAttachment = (attId: string) => {
    setStagedAttachments((prev) => prev.filter((a) => a.id !== attId))
  }

  const handleSubmit = async () => {
    if (disabled || isSending || (!newCommentText.trim() && stagedAttachments.length === 0)) {
      return
    }

    setIsSending(true)
    try {
      await onAddComment(newCommentText.trim(), stagedAttachments)
      setNewCommentText("")
      setStagedAttachments([])
      setMentionType("none")
      setMentionQuery("")
    } catch {
      toast.error("Error al enviar comentario")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-4 pt-4 border-t border-border/60">
      {/* Hidden file input for comment attachments */}
      <input
        type="file"
        ref={commentFileInputRef}
        onChange={handleCommentFileChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Actividad & Discusión ({comments.length})
          </span>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
        {loadingComments ? (
          <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Cargando comentarios...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground italic border border-dashed rounded-xl">
            No hay comentarios aún. Usa @ para mencionar a colaboradores o # para vincular tickets.
          </div>
        ) : (
          <>
            {displayedComments.map((c) => {
              const auditInfo = parseSystemAuditNote(c.content)
              const isSystemEvent = c.author_type === "system" || auditInfo.isAudit

              if (isSystemEvent) {
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-muted/40 hover:bg-muted/60 text-xs transition-colors border border-border/40"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs shrink-0">{auditInfo.icon}</span>
                      <span className="font-semibold text-foreground text-xs shrink-0">
                        {c.author_name || "Sistema"}
                      </span>
                      <span className="text-muted-foreground/40 shrink-0">·</span>
                      <span className="truncate text-xs text-foreground/85 font-normal">
                        {renderFormattedComment(auditInfo.formattedText, availableTasks, onSelectTask)}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/70 font-mono shrink-0">
                      {new Date(c.created_at).toLocaleDateString("es-ES", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )
              }

              return (
                <div
                  key={c.id}
                  className="p-3 rounded-xl border border-border/60 bg-background text-xs space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-5 h-5 shrink-0" style={{ backgroundColor: brandColor }}>
                        <AvatarImage
                          src={getCollaboratorAvatar(c.author_avatar, c.author_name)}
                          className="object-cover"
                        />
                        <AvatarFallback
                          className="text-[9px] font-bold text-white"
                          style={{ backgroundColor: brandColor }}
                        >
                          {c.author_name ? c.author_name.slice(0, 2).toUpperCase() : "US"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-foreground">{c.author_name}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                        {c.author_type === "system"
                          ? "Sistema"
                          : c.author_type === "owner"
                          ? "Admin"
                          : "Colaborador"}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(c.created_at).toLocaleDateString("es-ES", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="text-foreground/90 leading-relaxed pl-7 whitespace-pre-wrap">
                    {renderFormattedComment(c.content, availableTasks, onSelectTask)}
                  </div>
                </div>
              )
            })}

            {sortedComments.length > visibleCommentsCount && (
              <div className="pt-1 pb-0.5 flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setVisibleCommentsCount((prev) => prev + 10)}
                  className="text-xs text-muted-foreground hover:text-foreground h-7 gap-1.5 rounded-lg border border-border/40 hover:bg-muted/60 transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Cargar más ({sortedComments.length - visibleCommentsCount} anteriores)</span>
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Comment Input with @ & # Mention Autocomplete Popover */}
      {!disabled && (
        <div className="relative">
          {/* Floating Mention Autocomplete Menu (Collaborators) */}
          <AnimatePresence>
            {mentionType === "collaborator" && filteredCollaborators.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute bottom-full left-0 mb-2 w-72 max-h-52 overflow-y-auto bg-popover border border-border/80 rounded-xl shadow-xl z-30 p-1 space-y-0.5"
              >
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1 border-b border-border/40">
                  <AtSign className="w-3 h-3 text-primary" />
                  <span>Mencionar a un miembro</span>
                </div>
                {filteredCollaborators.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleSelectCollaborator(member)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-muted/80 text-xs transition-colors"
                  >
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={member.photo_url || undefined} />
                      <AvatarFallback className="text-[9px] font-bold">
                        {member.first_name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{member.role}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}

            {mentionType === "ticket" && filteredTickets.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute bottom-full left-0 mb-2 w-80 max-h-52 overflow-y-auto bg-popover border border-border/80 rounded-xl shadow-xl z-30 p-1 space-y-0.5"
              >
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1 border-b border-border/40">
                  <Hash className="w-3 h-3 text-primary" />
                  <span>Vincular Ticket / Tarea</span>
                </div>
                {filteredTickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTicket(t)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-muted/80 text-xs transition-colors"
                  >
                    <Badge variant="outline" className="font-mono text-[10px] px-1 py-0 shrink-0">
                      {t.ticket_code || t.id.slice(0, 4)}
                    </Badge>
                    <span className="truncate text-foreground font-medium flex-1">{t.title}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Staged attachments preview pills */}
          {stagedAttachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 border border-border/60 rounded-t-xl">
              {stagedAttachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1 text-[11px] bg-background border border-border/80 px-2 py-0.5 rounded-md"
                >
                  <ImageIcon className="w-3 h-3 text-primary" />
                  <span className="truncate max-w-[120px]">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveStagedAttachment(att.id)}
                    className="text-muted-foreground hover:text-destructive ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Textarea
            ref={commentTextareaRef}
            value={newCommentText}
            onChange={handleTextChange}
            placeholder="Escribe un comentario... Usa @ para mencionar o # para vincular tickets"
            rows={2}
            className={`text-xs bg-background resize-none ${
              stagedAttachments.length > 0 ? "rounded-t-none border-t-0" : ""
            }`}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && mentionType === "none") {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />

          {/* Toolbar and send button */}
          <div className="flex items-center justify-between pt-1.5">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                onClick={() => {
                  setNewCommentText((prev) => prev + " @")
                  setMentionType("collaborator")
                  setMentionQuery("")
                  commentTextareaRef.current?.focus()
                }}
              >
                <AtSign className="w-3 h-3 text-primary" />
                <span>Mencionar</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                onClick={() => {
                  setNewCommentText((prev) => prev + " #")
                  setMentionType("ticket")
                  setMentionQuery("")
                  commentTextareaRef.current?.focus()
                }}
              >
                <Hash className="w-3 h-3 text-primary" />
                <span>Ticket</span>
              </Button>

              {onUploadCommentAttachment && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isUploadingAttachment}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => commentFileInputRef.current?.click()}
                >
                  {isUploadingAttachment ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Paperclip className="w-3 h-3 text-primary" />
                  )}
                  <span>Adjuntar</span>
                </Button>
              )}
            </div>

            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={
                isSending ||
                isUploadingAttachment ||
                (!newCommentText.trim() && stagedAttachments.length === 0)
              }
              className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
            >
              {isSending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Comentar</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
