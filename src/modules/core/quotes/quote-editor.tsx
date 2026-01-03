"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus, Trash, Save, ArrowLeft, Check, ChevronsUpDown, RefreshCw, Box } from "lucide-react"
import { Quote, QuoteItem, ServiceCatalogItem } from "@/types"
import { updateQuote } from "@/modules/core/quotes/actions"
import { supabase } from "@/lib/supabase"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface QuoteEditorProps {
    quote: Quote
}

export function QuoteEditor({ quote: initialQuote }: QuoteEditorProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [items, setItems] = useState<QuoteItem[]>(initialQuote.items || [])
    const [date, setDate] = useState(initialQuote.date ? new Date(initialQuote.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])

    // Catalog State
    const [catalog, setCatalog] = useState<ServiceCatalogItem[]>([])
    const [isCatalogLoading, setIsCatalogLoading] = useState(true)

    useEffect(() => {
        fetchCatalog()
    }, [])

    const fetchCatalog = async () => {
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('is_visible_in_portal', true) // Only show catalog items intended for sale
            .order('name')

        if (data) {
            setCatalog(data as ServiceCatalogItem[])
        }
        setIsCatalogLoading(false)
    }

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

    const handleCatalogSelect = (index: number, serviceId: string) => {
        const service = catalog.find(s => s.id === serviceId)
        if (!service) return

        const newItems = [...items]
        newItems[index] = {
            ...newItems[index],
            description: service.name,
            price: service.base_price,
            catalog_item_id: service.id,
            is_recurring: service.type === 'recurring',
            frequency: service.frequency
        }
        setItems(newItems)
    }

    const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)

    const handleSave = async () => {
        setIsLoading(true)
        try {
            const response = await updateQuote(initialQuote.id, {
                date: new Date(date).toISOString(),
                items: items,
                total: total,
                // number is immutable
            })

            if (!response.success) throw new Error(response.error)
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
                            <div key={index} className="grid grid-cols-12 gap-4 items-start bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                {/* Description / Catalog Selector */}
                                <div className="col-span-12 md:col-span-5 space-y-2">
                                    <Label className="text-xs font-medium text-gray-500">Descripción / Servicio</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "w-full justify-between text-left font-normal bg-white",
                                                    !item.description && "text-muted-foreground"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    {item.catalog_item_id ? <Box className="h-3 w-3 text-indigo-500" /> : null}
                                                    {item.description || "Seleccionar servicio..."}
                                                </div>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0" align="start">
                                            <Command>
                                                <CommandInput
                                                    placeholder="Buscar en catálogo o escribir..."
                                                    onValueChange={(val) => {
                                                        // Allow manual typing if no match selected
                                                        if (val !== item.description) {
                                                            updateItem(index, 'description', val)
                                                            // Clear catalog link if typing manually
                                                            if (item.catalog_item_id) {
                                                                updateItem(index, 'catalog_item_id', undefined)
                                                                updateItem(index, 'is_recurring', false)
                                                            }
                                                        }
                                                    }}
                                                />
                                                <CommandList>
                                                    <CommandEmpty>
                                                        <p className="text-xs text-muted-foreground p-2">
                                                            Escribe para definir un item personalizado.
                                                        </p>
                                                    </CommandEmpty>
                                                    <CommandGroup heading="Catálogo de Servicios">
                                                        {catalog.map((service) => (
                                                            <CommandItem
                                                                key={service.id}
                                                                value={service.name}
                                                                onSelect={() => handleCatalogSelect(index, service.id)}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        item.catalog_item_id === service.id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                <div className="flex flex-col">
                                                                    <span>{service.name}</span>
                                                                    <span className="text-xs text-muted-foreground">${service.base_price.toLocaleString()}</span>
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* Recurrence Toggles */}
                                <div className="col-span-12 md:col-span-3 space-y-2">
                                    <div className="flex items-center justify-between h-[40px]">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                id={`rec-${index}`}
                                                checked={item.is_recurring}
                                                onCheckedChange={(checked) => updateItem(index, 'is_recurring', checked)}
                                            />
                                            <Label htmlFor={`rec-${index}`} className="text-xs cursor-pointer">
                                                {item.is_recurring ? "Recurrente" : "Pago Único"}
                                            </Label>
                                        </div>
                                    </div>

                                    {/* Frequency Selector (Only if Recurring) */}
                                    {item.is_recurring && (
                                        <Select
                                            value={item.frequency || 'monthly'}
                                            onValueChange={(val) => updateItem(index, 'frequency', val)}
                                        >
                                            <SelectTrigger className="h-9 bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="monthly">Mensual</SelectItem>
                                                <SelectItem value="quarterly">Trimestral</SelectItem>
                                                <SelectItem value="semiannual">Semestral</SelectItem>
                                                <SelectItem value="yearly">Anual</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                <div className="col-span-6 md:col-span-1 space-y-2">
                                    <Label className="text-xs font-medium text-gray-500">Cant.</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        className="bg-white"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-6 md:col-span-2 space-y-2">
                                    <Label className="text-xs font-medium text-gray-500">Precio</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        className="bg-white"
                                        value={item.price}
                                        onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-12 md:col-span-1 flex justify-end pt-8">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9">
                                        <Trash className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-2 pt-4 border-t">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Subtotal Recurrente (Mensual):</span>
                            <span className="font-medium">
                                ${items.filter(i => i.is_recurring && i.frequency === 'monthly').reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Pago Único / Setup:</span>
                            <span className="font-medium">
                                ${items.filter(i => !i.is_recurring).reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between items-end mt-2 pt-2 border-t border-dashed">
                            <p className="text-base font-semibold">Total General</p>
                            <p className="text-3xl font-bold text-brand-dark">${total.toLocaleString()}</p>
                        </div>
                    </div>

                </CardContent>
            </Card>
        </div>
    )
}
