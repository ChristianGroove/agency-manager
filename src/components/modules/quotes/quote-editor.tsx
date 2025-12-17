"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus, Trash, Save, ArrowLeft } from "lucide-react"
import { Quote, QuoteItem } from "@/types"
import { QuotesService } from "@/services/quotes-service"

interface QuoteEditorProps {
    quote: Quote
}

export function QuoteEditor({ quote: initialQuote }: QuoteEditorProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [items, setItems] = useState<QuoteItem[]>(initialQuote.items || [])
    const [date, setDate] = useState(initialQuote.date ? new Date(initialQuote.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])

    const addItem = () => {
        setItems([...items, { description: "", quantity: 1, price: 0 }])
    }

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
        const newItems = [...items]
        // @ts-ignore
        newItems[index][field] = value
        setItems(newItems)
    }

    const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)

    const handleSave = async () => {
        setIsLoading(true)
        try {
            await QuotesService.updateQuote(initialQuote.id, {
                date: new Date(date).toISOString(),
                items,
                total
            })
            alert("Cotización guardada exitosamente")
            router.push(`/quotes/${initialQuote.id}`)
        } catch (error) {
            console.error(error)
            alert("Error al guardar la cotización")
        } finally {
            setIsLoading(false)
        }
    }

    const entityName = initialQuote.client?.name || initialQuote.lead?.name || "Cliente Desconocido"

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                    </Button>
                    <h2 className="text-2xl font-bold tracking-tight">Editar Cotización {initialQuote.number}</h2>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => router.push(`/quotes/${initialQuote.id}`)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Guardar Cambios
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Detalles de la Cotización</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Cliente / Prospecto</Label>
                            <Input value={entityName} disabled className="bg-gray-100" />
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha</Label>
                            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="text-lg font-medium">Items del Servicio</h3>
                            <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                <Plus className="w-4 h-4 mr-2" /> Agregar Item
                            </Button>
                        </div>

                        {items.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                No hay items agregados. Haz clic en "Agregar Item" para comenzar.
                            </div>
                        )}

                        {items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-4 items-end bg-gray-50 p-4 rounded-lg">
                                <div className="col-span-6">
                                    <Label className="text-xs">Descripción</Label>
                                    <Input
                                        value={item.description}
                                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                                        placeholder="Descripción del servicio..."
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs">Cant.</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Label className="text-xs">Precio Unit.</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={item.price}
                                        onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                        <Trash className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total Estimado</p>
                            <p className="text-3xl font-bold text-brand-dark">${total.toLocaleString()}</p>
                        </div>
                    </div>

                </CardContent>
            </Card>
        </div>
    )
}
