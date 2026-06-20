"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, GripVertical, Check, Copy, CreditCard, Banknote, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod } from "./payment-methods-actions"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

export function PaymentMethodsManager() {
    const [methods, setMethods] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form State
    const [title, setTitle] = useState("")
    const [type, setType] = useState<"MANUAL" | "GATEWAY">("MANUAL")
    const [details, setDetails] = useState<any>({})
    const [instructions, setInstructions] = useState("")

    useEffect(() => {
        loadMethods()
    }, [])

    const loadMethods = async () => {
        setLoading(true)
        const data = await getPaymentMethods()
        setMethods(data || [])
        setLoading(false)
    }

    const resetForm = () => {
        setEditingId(null)
        setTitle("")
        setType("MANUAL")
        setDetails({})
        setInstructions("")
    }

    const openEdit = (method: any) => {
        setEditingId(method.id)
        setTitle(method.title)
        setType(method.type)
        setDetails(method.details || {})
        setInstructions(method.instructions || "")
        setIsDialogOpen(true)
    }

    const handleSave = async () => {
        if (!title) return toast.error("El nombre es requerido")

        // Clean details based on type
        const finalDetails = { ...details }
        if (type === 'MANUAL') {
            // Ensure account number is saved
        }

        try {
            if (editingId) {
                await updatePaymentMethod(editingId, {
                    title,
                    type,
                    details: finalDetails,
                    instructions
                })
                toast.success("Método actualizado")
            } else {
                await createPaymentMethod({
                    title,
                    type,
                    details: finalDetails,
                    instructions
                })
                toast.success("Método creado")
            }
            setIsDialogOpen(false)
            loadMethods()
            resetForm()
        } catch (error) {
            console.error(error)
            toast.error("Error al guardar")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este método de pago?")) return
        try {
            await deletePaymentMethod(id)
            toast.success("Método eliminado")
            loadMethods()
        } catch (error) {
            toast.error("Error al eliminar")
        }
    }

    const handleToggleActive = async (id: string, current: boolean) => {
        try {
            await updatePaymentMethod(id, { is_active: !current })
            setMethods(prev => prev.map(m => m.id === id ? { ...m, is_active: !current } : m))
        } catch (error) {
            toast.error("Error al actualizar estado")
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Métodos de Pago Manuales</CardTitle>
                    <CardDescription>
                        Configura las opciones que verán tus clientes al dar clic en "Pagar".
                    </CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) resetForm()
                }}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Agregar Método
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{editingId ? "Editar Método" : "Nuevo Método de Pago"}</DialogTitle>
                            <DialogDescription>
                                Agrega cuentas bancarias, billeteras digitales (Nequi/Daviplata) o instrucciones de efectivo.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Nombre</Label>
                                <Input
                                    className="col-span-3"
                                    placeholder="Ej: Bancolombia Ahorros"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Tipo</Label>
                                <Select value={type} onValueChange={(v: any) => setType(v)}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MANUAL">Transferencia / Manual</SelectItem>
                                        <SelectItem value="GATEWAY">Pasarela (Link Externo)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {type === 'MANUAL' && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Número de Cuenta</Label>
                                    <Input
                                        className="col-span-3 font-mono"
                                        placeholder="000-000-0000"
                                        value={details.account_number || ''}
                                        onChange={e => setDetails({ ...details, account_number: e.target.value })}
                                    />
                                </div>
                            )}

                            {type === 'GATEWAY' && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Link de Pago</Label>
                                    <Input
                                        className="col-span-3"
                                        placeholder="https://..."
                                        value={details.payment_link || ''}
                                        onChange={e => setDetails({ ...details, payment_link: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-4 gap-4">
                                <Label className="text-right pt-2">Instrucciones</Label>
                                <Textarea
                                    className="col-span-3"
                                    placeholder="Ej: Enviar comprobante al WhatsApp..."
                                    value={instructions}
                                    onChange={e => setInstructions(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave}>Guardar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-center py-8 text-gray-500">Cargando métodos...</div>
                ) : methods.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed rounded-xl">
                        <Banknote className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <h3 className="font-medium text-gray-900">No hay métodos configurados</h3>
                        <p className="text-sm text-gray-500 mb-4">Agrega tu primera cuenta bancaria para recibir pagos.</p>
                        <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
                            Crear Método
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {methods.map((method) => (
                            <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg bg-white hover:border-gray-300 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="cursor-move text-gray-300 hover:text-gray-600">
                                        <GripVertical className="h-5 w-5" />
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                                        {method.type === 'GATEWAY' ? <CreditCard className="h-5 w-5 text-gray-600" /> : <Banknote className="h-5 w-5 text-gray-600" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium text-gray-900">{method.title}</h4>
                                            {!method.is_active && <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>}
                                        </div>
                                        {method.type === 'MANUAL' && method.details.account_number && (
                                            <p className="text-xs text-gray-500 font-mono">{method.details.account_number}</p>
                                        )}
                                        {method.type === 'GATEWAY' && (
                                            <p className="text-xs text-blue-500 truncate max-w-[200px]">{method.details.payment_link}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Switch
                                        checked={method.is_active}
                                        onCheckedChange={() => handleToggleActive(method.id, method.is_active)}
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(method)}>
                                        <Edit2 className="h-4 w-4 text-gray-500" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(method.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
