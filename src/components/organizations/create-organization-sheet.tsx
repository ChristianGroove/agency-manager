"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Rocket, Building2, Package, Check, User } from "lucide-react"
import { toast } from "sonner"
import { getSaaSProducts } from "@/modules/core/saas/actions" // Assuming backend logic is here
import { SaasApp } from "@/modules/core/saas/app-management-actions"
import { createOrganization, getCurrentOrgDetails } from "@/modules/core/organizations/actions"

interface CreateOrganizationSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
    initialData?: {
        name?: string
        email?: string
    }
}

export function CreateOrganizationSheet({ open, onOpenChange, onSuccess, initialData }: CreateOrganizationSheetProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [products, setProducts] = useState<SaasApp[]>([])
    const [loadingProducts, setLoadingProducts] = useState(true)

    // Form State
    const [name, setName] = useState("")
    const [slug, setSlug] = useState("")
    const [adminEmail, setAdminEmail] = useState("")
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null)

    // V2: Hierarchy State
    const [currentParentOrg, setCurrentParentOrg] = useState<any>(null)
    const [orgType, setOrgType] = useState<'reseller' | 'client'>('client')

    // Fetch products and context
    useEffect(() => {
        if (open) {
            fetchInitialData()
            // Automagic Pre-fill
            if (initialData) {
                if (initialData.name) {
                    setName(initialData.name)
                    // Generate Slug
                    setSlug(initialData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
                }
                if (initialData.email) {
                    setAdminEmail(initialData.email)
                }
            } else {
                // Reset if no initial data (typical behavior for shared sheet)
                // But wait, if user closes and reopens manual, should it reset? 
                // Best to reset form on open if NOT initialData, or just rely on state preservation if intended.
                // For now, let's keep simple.
            }
        }
    }, [open, initialData])

    const fetchInitialData = async () => {
        setLoadingProducts(true)
        try {
            const [prods, orgDetails] = await Promise.all([
                getSaaSProducts(),
                getCurrentOrgDetails()
            ])
            setProducts(prods.filter(p => p.is_active))
            setCurrentParentOrg(orgDetails)

            // Auto-set type based on parent
            if (orgDetails?.organization_type === 'reseller') {
                setOrgType('client')
            }
        } catch (error) {
            console.error(error)
            toast.error("Error cargando datos")
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
            // Logic:
            // If Platform -> Parent = NULL (unless user wants to nest?), Type = User Selected
            // If Reseller -> Parent = CurrentOrg, Type = Client

            let parentId = null
            if (currentParentOrg?.organization_type === 'reseller') {
                parentId = currentParentOrg.id
            }

            const result = await createOrganization({
                name,
                slug,
                app_id: selectedProductId,
                parent_organization_id: parentId, // V2
                organization_type: orgType, // V2
                admin_email: adminEmail || undefined, // New: Automated Onboarding
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
                            <div className="p-2 bg-brand-pink/10 rounded-lg text-brand-pink">
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

                                        <div className="space-y-3 pt-2">
                                            <Label className="flex items-center justify-between">
                                                <span>Email del Administrador</span>
                                                <span className="text-xs font-normal text-brand-pink bg-brand-pink/10 px-2 py-0.5 rounded-full">Automático</span>
                                            </Label>
                                            <Input
                                                className="h-11"
                                                placeholder="admin@cliente.com (Opcional)"
                                                value={adminEmail}
                                                onChange={(e) => setAdminEmail(e.target.value)}
                                            />
                                            <p className="text-[11px] text-muted-foreground">
                                                Si ingresas un correo, le enviaremos una invitación mágica para acceder instantáneamente a esta organización.
                                            </p>
                                        </div>

                                        {/* V2: Hierarchy Logic */}
                                        {currentParentOrg?.organization_type === 'platform' && (
                                            <div className="pt-4 border-t border-gray-100">
                                                <Label className="text-gray-900 mb-4 block">Tipo de Organización</Label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div
                                                        onClick={() => setOrgType('reseller')}
                                                        className={`
                                                            group relative cursor-pointer p-4 rounded-xl border-2 transition-all duration-200
                                                            ${orgType === 'reseller'
                                                                ? 'border-gray-900 bg-gray-50'
                                                                : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50'
                                                            }
                                                        `}
                                                    >
                                                        <div className={`mb-3 h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${orgType === 'reseller' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>
                                                            <Building2 className="h-4 w-4" />
                                                        </div>
                                                        <div className="font-semibold text-sm text-gray-900">Reseller</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">Agencia / Franquicia</div>

                                                        {orgType === 'reseller' && (
                                                            <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-green-500" />
                                                        )}
                                                    </div>

                                                    <div
                                                        onClick={() => setOrgType('client')}
                                                        className={`
                                                            group relative cursor-pointer p-4 rounded-xl border-2 transition-all duration-200
                                                            ${orgType === 'client'
                                                                ? 'border-gray-900 bg-gray-50'
                                                                : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50'
                                                            }
                                                        `}
                                                    >
                                                        <div className={`mb-3 h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${orgType === 'client' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>
                                                            <User className="h-4 w-4" />
                                                        </div>
                                                        <div className="font-semibold text-sm text-gray-900">Cliente Final</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">Cuenta Directa</div>

                                                        {orgType === 'client' && (
                                                            <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-green-500" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {currentParentOrg?.organization_type === 'reseller' && (
                                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
                                                <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                                                    R
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-blue-900 uppercase">Reseller Mode</div>
                                                    <div className="text-xs text-blue-700">
                                                        Creando Cliente bajo <span className="font-bold">{currentParentOrg.name}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Selected Product Summary */}
                                    {selectedProductId && (
                                        <div className="p-5 rounded-xl bg-brand-pink/10 border border-gray-200 flex items-start gap-4">
                                            <div className="p-2 bg-brand-pink/20 rounded-lg text-brand-pink">
                                                <Package className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-900">App Seleccionada</h4>
                                                <p className="text-lg font-bold text-brand-pink">
                                                    {products.find(p => p.id === selectedProductId)?.name}
                                                </p>
                                                <p className="text-xs text-brand-pink/80 mt-1">
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
                                        <Package className="h-4 w-4 text-brand-pink" />
                                        Selecciona App Base
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Elige el paquete de software que usará esta organización.
                                    </p>
                                </div>

                                <ScrollArea className="flex-1 -mx-2 px-2">
                                    {loadingProducts ? (
                                        <div className="flex items-center justify-center h-40">
                                            <Loader2 className="h-8 w-8 text-brand-pink animate-spin" />
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
                                                                ? 'bg-white border-gray-300 ring-2 ring-gray-200 shadow-lg shadow-gray-200/50'
                                                                : 'bg-white border-gray-100 hover:border-gray-300 shadow-sm'}
                                                        `}
                                                        onClick={() => setSelectedProductId(product.id)}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h3 className={`text-base font-bold ${isSelected ? 'text-brand-pink' : 'text-gray-900'}`}>
                                                                {product.name}
                                                            </h3>
                                                            {isSelected && (
                                                                <div className="h-5 w-5 bg-brand-pink rounded-full flex items-center justify-center">
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
                            className="bg-brand-pink text-white hover:bg-brand-pink/90 shadow-xl shadow-gray-900/10 px-6 rounded-xl h-11"
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
