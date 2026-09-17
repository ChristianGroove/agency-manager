"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  Copy,
  ExternalLink,
  Plus,
  ShieldCheck,
  Code2,
  Palette,
  Briefcase,
  CheckCircle2,
  Clock,
  Pencil,
  Camera,
  Upload,
  Trash2,
  Loader2,
  Check,
  Mail,
  Phone,
  Target,
  Settings2,
  Headphones,
  GraduationCap,
  Wrench,
  Eye,
  Globe,
  Layers,
  AlertTriangle,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import type { TaskCollaborator, CollaboratorRole, TaskWorkspace } from "../../types"
import {
  createCollaborator,
  updateCollaborator,
  deleteCollaborator,
  uploadCollaboratorAvatar,
} from "../../actions/task-actions"
import { toast } from "sonner"
import { TASK_PACK_AVATARS, getCollaboratorAvatar } from "../../utils/avatar-presets"

interface TaskCollaboratorsManagerProps {
  collaborators: TaskCollaborator[]
  workspaces?: TaskWorkspace[]
  onCollaboratorCreated?: (collab: TaskCollaborator) => void
  onCollaboratorUpdated?: (collab: TaskCollaborator) => void
  onCollaboratorDeleted?: (collabId: string) => void
}

function AvatarUploader({
  photoUrl,
  firstName,
  lastName,
  isUploading,
  onUpload,
  onRemove,
  onSelectPreset,
}: {
  photoUrl: string
  firstName: string
  lastName: string
  isUploading: boolean
  onUpload: (file: File) => void
  onRemove: () => void
  onSelectPreset: (url: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(file)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-2xl bg-muted/30 border border-border/60">
      <div
        className="relative group cursor-pointer shrink-0"
        onClick={() => fileInputRef.current?.click()}
        title="Clic para cambiar foto"
      >
        <Avatar
          className="w-16 h-16 border-2 border-primary/20 shadow-sm shrink-0 overflow-hidden"
          style={{ backgroundColor: "#8ec045" }}
        >
          <AvatarImage src={getCollaboratorAvatar(photoUrl, firstName)} className="object-cover" />
          <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">
            {firstName?.[0] || "C"}
            {lastName?.[0] || "L"}
          </AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Camera className="w-5 h-5" />
          )}
        </div>
      </div>

      <div className="flex-1 space-y-2 text-center sm:text-left w-full min-w-0">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png,image/jpeg,image/webp,image/jpg"
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-border/70"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 text-primary" />
                Subir Foto Personalizada
              </>
            )}
          </Button>

          {photoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={isUploading}
              className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1 rounded-xl"
            >
              <Trash2 className="w-3 h-3" />
              Quitar
            </Button>
          )}
        </div>

        {/* Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-muted-foreground font-medium block">
            O selecciona un avatar 3D oficial:
          </span>
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            {TASK_PACK_AVATARS.map((preset, idx) => {
              const isSelected = photoUrl === preset
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectPreset(preset)}
                  className={cn(
                    "relative transition-all duration-150 ease-out active:scale-95 p-1 rounded-2xl select-none",
                    isSelected
                      ? "scale-125 ring-2 ring-primary ring-offset-2 dark:ring-offset-zinc-950 shadow-md"
                      : "opacity-75 hover:opacity-100 hover:scale-115 hover:-translate-y-0.5"
                  )}
                  title={`Avatar 3D ${idx + 1}`}
                >
                  <img
                    src={preset}
                    alt={`Avatar 3D ${idx + 1}`}
                    className="w-9 h-9 object-contain drop-shadow-sm pointer-events-none"
                  />
                  {isSelected && (
                    <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow-sm">
                      <Check className="w-2.5 h-2.5 font-bold" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export function TaskCollaboratorsManager({
  collaborators,
  workspaces = [],
  onCollaboratorCreated,
  onCollaboratorUpdated,
  onCollaboratorDeleted,
}: TaskCollaboratorsManagerProps) {
  const [localCollaborators, setLocalCollaborators] = useState<TaskCollaborator[]>(collaborators)

  useEffect(() => {
    setLocalCollaborators(collaborators)
  }, [collaborators])

  // New Collaborator Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<string>("Colaborador")
  const [taskRole, setTaskRole] = useState<CollaboratorRole>("specialist")
  const [photoUrl, setPhotoUrl] = useState<string>("")
  const [hasGlobalAccess, setHasGlobalAccess] = useState(true)
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([])
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false)

  // Edit Collaborator Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingCollab, setEditingCollab] = useState<TaskCollaborator | null>(null)
  const [editFirstName, setEditFirstName] = useState("")
  const [editLastName, setEditLastName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editRole, setEditRole] = useState<string>("")
  const [editTaskRole, setEditTaskRole] = useState<CollaboratorRole>("developer")
  const [editPhotoUrl, setEditPhotoUrl] = useState<string>("")
  const [editHasGlobalAccess, setEditHasGlobalAccess] = useState(true)
  const [editSelectedWorkspaceIds, setEditSelectedWorkspaceIds] = useState<string[]>([])
  const [editIsActive, setEditIsActive] = useState<boolean>(true)
  const [isUploadingEditPhoto, setIsUploadingEditPhoto] = useState(false)
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

  // Delete Collaborator Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [collabToDelete, setCollabToDelete] = useState<TaskCollaborator | null>(null)
  const [deleteAction, setDeleteAction] = useState<"unassign" | "reassign">("unassign")
  const [reassignStaffId, setReassignStaffId] = useState<string>("")
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false)

  const handleOpenDelete = (collab: TaskCollaborator) => {
    setCollabToDelete(collab)
    const others = localCollaborators.filter((c) => c.id !== collab.id)
    if (others.length > 0) {
      setReassignStaffId(others[0].id)
    } else {
      setReassignStaffId("")
    }
    setDeleteAction("unassign")
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!collabToDelete) return
    setIsSubmittingDelete(true)
    try {
      const res = await deleteCollaborator({
        collaboratorId: collabToDelete.id,
        reassignToStaffId: deleteAction === "reassign" && reassignStaffId ? reassignStaffId : null,
      })

      if (res.success) {
        toast.success(`Colaborador ${collabToDelete.first_name} eliminado con éxito`, {
          description:
            res.reassignedCount && res.reassignedCount > 0
              ? `${res.reassignedCount} tareas fueron ${deleteAction === "reassign" ? "reasignadas" : "desasignadas"}.`
              : "No tenía tareas asignadas.",
        })
        setLocalCollaborators((prev) => prev.filter((c) => c.id !== collabToDelete.id))
        onCollaboratorDeleted?.(collabToDelete.id)
        setIsDeleteModalOpen(false)
        setCollabToDelete(null)
      } else {
        toast.error(res.error || "Error al eliminar colaborador")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la solicitud")
    } finally {
      setIsSubmittingDelete(false)
    }
  }

  const copyPortalLink = (collab: TaskCollaborator) => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const url = `${origin}/portal/tasks/${collab.access_token}`
    navigator.clipboard.writeText(url)
    toast.success(`Enlace copiado para ${collab.first_name}`, {
      description: "El colaborador puede ingresar directamente a su portal sin contraseña.",
    })
  }

  const openPortal = (collab: TaskCollaborator) => {
    const url = `/portal/tasks/${collab.access_token}`
    window.open(url, "_blank")
  }

  const handleUpload = async (file: File, isEdit: boolean) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen debe ser menor a 5MB")
      return
    }
    const setUploading = isEdit ? setIsUploadingEditPhoto : setIsUploadingPhoto
    const setUrl = isEdit ? setEditPhotoUrl : setPhotoUrl

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await uploadCollaboratorAvatar(formData)
      if (res.success && res.url) {
        setUrl(res.url)
        toast.success("Foto subida correctamente")
      } else {
        toast.error(res.error || "Error al subir imagen")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al subir imagen")
    } finally {
      setUploading(false)
    }
  }

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Por favor completa el nombre y apellido")
      return
    }

    setIsSubmittingCreate(true)
    try {
      const res = await createCollaborator({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        role,
        taskRole,
        photoUrl: photoUrl || null,
        workspaceIds: hasGlobalAccess ? [] : selectedWorkspaceIds,
        hasGlobalWorkspaceAccess: hasGlobalAccess,
      })

      if (res.success && res.collaborator) {
        toast.success("Colaborador registrado exitosamente")
        setLocalCollaborators((prev) => [...prev, res.collaborator!])
        onCollaboratorCreated?.(res.collaborator)
        setIsCreateModalOpen(false)
        setFirstName("")
        setLastName("")
        setEmail("")
        setPhone("")
        setPhotoUrl("")
        setHasGlobalAccess(true)
        setSelectedWorkspaceIds([])
      } else {
        toast.error(res.error || "Error al crear colaborador")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar solicitud")
    } finally {
      setIsSubmittingCreate(false)
    }
  }

  const handleOpenEdit = (collab: TaskCollaborator) => {
    setEditingCollab(collab)
    setEditFirstName(collab.first_name)
    setEditLastName(collab.last_name)
    setEditEmail(collab.email || "")
    setEditPhone(collab.phone || "")
    setEditRole(collab.role || "Colaborador")
    setEditTaskRole(collab.task_role || "specialist")
    setEditPhotoUrl(collab.photo_url || "")
    setEditIsActive(collab.is_active ?? true)
    setEditHasGlobalAccess(collab.has_global_workspace_access ?? true)
    setEditSelectedWorkspaceIds(collab.workspace_ids || [])
    setIsEditModalOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingCollab) return
    if (!editFirstName.trim() || !editLastName.trim()) {
      toast.error("Por favor completa el nombre y apellido")
      return
    }

    setIsSubmittingEdit(true)
    try {
      const res = await updateCollaborator({
        id: editingCollab.id,
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
        role: editRole,
        taskRole: editTaskRole,
        photoUrl: editPhotoUrl || null,
        isActive: editIsActive,
        workspaceIds: editHasGlobalAccess ? [] : editSelectedWorkspaceIds,
        hasGlobalWorkspaceAccess: editHasGlobalAccess,
      })

      if (res.success && res.collaborator) {
        toast.success("Colaborador actualizado exitosamente")
        setLocalCollaborators((prev) =>
          prev.map((c) => (c.id === res.collaborator!.id ? res.collaborator! : c))
        )
        onCollaboratorUpdated?.(res.collaborator)
        setIsEditModalOpen(false)
        setEditingCollab(null)
      } else {
        toast.error(res.error || "Error al actualizar colaborador")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar solicitud")
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  const getRoleIcon = (roleName: string) => {
    const lower = (roleName || "").toLowerCase()
    if (lower.includes("pm") || lower.includes("project") || lower.includes("lead") || lower.includes("gestor")) {
      return <Briefcase className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
    }
    if (lower.includes("qa") || lower.includes("test")) {
      return <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
    }
    if (lower.includes("design") || lower.includes("ux") || lower.includes("ui") || lower.includes("creativ")) {
      return <Palette className="w-3.5 h-3.5 text-pink-500 shrink-0" />
    }
    if (lower.includes("venta") || lower.includes("comercial") || lower.includes("sales")) {
      return <Target className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
    }
    if (lower.includes("operac") || lower.includes("logistic")) {
      return <Settings2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
    }
    if (lower.includes("soporte") || lower.includes("support") || lower.includes("atención")) {
      return <Headphones className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
    }
    if (lower.includes("consult") || lower.includes("extern") || lower.includes("asesor")) {
      return <GraduationCap className="w-3.5 h-3.5 text-violet-500 shrink-0" />
    }
    if (lower.includes("observ")) {
      return <Eye className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
    }
    if (lower.includes("especial") || lower.includes("técnic")) {
      return <Wrench className="w-3.5 h-3.5 text-slate-500 shrink-0" />
    }
    return <Code2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
  }

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              Colaboradores & Portales Dedicados
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono ml-1">
              {localCollaborators.length} miembros
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Accesos independientes por token para cada colaborador sin contraseña ni permisos de plataforma.
          </p>
        </div>

        <Button
          onClick={() => {
            setFirstName("")
            setLastName("")
            setEmail("")
            setPhone("")
            setRole("Colaborador")
            setTaskRole("specialist")
            setPhotoUrl("")
            setIsCreateModalOpen(true)
          }}
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold h-9 rounded-xl shadow-sm shrink-0"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Nuevo Colaborador
        </Button>
      </div>

      {/* Collaborators Table */}
      <div className="border border-border/60 rounded-2xl bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-semibold">
                <th className="p-3.5 pl-4">Colaborador</th>
                <th className="p-3.5">Cargo / Especialidad</th>
                <th className="p-3.5">Contacto</th>
                <th className="p-3.5 text-center w-28">Asignadas</th>
                <th className="p-3.5 text-center w-28">Completadas</th>
                <th className="p-3.5 text-center w-24">Estado</th>
                <th className="p-3.5 pr-4 text-right w-64">Acceso & Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {localCollaborators.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No hay colaboradores registrados. Haz clic en "Nuevo Colaborador" para agregar uno.
                  </td>
                </tr>
              ) : (
                localCollaborators.map((collab) => (
                  <tr
                    key={collab.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {/* Colaborador Avatar + Nombre */}
                    <td className="p-3.5 pl-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 border border-border/60 shrink-0 shadow-sm" style={{ backgroundColor: "#8ec045" }}>
                          <AvatarImage src={getCollaboratorAvatar(collab.photo_url, collab.first_name)} className="object-cover" />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                            {collab.first_name[0]}
                            {collab.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-semibold text-foreground block">
                            {collab.first_name} {collab.last_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {collab.access_token.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Cargo / Especialidad */}
                    <td className="p-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          {getRoleIcon(collab.role)}
                          <span>{collab.role}</span>
                        </div>
                        {/* Assigned Workspaces Badges */}
                        <div className="flex flex-wrap items-center gap-1">
                          {collab.has_global_workspace_access !== false ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 font-medium">
                              <Globe className="w-2.5 h-2.5 opacity-70" />
                              Todos los espacios
                            </span>
                          ) : collab.workspace_ids && collab.workspace_ids.length > 0 ? (
                            collab.workspace_ids.map((wsId) => {
                              const ws = workspaces.find((w) => w.id === wsId)
                              if (!ws) return null
                              return (
                                <span
                                  key={wsId}
                                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-mono font-medium"
                                  style={{
                                    backgroundColor: `${ws.color}15`,
                                    color: ws.color,
                                    border: `1px solid ${ws.color}35`,
                                  }}
                                >
                                  {ws.key_prefix ? `[${ws.key_prefix}]` : ws.name}
                                </span>
                              )
                            })
                          ) : (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              Sin espacios asignados
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contacto */}
                    <td className="p-3.5 text-muted-foreground">
                      <div className="space-y-0.5">
                        {collab.email ? (
                          <div className="truncate max-w-[200px] flex items-center gap-1">
                            <Mail className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                            <span>{collab.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 italic">Sin email</span>
                        )}
                        {collab.phone && (
                          <div className="text-[10px] font-mono text-muted-foreground/70 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                            <span>{collab.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Tareas Asignadas */}
                    <td className="p-3.5 text-center font-mono font-bold text-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {collab.assigned_tasks_count || 0}
                      </span>
                    </td>

                    {/* Completadas */}
                    <td className="p-3.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {collab.completed_tasks_count || 0}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="p-3.5 text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-2 py-0.5 font-medium",
                          collab.is_active
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                        )}
                      >
                        {collab.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>

                    {/* Acceso al Portal / Acciones */}
                    <td className="p-3.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(collab)}
                          className="h-8 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                          title="Editar colaborador"
                        >
                          <Pencil className="w-3 h-3 text-primary" />
                          <span className="hidden lg:inline">Editar</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyPortalLink(collab)}
                          className="h-8 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground border-border/60"
                          title="Copiar enlace directo"
                        >
                          <Copy className="w-3 h-3" />
                          <span className="hidden xl:inline">Copiar</span>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openPortal(collab)}
                          className="h-8 text-xs font-medium gap-1 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                          title="Abrir portal del colaborador"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Abrir</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDelete(collab)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border/60 hover:border-destructive/40 transition-colors"
                          title="Eliminar colaborador"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Collaborator */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl sm:max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Alta de Nuevo Colaborador
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Avatar Uploader */}
            <AvatarUploader
              photoUrl={photoUrl}
              firstName={firstName}
              lastName={lastName}
              isUploading={isUploadingPhoto}
              onUpload={(file) => handleUpload(file, false)}
              onRemove={() => setPhotoUrl("")}
              onSelectPreset={(url) => setPhotoUrl(url)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Nombre *
                </label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ej. Ana"
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Apellido *
                </label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ej. Martínez"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Correo Electrónico
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ana@empresa.com"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Teléfono / WhatsApp
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+57 300 123 4567"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Perfil de Tareas
                </label>
                <Select
                  value={taskRole}
                  onValueChange={(val: CollaboratorRole) => {
                    setTaskRole(val)
                    const cargoMap: Record<string, string> = {
                      developer: "Desarrollador",
                      designer: "Diseñador",
                      qa_lead: "QA / Tester",
                      pm: "Gestor de Proyecto",
                      specialist: "Especialista",
                      observer: "Observador",
                      sales: "Ejecutivo Comercial",
                      operations: "Coordinador de Operaciones",
                      support: "Soporte Técnico",
                      consultant: "Consultor Externo",
                    }
                    setRole(cargoMap[val] || "Colaborador")
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pm">Gestor de Proyecto</SelectItem>
                    <SelectItem value="specialist">Especialista</SelectItem>
                    <SelectItem value="developer">Desarrollador</SelectItem>
                    <SelectItem value="designer">Diseñador</SelectItem>
                    <SelectItem value="qa_lead">QA / Tester</SelectItem>
                    <SelectItem value="sales">Ejecutivo Comercial</SelectItem>
                    <SelectItem value="operations">Operaciones</SelectItem>
                    <SelectItem value="support">Soporte / Atención</SelectItem>
                    <SelectItem value="consultant">Consultor Externo</SelectItem>
                    <SelectItem value="observer">Observador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Cargo Visible
                </label>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Ej. Coordinador Senior"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {taskRole === "pm" && (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs flex items-start gap-2.5">
                <Briefcase className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
                <div className="space-y-0.5">
                  <span className="font-bold text-foreground block">
                    Portal de Doble Vista Activo (Gestor de Proyecto / Lead)
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Este colaborador tendrá acceso dual en su portal privado: <strong>Dashboard Táctico</strong> (telemetría de sprints y métricas globales del equipo) + <strong>Gestión</strong> (tablero Kanban general, ribbon de miembros, creación de tickets y reasignaciones).
                  </p>
                </div>
              </div>
            )}
            {taskRole === "qa_lead" && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <div className="space-y-0.5">
                  <span className="font-bold text-foreground block">
                    Cola de QA & Validación Activa
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Este colaborador tendrá acceso prioritario en su portal para revisar tickets en cola de QA, validar entregables y certificar pasos a UAT / producción.
                  </p>
                </div>
              </div>
            )}

            {/* Espacios de Trabajo Asignados */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-muted/30 border border-border/60">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-primary" />
                    Acceso Global a Todos los Espacios
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Permite al colaborador o PM ver y gestionar proyectos y tickets de cualquier área.
                  </span>
                </div>
                <Switch
                  checked={hasGlobalAccess}
                  onCheckedChange={setHasGlobalAccess}
                />
              </div>

              {!hasGlobalAccess && (
                <div className="pt-2.5 border-t border-border/40 space-y-2">
                  <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                    <span>Espacios Permitidos ({selectedWorkspaceIds.length} seleccionados):</span>
                    {workspaces.length === 0 && (
                      <span className="text-destructive text-[10px]">No hay espacios creados</span>
                    )}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                    {workspaces.map((ws) => {
                      const isSelected = selectedWorkspaceIds.includes(ws.id)
                      return (
                        <div
                          key={ws.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedWorkspaceIds((prev) => prev.filter((id) => id !== ws.id))
                            } else {
                              setSelectedWorkspaceIds((prev) => [...prev, ws.id])
                            }
                          }}
                          className={cn(
                            "flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all",
                            isSelected
                              ? "bg-primary/10 border-primary/40 text-foreground shadow-xs"
                              : "bg-card hover:bg-muted/40 border-border/50 text-muted-foreground"
                          )}
                        >
                          <div
                            className={cn(
                              "w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/40 bg-transparent"
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: ws.color || "#0284c7" }}
                          />
                          <span className="truncate font-medium flex-1">{ws.name}</span>
                          {ws.key_prefix && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-muted font-mono text-muted-foreground shrink-0">
                              [{ws.key_prefix}]
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground space-y-1">
              <span className="font-semibold text-foreground block">
                Portal Autónomo Autogenerado:
              </span>
              Se creará un token de acceso seguro para que el colaborador consulte sus tareas, actualice avances con sliders y participe en discusiones.
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSubmittingCreate}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={isSubmittingCreate}
                className="text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSubmittingCreate ? "Creando..." : "Crear Colaborador"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Edit Collaborator */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl sm:max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Editar Colaborador
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Avatar Uploader */}
            <AvatarUploader
              photoUrl={editPhotoUrl}
              firstName={editFirstName}
              lastName={editLastName}
              isUploading={isUploadingEditPhoto}
              onUpload={(file) => handleUpload(file, true)}
              onRemove={() => setEditPhotoUrl("")}
              onSelectPreset={(url) => setEditPhotoUrl(url)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Nombre *
                </label>
                <Input
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="Ej. Ana"
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Apellido *
                </label>
                <Input
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="Ej. Martínez"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Correo Electrónico
                </label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="ana@empresa.com"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Teléfono / WhatsApp
                </label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+57 300 123 4567"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Perfil de Tareas
                </label>
                <Select
                  value={editTaskRole}
                  onValueChange={(val: CollaboratorRole) => {
                    setEditTaskRole(val)
                    const cargoMap: Record<string, string> = {
                      developer: "Desarrollador",
                      designer: "Diseñador",
                      qa_lead: "QA / Tester",
                      pm: "Gestor de Proyecto",
                      specialist: "Especialista",
                      observer: "Observador",
                      sales: "Ejecutivo Comercial",
                      operations: "Coordinador de Operaciones",
                      support: "Soporte Técnico",
                      consultant: "Consultor Externo",
                    }
                    setEditRole(cargoMap[val] || "Colaborador")
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pm">Gestor de Proyecto</SelectItem>
                    <SelectItem value="specialist">Especialista</SelectItem>
                    <SelectItem value="developer">Desarrollador</SelectItem>
                    <SelectItem value="designer">Diseñador</SelectItem>
                    <SelectItem value="qa_lead">QA / Tester</SelectItem>
                    <SelectItem value="sales">Ejecutivo Comercial</SelectItem>
                    <SelectItem value="operations">Operaciones</SelectItem>
                    <SelectItem value="support">Soporte / Atención</SelectItem>
                    <SelectItem value="consultant">Consultor Externo</SelectItem>
                    <SelectItem value="observer">Observador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Cargo Visible
                </label>
                <Input
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  placeholder="Ej. Coordinador Senior"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {editTaskRole === "pm" && (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs flex items-start gap-2.5">
                <Briefcase className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
                <div className="space-y-0.5">
                  <span className="font-bold text-foreground block">
                    Portal de Doble Vista Activo (Gestor de Proyecto / Lead)
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Este colaborador tiene acceso dual en su portal privado: <strong>Dashboard Táctico</strong> (telemetría de sprints y métricas globales del equipo) + <strong>Gestión</strong> (tablero Kanban general, ribbon de miembros, creación de tickets y reasignaciones).
                  </p>
                </div>
              </div>
            )}
            {editTaskRole === "qa_lead" && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <div className="space-y-0.5">
                  <span className="font-bold text-foreground block">
                    Cola de QA & Validación Activa
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Este colaborador tiene acceso prioritario en su portal para revisar tickets en cola de QA, validar entregables y certificar pasos a UAT / producción.
                  </p>
                </div>
              </div>
            )}

            {/* Espacios de Trabajo Asignados */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-muted/30 border border-border/60">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-primary" />
                    Acceso Global a Todos los Espacios
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Permite al colaborador o PM ver y gestionar proyectos y tickets de cualquier área.
                  </span>
                </div>
                <Switch
                  checked={editHasGlobalAccess}
                  onCheckedChange={setEditHasGlobalAccess}
                />
              </div>

              {!editHasGlobalAccess && (
                <div className="pt-2.5 border-t border-border/40 space-y-2">
                  <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                    <span>Espacios Permitidos ({editSelectedWorkspaceIds.length} seleccionados):</span>
                    {workspaces.length === 0 && (
                      <span className="text-destructive text-[10px]">No hay espacios creados</span>
                    )}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                    {workspaces.map((ws) => {
                      const isSelected = editSelectedWorkspaceIds.includes(ws.id)
                      return (
                        <div
                          key={ws.id}
                          onClick={() => {
                            if (isSelected) {
                              setEditSelectedWorkspaceIds((prev) => prev.filter((id) => id !== ws.id))
                            } else {
                              setEditSelectedWorkspaceIds((prev) => [...prev, ws.id])
                            }
                          }}
                          className={cn(
                            "flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all",
                            isSelected
                              ? "bg-primary/10 border-primary/40 text-foreground shadow-xs"
                              : "bg-card hover:bg-muted/40 border-border/50 text-muted-foreground"
                          )}
                        >
                          <div
                            className={cn(
                              "w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/40 bg-transparent"
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: ws.color || "#0284c7" }}
                          />
                          <span className="truncate font-medium flex-1">{ws.name}</span>
                          {ws.key_prefix && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-muted font-mono text-muted-foreground shrink-0">
                              [{ws.key_prefix}]
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Activo Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground block">
                  Colaborador Activo
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Permite acceso directo al portal y asignación en proyectos y tareas.
                </span>
              </div>
              <Switch
                checked={editIsActive}
                onCheckedChange={setEditIsActive}
              />
            </div>

            <DialogFooter className="gap-2 pt-2 items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (editingCollab) {
                    setIsEditModalOpen(false)
                    handleOpenDelete(editingCollab)
                  }
                }}
                disabled={isSubmittingEdit}
                className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive/60 gap-1.5 px-3 mr-auto"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                Eliminar
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSubmittingEdit}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdate}
                  disabled={isSubmittingEdit}
                  className="text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSubmittingEdit ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Delete Collaborator Confirmation & Reassignment */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !isSubmittingDelete && setIsDeleteModalOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              ¿Eliminar colaborador?
            </DialogTitle>
          </DialogHeader>

          {collabToDelete && (
            <div className="space-y-4 pt-2">
              {/* Member Card Summary */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
                <Avatar className="w-10 h-10 border border-border shrink-0">
                  <AvatarImage src={getCollaboratorAvatar(collabToDelete.photo_url, collabToDelete.first_name)} />
                  <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                    {collabToDelete.first_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-foreground truncate">
                    {collabToDelete.first_name} {collabToDelete.last_name}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">{collabToDelete.role}</p>
                </div>
              </div>

              {/* Tasks Impact Assessment */}
              {(collabToDelete.assigned_tasks_count || 0) > 0 ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block mb-0.5">
                        Este colaborador tiene {collabToDelete.assigned_tasks_count} tarea(s) asignada(s).
                      </span>
                      <span>Define qué sucederá con estas tareas antes de continuar:</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {/* Option 1: Unassign */}
                    <div
                      onClick={() => setDeleteAction("unassign")}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors text-xs",
                        deleteAction === "unassign"
                          ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                          : "border-border/60 hover:bg-muted/30 text-muted-foreground"
                      )}
                    >
                      <input
                        type="radio"
                        name="deleteAction"
                        checked={deleteAction === "unassign"}
                        onChange={() => setDeleteAction("unassign")}
                        className="mt-0.5 text-primary focus:ring-primary"
                      />
                      <div>
                        <span className="font-semibold block text-foreground">
                          Desasignar tareas (Quedarán sin responsable)
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Las tareas se conservarán en sus proyectos correspondientes para ser tomadas más adelante.
                        </span>
                      </div>
                    </div>

                    {/* Option 2: Reassign */}
                    {localCollaborators.filter((c) => c.id !== collabToDelete.id).length > 0 && (
                      <div
                        onClick={() => setDeleteAction("reassign")}
                        className={cn(
                          "flex flex-col gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors text-xs",
                          deleteAction === "reassign"
                            ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                            : "border-border/60 hover:bg-muted/30 text-muted-foreground"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="deleteAction"
                            checked={deleteAction === "reassign"}
                            onChange={() => setDeleteAction("reassign")}
                            className="mt-0.5 text-primary focus:ring-primary"
                          />
                          <div>
                            <span className="font-semibold block text-foreground">
                              Reasignar tareas a otro colaborador
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Todas las tareas activas se transferirán inmediatamente al miembro seleccionado.
                            </span>
                          </div>
                        </div>

                        {deleteAction === "reassign" && (
                          <div className="pl-6 pt-1">
                            <Select value={reassignStaffId} onValueChange={setReassignStaffId}>
                              <SelectTrigger className="h-8 text-xs bg-background">
                                <SelectValue placeholder="Seleccionar colaborador destino..." />
                              </SelectTrigger>
                              <SelectContent>
                                {localCollaborators
                                  .filter((c) => c.id !== collabToDelete.id)
                                  .map((c) => (
                                    <SelectItem key={c.id} value={c.id} className="text-xs">
                                      <div className="flex items-center gap-2">
                                        <span>
                                          {c.first_name} {c.last_name}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                          ({c.role})
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Este colaborador no tiene tareas asignadas actualmente. Al eliminarlo, se revocará de inmediato el
                  acceso a su portal privado de tareas.
                </p>
              )}

              <DialogFooter className="gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isSubmittingDelete}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={isSubmittingDelete || (deleteAction === "reassign" && !reassignStaffId)}
                  className="text-xs gap-1.5 font-semibold text-white bg-destructive hover:bg-destructive/90 shadow-sm"
                >
                  {isSubmittingDelete ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                      Eliminar Colaborador
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
