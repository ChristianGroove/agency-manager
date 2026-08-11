"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Rocket, Building2, Package, Check, User, Zap, Link2, Copy, Share2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { getSaaSProducts } from "@/modules/core/saas/saas-actions"
import { SaasApp } from "@/types/saas"
import { createOrganization, getCurrentOrgDetails } from "@/modules/core/organizations/organization-actions"
import { createInviteLink } from "@/modules/core/iam/actions/invitation-actions"

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
    const [activeTab, setActiveTab] = useState<'direct' | 'invite'>('direct')
    const [isLoading, setIsLoading] = useState(false)
    const [products, setProducts] = useState<SaasApp[]>([])
    const [loadingProducts, setLoadingProducts] = useState(true)

    // Direct Creation Form State
    const [name, setName] = useState("")
    const [slug, setSlug] = useState("")
    const [adminEmail, setAdminEmail] = useState("")
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null)

    // Invitation Generator State
    const [customInviteCode, setCustomInviteCode] = useState("")
    const [inviteMaxUses, setInviteMaxUses] = useState(1)
    const [inviteRecipientEmail, setInviteRecipientEmail] = useState("")
    const [isGeneratingInvite, setIsGeneratingInvite] = useState(false)
    const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null)
    const [copiedLink, setCopiedLink] = useState(false)

    // V2: Hierarchy State
    const [currentParentOrg, setCurrentParentOrg] = useState<any>(null)
    const [orgType, setOrgType] = useState<'reseller' | 'client'>('client')

    // Fetch products and context
    useEffect(() => {
        if (open) {
            fetchInitialData()
            setGeneratedInviteUrl(null)
            if (initialData) {
                if (initialData.name) {
                    setName(initialData.name)
                    setSlug(initialData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
                }
                if (initialData.email) {
                    setAdminEmail(initialData.email)
                    setInviteRecipientEmail(initialData.email)
                }
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
            const activeProds = prods.filter(p => p.is_active)
            setProducts(activeProds)
            setCurrentParentOrg(orgDetails)

            if (activeProds.length > 0 && !selectedProductId) {
                setSelectedProductId(activeProds[0].id)
            }

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

    const handleCreateDirect = async () => {
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
            let parentId = null
            let acquiredByResellerId = null

            if (currentParentOrg?.organization_type === 'reseller') {
                parentId = currentParentOrg.id
                acquiredByResellerId = currentParentOrg.id
            }

            const result = await createOrganization({
                name,
                slug,
                app_id: selectedProductId,
                parent_organization_id: parentId,
                organization_type: orgType,
                admin_email: adminEmail || undefined,
                acquired_by_reseller_id: acquiredByResellerId,
            })

            if (result.success) {
                if (result.data?.invitation_sent) {
                    toast.success(`Organización creada exitosamente. Invitación enviada a ${adminEmail}`)
                } else if (result.data?.invitation_error) {
                    toast.success('Organización creada exitosamente')
                    toast.warning(`No se pudo enviar la invitación: ${result.data.invitation_error}`)
                } else {
                    toast.success('Organización creada exitosamente')
                }

                onSuccess?.()
                onOpenChange(false)
                window.location.reload()
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

    const handleGenerateInvite = async () => {
        setIsGeneratingInvite(true)
        setGeneratedInviteUrl(null)

        try {
            const res = await createInviteLink({
                code: customInviteCode || undefined,
                target_app_id: selectedProductId || undefined,
                target_organization_type: orgType,
                recipient_email: inviteRecipientEmail || undefined,
                max_uses: Number(inviteMaxUses) || 1
            })

            if (res.success && res.data?.invite_url) {
                setGeneratedInviteUrl(res.data.invite_url)
                toast.success("Enlace de invitación generado exitosamente")
            } else {
                toast.error(res.error || "Error generando invitación")
            }
        } catch (e: any) {
            console.error("Error generating invite:", e)
            toast.error(e.message || "Error al generar enlace de invitación")
        } finally {
            setIsGeneratingInvite(false)
        }
    }

    const copyInviteUrl = () => {
        if (!generatedInviteUrl) return
        navigator.clipboard.writeText(generatedInviteUrl)
        setCopiedLink(true)
        toast.success("Enlace copiado al portapapeles")
        setTimeout(() => setCopiedLink(false), 2000)
    }

    const shareWhatsApp = () => {
        if (!generatedInviteUrl) return
        const text = encodeURIComponent(`Hola! Aquí tienes tu enlace de invitación para activar tu cuenta y espacio en Pixy: ${generatedInviteUrl}`)
        window.open(`https://wa.me/?text=${text}`, '_blank')
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

                <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0a] dark:border dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl text-slate-900 dark:text-zinc-100">

                    {/* Header with Dual Tabs */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-brand-pink/10 rounded-xl text-brand-pink shrink-0">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Nueva Organización</SheetTitle>
                                <p className="text-xs text-slate-500 dark:text-zinc-400">Aprovisiona de forma manual o envía un enlace autónomo.</p>
                            </div>
                        </div>

                        {/* High-Contrast Tabs Selector */}
                        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-900/90 rounded-2xl border border-slate-200/60 dark:border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setActiveTab('direct')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    activeTab === 'direct'
                                        ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-md border border-slate-200/60 dark:border-zinc-700/60'
                                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                Crear Directamente
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('invite')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    activeTab === 'invite'
                                        ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-md border border-slate-200/60 dark:border-zinc-700/60'
                                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Link2 className="w-3.5 h-3.5 text-brand-pink" />
                                Enlace de Invitación
                            </button>
                        </div>
                    </div>

                    {/* Main Split View */}
                    <div className="flex-1 overflow-hidden">
                        <div className="h-full grid grid-cols-1 lg:grid-cols-2 divide-x divide-slate-200/80 dark:divide-white/5">

                            {/* LEFT SIDE: TAB CONTENT */}
                            <div className="overflow-y-auto p-8 h-full relative scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800 bg-white/50 dark:bg-transparent">
                                {activeTab === 'direct' ? (
                                    /* TAB 1: DIRECT MANUAL CREATION */
                                    <div className="space-y-8 animate-in fade-in duration-300">
                                        <div className="space-y-4">
                                            <div className="space-y-3">
                                                <Label className="font-bold text-slate-900 dark:text-zinc-100 text-xs">Nombre Comercial</Label>
                                                <Input
                                                    className="h-11 bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-zinc-950 focus:border-indigo-500 font-medium text-sm rounded-xl shadow-xs"
                                                    placeholder="Ej: Barbería El Bigote"
                                                    value={name}
                                                    onChange={handleNameChange}
                                                />
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="font-bold text-slate-900 dark:text-zinc-100 text-xs">URL del Espacio (Slug)</Label>
                                                <div className="flex items-center h-11 px-3.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 text-xs font-mono">
                                                    app.pixy.com/
                                                    <span className="text-slate-900 dark:text-white font-bold ml-0.5">{slug}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3 pt-2">
                                                <Label className="flex items-center justify-between font-bold text-slate-900 dark:text-zinc-100 text-xs">
                                                    <span>Email del Administrador</span>
                                                    <span className="text-xs font-semibold text-brand-pink bg-brand-pink/10 dark:bg-brand-pink/20 px-2.5 py-0.5 rounded-full">Automático</span>
                                                </Label>
                                                <Input
                                                    className="h-11 bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-zinc-950 focus:border-indigo-500 font-medium text-xs rounded-xl shadow-xs"
                                                    placeholder="admin@cliente.com (Opcional)"
                                                    value={adminEmail}
                                                    onChange={(e) => setAdminEmail(e.target.value)}
                                                />
                                                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                                                    Si ingresas un correo, le enviaremos una invitación mágica para acceder instantáneamente a esta organización.
                                                </p>
                                            </div>

                                            {currentParentOrg?.organization_type === 'platform' && (
                                                <div className="space-y-2 pt-2">
                                                    <Label className="font-bold text-slate-800 dark:text-zinc-200 text-xs">Tipo de Organización a Crear</Label>
                                                    <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
                                                        <button
                                                            type="button"
                                                            onClick={() => setOrgType('client')}
                                                            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${orgType === 'client' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs ring-1 ring-black/5 dark:ring-white/10' : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'}`}
                                                        >
                                                            Cliente Final
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setOrgType('reseller')}
                                                            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${orgType === 'reseller' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs ring-1 ring-black/5 dark:ring-white/10' : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'}`}
                                                        >
                                                            Reseller / Agencia
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {currentParentOrg?.organization_type === 'reseller' && (
                                                <div className="p-4 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-3">
                                                    <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center font-bold text-xs">
                                                        R
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wide">Reseller Mode</div>
                                                        <div className="text-xs text-blue-700 dark:text-blue-300">
                                                            Creando Cliente bajo <span className="font-bold">{currentParentOrg.name}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {selectedProductId && (
                                            <div className="p-5 rounded-xl bg-brand-pink/10 dark:bg-brand-pink/20 border border-brand-pink/30 flex items-start gap-4">
                                                <div className="p-2 bg-brand-pink/20 dark:bg-brand-pink/30 rounded-lg text-brand-pink shrink-0">
                                                    <Package className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">App Seleccionada</h4>
                                                    <p className="text-lg font-bold text-brand-pink">
                                                        {products.find(p => p.id === selectedProductId)?.name}
                                                    </p>
                                                    <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1">
                                                        Listo para instalar en el nuevo tenant.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* TAB 2: AUTONOMOUS INVITATION LINK GENERATOR */
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        <div className="p-4 rounded-2xl bg-brand-pink/10 dark:bg-brand-pink/20 border border-brand-pink/30 space-y-1">
                                            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                                                <Sparkles className="w-4 h-4 text-brand-pink animate-pulse" />
                                                Auto-registro Autónomo por Invitación
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-zinc-300">
                                                El cliente recibirá una URL única para registrarse, definir el nombre de su empresa y completar su propio Onboarding a su ritmo.
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            {currentParentOrg?.organization_type === 'platform' && (
                                                <div className="space-y-2">
                                                    <Label className="font-bold text-slate-800 dark:text-zinc-200 text-xs">Tipo de Organización Invitada</Label>
                                                    <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
                                                        <button
                                                            type="button"
                                                            onClick={() => setOrgType('client')}
                                                            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${orgType === 'client' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs ring-1 ring-black/5 dark:ring-white/10' : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'}`}
                                                        >
                                                            Cliente Final
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setOrgType('reseller')}
                                                            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${orgType === 'reseller' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs ring-1 ring-black/5 dark:ring-white/10' : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'}`}
                                                        >
                                                            Reseller / Agencia
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="font-bold text-slate-800 dark:text-zinc-200 text-xs">Límite de Usos</Label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        max={500}
                                                        value={inviteMaxUses}
                                                        onChange={(e) => setInviteMaxUses(parseInt(e.target.value) || 1)}
                                                        className="h-11 bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-zinc-950 focus:border-brand-pink text-xs rounded-xl shadow-xs"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="font-bold text-slate-800 dark:text-zinc-200 text-xs">Email Destinatario (Opcional)</Label>
                                                    <Input
                                                        type="email"
                                                        placeholder="cliente@empresa.com"
                                                        value={inviteRecipientEmail}
                                                        onChange={(e) => setInviteRecipientEmail(e.target.value)}
                                                        className="h-11 bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-zinc-950 focus:border-brand-pink text-xs rounded-xl shadow-xs"
                                                    />
                                                </div>
                                            </div>

                                            <Button
                                                onClick={handleGenerateInvite}
                                                disabled={isGeneratingInvite}
                                                className="w-full bg-brand-pink hover:bg-brand-pink/90 text-white font-bold h-11 transition-all rounded-xl cursor-pointer shadow-md shadow-brand-pink/20"
                                            >
                                                {isGeneratingInvite ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Generando Enlace Exclusivo...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Link2 className="w-4 h-4 mr-2" />
                                                        Generar Enlace de Invitación
                                                    </>
                                                )}
                                            </Button>

                                            {generatedInviteUrl && (
                                                <div className="p-5 rounded-2xl bg-slate-900 dark:bg-zinc-900 text-white space-y-4 animate-in fade-in zoom-in duration-300 shadow-2xl border border-slate-800 dark:border-zinc-700">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs font-bold text-brand-pink uppercase tracking-wider">¡Enlace Listo para Enviar!</Label>
                                                        <span className="text-[10px] bg-brand-pink/20 text-brand-pink border border-brand-pink/30 px-2.5 py-0.5 rounded-full font-mono">
                                                            {inviteMaxUses} Uso{inviteMaxUses > 1 ? 's' : ''}
                                                        </span>
                                                    </div>

                                                    <Input
                                                        readOnly
                                                        value={generatedInviteUrl}
                                                        className="bg-white/10 border-white/20 text-white text-xs font-mono select-all h-10 rounded-xl"
                                                    />

                                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                                        <Button
                                                            onClick={copyInviteUrl}
                                                            variant="secondary"
                                                            className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold h-10 rounded-xl cursor-pointer"
                                                        >
                                                            {copiedLink ? <Check className="w-4 h-4 mr-1.5 text-green-400" /> : <Copy className="w-4 h-4 mr-1.5" />}
                                                            {copiedLink ? "¡Copiado!" : "Copiar Enlace"}
                                                        </Button>
                                                        <Button
                                                            onClick={shareWhatsApp}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 rounded-xl cursor-pointer"
                                                        >
                                                            <Share2 className="w-4 h-4 mr-1.5" />
                                                            Enviar por WhatsApp
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT SIDE: PRODUCT SELECTOR (DIRECT CREATION) OR AUTONOMOUS PREVIEW (INVITATION) */}
                            {activeTab === 'direct' ? (
                                <div className="bg-slate-50/80 dark:bg-zinc-950/60 p-8 flex flex-col h-full relative overflow-hidden">
                                    <div className="mb-4">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Package className="h-4 w-4 text-brand-pink" />
                                            Selecciona App Base
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
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
                                                                    ? 'bg-white dark:bg-zinc-900 border-brand-pink dark:border-brand-pink ring-2 ring-brand-pink/20 dark:ring-brand-pink/30 shadow-md'
                                                                    : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 shadow-xs'}
                                                            `}
                                                            onClick={() => setSelectedProductId(product.id)}
                                                        >
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h3 className={`text-base font-bold ${isSelected ? 'text-brand-pink' : 'text-slate-900 dark:text-white'}`}>
                                                                    {product.name}
                                                                </h3>
                                                                {isSelected && (
                                                                    <div className="h-5 w-5 bg-brand-pink rounded-full flex items-center justify-center">
                                                                        <Check className="h-3 w-3 text-white" />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4 line-clamp-2">
                                                                {product.description || "Sin descripción"}
                                                            </p>

                                                            <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                                                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                                                    ${product.price_monthly}
                                                                </span>
                                                                <span className="text-xs uppercase font-medium text-slate-400 dark:text-zinc-500">
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
                            ) : (
                                <div className="bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 text-white p-8 flex flex-col justify-between h-full relative overflow-hidden">
                                    <div className="space-y-6 relative z-10">
                                        <div className="h-12 w-12 rounded-2xl bg-brand-pink/20 border border-brand-pink/40 flex items-center justify-center text-brand-pink shadow-lg">
                                            <Sparkles className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-2">Experiencia Autónoma Pixy</h3>
                                            <p className="text-xs text-slate-300 leading-relaxed">
                                                Al compartir este enlace de invitación, el cliente elegirá su propio nombre de empresa, su subdominio personalizado y seleccionará la App Base de su preferencia durante su proceso de Onboarding.
                                            </p>
                                        </div>

                                        <div className="space-y-3 pt-4 border-t border-white/10">
                                            <div className="flex items-center gap-3 text-xs text-slate-200 font-medium">
                                                <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">1</div>
                                                <span>Acceso al instante mediante token seguro</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-200 font-medium">
                                                <div className="h-6 w-6 rounded-full bg-brand-pink/20 text-brand-pink flex items-center justify-center font-bold text-[10px]">2</div>
                                                <span>Selección libre de App Base en Onboarding</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-200 font-medium">
                                                <div className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px]">3</div>
                                                <span>Aprovisionamiento automático de Workspace</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between relative z-10">
                                        <span>Seguridad Pixy IAM</span>
                                        <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-[10px] text-slate-300">Enlace Criptográfico</span>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 px-8 py-4 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-t border-gray-100 dark:border-white/5 flex items-center justify-between z-20">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-xl h-10 px-4 text-xs font-semibold">
                            Cerrar
                        </Button>

                        {activeTab === 'direct' && (
                            <Button
                                onClick={handleCreateDirect}
                                disabled={isLoading}
                                className="bg-brand-pink text-white hover:bg-brand-pink/90 shadow-xl shadow-brand-pink/20 px-8 rounded-xl h-11 cursor-pointer font-bold transition-all"
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
                        )}
                    </div>

                </div>
            </SheetContent>
        </Sheet>
    )
}
