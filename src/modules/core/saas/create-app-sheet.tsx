"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Rocket, Plug, Package, Layers } from "lucide-react"
import { toast } from "sonner"
import { SystemModule } from "@/types/saas" // Assuming types are here
import { createSaaSProduct, getSystemModules, seedSystemModules } from "@/modules/core/saas/actions" // Assuming backend logic is here

interface CreateAppSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function CreateAppSheet({ open, onOpenChange, onSuccess }: CreateAppSheetProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [modules, setModules] = useState<SystemModule[]>([])
    const [loadingModules, setLoadingModules] = useState(true)

    // Form State
    const [name, setName] = useState("")
    const [slug, setSlug] = useState("")
    const [description, setDescription] = useState("")
    const [price, setPrice] = useState("")
    const [pricingModel, setPricingModel] = useState<"subscription" | "one_time">("subscription")

    // Selection State
    const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(new Set())

    // Fetch modules on open
    useEffect(() => {
        if (open) {
            fetchModules()
        }
    }, [open])

    const fetchModules = async () => {
        setLoadingModules(true)
        try {
            let data = await getSystemModules()
            if (data.length === 0) {
                await seedSystemModules()
                data = await getSystemModules()
            }
            setModules(data)
        } catch (error) {
            console.error(error)
            toast.error("Error cargando módulos del sistema")
        } finally {
            setLoadingModules(false)
        }
    }

    const toggleModule = (id: string) => {
        const newSet = new Set(selectedModuleIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedModuleIds(newSet)
    }

    const handleSave = async () => {
        if (!name || !slug || !price) {
            toast.error("Completa los campos requeridos")
            return
        }

        setIsLoading(true)
        try {
            const result = await createSaaSProduct({
                name,
                slug,
                description,
                base_price: parseFloat(price),
                pricing_model: pricingModel,
                status: 'published' // Auto publish
            }, Array.from(selectedModuleIds))

            if (result.success) {
                toast.success("App SaaS creada correctamente")
                onSuccess?.()
                onOpenChange(false)
                // Reset form
                setName("")
                setSlug("")
                setDescription("")
                setPrice("")
                setSelectedModuleIds(new Set())
            } else {
                toast.error(result.error || "Error al crear la App")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error inesperado")
        } finally {
            setIsLoading(false)
        }
    }

    // Auto-slug
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setName(val)
        setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-[1000px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <SheetHeader className="hidden">
                    <SheetTitle>Nueva App SaaS</SheetTitle>
                    <SheetDescription>Configura un nuevo producto para el catálogo.</SheetDescription>
                </SheetHeader>

                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">

                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/40 backdrop-blur-md border-b border-black/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                <Package className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Nueva App SaaS</h2>
                                <p className="text-xs text-muted-foreground">Define el producto comercial y sus módulos.</p>
                            </div>
                        </div>
                    </div>

                    {/* Split View */}
                    <div className="flex-1 overflow-hidden">
                        <div className="h-full grid grid-cols-1 lg:grid-cols-2 divide-x divide-gray-100/50">

                            {/* LEFT: Commercial Definition */}
                            <div className="overflow-y-auto p-8 h-full relative scrollbar-thin scrollbar-thumb-gray-200">
                                <div className="space-y-6">
                                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                                        <Layers className="h-4 w-4 text-gray-500" />
                                        Información Comercial
                                    </h3>

                                    <div className="space-y-3">
                                        <Label htmlFor="name">Nombre del Producto</Label>
                                        <Input
                                            id="name"
                                            placeholder="Ej: Barber Shop Pro"
                                            value={name}
                                            onChange={handleNameChange}
                                            className="h-11"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <Label>Slug (URL)</Label>
                                            <div className="flex items-center h-11 px-3 rounded-md bg-slate-50 border border-slate-200 text-slate-500 text-sm">
                                                <span className="truncate">pixy.ai/apps/{slug}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <Label>Modelo de Precio</Label>
                                            <Select value={pricingModel} onValueChange={(v: any) => setPricingModel(v)}>
                                                <SelectTrigger className="h-11">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="subscription">Suscripción Mensual</SelectItem>
                                                    <SelectItem value="one_time">Pago Único</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label>Precio Base ($)</Label>
                                        <Input
                                            type="number"
                                            className="h-11 pl-4"
                                            placeholder="0.00"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <Label>Descripción</Label>
                                        <Textarea
                                            className="resize-none h-32"
                                            placeholder="Describe las características principales..."
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="h-12"></div>
                            </div>

                            {/* RIGHT: Modules Recipe */}
                            <div className="bg-slate-50/50 p-8 flex flex-col h-full relative overflow-hidden">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        <Plug className="h-4 w-4 text-indigo-500" />
                                        La Receta (Módulos)
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Selecciona qué funcionalidades incluye esta App.
                                    </p>
                                </div>

                                <ScrollArea className="flex-1 -mx-2 px-2">
                                    {loadingModules ? (
                                        <div className="flex items-center justify-center h-40">
                                            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="space-y-6 pb-20">
                                            {['core', 'addon'].map((category) => {
                                                const catModules = modules.filter(m => m.category === category)
                                                if (catModules.length === 0) return null

                                                return (
                                                    <div key={category} className="space-y-3">
                                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                            Módulos {category === 'core' ? 'Principales' : 'Adicionales'}
                                                        </h4>
                                                        {catModules.map((module) => {
                                                            const isSelected = selectedModuleIds.has(module.id)
                                                            return (
                                                                <div
                                                                    key={module.id}
                                                                    className={`
                                                                        group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer
                                                                        ${isSelected
                                                                            ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                                                            : 'bg-white border-gray-100 hover:border-gray-300'}
                                                                    `}
                                                                    onClick={() => toggleModule(module.id)}
                                                                >
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div>
                                                                            <div className="flex items-center gap-2">
                                                                                <h5 className={`text-sm font-medium ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>
                                                                                    {module.name}
                                                                                </h5>
                                                                            </div>
                                                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                                                                {module.description}
                                                                            </p>
                                                                        </div>
                                                                        <Switch
                                                                            checked={isSelected}
                                                                            onCheckedChange={() => toggleModule(module.id)}
                                                                            className="data-[state=checked]:bg-indigo-600 mt-0.5"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </ScrollArea>

                                <div className="absolute bottom-4 left-4 right-4 bg-white/80 backdrop-blur-md border border-indigo-100 p-3 rounded-lg flex justify-between items-center shadow-sm">
                                    <span className="text-xs text-gray-500">Módulos seleccionados:</span>
                                    <span className="text-sm font-bold text-indigo-600">{selectedModuleIds.size}</span>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-white/80 backdrop-blur-md p-6 border-t border-gray-100 flex items-center justify-between z-20">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-gray-500 hover:text-red-500">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 px-6 rounded-xl h-11"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creando...
                                </>
                            ) : (
                                <>
                                    <Rocket className="mr-2 h-4 w-4" />
                                    Publicar App
                                </>
                            )}
                        </Button>
                    </div>

                </div>
            </SheetContent>
        </Sheet>
    )
}
