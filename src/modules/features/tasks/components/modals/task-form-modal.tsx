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
import { Plus, CheckSquare, Layers } from "lucide-react"
import type {
  TaskItem,
  TaskProject,
  TaskCollaborator,
  TaskPriority,
  TaskType,
  TaskStatus
} from "../../types"
import { createTask } from "../../actions/task-actions"
import { toast } from "sonner"

interface TaskFormModalProps {
  isOpen: boolean
  onClose: () => void
  onTaskCreated?: (task: TaskItem) => void
  projects: TaskProject[]
  collaborators: TaskCollaborator[]
  defaultProjectId?: string
  defaultStatus?: TaskStatus
}

export function TaskFormModal({
  isOpen,
  onClose,
  onTaskCreated,
  projects,
  collaborators,
  defaultProjectId,
  defaultStatus = "todo",
}: TaskFormModalProps) {
  const [projectId, setProjectId] = useState(
    defaultProjectId && defaultProjectId !== "all"
      ? defaultProjectId
      : projects[0]?.id || ""
  )
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<TaskStatus>(defaultStatus)
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [type, setType] = useState<TaskType>("task")
  const [assignedStaffId, setAssignedStaffId] = useState("unassigned")
  const [qaStaffId, setQaStaffId] = useState("unassigned")
  const [dueDate, setDueDate] = useState("")
  const [estimatedHours, setEstimatedHours] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update default project when modal opens
  React.useEffect(() => {
    if (defaultProjectId && defaultProjectId !== "all") {
      setProjectId(defaultProjectId)
    } else if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id)
    }
    if (defaultStatus) {
      setStatus(defaultStatus)
    }
  }, [defaultProjectId, defaultStatus, projects])

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Por favor ingresa el título de la tarea")
      return
    }
    if (!projectId) {
      toast.error("Por favor selecciona o crea un proyecto primero")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createTask({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        type,
        assigned_staff_id: assignedStaffId === "unassigned" ? null : assignedStaffId,
        qa_staff_id: qaStaffId === "unassigned" ? null : qaStaffId,
        due_date: dueDate || null,
        estimated_hours: Number(estimatedHours),
        progress_percentage: status === "done" ? 100 : 0,
      })

      if (res.success && res.task) {
        toast.success("Tarea creada exitosamente")
        onTaskCreated?.(res.task)
        onClose()
        setTitle("")
        setDescription("")
      } else {
        toast.error(res.error || "Error al crear la tarea")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la solicitud")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Nueva Tarea / Ticket
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Project Selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Proyecto / Sprint *
            </label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Seleccionar proyecto..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      <span>{p.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Título del Ticket *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Integrar pasarela Wompi en checkout de pedidos"
              className="h-9 text-xs font-semibold"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Descripción & Requisitos
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalla lo que debe resolverse, criterios de entrega, contexto..."
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Tipo
              </label>
              <Select value={type} onValueChange={(val: TaskType) => setType(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Tarea Estándar</SelectItem>
                  <SelectItem value="feature">Nueva Feature</SelectItem>
                  <SelectItem value="bug">Reporte Bug</SelectItem>
                  <SelectItem value="improvement">Mejora</SelectItem>
                  <SelectItem value="delivery">Entrega</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Prioridad
              </label>
              <Select value={priority} onValueChange={(val: TaskPriority) => setPriority(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee & QA Reviewer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Responsable Asignado
              </label>
              <Select value={assignedStaffId} onValueChange={setAssignedStaffId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Sin asignar</SelectItem>
                  {collaborators.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} ({c.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Revisor QA
              </label>
              <Select value={qaStaffId} onValueChange={setQaStaffId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Sin QA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Sin QA</SelectItem>
                  {collaborators.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} ({c.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date & Estimated Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Fecha de Entrega
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Horas Estimadas
              </label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(Number(e.target.value))}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground text-xs font-medium"
            >
              {isSubmitting ? "Guardando..." : "Crear Ticket"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
