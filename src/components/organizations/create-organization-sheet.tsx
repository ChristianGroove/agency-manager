"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Rocket, Building2, Package, Check } from "lucide-react"
import { toast } from "sonner"
import { getSaaSProducts } from "@/modules/core/saas/actions" // Assuming backend logic is here
import { SaasApp } from "@/modules/core/saas/app-management-actions"
import { createOrganization } from "@/modules/core/organizations/actions"

interface CreateOrganizationSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function CreateOrganizationSheet({ open, onOpenChange, onSuccess }: CreateOrganizationSheetProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [products, setProducts] = useState<SaasApp[]>([])
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
            setProducts(data.filter(p => p.status === 'published' || true))
        } catch (error) {
            console.error(error)
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
                app_id: selectedProductId, // Changed from subscription_product_id to app_id
            })

            if (result.success) {
                toast.success(`Organización "${name}" creada correctamente`)
                onSuccess?.()
                onOpenChange(false)

                // Small delay to ensure cookie propagation
                await new Promise(resolve => setTimeout(resolve, 100))

                // Navigate using router to preserve session
                router.push('/')
                router.refresh()
            } else {
                toast.error(result.error || "Error al crear la organización")
                setIsLoading(false)
            }
        } catch (error) {
            console.error(error)
            toast.error("Error inesperado")
            setIsLoading(false)
        }
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
                    <SheetTitle>Nueva Organización</SheetTitle>
                    <SheetDescription>Crea un nuevo espacio de trabajo (Tenant).</SheetDescription>
                </SheetHeader>

                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">

                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/40 backdrop-blur-md border-b border-black/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Nueva Organización</h2>
                                <p className="text-xs text-muted-foreground">Configura el tenant y su paquete de software.</p>
                            </div>
                        </div>
                    </div>

                    {/* Split View */}
                    <div className="flex-1 overflow-hidden">
                        <div className="h-full grid grid-cols-1 lg:grid-cols-2 divide-x divide-gray-100/50">

                            {/* LEFT: Identity */}
                            <div className="overflow-y-auto p-8 h-full relative scrollbar-thin scrollbar-thumb-gray-200">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <div className="space-y-3">
                                            <Label>Nombre Comercial</Label>
                                            <Input
                                                className="h-12 text-lg"
                                                placeholder="Ej: Barbería El Bigote"
                                                value={name}
                                                onChange={handleNameChange}
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <Label>URL del Espacio (Slug)</Label>
                                            <div className="flex items-center h-11 px-3 rounded-md bg-slate-50 border border-slate-200 text-slate-500 text-sm">
                                                app.pixy.com/
                                                <span className="text-gray-900 font-medium ml-0.5">{slug}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Selected Product Summary */}
                                    {selectedProductId && (
                                        <div className="p-5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-start gap-4">
                                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                                <Package className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-indigo-900">App Seleccionada</h4>
                                                <p className="text-lg font-bold text-indigo-700">
                                                    {products.find(p => p.id === selectedProductId)?.name}
                                                </p>
                                                <p className="text-xs text-indigo-600/80 mt-1">
                                                    Listo para instalar en tu nuevo tenant.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT: Product Selection */}
                            <div className="bg-slate-50/50 p-8 flex flex-col h-full relative overflow-hidden">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        <Package className="h-4 w-4 text-indigo-500" />
                                        Selecciona App Base
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Elige el paquete de software que usará esta organización.
                                    </p>
                                </div>

                                <ScrollArea className="flex-1 -mx-2 px-2">
                                    {loadingProducts ? (
                                        <div className="flex items-center justify-center h-40">
                                            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-4 pb-20">
                                            {products.map((product) => {
                                                const isSelected = selectedProductId === product.id
                                                return (
                                                    <div
                                                        key={product.id}
                                                        className={`
                                                            group relative p-5 rounded-xl border transition-all duration-300 cursor-pointer text-left
                                                            ${isSelected
                                                                ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/10'
                                                                : 'bg-white border-gray-100 hover:border-gray-300 shadow-sm'}
                                                        `}
                                                        onClick={() => setSelectedProductId(product.id)}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h3 className={`text-base font-bold ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>
                                                                {product.name}
                                                            </h3>
                                                            {isSelected && (
                                                                <div className="h-5 w-5 bg-indigo-600 rounded-full flex items-center justify-center">
                                                                    <Check className="h-3 w-3 text-white" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                                                            {product.description || "Sin descripción"}
                                                        </p>

                                                        <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                                                            <span className="text-lg font-bold text-gray-900">
                                                                ${product.price_monthly}
                                                            </span>
                                                            <span className="text-xs uppercase font-medium text-gray-400">
                                                                /{product.price_monthly > 0 ? 'Mes' : 'Único'}
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
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-white/80 backdrop-blur-md p-6 border-t border-gray-100 flex items-center justify-between z-20">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-gray-500 hover:text-red-500">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={isLoading}
                            className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 px-6 rounded-xl h-11"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Inicializando...
                                </>
                            ) : (
                                <>
                                    <Rocket className="mr-2 h-4 w-4" />
                                    Crear Organización
                                </>
                            )}
                        </Button>
                    </div>

                </div>
            </SheetContent>
        </Sheet>
    )
}
