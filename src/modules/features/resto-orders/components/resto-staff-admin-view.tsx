"use client"

import React, { useState, useEffect } from "react"
import QRCode from "react-qr-code"
import { Users, Plus, QrCode, Copy, Check, Shield, MapPin, RefreshCw, Star, Trash2, Phone, KeyRound, Loader2, Power, ShieldAlert } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { toast } from "sonner"
import { supabase } from "@/modules/core/database/supabase"

import {
    getStaffWithZoneAssignments,
    createStaffMember,
    toggleStaffZoneAssignment,
    updateStaffPin,
    toggleStaffActiveStatus,
    regenerateStaffToken,
    deleteStaffMember
} from "@/modules/features/resto-orders/actions/resto-staff-actions"

const ROLE_CONFIG: Record<string, { label: string; bg: string; iconColor: string }> = {
    waiter: {
        label: "Mesero",
        bg: "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800",
        iconColor: "text-sky-600 dark:text-sky-400"
    },
    mesero: {
        label: "Mesero",
        bg: "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800",
        iconColor: "text-sky-600 dark:text-sky-400"
    },
    cajero: {
        label: "Cajero",
        bg: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800",
        iconColor: "text-emerald-600 dark:text-emerald-400"
    },
    host: {
        label: "Host / Anfitrión",
        bg: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800",
        iconColor: "text-indigo-600 dark:text-indigo-400"
    },
    bartender: {
        label: "Bartender",
        bg: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800",
        iconColor: "text-amber-600 dark:text-amber-400"
    },
    cocinero: {
        label: "Cocinero / Chef",
        bg: "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200/80 dark:border-orange-800",
        iconColor: "text-orange-600 dark:text-orange-400"
    }
}

interface RestoStaffAdminViewProps {
    orgId: string
    zones: any[]
    isCreateOpen?: boolean
    onCloseCreate?: () => void
}

export function RestoStaffAdminView({ orgId, zones, isCreateOpen, onCloseCreate }: RestoStaffAdminViewProps) {
    const [staffList, setStaffList] = useState<any[]>([])
    const [assignments, setAssignments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [internalShowCreateModal, setInternalShowCreateModal] = useState(false)

    const showCreateModal = isCreateOpen !== undefined ? isCreateOpen : internalShowCreateModal
    const handleCloseCreateModal = () => {
        setInternalShowCreateModal(false)
        if (onCloseCreate) onCloseCreate()
    }
    const handleOpenCreateModal = () => {
        setInternalShowCreateModal(true)
    }

    const [showQrModal, setShowQrModal] = useState<any | null>(null)
    const [copied, setCopied] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form State
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [role, setRole] = useState("waiter")
    const [phone, setPhone] = useState("")
    const [pinCode, setPinCode] = useState("")

    // Inline PIN Editing State
    const [editingPinStaffId, setEditingPinStaffId] = useState<string | null>(null)
    const [editingPinValue, setEditingPinValue] = useState("")
    const [savingPin, setSavingPin] = useState(false)

    const handleStartEditPin = (staffId: string, currentPin: string) => {
        setEditingPinStaffId(staffId)
        setEditingPinValue(currentPin || "")
    }

    const handleSavePin = async (staffId: string) => {
        if (!editingPinValue.trim()) return
        setSavingPin(true)
        try {
            const res = await updateStaffPin(orgId, staffId, editingPinValue)
            if (!res.success) {
                toast.error(res.error || "Error al actualizar PIN")
                return
            }
            toast.success("PIN de tablet actualizado correctamente")
            setEditingPinStaffId(null)
            await fetchStaffData()
        } catch (e: any) {
            console.error(e)
            toast.error("Error al actualizar PIN")
        } finally {
            setSavingPin(false)
        }
    }

    const handleToggleActive = async (staffId: string, currentIsActive: boolean) => {
        try {
            const res = await toggleStaffActiveStatus(orgId, staffId, currentIsActive)
            if (!res.success) throw new Error(res.error)
            toast.success(currentIsActive ? "Acceso de colaborador desactivado (Bloqueado)" : "Acceso de colaborador activado")
            await fetchStaffData()
        } catch (e: any) {
            toast.error(e.message || "Error al cambiar estado")
        }
    }

    const handleRegenerateToken = async (staffId: string, name: string) => {
        if (!confirm(`¿Regenerar el enlace y código QR de ${name}? El enlace o foto anterior quedará invalidado inmediatamente.`)) return
        try {
            const res = await regenerateStaffToken(orgId, staffId)
            if (!res.success) throw new Error(res.error)
            toast.success("Token y Código QR regenerados. El acceso anterior ya no funciona.")
            await fetchStaffData()
        } catch (e: any) {
            toast.error(e.message || "Error al regenerar token")
        }
    }

    const handleDeleteStaff = async (staffId: string, name: string) => {
        if (!confirm(`¿Eliminar definitivamente a ${name}? Esta acción eliminará su registro.`)) return
        try {
            const res = await deleteStaffMember(orgId, staffId)
            if (!res.success) throw new Error(res.error)
            toast.success("Colaborador eliminado correctamente")
            await fetchStaffData()
        } catch (e: any) {
            toast.error(e.message || "Error al eliminar colaborador")
        }
    }

    const fetchStaffData = async () => {
        setLoading(true)
        try {
            const res = await getStaffWithZoneAssignments(orgId)
            if (res.success) {
                setStaffList(res.staffList)
                setAssignments(res.assignments)
            } else {
                toast.error(res.error || "Error al cargar colaboradores")
            }
        } catch (e) {
            console.error("Error loading staff data:", e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (orgId) fetchStaffData()
    }, [orgId])

    const handleCreateStaff = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!firstName.trim()) {
            toast.error("Ingresa el nombre del colaborador")
            return
        }

        setSaving(true)
        try {
            const res = await createStaffMember(orgId, {
                firstName,
                lastName,
                role,
                phone,
                pinCode
            })

            if (!res.success) throw new Error(res.error)

            toast.success(`Colaborador ${firstName} creado con éxito`)
            handleCloseCreateModal()
            setFirstName("")
            setLastName("")
            setRole("waiter")
            setPhone("")
            setPinCode("")
            fetchStaffData()
            if (res.staff) setShowQrModal(res.staff)
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Error al crear colaborador")
        } finally {
            setSaving(false)
        }
    }

    const handleToggleZoneAssignment = async (staffId: string, zoneId: string, isAssigned: boolean) => {
        try {
            const res = await toggleStaffZoneAssignment(orgId, staffId, zoneId, isAssigned)
            if (!res.success) {
                toast.error(res.error || "Error al actualizar zona")
                return
            }

            if (isAssigned) {
                toast.info("Zona removida del colaborador")
            } else {
                toast.success("Zona asignada al colaborador")
            }
            await fetchStaffData()
        } catch (e: any) {
            console.error(e)
            toast.error("Error al actualizar zona")
        }
    }

    const handleCopyPortalLink = (token: string) => {
        const portalUrl = `${window.location.origin}/portal/${token}`
        navigator.clipboard.writeText(portalUrl)
        setCopied(true)
        toast.success("Enlace del portal copiado al portapapeles")
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="space-y-6">
            {/* Info Banner: Multi-Device Modes */}
            <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-sky-900 dark:text-sky-200">
                <div className="flex items-start gap-2.5">
                    <KeyRound className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold block text-sm">Modalidades de Acceso Operativo</span>
                        <span><strong>1. Celular Personal:</strong> Cada colaborador escanea su QR o ingresa con su enlace único sin contraseñas.<br/><strong>2. Tablet POS Compartida:</strong> En estaciones de trabajo compartidas, digitan su PIN de 4 dígitos para alternar de usuario en 1 segundo.</span>
                    </div>
                </div>
            </div>

            {/* Content List */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
                </div>
            ) : staffList.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
                    <Users className="w-12 h-12 text-zinc-400" />
                    <h3 className="font-bold text-zinc-900 dark:text-white text-base">Sin Colaboradores Registrados</h3>
                    <p className="text-xs text-zinc-500 max-w-sm">
                        Agrega personal de sala, barra o caja para asignarles zonas de atención y enlaces a su portal.
                    </p>
                    <button
                        onClick={handleOpenCreateModal}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 shadow-md cursor-pointer transition-colors"
                    >
                        Crear Primer Colaborador
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staffList.map((member) => {
                        const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim()
                        const staffAssignments = assignments.filter(a => a.staff_id === member.id)
                        const assignedZoneIds = staffAssignments.map(a => a.zone_id)
                        const roleInfo = ROLE_CONFIG[member.role] || ROLE_CONFIG.waiter

                        return (
                            <div
                                key={member.id}
                                className={cn(
                                    "bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between transition-all",
                                    member.is_active === false
                                        ? "opacity-60 border-red-200 dark:border-red-950/60 bg-red-50/20 dark:bg-red-950/10"
                                        : "border-zinc-200/80 dark:border-zinc-800"
                                )}
                            >
                                <div className="space-y-3">
                                    {/* Staff info */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-bold flex items-center justify-center text-sm border border-slate-200/80 dark:border-zinc-700">
                                                {fullName.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-base text-zinc-900 dark:text-white leading-tight flex items-center gap-2">
                                                    {fullName}
                                                    {member.is_active === false && (
                                                        <span className="text-[10px] font-black text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/80 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900">
                                                            Bloqueado
                                                        </span>
                                                    )}
                                                </h3>
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border mt-0.5",
                                                    roleInfo.bg
                                                )}>
                                                    <Shield className="w-3 h-3" />
                                                    {roleInfo.label}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setShowQrModal(member)}
                                            className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700"
                                            title="Ver Código QR y Enlace de Acceso"
                                        >
                                            <QrCode className="w-4 h-4 text-sky-500" />
                                        </button>
                                    </div>

                                    {/* Additional info */}
                                    <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
                                        {member.phone && (
                                            <div className="flex items-center gap-1.5">
                                                <Phone className="w-3.5 h-3.5 text-zinc-400" />
                                                <span>{member.phone}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60 w-fit">
                                            <KeyRound className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                            {editingPinStaffId === member.id ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="text"
                                                        maxLength={6}
                                                        value={editingPinValue}
                                                        onChange={(e) => setEditingPinValue(e.target.value)}
                                                        className="w-16 px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border border-sky-400 text-xs font-bold font-mono outline-none text-zinc-900 dark:text-white"
                                                        placeholder="PIN"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => handleSavePin(member.id)}
                                                        disabled={savingPin}
                                                        className="p-1 rounded bg-sky-500 text-white hover:bg-sky-600 font-bold"
                                                        title="Guardar PIN"
                                                    >
                                                        {savingPin ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    <span>PIN Tablet POS: <strong>{member.pin_code || '----'}</strong></span>
                                                    <button
                                                        onClick={() => handleStartEditPin(member.id, member.pin_code)}
                                                        className="text-zinc-400 hover:text-sky-500 transition-colors ml-1"
                                                        title="Editar PIN de Tablet"
                                                    >
                                                        ✎
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Zone Assignment Picker */}
                                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
                                        <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-sky-500" />
                                            Zonas Asignadas ({staffAssignments.length})
                                        </span>

                                        <div className="flex flex-wrap gap-1.5">
                                            {zones.map((zone) => {
                                                const isAssigned = assignedZoneIds.includes(zone.id)
                                                return (
                                                    <button
                                                        key={zone.id}
                                                        onClick={() => handleToggleZoneAssignment(member.id, zone.id, isAssigned)}
                                                        className={cn(
                                                            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                                                            isAssigned
                                                                ? "bg-[#00aeef] text-white border-[#00aeef] shadow-xs"
                                                                : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-[#00aeef]"
                                                        )}
                                                    >
                                                        {zone.name} {isAssigned ? '✓' : '+'}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                    <button
                                        onClick={() => handleCopyPortalLink(member.access_token)}
                                        className="flex items-center gap-1.5 text-xs font-bold text-sky-500 hover:underline cursor-pointer"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        Copiar Enlace
                                    </button>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleRegenerateToken(member.id, fullName)}
                                            className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                                            title="Regenerar Código QR y Enlace (Revoca el acceso anterior de inmediato)"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleToggleActive(member.id, member.is_active !== false)}
                                            className={cn(
                                                "p-1.5 rounded-lg border transition-colors cursor-pointer",
                                                member.is_active === false
                                                    ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/50"
                                                    : "text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/50"
                                            )}
                                            title={member.is_active === false ? "Activar Acceso" : "Desactivar Acceso (Bloquear temporalmente)"}
                                        >
                                            <Power className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteStaff(member.id, fullName)}
                                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                                            title="Eliminar Colaborador"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Create Staff Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={handleCloseCreateModal}>
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-lg text-zinc-900 dark:text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-sky-500" />
                                Crear Nuevo Colaborador
                            </h3>
                            <button onClick={handleCloseCreateModal} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white">✕</button>
                        </div>

                        <form onSubmit={handleCreateStaff} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Nombre *</label>
                                    <input
                                        type="text"
                                        required
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Ej. Carlos"
                                        className="w-full px-3 py-2 rounded-xl text-sm border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-sky-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Apellido</label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Ej. Mendoza"
                                        className="w-full px-3 py-2 rounded-xl text-sm border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-sky-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Rol</label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl text-sm border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-sky-500"
                                    >
                                        <option value="waiter">Mesero / Mesera</option>
                                        <option value="cajero">Cajero / Cobranza</option>
                                        <option value="host">Host / Anfitrión</option>
                                        <option value="bartender">Bartender / Barista</option>
                                        <option value="cocinero">Cocinero / Chef</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">PIN Tablet POS (4 dígitos)</label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={pinCode}
                                        onChange={(e) => setPinCode(e.target.value)}
                                        placeholder="Ej. 1234"
                                        className="w-full px-3 py-2 rounded-xl text-sm font-mono border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-sky-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Teléfono (opcional)</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+57 300 000 0000"
                                    className="w-full px-3 py-2 rounded-xl text-sm border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-sky-500"
                                />
                            </div>

                            <div className="pt-3 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={handleCloseCreateModal}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 rounded-xl text-xs font-black text-white bg-sky-500 hover:bg-sky-600 shadow-md shadow-sky-500/20"
                                >
                                    {saving ? 'Guardando...' : 'Crear y Generar Portal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QR & Token Modal */}
            {showQrModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => setShowQrModal(null)}>
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-sm w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-base text-zinc-900 dark:text-white">
                                Acceso Portal Operativo
                            </h3>
                            <button onClick={() => setShowQrModal(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white">✕</button>
                        </div>

                        <div className="space-y-1">
                            <div className="font-bold text-lg text-zinc-900 dark:text-white">
                                {showQrModal.first_name} {showQrModal.last_name}
                            </div>
                            <span className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border",
                                (ROLE_CONFIG[showQrModal.role] || ROLE_CONFIG.waiter).bg
                            )}>
                                {(ROLE_CONFIG[showQrModal.role] || ROLE_CONFIG.waiter).label}
                            </span>
                        </div>

                        {/* Rendered QR Code */}
                        <div className="p-4 bg-white rounded-2xl inline-block border border-zinc-200 shadow-md mx-auto">
                            <QRCode
                                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${showQrModal.access_token}`}
                                size={180}
                            />
                        </div>

                        <p className="text-xs text-zinc-500">
                            Escanea este código desde el teléfono del colaborador para ingresar a su portal directo sin contraseñas.
                        </p>

                        <div className="pt-2">
                            <button
                                onClick={() => handleCopyPortalLink(showQrModal.access_token)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-sky-500 hover:bg-sky-600 shadow-md cursor-pointer transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? '¡Enlace Copiado!' : 'Copiar Enlace para Compartir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
