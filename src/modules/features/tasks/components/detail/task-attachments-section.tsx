"use client"

import React, { useState } from "react"
import {
  Paperclip,
  Upload,
  Link2,
  ExternalLink,
  Trash2,
  Plus,
  Loader2,
  Image as ImageIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/modules/infrastructure/utils/utils"
import type { TaskAttachment } from "../../types"

export interface TaskAttachmentsSectionProps {
  attachments: TaskAttachment[]
  disabled?: boolean
  isUploadingFile?: boolean
  onTriggerFileUpload?: () => void
  onAddAttachment: (name: string, url: string, type: string) => void
  onRemoveAttachment: (id: string) => void
}

export function TaskAttachmentsSection({
  attachments,
  disabled = false,
  isUploadingFile = false,
  onTriggerFileUpload,
  onAddAttachment,
  onRemoveAttachment,
}: TaskAttachmentsSectionProps) {
  const [showAddRef, setShowAddRef] = useState(false)
  const [newRefUrl, setNewRefUrl] = useState("")
  const [newRefName, setNewRefName] = useState("")
  const [newRefType, setNewRefType] = useState("auto")

  const handleSaveLink = () => {
    if (!newRefUrl.trim() || disabled) return

    let finalType = newRefType
    if (finalType === "auto") {
      const lowerUrl = newRefUrl.toLowerCase()
      if (lowerUrl.includes("figma.com")) finalType = "figma"
      else if (lowerUrl.includes("github.com")) finalType = "github"
      else if (/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(newRefUrl)) finalType = "image"
      else if (lowerUrl.includes("docs.google.com") || lowerUrl.includes(".pdf")) finalType = "doc"
      else finalType = "link"
    }

    const finalName =
      newRefName.trim() ||
      (finalType === "figma"
        ? "Figma Design"
        : finalType === "github"
        ? "GitHub Resource"
        : finalType === "image"
        ? "Captura Adjunta"
        : "Recurso Externo")

    onAddAttachment(finalName, newRefUrl.trim(), finalType)
    setNewRefUrl("")
    setNewRefName("")
    setNewRefType("auto")
    setShowAddRef(false)
  }

  return (
    <div className="space-y-3 pt-4 border-t border-border/60">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider truncate">
            Enlaces & Referencias ({attachments.length})
          </span>
        </div>
        {!disabled && (
          <div className="flex items-center gap-2 shrink-0">
            {onTriggerFileUpload && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingFile}
                onClick={onTriggerFileUpload}
                className="h-7 text-xs px-2.5 rounded-lg border-border text-foreground hover:bg-muted/40 font-medium shrink-0"
              >
                {isUploadingFile ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : (
                  <Upload className="w-3.5 h-3.5 mr-1 text-primary" />
                )}
                Subir desde PC
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddRef(!showAddRef)}
              className="h-7 text-xs px-2.5 rounded-lg border-border text-foreground hover:bg-muted/40 font-medium shrink-0"
            >
              <Link2 className="w-3.5 h-3.5 mr-1 text-primary" />
              {showAddRef ? "Cancelar" : "Enlaces"}
            </Button>
          </div>
        )}
      </div>

      {/* Add Reference Form */}
      <AnimatePresence>
        {showAddRef && !disabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3.5 rounded-xl bg-muted/30 border border-primary/20 space-y-3 overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  URL del Recurso (Figma, GitHub, Docs, Imagen...)
                </label>
                <Input
                  value={newRefUrl}
                  onChange={(e) => setNewRefUrl(e.target.value)}
                  placeholder="https://figma.com/... o https://..."
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Tipo de Enlace
                </label>
                <Select value={newRefType} onValueChange={setNewRefType}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detectar</SelectItem>
                    <SelectItem value="figma">Figma Design</SelectItem>
                    <SelectItem value="github">GitHub PR / Repo</SelectItem>
                    <SelectItem value="image">Imagen / Screenshot</SelectItem>
                    <SelectItem value="doc">Documento / Google Docs</SelectItem>
                    <SelectItem value="link">Enlace General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Título o Descripción Breve (Opcional)
              </label>
              <div className="flex gap-2">
                <Input
                  value={newRefName}
                  onChange={(e) => setNewRefName(e.target.value)}
                  placeholder="Ej: Prototipo V2, Captura de QA..."
                  className="h-8 text-xs bg-background flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveLink()}
                />
                <Button
                  size="sm"
                  onClick={handleSaveLink}
                  disabled={!newRefUrl.trim()}
                  className="h-8 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Guardar Enlace
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* References List */}
      {attachments.length === 0 ? (
        <div className="py-2.5 px-3 rounded-xl border border-dashed border-border/70 text-center text-xs text-muted-foreground bg-muted/10">
          <p>Sin referencias adjuntas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {attachments.map((att) => {
            const isImg =
              att.type === "image" || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(att.url)
            const isFigma = att.type === "figma" || att.url.includes("figma.com")
            const isGithub = att.type === "github" || att.url.includes("github.com")

            return (
              <div
                key={att.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/60 hover:border-primary/40 transition-colors group gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {isImg ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-border/80 bg-muted/40 relative flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={att.url}
                        alt={att.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none"
                        }}
                      />
                      <ImageIcon className="w-4 h-4 text-muted-foreground absolute" />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold",
                        isFigma
                          ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                          : isGithub
                          ? "bg-zinc-800 text-zinc-100 dark:bg-zinc-700"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {isFigma ? (
                        <span className="font-mono text-[11px] font-extrabold">F</span>
                      ) : isGithub ? (
                        <span className="font-mono text-[11px] font-extrabold">GH</span>
                      ) : (
                        <Link2 className="w-3.5 h-3.5" />
                      )}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1 truncate group-hover:underline"
                    >
                      <span className="truncate">{att.name}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                    </a>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {att.url.replace(/^https?:\/\/(www\.)?/, "")}
                    </p>
                  </div>
                </div>

                {!disabled && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => onRemoveAttachment(att.id)}
                    aria-label="Eliminar referencia"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
