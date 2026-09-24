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
import { Globe, Trash2, Loader2, Users, ShieldAlert, Sparkles, Headset } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import type { TaskWorkspace, TaskCollaborator } from "../../types"
import { createWorkspace, updateWorkspace, deleteWorkspace } from "../../actions/task-actions"
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
      } else {
        setName("")
        setKeyPrefix("WEB")
        setDescription("")
        setColor("#0284c7")
        setParallelTeamEnabled(false)
        setSlaFirstResponse(24)
        setSlaResolution(72)
        const defaultLead = collaborators.find(
          (c) => c.task_role === "pm" || c.role?.toLowerCase().includes("gestor")
        )
        setLeadStaffId(defaultLead ? defaultLead.id : "unassigned")
      }
    }
  }, [isOpen, workspaceToEdit, collaborators])

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

      if (isEditing && workspaceToEdit) {
        const res = await updateWorkspace(workspaceToEdit.id, {
          name: name.trim(),
          key_prefix: cleanPrefix,
          description: description.trim() || null,
          color,
          lead_staff_id: leadStaffId === "unassigned" ? null : leadStaffId,
          parallel_team_enabled: parallelTeamEnabled,
          support_config: supportConfig,
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
  )
}
