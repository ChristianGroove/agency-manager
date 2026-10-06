"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Switch } from "@/components/ui/switch"
import { FolderPlus, Pencil, Globe, Trash2, AlertTriangle, GitBranch, ChevronDown, ChevronUp, Layers, RotateCcw, Zap } from "lucide-react"
import type { TaskProject, TaskCollaborator, TaskWorkspace } from "../../types"
import { createProject, updateProject, deleteProject } from "../../actions/task-actions"
import { getVcsRepositoriesAction, VcsUnifiedRepository } from "../../actions/task-vcs-actions"
import { DynamicIntegrationSheet } from "@/modules/infrastructure/integrations/marketplace/components/dynamic-integration-sheet"
import { toast } from "sonner"

interface ProjectFormModalProps {
  isOpen: boolean
  onClose: () => void
  projectToEdit?: TaskProject | null
  onProjectCreated?: (project: TaskProject) => void
  onProjectUpdated?: (project: TaskProject) => void
  onProjectDeleted?: (projectId: string) => void
  collaborators: TaskCollaborator[] | any[]
  workspaces?: TaskWorkspace[]
  defaultWorkspaceId?: string
}

const COLOR_OPTIONS = [
  { label: "Índigo", value: "#6366f1" },
  { label: "Azul Cielo", value: "#0284c7" },
  { label: "Esmeralda", value: "#10b981" },
  { label: "Púrpura", value: "#8b5cf6" },
  { label: "Naranja", value: "#f97316" },
  { label: "Rosa", value: "#ec4899" },
]

export function ProjectFormModal({
  isOpen,
  onClose,
  projectToEdit,
  onProjectCreated,
  onProjectUpdated,
  onProjectDeleted,
  collaborators = [],
  workspaces = [],
  defaultWorkspaceId,
}: ProjectFormModalProps) {
  const isEditing = Boolean(projectToEdit)

  const [name, setName] = useState("")
  const [workspaceId, setWorkspaceId] = useState<string>("none")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState("#6366f1")
  const [leadStaffId, setLeadStaffId] = useState("unassigned")
  const [startDate, setStartDate] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // VCS / Git Integration State
  const [vcsEnabled, setVcsEnabled] = useState(false)
  const [vcsRepository, setVcsRepository] = useState("")
  const [vcsAutoTransitions, setVcsAutoTransitions] = useState(true)
  const [showVcsSection, setShowVcsSection] = useState(false)
  const [availableRepos, setAvailableRepos] = useState<VcsUnifiedRepository[]>([])
  const [isVcsConnected, setIsVcsConnected] = useState(false)
  const [canManageIntegrations, setCanManageIntegrations] = useState(false)
  const [selectedVcsProvider, setSelectedVcsProvider] = useState<'github' | 'bitbucket'>('github')
  const [isVcsSheetOpen, setIsVcsSheetOpen] = useState(false)
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [overrideWorkspaceVcs, setOverrideWorkspaceVcs] = useState(false)

  const refreshVcs = async () => {
    setLoadingRepos(true)
    try {
      const res = await getVcsRepositoriesAction()
      setIsVcsConnected(res.connected)
      setAvailableRepos(res.repositories || [])
      if (res.canManageIntegrations !== undefined) {
        setCanManageIntegrations(res.canManageIntegrations)
      }
    } catch (err) {
      console.error("Error loading repositories:", err)
    } finally {
      setLoadingRepos(false)
    }
  }

  // Resolve parent workspace VCS configuration
  const parentWorkspace = workspaces.find((w) => w.id === workspaceId)
  const workspaceVcs = parentWorkspace?.settings?.vcs
  const workspaceRepos: string[] = Array.isArray(workspaceVcs?.repositories)
    ? workspaceVcs.repositories
    : (workspaceVcs?.repository ? [workspaceVcs.repository] : [])
  const hasWorkspaceRepos = Boolean(workspaceVcs?.enabled !== false && workspaceRepos.length > 0)

  // Sync state when modal opens or projectToEdit changes
  React.useEffect(() => {
    if (isOpen) {
      setIsConfirmingDelete(false)
      if (projectToEdit) {
        setName(projectToEdit.name || "")
        setWorkspaceId(projectToEdit.workspace_id || "none")
        setDescription(projectToEdit.description || "")
        setColor(projectToEdit.color || "#6366f1")
        setLeadStaffId(projectToEdit.lead_staff_id || "unassigned")
        setStartDate(projectToEdit.start_date || "")
        setTargetDate(projectToEdit.target_date || "")

        const vcs = projectToEdit.settings?.vcs
        const hasProjectSpecificRepo = Boolean(
          vcs?.repository || (Array.isArray(vcs?.repositories) && vcs.repositories.length > 0)
        )
        const isExplicitlyDisabled = vcs?.enabled === false
        if (vcs?.repository || vcs?.enabled || (Array.isArray(vcs?.repositories) && vcs.repositories.length > 0) || isExplicitlyDisabled) {
          setVcsEnabled(vcs?.enabled !== false)
          setVcsRepository(vcs?.repository || (Array.isArray(vcs?.repositories) ? vcs.repositories[0] : ""))
          setVcsAutoTransitions(vcs?.auto_transitions !== false)
          setShowVcsSection(true)
          setOverrideWorkspaceVcs((hasProjectSpecificRepo || isExplicitlyDisabled) && !vcs?.inherited_from_workspace)
        } else {
          setVcsEnabled(false)
          setVcsRepository("")
          setVcsAutoTransitions(true)
          setShowVcsSection(false)
          setOverrideWorkspaceVcs(false)
        }
      } else {
        setName("")
        setWorkspaceId(defaultWorkspaceId || "none")
        setDescription("")
        setColor("#6366f1")
        setLeadStaffId("unassigned")
        setStartDate("")
        setTargetDate("")
        setVcsEnabled(false)
        setVcsRepository("")
        setVcsAutoTransitions(true)
        setShowVcsSection(false)
        setOverrideWorkspaceVcs(false)
      }

      // Check if Bitbucket is connected and fetch repositories
      refreshVcs()
    }
  }, [isOpen, projectToEdit, defaultWorkspaceId])

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Por favor ingresa el nombre del proyecto o sprint")
      return
    }

    setIsSubmitting(true)
    try {
      let vcsConfig: any = undefined

      if (hasWorkspaceRepos && !overrideWorkspaceVcs) {
        vcsConfig = {
          enabled: true,
          provider: workspaceVcs?.provider || 'github',
          inherited_from_workspace: true,
          auto_transitions: vcsAutoTransitions,
        }
      } else if (overrideWorkspaceVcs && !vcsEnabled) {
        vcsConfig = {
          enabled: false,
        }
      } else if (vcsEnabled) {
        const repo = vcsRepository.trim()
        const selectedRepoObj = availableRepos.find(r => r.full_name.toLowerCase() === repo.toLowerCase())
        const projectProvider = selectedRepoObj?.provider || projectToEdit?.settings?.vcs?.provider || workspaceVcs?.provider || 'github'
        vcsConfig = {
          enabled: true,
          provider: projectProvider,
          repository: repo || undefined,
          repositories: repo ? [repo] : undefined,
          auto_transitions: vcsAutoTransitions,
        }
      }

      const currentSettings = projectToEdit?.settings || {}
      const newSettings = {
        ...currentSettings,
        ...(vcsConfig ? { vcs: vcsConfig } : { vcs: undefined })
      }

      if (isEditing && projectToEdit) {
        const res = await updateProject(projectToEdit.id, {
          name: name.trim(),
          workspace_id: workspaceId === "none" ? null : workspaceId,
          description: description.trim() || null,
          color,
          lead_staff_id: leadStaffId === "unassigned" ? null : leadStaffId,
          start_date: startDate || null,
          target_date: targetDate || null,
          settings: newSettings,
        })

        if (res.success) {
          toast.success("Proyecto actualizado exitosamente")
          const updatedProj: TaskProject = {
            ...projectToEdit,
            name: name.trim(),
            workspace_id: workspaceId === "none" ? null : workspaceId,
            description: description.trim() || null,
            color,
            lead_staff_id: leadStaffId === "unassigned" ? null : leadStaffId,
            start_date: startDate || null,
            target_date: targetDate || null,
            settings: newSettings,
          }
          onProjectUpdated?.(updatedProj)
          onClose()
        } else {
          toast.error(res.error || "Error al actualizar el proyecto")
        }
      } else {
        const res = await createProject({
          name: name.trim(),
          workspace_id: workspaceId === "none" ? null : workspaceId,
          description: description.trim() || undefined,
          color,
          lead_staff_id: leadStaffId === "unassigned" ? null : leadStaffId,
          start_date: startDate || null,
          target_date: targetDate || null,
          settings: newSettings,
        })

        if (res.success && res.project) {
          toast.success("Proyecto creado exitosamente")
          onProjectCreated?.(res.project)
          onClose()
          setName("")
          setDescription("")
        } else {
          toast.error(res.error || "Error al crear el proyecto")
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la solicitud")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!projectToEdit) return
    setIsDeleting(true)
    try {
      const res = await deleteProject(projectToEdit.id)
      if (res.success) {
        toast.success("Proyecto eliminado correctamente")
        onProjectDeleted?.(projectToEdit.id)
        onClose()
      } else {
        toast.error(res.error || "Error al eliminar el proyecto")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar el proyecto")
    } finally {
      setIsDeleting(false)
      setIsConfirmingDelete(false)
    }
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            {isEditing ? (
              <Pencil className="w-5 h-5 text-primary" />
            ) : (
              <FolderPlus className="w-5 h-5 text-primary" />
            )}
            {isEditing ? "Editar Proyecto" : "Nuevo Proyecto"}
          </DialogTitle>
        </DialogHeader>

        {/* Confirmation banner if deleting */}
        {isConfirmingDelete ? (
          <div className="space-y-4 py-4">
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <span>¿Eliminar este proyecto definitivamente?</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Esta acción eliminará el proyecto <strong className="text-foreground">{projectToEdit?.name}</strong>. Las tareas existentes pasarán a ser tickets independientes sin proyecto asignado.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
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
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? "Eliminando..." : "Sí, eliminar proyecto"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Row 1: Espacio de Trabajo & Nombre del Proyecto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {workspaces.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Espacio de Trabajo (Padre)
                  </label>
                  <Select value={workspaceId} onValueChange={setWorkspaceId}>
                    <SelectTrigger className="h-9 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                        <SelectValue placeholder="Seleccionar espacio..." />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin espacio (Proyecto Independiente)</SelectItem>
                      {workspaces.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: w.color }}
                            />
                            <span>{w.name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">[{w.key_prefix}]</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className={workspaces.length > 0 ? "" : "sm:col-span-2"}>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Nombre del Proyecto *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Rediseño Web Corporativo 2026"
                  className="h-9 text-xs font-medium"
                />
              </div>
            </div>

            {/* Row 2: Descripción y (Líder + Color) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Descripción / Objetivo
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objetivos clave del sprint, entregables esperados..."
                  rows={4}
                  className="text-xs resize-none h-[88px]"
                />
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Líder / PM Asignado
                  </label>
                  <Select value={leadStaffId} onValueChange={setLeadStaffId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Sin líder asignado</SelectItem>
                      {collaborators.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.first_name} {c.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Color Distintivo
                  </label>
                  <Select value={color} onValueChange={setColor}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: c.value }}
                            />
                            <span>{c.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Row 3: Fechas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Fecha de Inicio
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Fecha Objetivo / Límite
                </label>
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Version Control System (VCS / Bitbucket) Collapsible Section */}
            <div className="rounded-xl border border-border/60 bg-muted/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowVcsSection((prev) => !prev)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-foreground/90 hover:bg-muted/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <GitBranch className="w-3.5 h-3.5 text-blue-500" />
                  <span>Control de Versiones (Git / Bitbucket)</span>
                  {hasWorkspaceRepos && !overrideWorkspaceVcs ? (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      {workspaceRepos.length} repo{workspaceRepos.length !== 1 ? 's' : ''} heredado{workspaceRepos.length !== 1 ? 's' : ''}
                    </span>
                  ) : vcsEnabled && vcsRepository ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      {vcsRepository}
                    </span>
                  ) : null}
                </div>
                {showVcsSection ? (
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>

              {showVcsSection && (
                <div className="p-3.5 pt-2 border-t border-border/40 space-y-3 bg-background/50 text-xs">
                  {hasWorkspaceRepos && !overrideWorkspaceVcs ? (
                    <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                            <Layers className="w-3.5 h-3.5 text-purple-500" />
                            <span>Heredando repositorios del Espacio de Trabajo</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Este proyecto hereda automáticamente los repositorios configurados en{" "}
                            <span className="font-semibold text-foreground">
                              {parentWorkspace?.name || "el espacio"}
                            </span>
                            :
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {workspaceRepos.map((repo) => (
                          <div
                            key={repo}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 font-mono text-[11px]"
                          >
                            <GitBranch className="w-3 h-3 text-purple-500 shrink-0" />
                            <span>{repo}</span>
                          </div>
                        ))}
                      </div>

                      <div className="p-2.5 rounded-lg border border-border/40 bg-background/80 flex items-center justify-between gap-3 mt-2">
                        <div>
                          <span className="font-medium text-foreground block text-xs">Auto-transiciones</span>
                          <span className="text-[10px] text-muted-foreground block">
                            Mueve a En Curso al codificar y a Done al fusionar PRs
                          </span>
                        </div>
                        <Switch
                          checked={vcsAutoTransitions}
                          onCheckedChange={setVcsAutoTransitions}
                        />
                      </div>

                      <div className="pt-1 flex items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setOverrideWorkspaceVcs(true)
                            setVcsEnabled(true)
                          }}
                          className="text-xs h-7 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-500/10 px-2 cursor-pointer"
                        >
                          Personalizar repositorios para este proyecto →
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {hasWorkspaceRepos && overrideWorkspaceVcs && (
                        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400">
                          <span>
                            Personalización activa (sobrescribe la herencia del espacio).
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setOverrideWorkspaceVcs(false)
                              setVcsRepository("")
                            }}
                            className="h-6 text-[11px] text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 px-2 gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restaurar herencia del Espacio</span>
                          </Button>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-medium text-foreground block">Habilitar integración Git</span>
                          <span className="text-[11px] text-muted-foreground block">
                            Conecta tickets de este proyecto con ramas, commits y PRs
                          </span>
                        </div>
                        <Switch
                          checked={vcsEnabled}
                          onCheckedChange={setVcsEnabled}
                        />
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
                                      ? "Conecta tu cuenta de GitHub o Bitbucket para autocompletar y sincronizar repositorios con este proyecto."
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                              <div>
                                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                                  Repositorio Vinculado
                                </label>
                                {availableRepos.length > 0 ? (
                                  <Select
                                    value={vcsRepository}
                                    onValueChange={setVcsRepository}
                                  >
                                    <SelectTrigger className="h-9 text-xs font-mono">
                                      <SelectValue placeholder="Seleccionar repositorio..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableRepos.map((repo) => (
                                        <SelectItem
                                          key={`${repo.provider}-${repo.full_name}`}
                                          value={repo.full_name}
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
                                    placeholder="workspace/nombre-del-repo"
                                    value={vcsRepository}
                                    onChange={(e) => setVcsRepository(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                  />
                                )}
                                <span className="text-[10px] text-muted-foreground mt-1 block">
                                  Formato: slug-del-workspace/nombre-del-repo (ej: mi-agencia/backend-api)
                                </span>
                              </div>

                              <div className="p-2.5 rounded-lg border border-border/40 bg-muted/20 flex items-center justify-between gap-3 mt-1 sm:mt-5">
                                <div>
                                  <span className="font-medium text-foreground block text-xs">Auto-transiciones</span>
                                  <span className="text-[10px] text-muted-foreground block">
                                    Mueve a En Curso al codificar y a Done al fusionar PRs
                                  </span>
                                </div>
                                <Switch
                                  checked={vcsAutoTransitions}
                                  onCheckedChange={setVcsAutoTransitions}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 flex items-center justify-between gap-2">
              {isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </Button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onClose} className="text-xs cursor-pointer">
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground text-xs font-medium cursor-pointer"
                >
                  {isSubmitting
                    ? "Guardando..."
                    : isEditing
                    ? "Guardar Cambios"
                    : "Crear Proyecto"}
                </Button>
              </div>
            </div>
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
