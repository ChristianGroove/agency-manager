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
} from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import type { TaskCollaborator, CollaboratorRole } from "../../types"
import {
  createCollaborator,
  updateCollaborator,
  uploadCollaboratorAvatar,
} from "../../actions/task-actions"
import { toast } from "sonner"
import { TASK_PACK_AVATARS, getCollaboratorAvatar } from "../../utils/avatar-presets"

interface TaskCollaboratorsManagerProps {
  collaborators: TaskCollaborator[]
  onCollaboratorCreated?: (collab: TaskCollaborator) => void
  onCollaboratorUpdated?: (collab: TaskCollaborator) => void
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
  onCollaboratorCreated,
  onCollaboratorUpdated,
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
  const [editIsActive, setEditIsActive] = useState<boolean>(true)
  const [isUploadingEditPhoto, setIsUploadingEditPhoto] = useState(false)
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

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
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        {getRoleIcon(collab.role)}
                        <span>{collab.role}</span>
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

            <DialogFooter className="gap-2 pt-2">
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
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
