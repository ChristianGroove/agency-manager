"use client"

import { useState, useEffect } from "react"
import { Emitter } from "@/types/billing"
import { getEmitters, createEmitter, updateEmitter } from "@/lib/actions/emitters"
import { calculateDV, getEmitterDocumentType, getDocumentTypeLabel } from "@/lib/billing-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus, Building2, User, Check, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"

export function EmittersSettings() {
    const [emitters, setEmitters] = useState<Emitter[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingEmitter, setEditingEmitter] = useState<Partial<Emitter> | null>(null)
    const [saving, setSaving] = useState(false)

    const fetchEmitters = async () => {
        setLoading(true)
        const data = await getEmitters()
        setEmitters(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchEmitters()
    }, [])

    const handleOpenModal = (emitter?: Emitter) => {
        if (emitter) {
            setEditingEmitter(emitter)
        } else {
            setEditingEmitter({
                emitter_type: 'NATURAL',
                identification_type: 'CC', // Default for Natural
                identification_number: '',
                display_name: '',
                legal_name: '',
                allowed_document_types: ['CUENTA_DE_COBRO'],
                is_active: true,
                is_default: emitters.length === 0
            })
        }
        setIsModalOpen(true)
    }

    const handleTypeChange = (type: 'NATURAL' | 'JURIDICO') => {
        setEditingEmitter(prev => {
            if (!prev) return null
            const newDocType = getEmitterDocumentType(type)
            return {
                ...prev,
                emitter_type: type,
                identification_type: type === 'NATURAL' ? 'CC' : 'NIT', // Reset ID type
                allowed_document_types: [newDocType]
            }
        })
    }

    const handleNitChange = (value: string) => {
        // Allow only numbers
        const cleanVal = value.replace(/[^0-9]/g, '')
        const dv = calculateDV(cleanVal)

        setEditingEmitter(prev => ({
            ...prev!,
            identification_number: cleanVal,
            verification_digit: dv
        }))
    }

    const handleSave = async () => {
        if (!editingEmitter?.display_name && !editingEmitter?.legal_name) {
            toast.error("El nombre es requerido")
            return
        }
        if (!editingEmitter?.identification_number) {
            toast.error("El número de identificación es requerido")
            return
        }

        if (editingEmitter.emitter_type === 'JURIDICO' && !editingEmitter.legal_name) {
            toast.error("La Razón Social es obligatoria para empresas")
            return
        }

        setSaving(true)
        try {
            // Re-enforce strict rules before sending
            const docType = getEmitterDocumentType(editingEmitter.emitter_type!)

            const payload: any = {
                ...editingEmitter,
                allowed_document_types: [docType]
            }

            // Cleanup invalid fields based on type
            if (payload.emitter_type === 'NATURAL') {
                delete payload.verification_digit // Natural should not have DV
                // For Natural, legal_name often matches display_name or full name.
                // If legal_name is empty, fallback to display_name
                if (!payload.legal_name) payload.legal_name = payload.display_name
                if (!payload.display_name) payload.display_name = payload.legal_name
            } else {
                // For Juridica
                if (!payload.display_name) payload.display_name = payload.legal_name
            }

            if (payload.id) {
                const { data: updated, error } = await updateEmitter(payload.id, payload)
                if (error) throw new Error(error)

                toast.success("Emisor actualizado correctamente")
                // Optimistic update
                setEmitters(prev => prev.map(e => e.id === updated.id ? updated : e))
            } else {
                const { data: created, error } = await createEmitter(payload)
                if (error) throw new Error(error)

                toast.success("Emisor creado correctamente")
                // Optimistic update
                setEmitters(prev => [created, ...prev])
            }

            setIsModalOpen(false)
        } catch (error) {
            console.error(error)
            toast.error("Error al guardar: " + (error as any).message)
        } finally {
            setSaving(false)
        }
    }

    const handleSetDefault = async (emitter: Emitter) => {
        if (!emitter.is_active) {
            toast.error("El emisor debe estar activo para ser defecto")
            return
        }
        await updateEmitter(emitter.id, { is_default: true })
        fetchEmitters()
    }

    if (loading) return <div className="p-4"><Loader2 className="animate-spin" /></div>

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Emisores de Facturación</CardTitle>
                    <CardDescription>Configura las entidades que emiten los documentos.</CardDescription>
                </div>
                <Button onClick={() => handleOpenModal()} size="sm">
                    <Plus className="h-4 w-4 mr-2" /> Nuevo Emisor
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {emitters.map(emitter => (
                        <div key={emitter.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-full ${emitter.emitter_type === 'JURIDICO' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                    {emitter.emitter_type === 'JURIDICO' ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium">{emitter.display_name}</p>
                                        {emitter.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
                                        {!emitter.is_active && <Badge variant="destructive" className="text-xs">Inactivo</Badge>}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {emitter.identification_type} {emitter.identification_number}
                                        {emitter.verification_digit ? `-${emitter.verification_digit}` : ''}
                                        Files • {emitter.legal_name}
                                    </p>
                                    <div className="flex gap-2 mt-1">
                                        <Badge variant="outline" className="text-[10px] font-normal">
                                            {getDocumentTypeLabel(emitter.allowed_document_types[0])}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleOpenModal(emitter)}>Editar</Button>
                                {!emitter.is_default && (
                                    <Button variant="ghost" size="sm" onClick={() => handleSetDefault(emitter)} title="Hacer Default">
                                        <Check className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}

                    {emitters.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                            No hay emisores configurados. Crea uno para comenzar.
                        </div>
                    )}
                </div>
            </CardContent>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{editingEmitter?.id ? 'Editar Emisor' : 'Nuevo Emisor'}</DialogTitle>
                        <DialogDescription>
                            Configura los datos fiscales. El tipo de documento se asigna automáticamente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        {/* TYPE SELECTOR */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo de Persona</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={editingEmitter?.emitter_type}
                                    onChange={(e) => handleTypeChange(e.target.value as any)}
                                >
                                    <option value="NATURAL">Persona Natural</option>
                                    <option value="JURIDICO">Persona Jurídica (Empresa)</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label>Documento a Emitir</Label>
                                <div className="h-10 px-3 py-2 border rounded-md bg-muted text-sm font-medium text-foreground/80 flex items-center">
                                    {getDocumentTypeLabel(getEmitterDocumentType(editingEmitter?.emitter_type || 'NATURAL'))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 border-t pt-4">
                            {editingEmitter?.emitter_type === 'NATURAL' ? (
                                /* NATURAL PERSON FORM */
                                <>
                                    <div className="space-y-2">
                                        <Label>Nombre Completo (Legal y Visible)</Label>
                                        <Input
                                            value={editingEmitter?.display_name || ''}
                                            onChange={(e) => setEditingEmitter(prev => ({
                                                ...prev!,
                                                display_name: e.target.value,
                                                legal_name: e.target.value // Sync legal name for Natural
                                            }))}
                                            placeholder="Ej: Juan Pérez"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Tipo ID</Label>
                                            <select
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={editingEmitter?.identification_type}
                                                onChange={(e) => setEditingEmitter(prev => ({ ...prev!, identification_type: e.target.value }))}
                                            >
                                                <option value="CC">Cédula (CC)</option>
                                                <option value="CE">Cédula Extranjería (CE)</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <Label>Número de Identificación</Label>
                                            <Input
                                                value={editingEmitter?.identification_number || ''}
                                                onChange={(e) => setEditingEmitter(prev => ({ ...prev!, identification_number: e.target.value }))}
                                                placeholder="Ej: 80.123.456"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* JURIDICA FORM */
                                <>
                                    <div className="space-y-2">
                                        <Label>Razón Social (Legal)</Label>
                                        <Input
                                            value={editingEmitter?.legal_name || ''}
                                            onChange={(e) => setEditingEmitter(prev => ({ ...prev!, legal_name: e.target.value }))}
                                            placeholder="Ej: Tech Solutions S.A.S"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Nombre Comercial (Opcional)</Label>
                                        <Input
                                            value={editingEmitter?.display_name || ''}
                                            onChange={(e) => setEditingEmitter(prev => ({ ...prev!, display_name: e.target.value }))}
                                            placeholder="Ej: Tech Solutions (Si es diferente)"
                                        />
                                        <p className="text-xs text-muted-foreground">Si se deja vacío, se usará la Razón Social.</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Tipo ID</Label>
                                            <div className="h-10 px-3 py-2 border rounded-md bg-muted text-sm flex items-center">
                                                NIT
                                            </div>
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <Label>Número NIT (Sin DV)</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={editingEmitter?.identification_number || ''}
                                                    onChange={(e) => handleNitChange(e.target.value)}
                                                    placeholder="900123456"
                                                    className="flex-1"
                                                />
                                                <div className="w-16">
                                                    <div className="h-10 px-3 py-2 border rounded-md bg-muted text-center text-sm font-mono">
                                                        {editingEmitter?.verification_digit || '-'}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground">El dígito de verificación se calcula automáticamente.</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingEmitter?.id ? 'Actualizar' : 'Crear Emisor'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
