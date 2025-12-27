"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Save, Rocket, Info, Check, Plug } from "lucide-react"
import { toast } from "sonner"
import { SystemModule } from "@/types/saas" // Assuming types are here
import { getSystemModules, createSaaSProduct, seedSystemModules } from "@/lib/actions/saas" // Assuming backend logic is here

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
                // Auto seed on first run if empty (Client-side trigger for convenience)
                // In production this might be automatic, but here acts as self-healing
                await seedSystemModules()
                data = await getSystemModules()
            }
            setModules(data)
        } catch (error) {
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
                status: 'published' // Auto publish for now
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
            <SheetContent side="right" className="w-[85vw] sm:max-w-[85vw] p-0 border-l border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
                <div className="flex h-full">

                    {/* LEFT COLUMN: Commercial Definition */}
                    <div className="w-1/2 h-full border-r border-white/5 bg-gradient-to-br from-gray-900/50 to-black/50 p-8 flex flex-col overflow-y-auto">
                        <SheetHeader className="mb-8">
                            <SheetTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                Definir Producto SaaS
                            </SheetTitle>
                            <p className="text-gray-400">Configura la oferta comercial de tu nueva App.</p>
                        </SheetHeader>

                        <div className="space-y-6 flex-1">
                            <div className="space-y-2">
                                <Label className="text-gray-300">Nombre del Producto</Label>
                                <Input
                                    className="bg-white/5 border-white/10 text-white focus:border-indigo-500/50 h-12 text-lg"
                                    placeholder="Ej: Barber Shop Pro"
                                    value={name}
                                    onChange={handleNameChange}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Slug (URL)</Label>
                                    <div className="flex items-center h-10 px-3 rounded-md bg-white/5 border border-white/10 text-gray-400 text-sm">
                                        pixy.ai/apps/
                                        <span className="text-white ml-0.5">{slug}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Modelo de Precio</Label>
                                    <Select value={pricingModel} onValueChange={(v: any) => setPricingModel(v)}>
                                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="subscription">Suscripción Mensual</SelectItem>
                                            <SelectItem value="one_time">Pago Único</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-gray-300">Precio Base</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                                    <Input
                                        type="number"
                                        className="bg-white/5 border-white/10 text-white pl-8 h-10 font-mono"
                                        placeholder="0.00"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-gray-300">Descripción</Label>
                                <Textarea
                                    className="bg-white/5 border-white/10 text-white h-32 resize-none"
                                    placeholder="Describe las características principales..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/10">
                            <Button
                                onClick={handleSave}
                                disabled={isLoading}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-12 shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]"
                            >
                                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Rocket className="mr-2 h-5 w-5" />}
                                Publicar App en Catálogo
                            </Button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: The Recipe (Modules) */}
                    <div className="w-1/2 h-full bg-white/5 p-0 flex flex-col relative">
                        <div className="p-8 pb-4 border-b border-white/5 bg-white/5 backdrop-blur-lg z-10">
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                <Plug className="h-5 w-5 text-indigo-400" />
                                La Receta
                            </h3>
                            <p className="text-sm text-gray-400 mt-1">
                                Selecciona los módulos que incluirá esta App.
                            </p>
                        </div>

                        <ScrollArea className="flex-1 p-8">
                            {loadingModules ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Categorized Modules */}
                                    {['core', 'addon'].map((category) => {
                                        const catModules = modules.filter(m => m.category === category)
                                        if (catModules.length === 0) return null

                                        return (
                                            <div key={category} className="space-y-3">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                                    Módulos {category === 'core' ? 'Principales' : 'Adicionales'}
                                                </h4>
                                                {catModules.map((module) => {
                                                    const isSelected = selectedModuleIds.has(module.id)
                                                    return (
                                                        <div
                                                            key={module.id}
                                                            className={`
                                                                group relative p-4 rounded-xl border transition-all duration-300 cursor-pointer
                                                                ${isSelected
                                                                    ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                                                                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}
                                                            `}
                                                            onClick={() => toggleModule(module.id)}
                                                        >
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <h5 className={`font-medium ${isSelected ? 'text-indigo-200' : 'text-gray-300'}`}>
                                                                            {module.name}
                                                                        </h5>
                                                                        {isSelected && (
                                                                            <span className="flex items-center text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-bold">
                                                                                INCLUIDO
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                                                                        {module.description}
                                                                    </p>
                                                                </div>
                                                                <Switch
                                                                    checked={isSelected}
                                                                    onCheckedChange={() => toggleModule(module.id)}
                                                                    className="data-[state=checked]:bg-indigo-500 mt-1"
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

                        {/* Live Summary Footer */}
                        <div className="p-4 border-t border-white/10 bg-black/20 text-center">
                            <span className="text-sm text-gray-400">
                                Esta App incluye <strong className="text-white">{selectedModuleIds.size} módulos</strong> activos.
                            </span>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
