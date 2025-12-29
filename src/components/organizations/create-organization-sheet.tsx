"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Rocket, Building2, Package, Check } from "lucide-react"
import { toast } from "sonner"
import { SaaSProduct } from "@/types/saas"
import { getSaaSProducts } from "@/modules/core/saas/actions" // Reuse this
import { createOrganization } from "@/modules/core/organizations/actions"
import { useRouter } from "next/navigation"

interface CreateOrganizationSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function CreateOrganizationSheet({ open, onOpenChange, onSuccess }: CreateOrganizationSheetProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [products, setProducts] = useState<SaaSProduct[]>([])
    const [loadingProducts, setLoadingProducts] = useState(true)

    // Form State
    const [name, setName] = useState("")
    const [slug, setSlug] = useState("")
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null)

    // Fetch products
    useEffect(() => {
        if (open) {
            fetchProducts()
        }
    }, [open])

    const fetchProducts = async () => {
        setLoadingProducts(true)
        try {
            const data = await getSaaSProducts()
            // Filter only published usually, but for now allow all for demo
            setProducts(data.filter(p => p.status === 'published' || true))
        } catch (error) {
            toast.error("Error cargando productos")
        } finally {
            setLoadingProducts(false)
        }
    }

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setName(val)
        setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
    }

    const handleCreate = async () => {
        if (!name || !slug) {
            toast.error("El nombre y slug son requeridos")
            return
        }
        if (!selectedProductId) {
            toast.error("Debes seleccionar un Producto SaaS base")
            return
        }

        setIsLoading(true)
        try {
            const result = await createOrganization({
                name,
                slug,
                subscription_product_id: selectedProductId,
                // logo_url: '' // Todo: upload logic
            })

            if (result.success) {
                toast.success(`Organización "${name}" creada correctamente`)
                onSuccess?.()
                onOpenChange(false)

                // Force comprehensive reload to apply new context
                window.location.href = '/'
            } else {
                toast.error(result.error || "Error al crear la organización")
                setIsLoading(false) // Only stop loading on error, on success we reload so keep spinner
            }
        } catch (error) {
            toast.error("Error inesperado")
            setIsLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-[85vw] sm:max-w-[85vw] p-0 border-l border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
                <div className="flex h-full">

                    {/* LEFT COLUMN: Identity */}
                    <div className="w-1/2 h-full border-r border-white/5 bg-gradient-to-br from-gray-900/50 to-black/50 p-8 flex flex-col">
                        <SheetHeader className="mb-8">
                            <SheetTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                Nueva Organización
                            </SheetTitle>
                            <p className="text-gray-400">Crea un nuevo espacio de trabajo (Tenant).</p>
                        </SheetHeader>

                        <div className="space-y-6 flex-1">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Nombre Comercial</Label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                                        <Input
                                            className="bg-white/5 border-white/10 text-white pl-10 h-12 text-lg focus:border-indigo-500/50"
                                            placeholder="Ej: Barbería El Bigote"
                                            value={name}
                                            onChange={handleNameChange}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-gray-300">URL del Espacio (Slug)</Label>
                                    <div className="flex items-center h-10 px-3 rounded-md bg-white/5 border border-white/10 text-gray-400 text-sm">
                                        app.pixy.com/
                                        <span className="text-white ml-0.5">{slug}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Selected Product Summary */}
                            {selectedProductId && (
                                <div className="mt-8 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                    <h4 className="text-sm font-semibold text-indigo-300 mb-1">Producto Seleccionado</h4>
                                    <p className="text-white text-lg font-medium">
                                        {products.find(p => p.id === selectedProductId)?.name}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/10">
                            <Button
                                onClick={handleCreate}
                                disabled={isLoading}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-12 shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]"
                            >
                                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Rocket className="mr-2 h-5 w-5" />}
                                Inicializar Organización
                            </Button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Product Selection */}
                    <div className="w-1/2 h-full bg-white/5 p-0 flex flex-col relative">
                        <div className="p-8 pb-4 border-b border-white/5 bg-white/5 backdrop-blur-lg z-10">
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                <Package className="h-5 w-5 text-indigo-400" />
                                Seleccionar App Base
                            </h3>
                            <p className="text-sm text-gray-400 mt-1">
                                Elige el paquete de software que usará esta organización.
                            </p>
                        </div>

                        <ScrollArea className="flex-1 p-8">
                            {loadingProducts ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {products.map((product) => {
                                        const isSelected = selectedProductId === product.id
                                        return (
                                            <div
                                                key={product.id}
                                                className={`
                                                    group relative p-5 rounded-xl border transition-all duration-300 cursor-pointer text-left
                                                    ${isSelected
                                                        ? 'bg-indigo-600 shadow-xl shadow-indigo-900/50 border-indigo-400 transform scale-[1.02]'
                                                        : 'bg-black/40 border-white/10 hover:bg-white/5 hover:border-white/20'}
                                                `}
                                                onClick={() => setSelectedProductId(product.id)}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                                        {product.name}
                                                    </h3>
                                                    {isSelected && <Check className="h-5 w-5 text-white" />}
                                                </div>

                                                <p className={`text-sm mb-4 line-clamp-2 ${isSelected ? 'text-indigo-100' : 'text-gray-400'}`}>
                                                    {product.description || "Sin descripción"}
                                                </p>

                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                                        ${product.base_price}
                                                    </span>
                                                    <span className={`text-xs uppercase font-medium ${isSelected ? 'text-indigo-200' : 'text-gray-500'}`}>
                                                        /{product.pricing_model === 'subscription' ? 'Mes' : 'Único'}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
