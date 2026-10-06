"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Globe, Trash2, Loader2, Users, ShieldAlert, Sparkles, Headset, GitBranch, Plus, X, ChevronDown, ChevronUp, Zap } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import type { TaskWorkspace, TaskCollaborator } from "../../types"
import { createWorkspace, updateWorkspace, deleteWorkspace } from "../../actions/task-actions"
import { getVcsRepositoriesAction, VcsUnifiedRepository } from "../../actions/task-vcs-actions"
import { DynamicIntegrationSheet } from "@/modules/infrastructure/integrations/marketplace/components/dynamic-integration-sheet"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"

interface WorkspaceFormModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceToEdit?: TaskWorkspace | null
  onWorkspaceCreated?: (workspace: TaskWorkspace) => void
  onWorkspaceUpdated?: (workspace: TaskWorkspace) => void
  onWorkspaceDeleted?: (workspaceId: string) => void
  collaborators: TaskCollaborator[]
}

const COLOR_OPTIONS = [
  { label: "Azul Océano", value: "#0284c7" },
  { label: "Índigo", value: "#6366f1" },
  { label: "Púrpura", value: "#8b5cf6" },
  { label: "Esmeralda", value: "#10b981" },
  { label: "Verde Lima", value: "#84cc16" },
  { label: "Ámbar", value: "#f59e0b" },
  { label: "Naranja", value: "#f97316" },
  { label: "Rosa Vibrante", value: "#ec4899" },
  { label: "Cian", value: "#06b6d4" },
]

export function WorkspaceFormModal({
  isOpen,
  onClose,
  workspaceToEdit,
  onWorkspaceCreated,
  onWorkspaceUpdated,
  onWorkspaceDeleted,
  collaborators,
}: WorkspaceFormModalProps) {
  const isEditing = Boolean(workspaceToEdit)

  const [name, setName] = useState("")
  const [keyPrefix, setKeyPrefix] = useState("WEB")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState("#0284c7")
  const [leadStaffId, setLeadStaffId] = useState("unassigned")
  const [parallelTeamEnabled, setParallelTeamEnabled] = useState(false)
  const [slaFirstResponse, setSlaFirstResponse] = useState<number>(24)
  const [slaResolution, setSlaResolution] = useState<number>(72)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // VCS / Git Integration State
  const [vcsEnabled, setVcsEnabled] = useState(false)
  const [vcsRepositories, setVcsRepositories] = useState<string[]>([])
  const [newRepoInput, setNewRepoInput] = useState("")
  const [showVcsSection, setShowVcsSection] = useState(false)
  const [availableRepos, setAvailableRepos] = useState<VcsUnifiedRepository[]>([])
  const [isVcsConnected, setIsVcsConnected] = useState(false)
  const [canManageIntegrations, setCanManageIntegrations] = useState(false)
  const [selectedVcsProvider, setSelectedVcsProvider] = useState<'github' | 'bitbucket'>('github')
  const [isVcsSheetOpen, setIsVcsSheetOpen] = useState(false)

  const refreshVcs = async () => {
    try {
      const res = await getVcsRepositoriesAction()
      setIsVcsConnected(res.connected)
      setAvailableRepos(res.repositories || [])
      if (res.canManageIntegrations !== undefined) {
        setCanManageIntegrations(res.canManageIntegrations)
      }
    } catch {
      // silently fallback
    }
  }

  useEffect(() => {
    if (isOpen) {
      setIsConfirmingDelete(false)
      if (workspaceToEdit) {
        setName(workspaceToEdit.name)
        setKeyPrefix(workspaceToEdit.key_prefix || "WEB")
        setDescription(workspaceToEdit.description || "")
        setColor(workspaceToEdit.color || "#0284c7")
        setLeadStaffId(workspaceToEdit.lead_staff_id || "unassigned")
        setParallelTeamEnabled(workspaceToEdit.parallel_team_enabled ?? false)
        setSlaFirstResponse(workspaceToEdit.support_config?.sla_first_response_hours ?? 24)
        setSlaResolution(workspaceToEdit.support_config?.sla_resolution_hours ?? 72)

        const vcs = workspaceToEdit.settings?.vcs
        if (vcs) {
          setVcsEnabled(vcs.enabled !== false)
          const repos = Array.isArray(vcs.repositories)
            ? vcs.repositories
            : (vcs.repository ? [vcs.repository] : [])
          setVcsRepositories(repos)
          setShowVcsSection(Boolean(vcs.enabled || repos.length > 0))
        } else {
          setVcsEnabled(false)
          setVcsRepositories([])
          setShowVcsSection(false)
        }
      } else {
        setName("")
        setKeyPrefix("WEB")
        setDescription("")
        setColor("#0284c7")
        setParallelTeamEnabled(false)
        setSlaFirstResponse(24)
        setSlaResolution(72)
        setVcsEnabled(false)
        setVcsRepositories([])
        setShowVcsSection(false)
        const defaultLead = collaborators.find(
          (c) => c.task_role === "pm" || c.role?.toLowerCase().includes("gestor")
        )
        setLeadStaffId(defaultLead ? defaultLead.id : "unassigned")
      }

      refreshVcs()
    }
  }, [isOpen, workspaceToEdit, collaborators])

  const handleAddRepository = (repoSlug: string) => {
    const clean = repoSlug.trim().toLowerCase()
    if (!clean) return
    if (!vcsRepositories.includes(clean)) {
      setVcsRepositories((prev) => [...prev, clean])
    }
    setNewRepoInput("")
  }

  const handleRemoveRepository = (repoSlug: string) => {
    setVcsRepositories((prev) => prev.filter((r) => r !== repoSlug))
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Por favor ingresa el nombre del Espacio de Trabajo")
      return
    }

    const cleanPrefix = keyPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (!cleanPrefix || cleanPrefix.length < 2) {
      toast.error("El prefijo debe tener al menos 2 caracteres alfanuméricos (Ej. WEB, CRM, APP)")
      return
    }

    setIsSubmitting(true)
    try {
      const supportConfig = {
        sla_first_response_hours: Number(slaFirstResponse) || 24,
        sla_resolution_hours: Number(slaResolution) || 72,
      }

      const currentSettings = workspaceToEdit?.settings || {}
      const selectedRepoObj = availableRepos.find(r => r.full_name.toLowerCase() === vcsRepositories[0]?.toLowerCase())
      const activeProvider = selectedRepoObj?.provider || workspaceToEdit?.settings?.vcs?.provider || 'github'

      const vcsConfig = vcsEnabled ? {
        enabled: true,
        provider: activeProvider,
        repositories: vcsRepositories,
        repository: vcsRepositories[0] || undefined,
        default_branch: selectedRepoObj?.default_branch || 'main'
      } : {
        enabled: false,
        repositories: [],
      }

      const updatedSettings = {
        ...currentSettings,
        vcs: vcsConfig
      }

      if (isEditing && workspaceToEdit) {
        const res = await updateWorkspace(workspaceToEdit.id, {
          name: name.trim(),
          key_prefix: cleanPrefix,
          description: description.trim() || null,
          color,
          lead_staff_id: leadStaffId === "unassigned" ? null : leadStaffId,
          parallel_team_enabled: parallelTeamEnabled,
          support_config: supportConfig,
          settings: updatedSettings,
        })

        if (res.success && res.workspace) {
          toast.success("Espacio de Trabajo actualizado")
          onWorkspaceUpdated?.(res.workspace)
          onClose()
        } else {
          toast.error(res.error || "Error al actualizar el espacio")
        }
      } else {
        const res = await createWorkspace({
          name: name.trim(),
          key_prefix: cleanPrefix,
          description: description.trim() || undefined,
          color,
          lead_staff_id: leadStaffId === "unassigned" ? null : leadStaffId,
          parallel_team_enabled: parallelTeamEnabled,
          support_config: supportConfig,
          settings: updatedSettings,
        })

        if (res.success && res.workspace) {
          toast.success("Espacio de Trabajo creado exitosamente")
          onWorkspaceCreated?.(res.workspace)
          onClose()
        } else {
          toast.error(res.error || "Error al crear el espacio")
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la solicitud")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!workspaceToEdit) return
    setIsDeleting(true)
    try {
      const res = await deleteWorkspace(workspaceToEdit.id)
      if (res.success) {
        toast.success(`Espacio ${workspaceToEdit.name} eliminado`, {
          description: "Los proyectos y tickets contenidos se conservaron como independientes.",
        })
        onWorkspaceDeleted?.(workspaceToEdit.id)
        onClose()
      } else {
        toast.error(res.error || "Error al eliminar el espacio")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar el espacio")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
              style={{ backgroundColor: color }}
            >
              <Globe className="w-4 h-4" />
            </div>
            {isEditing ? "Editar Espacio de Trabajo" : "Nuevo Espacio de Trabajo"}
          </DialogTitle>
        </DialogHeader>

        {isConfirmingDelete ? (
          <div className="space-y-4 py-2">
            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                ¿Eliminar este espacio de trabajo?
              </div>
              <p className="leading-relaxed text-[11px] text-muted-foreground">
                Se eliminará el agrupador <strong>{workspaceToEdit?.name}</strong>.
                Todos los proyectos y tareas existentes se conservarán intactos, pasando a estado sin espacio asignado.
              </p>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeleting}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-xs gap-1.5 font-semibold text-white bg-destructive hover:bg-destructive/90 shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                    Confirmar Eliminación
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Info Banner */}
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Los <strong>Espacios de Trabajo</strong> agrupan múltiples proyectos, módulos y sprints bajo una misma visión organizativa y prefijo de tickets común.
              </p>
            </div>

            {/* Name and Prefix */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Nombre del Espacio *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Plataforma Web y Servicios"
                  className="h-9 text-xs"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Prefijo Tickets *
                </label>
                <Input
                  value={keyPrefix}
                  onChange={(e) =>
                    setKeyPrefix(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "")
                        .slice(0, 6)
                    )
                  }
                  placeholder="WEB"
                  className="h-9 text-xs font-mono font-bold uppercase tracking-wider"
                />
                <span className="text-[10px] text-muted-foreground">Ej: {keyPrefix || "WEB"}-101</span>
              </div>
            </div>

            {/* Leader / Gestor */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Líder / Gestor del Espacio
              </label>
              <Select value={leadStaffId} onValueChange={setLeadStaffId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Seleccionar gestor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" className="text-xs">
                    Sin gestor asignado
                  </SelectItem>
                  {collaborators.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span>
                          {c.first_name} {c.last_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ({c.role})
                        </span>
                        {(c.task_role === "pm" || c.role?.toLowerCase().includes("gestor")) && (
                          <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-semibold">
                            PM / Lead
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Descripción (Opcional)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Objetivos, alcance o contexto del espacio..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            {/* Canal de Soporte (Equipo Paralelo) */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Headset className="w-3.5 h-3.5 text-primary" />
                    <span>Canal de Soporte (Equipo Paralelo)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Habilita la recepción de tickets de soporte emitidos por colaboradores de atención al cliente. Estos tickets permanecen aislados de las métricas de rendimiento y sprints del equipo de desarrollo.
                  </p>
                </div>
                <Switch
                  checked={parallelTeamEnabled}
                  onCheckedChange={setParallelTeamEnabled}
                />
              </div>

              {parallelTeamEnabled && (
                <div className="pt-2.5 border-t border-border/40 grid grid-cols-2 gap-3 text-xs animate-in fade-in-50 duration-200">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                      SLA Primera Respuesta (horas)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={168}
                      value={slaFirstResponse}
                      onChange={(e) => setSlaFirstResponse(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                      SLA Resolución Estimada (horas)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={720}
                      value={slaResolution}
                      onChange={(e) => setSlaResolution(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Control de Versiones Git (Repositorios del Espacio) */}
            <div className="rounded-xl border border-border/60 bg-muted/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowVcsSection((prev) => !prev)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-foreground/90 hover:bg-muted/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <GitBranch className="w-3.5 h-3.5 text-blue-500" />
                  <span>Control de Versiones Git (Repositorios del Espacio)</span>
                  {vcsEnabled && vcsRepositories.length > 0 && (
                    <Badge variant="outline" className="text-[10px] font-mono bg-blue-500/10 text-blue-600 border-blue-500/20 py-0 h-4">
                      {vcsRepositories.length} repo{vcsRepositories.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                {showVcsSection ? (
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>

              {showVcsSection && (
                <div className="p-3.5 pt-2 border-t border-border/40 space-y-3 bg-background/50 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-medium text-foreground block">
                        Habilitar repositorios a nivel de Espacio
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        Todos los proyectos y tickets de este espacio heredarán estos repositorios automáticamente.
                      </span>
                    </div>
                    <Switch checked={vcsEnabled} onCheckedChange={setVcsEnabled} />
                  </div>

                  {vcsEnabled && (
                    <div className="space-y-3 pt-2.5 border-t border-border/30">
                      {!isVcsConnected ? (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2.5">
                          <div className="flex items-start gap-2.5">
                            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                              <GitBranch className="w-4 h-4" />
                            </div>
                            <div className="space-y-1 flex-1">
                              <p className="text-xs font-semibold text-foreground">
                                Control de Versiones no conectado
                              </p>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {canManageIntegrations
                                  ? "Conecta tu cuenta de GitHub o Bitbucket para sincronizar ramas, commits y pull requests automáticamente en este espacio y sus proyectos."
                                  : "El control de versiones no está conectado en esta organización. Contacta a un administrador para vincular GitHub o Bitbucket."}
                              </p>
                            </div>
                          </div>

                          {canManageIntegrations && (
                            <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  setSelectedVcsProvider('github')
                                  setIsVcsSheetOpen(true)
                                }}
                                className="h-8 text-xs bg-zinc-800 hover:bg-zinc-900 text-white font-medium gap-1.5 shadow-sm cursor-pointer"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                <span>⚡ Conectar GitHub</span>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  setSelectedVcsProvider('bitbucket')
                                  setIsVcsSheetOpen(true)
                                }}
                                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium gap-1.5 shadow-sm cursor-pointer"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                <span>⚡ Conectar Bitbucket</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                            Agregar Repositorio (GitHub / Bitbucket)
                          </label>
                          <div className="flex items-center gap-2">
                            {availableRepos.length > 0 ? (
                              <Select
                                value=""
                                onValueChange={(val) => {
                                  if (val) handleAddRepository(val)
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs font-mono flex-1">
                                  <SelectValue placeholder="Seleccionar repositorio conectado..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableRepos.map((repo) => (
                                    <SelectItem
                                      key={`${repo.provider}-${repo.full_name}`}
                                      value={repo.full_name}
                                      disabled={vcsRepositories.includes(repo.full_name.toLowerCase())}
                                      className="font-mono text-xs"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded font-sans font-semibold bg-muted text-muted-foreground">
                                          {repo.provider === 'github' ? '🐙 GitHub' : '🪣 Bitbucket'}
                                        </span>
                                        <span>{repo.full_name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={newRepoInput}
                                onChange={(e) => setNewRepoInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault()
                                    handleAddRepository(newRepoInput)
                                  }
                                }}
                                placeholder="mi-empresa/frontend o mi-empresa/backend-api"
                                className="h-8 text-xs font-mono flex-1"
                              />
                            )}

                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handleAddRepository(newRepoInput)}
                              className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Agregar</span>
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Repositories Tag List */}
                      {vcsRepositories.length > 0 ? (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                            Repositorios Vinculados ({vcsRepositories.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {vcsRepositories.map((repo) => (
                              <div
                                key={repo}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 font-mono text-[11px]"
                              >
                                <GitBranch className="w-3 h-3 text-blue-500 shrink-0" />
                                <span>{repo}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRepository(repo)}
                                  className="text-muted-foreground hover:text-destructive p-0.5 transition-colors cursor-pointer"
                                  title="Quitar repositorio"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">
                          No hay repositorios configurados aún para este espacio.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Color Picker */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Color de Identificación
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={cn(
                      "w-7 h-7 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-2xs",
                      color === c.value
                        ? "ring-2 ring-offset-2 ring-primary scale-110"
                        : "opacity-80 hover:opacity-100 hover:scale-105"
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 items-center justify-between">
              {isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConfirmingDelete(true)}
                  disabled={isSubmitting}
                  className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive/60 gap-1.5 px-3 mr-auto"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  Eliminar Espacio
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      {isEditing ? "Guardando..." : "Creando..."}
                    </>
                  ) : isEditing ? (
                    "Guardar Cambios"
                  ) : (
                    "Crear Espacio"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>

    <DynamicIntegrationSheet
      providerKey={selectedVcsProvider}
      provider={null}
      isOpen={isVcsSheetOpen}
      onOpenChange={setIsVcsSheetOpen}
      onSuccess={() => {
        refreshVcs()
      }}
    />
    </>
  )
}
