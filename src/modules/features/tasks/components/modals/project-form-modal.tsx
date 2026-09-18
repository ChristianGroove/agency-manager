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
import { FolderPlus, Pencil, Globe, Trash2, AlertTriangle } from "lucide-react"
import type { TaskProject, TaskCollaborator, TaskWorkspace } from "../../types"
import { createProject, updateProject, deleteProject } from "../../actions/task-actions"
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
      } else {
        setName("")
        setWorkspaceId(defaultWorkspaceId || "none")
        setDescription("")
        setColor("#6366f1")
        setLeadStaffId("unassigned")
        setStartDate("")
        setTargetDate("")
      }
    }
  }, [isOpen, projectToEdit, defaultWorkspaceId])

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Por favor ingresa el nombre del proyecto o sprint")
      return
    }

    setIsSubmitting(true)
    try {
      if (isEditing && projectToEdit) {
        const res = await updateProject(projectToEdit.id, {
          name: name.trim(),
          workspace_id: workspaceId === "none" ? null : workspaceId,
          description: description.trim() || null,
          color,
          lead_staff_id: leadStaffId === "unassigned" ? null : leadStaffId,
          start_date: startDate || null,
          target_date: targetDate || null,
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
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

            <div>
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

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Descripción / Objetivo
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Objetivos clave del sprint, entregables esperados..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
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
  )
}
