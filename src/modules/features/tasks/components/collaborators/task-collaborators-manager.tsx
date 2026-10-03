"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
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
  Headset,
  Info,
  GraduationCap,
  Wrench,
  Eye,
  Globe,
  Layers,
  AlertTriangle,
  AlertCircle,
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
} from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import type { TaskCollaborator, CollaboratorRole, TaskWorkspace, CollaboratorCapabilities } from "../../types"
import { resolveCollaboratorCapabilities } from "../../types"
import {
  createCollaborator,
  updateCollaborator,
  deleteCollaborator,
  uploadCollaboratorAvatar,
} from "../../actions/task-actions"
import {
  adminResetCollaboratorPinAction,
  adminSetCollaboratorPinAction,
} from "@/modules/features/portal-security"
import { toast } from "sonner"
import { TASK_PACK_AVATARS, getCollaboratorAvatar } from "../../utils/avatar-presets"

interface TaskCollaboratorsManagerProps {
  collaborators: TaskCollaborator[]
  workspaces?: TaskWorkspace[]
  onCollaboratorCreated?: (collab: TaskCollaborator) => void
  onCollaboratorUpdated?: (collab: TaskCollaborator) => void
  onCollaboratorDeleted?: (collabId: string) => void
}

function AvatarPickerPopover({
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
  const [open, setOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(file)
      setOpen(false)
    }
  }

  const hasPhoto = photoUrl && photoUrl.trim() !== ""
  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "?"

  return (
    <div className="flex flex-col items-center justify-center shrink-0 self-center">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
      />
      <div className="relative">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "relative group rounded-full transition-all duration-200 cursor-pointer select-none",
                "w-20 h-20 sm:w-22 sm:h-22 flex items-center justify-center overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs",
                hasPhoto
                  ? "border-2 border-primary/30 hover:border-primary shadow-sm bg-transparent"
                  : "border-2 border-dashed border-border/80 hover:border-primary/60 bg-muted/30 hover:bg-muted/50"
              )}
              aria-label={hasPhoto ? "Clic para cambiar avatar" : "Clic para seleccionar avatar"}
            >
              {hasPhoto ? (
                <>
                  <img
                    src={photoUrl}
                    alt="Avatar seleccionado"
                    className="w-full h-full object-cover pointer-events-none select-none"
                  />
                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-medium gap-1">
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>Cambiar</span>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground/60 group-hover:text-primary transition-colors gap-1">
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                        <Camera className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-semibold text-foreground/80">Avatar</span>
                    </>
                  )}
                </div>
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent
            side="right"
            align="start"
            sideOffset={10}
            className="w-80 p-3.5 space-y-3 rounded-2xl shadow-xl border border-border/80 bg-popover z-[100]"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-primary" />
                  Avatar del Colaborador
                </span>
                {hasPhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      onRemove()
                      setOpen(false)
                    }}
                    className="text-[10px] text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                    Quitar foto
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Sube una imagen personalizada o elige una ilustración prediseñada:
              </p>
            </div>

            {/* Subir archivo */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-8 text-xs font-medium gap-2 border-border/80 hover:bg-primary/5 hover:text-primary hover:border-primary/40 cursor-pointer"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-primary" />
              )}
              <span>Subir imagen desde equipo</span>
            </Button>

            {/* Presets Grid */}
            <div className="space-y-1.5 pt-1.5 border-t border-border/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Ilustraciones Disponibles
              </span>
              <div className="grid grid-cols-7 gap-1.5 p-1 bg-muted/20 rounded-xl border border-border/40 max-h-36 overflow-y-auto">
                {TASK_PACK_AVATARS.map((preset, idx) => {
                  const isSelected = photoUrl === preset
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        onSelectPreset(preset)
                        setOpen(false)
                      }}
                      className={cn(
                        "relative p-1 rounded-xl transition-all duration-150 select-none cursor-pointer flex items-center justify-center",
                        isSelected
                          ? "scale-105 ring-2 ring-primary bg-primary/10 shadow-xs"
                          : "opacity-75 hover:opacity-100 hover:scale-110 hover:bg-muted/50"
                      )}
                      title={`Ilustración ${idx + 1}`}
                    >
                      <img
                        src={preset}
                        alt={`Avatar ${idx + 1}`}
                        className="w-7 h-7 object-contain drop-shadow-xs pointer-events-none"
                      />
                      {isSelected && (
                        <div className="absolute -bottom-0.5 -right-0.5 bg-primary text-primary-foreground rounded-full p-0.5 shadow-xs">
                          <Check className="w-2 h-2 font-bold" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Canequita rápida en la esquina superior cuando hay foto activa */}
        {hasPhoto && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove()
                  }}
                  disabled={isUploading}
                  className="absolute -top-1 -right-1 z-20 w-6 h-6 rounded-full bg-background text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-border/80 hover:border-rose-200 dark:hover:border-rose-900/60 shadow-xs flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer"
                  aria-label="Quitar foto"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="rounded-lg text-xs py-1 px-2">
                Quitar foto
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
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
  const [canBulkDelete, setCanBulkDelete] = useState(false)
  const [capabilities, setCapabilities] = useState<CollaboratorCapabilities>(() =>
    resolveCollaboratorCapabilities({ task_role: "specialist" })
  )
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
  const [editCapabilities, setEditCapabilities] = useState<CollaboratorCapabilities>(() =>
    resolveCollaboratorCapabilities({ task_role: "developer" })
  )
  const [editPhotoUrl, setEditPhotoUrl] = useState<string>("")
  const [editHasGlobalAccess, setEditHasGlobalAccess] = useState(true)
  const [editSelectedWorkspaceIds, setEditSelectedWorkspaceIds] = useState<string[]>([])
  const [editCanBulkDelete, setEditCanBulkDelete] = useState(false)
  const [editIsActive, setEditIsActive] = useState<boolean>(true)
  const [isUploadingEditPhoto, setIsUploadingEditPhoto] = useState(false)
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

  // Collaborator PIN Security Modal State
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false)
  const [selectedCollabForSecurity, setSelectedCollabForSecurity] = useState<TaskCollaborator | null>(null)
  const [customTempPin, setCustomTempPin] = useState("")
  const [isSubmittingPinAction, setIsSubmittingPinAction] = useState(false)

  const handleOpenSecurity = (collab: TaskCollaborator) => {
    setSelectedCollabForSecurity(collab)
    setCustomTempPin("")
    setIsSecurityModalOpen(true)
  }

  const handleAdminResetPin = async (collabId: string) => {
    setIsSubmittingPinAction(true)
    try {
      const res = await adminResetCollaboratorPinAction(collabId)
      if (res.success) {
        toast.success("PIN de seguridad restablecido con éxito", {
          description: "El colaborador ahora puede ingresar directamente o configurar un nuevo PIN.",
        })
        setLocalCollaborators((prev) =>
          prev.map((c) => (c.id === collabId ? { ...c, has_pin_code: false } : c))
        )
        if (selectedCollabForSecurity && selectedCollabForSecurity.id === collabId) {
          setSelectedCollabForSecurity((prev) => (prev ? { ...prev, has_pin_code: false } : null))
        }
        if (editingCollab && editingCollab.id === collabId) {
          setEditingCollab((prev) => (prev ? { ...prev, has_pin_code: false } : null))
        }
        setIsSecurityModalOpen(false)
      } else {
        toast.error(res.error || "Error al restablecer el PIN")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la solicitud")
    } finally {
      setIsSubmittingPinAction(false)
    }
  }

  const handleAdminSetPin = async (collabId: string) => {
    if (!/^\d{6}$/.test(customTempPin.trim())) {
      toast.error("El PIN temporal debe tener exactamente 6 dígitos numéricos")
      return
    }

    setIsSubmittingPinAction(true)
    try {
      const res = await adminSetCollaboratorPinAction(collabId, customTempPin.trim())
      if (res.success) {
        toast.success("Nuevo PIN asignado con éxito", {
          description: `El PIN asignado es: ${customTempPin.trim()}`,
        })
        setLocalCollaborators((prev) =>
          prev.map((c) => (c.id === collabId ? { ...c, has_pin_code: true } : c))
        )
        if (selectedCollabForSecurity && selectedCollabForSecurity.id === collabId) {
          setSelectedCollabForSecurity((prev) => (prev ? { ...prev, has_pin_code: true } : null))
        }
        if (editingCollab && editingCollab.id === collabId) {
          setEditingCollab((prev) => (prev ? { ...prev, has_pin_code: true } : null))
        }
        setIsSecurityModalOpen(false)
      } else {
        toast.error(res.error || "Error al asignar el PIN")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la solicitud")
    } finally {
      setIsSubmittingPinAction(false)
    }
  }

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

    const effectiveCapabilities = taskRole === "support"
      ? { vcs_code: false, design_preview: false, monitoring: false, finance_costs: false }
      : capabilities

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
        canBulkDeleteTasks: canBulkDelete,
        capabilities: effectiveCapabilities,
        settings: { capabilities: effectiveCapabilities },
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
        setCanBulkDelete(false)
        setCapabilities(resolveCollaboratorCapabilities({ task_role: "specialist" }))
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
    const initialCaps = resolveCollaboratorCapabilities(collab)
    setEditCapabilities(initialCaps)
    setEditPhotoUrl(collab.photo_url || "")
    setEditIsActive(collab.is_active ?? true)
    setEditHasGlobalAccess(collab.has_global_workspace_access ?? true)
    setEditSelectedWorkspaceIds(collab.workspace_ids || [])
    setEditCanBulkDelete(collab.can_bulk_delete_tasks ?? (collab.task_role === "pm"))
    setIsEditModalOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingCollab) return
    if (!editFirstName.trim() || !editLastName.trim()) {
      toast.error("Por favor completa el nombre y apellido")
      return
    }

    const effectiveEditCapabilities = editTaskRole === "support"
      ? { vcs_code: false, design_preview: false, monitoring: false, finance_costs: false }
      : editCapabilities

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
        canBulkDeleteTasks: editCanBulkDelete,
        capabilities: effectiveEditCapabilities,
        settings: {
          ...(editingCollab.settings || {}),
          capabilities: effectiveEditCapabilities,
        },
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
                <th className="p-3.5 pr-4 text-right w-44">Acceso & Gestión</th>
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
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {collab.access_token.slice(0, 8)}...
                            </span>
                            {collab.has_pin_code ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-md">
                                <Lock className="w-2.5 h-2.5" />
                                PIN Activo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-500/10 px-1.5 py-0.2 rounded-md">
                                <Unlock className="w-2.5 h-2.5" />
                                Sin PIN
                              </span>
                            )}
                          </div>
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
                        {/* Capability Lenses Badges */}
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          {collab.capabilities?.vcs_code && (
                            <span
                              className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium"
                              title="Lente de Código y Control de Versiones Activo"
                            >
                              <Code2 className="w-2.5 h-2.5" />
                              Código
                            </span>
                          )}
                          {collab.capabilities?.design_preview && (
                            <span
                              className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded-md bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20 font-medium"
                              title="Lente de Diseño e Interfaces Activo"
                            >
                              <Palette className="w-2.5 h-2.5" />
                              Diseño
                            </span>
                          )}
                          {collab.capabilities?.monitoring && (
                            <span
                              className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium"
                              title="Lente de Observabilidad y Telemetría Activo"
                            >
                              <Eye className="w-2.5 h-2.5" />
                              Telemetría
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
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider delayDuration={150}>
                          {/* Editar */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(collab)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-primary hover:bg-primary/10 transition-all cursor-pointer active:scale-95 focus:outline-none"
                                aria-label="Editar colaborador"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="rounded-xl text-xs">
                              Editar colaborador
                            </TooltipContent>
                          </Tooltip>

                          {/* Copiar enlace */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => copyPortalLink(collab)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all cursor-pointer active:scale-95 focus:outline-none"
                                aria-label="Copiar enlace directo"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="rounded-xl text-xs">
                              Copiar enlace al portal
                            </TooltipContent>
                          </Tooltip>

                          {/* Abrir portal */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => openPortal(collab)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-primary hover:bg-primary/10 transition-all cursor-pointer active:scale-95 focus:outline-none"
                                aria-label="Abrir portal del colaborador"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="rounded-xl text-xs">
                              Abrir portal del colaborador
                            </TooltipContent>
                          </Tooltip>

                          {/* Seguridad / PIN */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => handleOpenSecurity(collab)}
                                className={cn(
                                  "p-1.5 rounded-lg transition-all cursor-pointer active:scale-95 focus:outline-none",
                                  collab.has_pin_code
                                    ? "text-amber-500/80 hover:text-amber-500 hover:bg-amber-500/10"
                                    : "text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10"
                                )}
                                aria-label="Seguridad y PIN de acceso"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="rounded-xl text-xs">
                              {collab.has_pin_code
                                ? "Gestionar / Restablecer PIN de seguridad"
                                : "Asignar PIN de seguridad"}
                            </TooltipContent>
                          </Tooltip>

                          {/* Eliminar */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => handleOpenDelete(collab)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer active:scale-95 focus:outline-none"
                                aria-label="Eliminar colaborador"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="rounded-xl text-xs">
                              Eliminar colaborador
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
        <DialogContent className="max-w-2xl sm:max-w-3xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/40 shrink-0">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Alta de Nuevo Colaborador
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {/* Top row: Avatar Invocable Popover + 4 Identity Inputs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-2xl bg-muted/30 border border-border/60">
              <AvatarPickerPopover
                photoUrl={photoUrl}
                firstName={firstName}
                lastName={lastName}
                isUploading={isUploadingPhoto}
                onUpload={(file) => handleUpload(file, false)}
                onRemove={() => setPhotoUrl("")}
                onSelectPreset={(url) => setPhotoUrl(url)}
              />

              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Nombre *
                  </label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ej. Ana"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Apellido *
                  </label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ej. Martínez"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Correo Electrónico
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ana@empresa.com"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+57 300 123 4567"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Perfil de Tareas + Cargo Visible */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
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
                    setCapabilities(resolveCollaboratorCapabilities({ task_role: val }))
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="w-[320px] sm:w-[460px] p-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Columna 1: Equipo Técnico & Producto */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase px-2 py-1 block">
                          Técnico & Producto
                        </span>
                        <SelectItem value="pm" textValue="Gestor de Proyecto" className="text-xs py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>Gestor de Proyecto</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="developer" textValue="Desarrollador" className="text-xs py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Code2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>Desarrollador</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="designer" textValue="Diseñador" className="text-xs py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Palette className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                            <span>Diseñador</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="qa_lead" textValue="QA / Tester" className="text-xs py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>QA / Tester</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="specialist" textValue="Especialista" className="text-xs py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Target className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                            <span>Especialista</span>
                          </div>
                        </SelectItem>
                      </div>

                      {/* Columna 2: Operaciones & Canal Paralelo */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase px-2 py-1 block">
                          Operaciones & Soporte
                        </span>
                        <SelectItem value="operations" textValue="Operaciones" className="text-xs py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Settings2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>Operaciones</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="sales" textValue="Ejecutivo Comercial" className="text-xs py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                            <span>Ejecutivo Comercial</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="consultant" textValue="Consultor Externo" className="text-xs py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                            <span>Consultor Externo</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="observer" textValue="Observador" className="text-xs py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Eye className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span>Observador</span>
                          </div>
                        </SelectItem>
                        <div className="pt-1 mt-1 border-t border-border/40">
                          <SelectItem value="support" textValue="Soporte (Canal Paralelo)" className="text-xs py-1.5 cursor-pointer font-medium text-sky-600 dark:text-sky-400">
                            <div className="flex items-center gap-2">
                              <Headset className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                              <span>Soporte (Canal Paralelo)</span>
                            </div>
                          </SelectItem>
                        </div>
                      </div>
                    </div>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Cargo Visible
                </label>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Ej. Coordinador Senior"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Banners contextuales según rol */}
            {taskRole === "pm" && (
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 shrink-0 text-indigo-500" />
                <div className="leading-tight">
                  <span className="font-bold text-foreground">Portal de Doble Vista Activo:</span>{" "}
                  <span className="text-[11px] text-muted-foreground">
                    Acceso dual a Dashboard Táctico (métricas y sprints de equipo) + Tablero de Gestión.
                  </span>
                </div>
              </div>
            )}
            {taskRole === "qa_lead" && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 text-amber-500" />
                <div className="leading-tight">
                  <span className="font-bold text-foreground">Cola de QA & Validación Activa:</span>{" "}
                  <span className="text-[11px] text-muted-foreground">
                    Acceso prioritario para auditar y validar entregables antes de certificar pasos a producción.
                  </span>
                </div>
              </div>
            )}
            {taskRole === "support" && (
              <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-400 text-xs flex items-center gap-2.5">
                <Headset className="w-4 h-4 shrink-0 text-sky-500" />
                <div className="leading-tight">
                  <span className="font-bold text-foreground">Canal Paralelo de Soporte:</span>{" "}
                  <span className="text-[11px] text-muted-foreground">
                    Reporta incidencias directamente al PM. Excluido de métricas de sprints e integraciones técnicas.
                  </span>
                </div>
              </div>
            )}

            {/* Capacidades & Lentes de Integración (Solo equipo operativo, excluido canal paralelo/soporte) */}
            {taskRole !== "support" && (
              <div className="space-y-2 p-3 rounded-2xl bg-muted/30 border border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-foreground">
                      Capacidades & Lentes de Integración
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary py-0 h-4">
                    RBAC
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Código & Versiones */}
                  <div className="p-2.5 rounded-xl border border-border/50 bg-background/60 hover:bg-background transition-colors flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Code2 className="w-3.5 h-3.5" />
                      </div>
                      <Switch
                        checked={capabilities.vcs_code ?? false}
                        onCheckedChange={(val) => setCapabilities((prev) => ({ ...prev, vcs_code: val }))}
                      />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        Código & Versiones
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight block">
                        Ramas activas, commits, pull requests y pipelines
                      </span>
                    </div>
                  </div>

                  {/* Diseño & UI */}
                  <div className="p-2.5 rounded-xl border border-border/50 bg-background/60 hover:bg-background transition-colors flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="w-6 h-6 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500">
                        <Palette className="w-3.5 h-3.5" />
                      </div>
                      <Switch
                        checked={capabilities.design_preview ?? false}
                        onCheckedChange={(val) => setCapabilities((prev) => ({ ...prev, design_preview: val }))}
                      />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        Diseño & Interfaces
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight block">
                        Previsualizaciones interactivas y especificaciones UI
                      </span>
                    </div>
                  </div>

                  {/* Observabilidad & Telemetría */}
                  <div className="p-2.5 rounded-xl border border-border/50 bg-background/60 hover:bg-background transition-colors flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Eye className="w-3.5 h-3.5" />
                      </div>
                      <Switch
                        checked={capabilities.monitoring ?? false}
                        onCheckedChange={(val) => setCapabilities((prev) => ({ ...prev, monitoring: val }))}
                      />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        Observabilidad & Logs
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight block">
                        Incidentes, trazabilidad técnica y monitoreo
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Espacios de Trabajo y Permisos */}
            <div className="space-y-2.5 p-3 rounded-2xl bg-muted/30 border border-border/60">
              <div className={cn(
                "grid gap-2",
                taskRole === "pm" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
              )}>
                <div className="flex items-center justify-between p-2 rounded-xl bg-background/60 border border-border/50">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-primary" />
                      {taskRole === "support" ? "Reportar a Todos los Espacios" : "Acceso Global a Espacios"}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight block">
                      {taskRole === "support"
                        ? "Permite reportar tickets a cualquier espacio con canal activo"
                        : "Permite gestionar tickets de cualquier área o espacio"}
                    </span>
                  </div>
                  <Switch
                    checked={hasGlobalAccess}
                    onCheckedChange={setHasGlobalAccess}
                  />
                </div>

                {taskRole === "pm" && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-background/60 border border-border/50">
                    <div className="space-y-0.5 pr-2">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        Eliminación en Masa
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight block">
                        Habilita la eliminación en lote de tareas desde la lista
                      </span>
                    </div>
                    <Switch
                      checked={canBulkDelete}
                      onCheckedChange={setCanBulkDelete}
                    />
                  </div>
                )}
              </div>

              {!hasGlobalAccess && (
                <div className="pt-2 border-t border-border/40 space-y-1.5">
                  <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                    <span>Espacios Permitidos ({selectedWorkspaceIds.length} seleccionados):</span>
                    {workspaces.length === 0 && (
                      <span className="text-destructive text-[10px]">No hay espacios creados</span>
                    )}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {workspaces.map((ws) => {
                      const isSelected = selectedWorkspaceIds.includes(ws.id)
                      const isSupportActive = ws.parallel_team_enabled
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
                          {taskRole === "support" && (
                            <span
                              className={cn(
                                "text-[9px] px-1.5 py-0.2 rounded font-medium shrink-0",
                                isSupportActive
                                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {isSupportActive ? "Canal Activo" : "Sin Canal"}
                            </span>
                          )}
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
          </div>

          <DialogFooter className="p-3 sm:p-4 px-5 border-t border-border/40 bg-muted/20 shrink-0 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground hidden sm:inline-block">
              Se autogenerará un enlace de acceso seguro sin contraseña.
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSubmittingCreate}
                className="text-xs h-8 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={isSubmittingCreate}
                className="text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                {isSubmittingCreate ? "Creando..." : "Crear Colaborador"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Edit Collaborator */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl sm:max-w-3xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/40 shrink-0">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Editar Colaborador
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {/* Top row: Avatar Invocable Popover + 4 Identity Inputs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-2xl bg-muted/30 border border-border/60">
              <AvatarPickerPopover
                photoUrl={editPhotoUrl}
                firstName={editFirstName}
                lastName={editLastName}
                isUploading={isUploadingEditPhoto}
                onUpload={(file) => handleUpload(file, true)}
                onRemove={() => setEditPhotoUrl("")}
                onSelectPreset={(url) => setEditPhotoUrl(url)}
              />

              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Nombre *
                  </label>
                  <Input
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="Ej. Ana"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Apellido *
                  </label>
                  <Input
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="Ej. Martínez"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Correo Electrónico
                  </label>
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="ana@empresa.com"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+57 300 123 4567"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Perfil de Tareas + Cargo Visible */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
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
                    setEditCapabilities(resolveCollaboratorCapabilities({ task_role: val }))
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="w-[320px] sm:w-[460px] p-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Columna 1: Equipo Técnico & Producto */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase px-2 py-1 block">
                          Técnico & Producto
                        </span>
                        <SelectItem value="pm" textValue="Gestor de Proyecto" className="text-xs py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>Gestor de Proyecto</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="developer" textValue="Desarrollador" className="text-xs py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Code2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>Desarrollador</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="designer" textValue="Diseñador" className="text-xs py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Palette className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                            <span>Diseñador</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="qa_lead" textValue="QA / Tester" className="text-xs py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>QA / Tester</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="specialist" textValue="Especialista" className="text-xs py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Target className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                            <span>Especialista</span>
                          </div>
                        </SelectItem>
                      </div>

                      {/* Columna 2: Operaciones & Canal Paralelo */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase px-2 py-1 block">
                          Operaciones & Soporte
                        </span>
                        <SelectItem value="operations" textValue="Operaciones" className="text-xs py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Settings2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>Operaciones</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="sales" textValue="Ejecutivo Comercial" className="text-xs py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                            <span>Ejecutivo Comercial</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="consultant" textValue="Consultor Externo" className="text-xs py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                            <span>Consultor Externo</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="observer" textValue="Observador" className="text-xs py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Eye className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span>Observador</span>
                          </div>
                        </SelectItem>
                        <div className="pt-1 mt-1 border-t border-border/40">
                          <SelectItem value="support" textValue="Soporte (Canal Paralelo)" className="text-xs py-1.5 cursor-pointer font-medium text-sky-600 dark:text-sky-400">
                            <div className="flex items-center gap-2">
                              <Headset className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                              <span>Soporte (Canal Paralelo)</span>
                            </div>
                          </SelectItem>
                        </div>
                      </div>
                    </div>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Cargo Visible
                </label>
                <Input
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  placeholder="Ej. Coordinador Senior"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Banners contextuales según rol */}
            {editTaskRole === "pm" && (
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 shrink-0 text-indigo-500" />
                <div className="leading-tight">
                  <span className="font-bold text-foreground">Portal de Doble Vista Activo:</span>{" "}
                  <span className="text-[11px] text-muted-foreground">
                    Acceso dual a Dashboard Táctico (métricas y sprints de equipo) + Tablero de Gestión.
                  </span>
                </div>
              </div>
            )}
            {editTaskRole === "qa_lead" && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 text-amber-500" />
                <div className="leading-tight">
                  <span className="font-bold text-foreground">Cola de QA & Validación Activa:</span>{" "}
                  <span className="text-[11px] text-muted-foreground">
                    Acceso prioritario para auditar y certificar entregables antes de pasos a producción.
                  </span>
                </div>
              </div>
            )}
            {editTaskRole === "support" && (
              <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-400 text-xs flex items-center gap-2.5">
                <Headset className="w-4 h-4 shrink-0 text-sky-500" />
                <div className="leading-tight">
                  <span className="font-bold text-foreground">Canal Paralelo de Soporte:</span>{" "}
                  <span className="text-[11px] text-muted-foreground">
                    Reporta incidencias directamente al PM. Excluido de métricas de sprints e integraciones técnicas.
                  </span>
                </div>
              </div>
            )}

            {/* Capacidades & Lentes de Integración en Edit (Solo si no es support) */}
            {editTaskRole !== "support" && (
              <div className="space-y-2 p-3 rounded-2xl bg-muted/30 border border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-foreground">
                      Capacidades & Lentes de Integración
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary py-0 h-4">
                    RBAC
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Código & Versiones */}
                  <div className="p-2.5 rounded-xl border border-border/50 bg-background/60 hover:bg-background transition-colors flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Code2 className="w-3.5 h-3.5" />
                      </div>
                      <Switch
                        checked={editCapabilities.vcs_code ?? false}
                        onCheckedChange={(val) => setEditCapabilities((prev) => ({ ...prev, vcs_code: val }))}
                      />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        Código & Versiones
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight block">
                        Ramas activas, commits, pull requests y pipelines
                      </span>
                    </div>
                  </div>

                  {/* Diseño & UI */}
                  <div className="p-2.5 rounded-xl border border-border/50 bg-background/60 hover:bg-background transition-colors flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="w-6 h-6 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500">
                        <Palette className="w-3.5 h-3.5" />
                      </div>
                      <Switch
                        checked={editCapabilities.design_preview ?? false}
                        onCheckedChange={(val) => setEditCapabilities((prev) => ({ ...prev, design_preview: val }))}
                      />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        Diseño & Interfaces
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight block">
                        Previsualizaciones interactivas y especificaciones UI
                      </span>
                    </div>
                  </div>

                  {/* Observabilidad & Telemetría */}
                  <div className="p-2.5 rounded-xl border border-border/50 bg-background/60 hover:bg-background transition-colors flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Eye className="w-3.5 h-3.5" />
                      </div>
                      <Switch
                        checked={editCapabilities.monitoring ?? false}
                        onCheckedChange={(val) => setEditCapabilities((prev) => ({ ...prev, monitoring: val }))}
                      />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        Observabilidad & Logs
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight block">
                        Incidentes, trazabilidad técnica y monitoreo
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preferencias de Acceso & Gobernanza */}
            <div className="space-y-2.5 p-3 rounded-2xl bg-muted/30 border border-border/60">
              <div className={cn(
                "grid gap-2",
                editTaskRole === "pm" ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"
              )}>
                {/* Colaborador Activo */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-background/60 border border-border/50">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-semibold text-foreground block">
                      Colaborador Activo
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight block">
                      Acceso al portal y asignación de tareas
                    </span>
                  </div>
                  <Switch
                    checked={editIsActive}
                    onCheckedChange={setEditIsActive}
                  />
                </div>

                {/* Acceso Global */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-background/60 border border-border/50">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-primary" />
                      {editTaskRole === "support" ? "Reportar a Todos los Espacios" : "Acceso Global"}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight block">
                      {editTaskRole === "support"
                        ? "Reportar en cualquier espacio con soporte activo"
                        : "Gestionar proyectos de cualquier área"}
                    </span>
                  </div>
                  <Switch
                    checked={editHasGlobalAccess}
                    onCheckedChange={setEditHasGlobalAccess}
                  />
                </div>

                {/* Si es PM: Eliminación en Masa */}
                {editTaskRole === "pm" && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-background/60 border border-border/50">
                    <div className="space-y-0.5 pr-2">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        Eliminación Masiva
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight block">
                        Permite eliminar lotes de tickets
                      </span>
                    </div>
                    <Switch
                      checked={editCanBulkDelete}
                      onCheckedChange={setEditCanBulkDelete}
                    />
                  </div>
                )}
              </div>

              {!editHasGlobalAccess && (
                <div className="pt-2 border-t border-border/40 space-y-1.5">
                  <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                    <span>Espacios Permitidos ({editSelectedWorkspaceIds.length} seleccionados):</span>
                    {workspaces.length === 0 && (
                      <span className="text-destructive text-[10px]">No hay espacios creados</span>
                    )}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {workspaces.map((ws) => {
                      const isSelected = editSelectedWorkspaceIds.includes(ws.id)
                      const isSupportActive = ws.parallel_team_enabled
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
                          {editTaskRole === "support" && (
                            <span
                              className={cn(
                                "text-[9px] px-1.5 py-0.2 rounded font-medium shrink-0",
                                isSupportActive
                                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {isSupportActive ? "Canal Activo" : "Sin Canal"}
                            </span>
                          )}
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

            {/* Seguridad del Portal (PIN) */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                  PIN de Acceso al Portal
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {editingCollab?.has_pin_code
                    ? "Este colaborador tiene un PIN de 6 dígitos configurado y activo."
                    : "No tiene PIN configurado (acceso directo con enlace)."}
                </span>
              </div>
              {editingCollab?.has_pin_code && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (editingCollab) {
                      handleAdminResetPin(editingCollab.id)
                    }
                  }}
                  disabled={isSubmittingPinAction}
                  className="h-7 text-xs text-rose-600 hover:bg-rose-500/10 border-rose-500/30 cursor-pointer"
                >
                  {isSubmittingPinAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Restablecer PIN"}
                </Button>
              )}
            </div>
          </div>

          <DialogFooter className="p-3 sm:p-4 px-5 border-t border-border/40 bg-muted/20 shrink-0 flex items-center justify-between gap-2">
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
              className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive/60 gap-1.5 px-3 mr-auto cursor-pointer"
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
                className="text-xs h-8 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleUpdate}
                disabled={isSubmittingEdit}
                className="text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                {isSubmittingEdit ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </DialogFooter>
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

      {/* Modal: Gestionar Seguridad y PIN del Colaborador */}
      <Dialog open={isSecurityModalOpen} onOpenChange={setIsSecurityModalOpen}>
        <DialogContent className="max-w-md w-full p-6 rounded-3xl bg-card border border-border/80 shadow-2xl">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-2">
              <KeyRound className="w-6 h-6" />
            </div>
            <DialogTitle className="text-base font-bold">
              Seguridad y PIN de Acceso
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {selectedCollabForSecurity?.first_name} {selectedCollabForSecurity?.last_name} ({selectedCollabForSecurity?.role})
            </p>
          </DialogHeader>

          <div className="py-3 space-y-4">
            {/* Estado actual */}
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {selectedCollabForSecurity?.has_pin_code ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                )}
                <div className="text-left">
                  <span className="text-xs font-semibold text-foreground block">
                    {selectedCollabForSecurity?.has_pin_code
                      ? "PIN de 6 dígitos activo"
                      : "Sin PIN configurado"}
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    {selectedCollabForSecurity?.has_pin_code
                      ? "El portal requiere PIN para acceder."
                      : "El portal es de acceso directo con el enlace."}
                  </span>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-2 py-0.5 font-bold",
                  selectedCollabForSecurity?.has_pin_code
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                )}
              >
                {selectedCollabForSecurity?.has_pin_code ? "Protegido" : "Público"}
              </Badge>
            </div>

            {/* Restablecer PIN (si tiene PIN activo) */}
            {selectedCollabForSecurity?.has_pin_code && (
              <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                <div className="text-left">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">
                    Restablecer PIN (Quitar Bloqueo)
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Si el colaborador olvidó su PIN, restablecerlo eliminará la clave y le permitirá acceder directamente y configurar uno nuevo.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => selectedCollabForSecurity && handleAdminResetPin(selectedCollabForSecurity.id)}
                  disabled={isSubmittingPinAction}
                  className="w-full h-9 rounded-xl border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingPinAction ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Restablecer y Eliminar PIN Actual</span>
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Asignar un PIN nuevo manual */}
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-2 text-left">
              <span className="text-xs font-bold text-foreground block">
                {selectedCollabForSecurity?.has_pin_code
                  ? "Asignar un nuevo PIN temporal"
                  : "Asignar un PIN de 6 dígitos"}
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Ingresa 6 dígitos numéricos si deseas asignarle manualmente un PIN al colaborador:
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  maxLength={6}
                  value={customTempPin}
                  onChange={(e) => setCustomTempPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Ej: 123456"
                  className="h-9 text-xs font-mono font-bold tracking-widest text-center"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => selectedCollabForSecurity && handleAdminSetPin(selectedCollabForSecurity.id)}
                  disabled={customTempPin.length !== 6 || isSubmittingPinAction}
                  className="h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shrink-0 cursor-pointer"
                >
                  {isSubmittingPinAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Guardar"}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSecurityModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
