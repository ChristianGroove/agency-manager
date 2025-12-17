"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus, Trash } from "lucide-react"

export function QuoteForm() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [items, setItems] = useState([{ description: "", quantity: 1, price: 0 }])
    const [formData, setFormData] = useState({
        client_id: "",
        number: "COT-" + new Date().getFullYear() + "-001",
        date: new Date().toISOString().split('T')[0],
    })

    const addItem = () => {
        setItems([...items, { description: "", quantity: 1, price: 0 }])
    }

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items]
        // @ts-ignore
        newItems[index][field] = value
        setItems(newItems)
    }

    const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        // Logic to save quote
        alert("Funcionalidad de guardado pendiente")
        setIsLoading(false)
    }

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Nueva Cotización</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="client_id">Cliente</Label>
                            <Input id="client_id" placeholder="Buscar cliente..." value={formData.client_id} onChange={(e) => setFormData({ ...formData, client_id: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="number">Número</Label>
                            <Input id="number" value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date">Fecha</Label>
                            <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium">Items</h3>
                            <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                <Plus className="w-4 h-4 mr-2" /> Agregar Item
                            </Button>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-4 items-end">
                                <div className="col-span-6">
                                    <Label>Descripción</Label>
                                    <Input value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} placeholder="Servicio de..." />
                                </div>
                                <div className="col-span-2">
                                    <Label>Cant.</Label>
                                    <Input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} />
                                </div>
                                <div className="col-span-3">
                                    <Label>Precio Unit.</Label>
                                    <Input type="number" value={item.price} onChange={(e) => updateItem(index, 'price', Number(e.target.value))} />
                                </div>
                                <div className="col-span-1">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                                        <Trash className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end">
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="text-2xl font-bold">${total.toLocaleString()}</p>
                        </div>
                    </div>

                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
                    <Button variant="outline" type="button" onClick={() => router.back()}>Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generar Cotización
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
