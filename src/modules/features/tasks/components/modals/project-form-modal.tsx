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
import { FolderPlus, Layers } from "lucide-react"
import type { TaskProject, TaskCollaborator } from "../../types"
import { createProject } from "../../actions/task-actions"
import { toast } from "sonner"

interface ProjectFormModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated?: (project: TaskProject) => void
  collaborators: TaskCollaborator[]
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
  onProjectCreated,
  collaborators,
}: ProjectFormModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState("#6366f1")
  const [leadStaffId, setLeadStaffId] = useState("unassigned")
  const [startDate, setStartDate] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Por favor ingresa el nombre del proyecto o sprint")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createProject({
        name: name.trim(),
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
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la solicitud")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-primary" />
            Nuevo Proyecto / Sprint
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Nombre del Proyecto *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Sprint 14 - Plataforma SaaS 2.0"
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
              {isSubmitting ? "Creando..." : "Crear Proyecto"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
