"use client"

import React, { useState, useEffect } from "react"
import QRCode from "react-qr-code"
import { Users, Plus, QrCode, Copy, Check, Shield, MapPin, RefreshCw, Star, Trash2, Phone, KeyRound, Loader2 } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { toast } from "sonner"
import { supabase } from "@/modules/core/database/supabase"

import {
    getStaffWithZoneAssignments,
    createStaffMember,
    toggleStaffZoneAssignment
} from "@/modules/features/resto-orders/actions/resto-staff-actions"

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
                toast.info("Zona removida del mesero")
            } else {
                toast.success("Zona asignada al mesero")
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
        toast.success("Enlace del portal del mesero copiado al portapapeles")
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="space-y-6">
            {/* Content List */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-6 h-6 text-brand-pink animate-spin" />
                </div>
            ) : staffList.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
                    <Users className="w-12 h-12 text-zinc-400" />
                    <h3 className="font-bold text-zinc-900 dark:text-white text-base">Sin Colaboradores Registrados</h3>
                    <p className="text-xs text-zinc-500 max-w-sm">
                        Agrega meseros y personal de servicio para asignarles zonas y permitirles ver sus mesas y propinas.
                    </p>
                    <button
                        onClick={handleOpenCreateModal}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-pink shadow-md cursor-pointer"
                    >
                        Crear Primer Mesero
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staffList.map((member) => {
                        const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim()
                        const staffAssignments = assignments.filter(a => a.staff_id === member.id)
                        const assignedZoneIds = staffAssignments.map(a => a.zone_id)

                        return (
                            <div
                                key={member.id}
                                className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between"
                            >
                                <div className="space-y-3">
                                    {/* Staff info */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-pink to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                                                {fullName.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-base text-zinc-900 dark:text-white leading-tight">
                                                    {fullName}
                                                </h3>
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full capitalize">
                                                    <Shield className="w-3 h-3" />
                                                    {member.role || 'waiter'}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setShowQrModal(member)}
                                            className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700"
                                            title="Ver Código QR y Enlace de Acceso"
                                        >
                                            <QrCode className="w-4 h-4 text-brand-pink" />
                                        </button>
                                    </div>

                                    {/* Additional info */}
                                    <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
                                        {member.phone && (
                                            <div className="flex items-center gap-1.5">
                                                <Phone className="w-3.5 h-3.5" />
                                                <span>{member.phone}</span>
                                            </div>
                                        )}
                                        {member.pin_code && (
                                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
                                                <KeyRound className="w-3.5 h-3.5" />
                                                <span>PIN Tablet: {member.pin_code}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Zone Assignment Picker */}
                                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
                                        <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-brand-pink" />
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
                                                                ? "bg-brand-pink text-white border-brand-pink shadow-xs"
                                                                : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-brand-pink"
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
                                        className="flex items-center gap-1.5 text-xs font-bold text-brand-pink hover:underline"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        Copiar Enlace Portal
                                    </button>
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
                                <Users className="w-5 h-5 text-brand-pink" />
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
                                        className="w-full px-3 py-2 rounded-xl text-sm border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-brand-pink"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Apellido</label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Ej. Mendoza"
                                        className="w-full px-3 py-2 rounded-xl text-sm border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-brand-pink"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Rol</label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl text-sm border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-brand-pink capitalize"
                                    >
                                        <option value="waiter">Mesero / Mesera</option>
                                        <option value="bartender">Bartender / Barista</option>
                                        <option value="host">Host / Anfitrión</option>
                                        <option value="cajero">Cajero</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">PIN Tablet (4 dígitos)</label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={pinCode}
                                        onChange={(e) => setPinCode(e.target.value)}
                                        placeholder="Ej. 1234"
                                        className="w-full px-3 py-2 rounded-xl text-sm font-mono border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-brand-pink"
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
                                    className="w-full px-3 py-2 rounded-xl text-sm border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-brand-pink"
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
                                    className="px-5 py-2 rounded-xl text-xs font-black text-white bg-brand-pink hover:opacity-90 shadow-md shadow-brand-pink/20"
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
                                Acceso Portal de Mesero
                            </h3>
                            <button onClick={() => setShowQrModal(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white">✕</button>
                        </div>

                        <div className="space-y-1">
                            <div className="font-bold text-lg text-zinc-900 dark:text-white">
                                {showQrModal.first_name} {showQrModal.last_name}
                            </div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 capitalize">
                                {showQrModal.role || 'waiter'}
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
                            Escanea este código desde el celular del mesero para ingresar a su portal directo sin contraseñas.
                        </p>

                        <div className="pt-2">
                            <button
                                onClick={() => handleCopyPortalLink(showQrModal.access_token)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-brand-pink hover:opacity-90 shadow-md shadow-brand-pink/20 cursor-pointer"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? '¡Enlace Copiado!' : 'Copiar Enlace para WhatsApp'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
