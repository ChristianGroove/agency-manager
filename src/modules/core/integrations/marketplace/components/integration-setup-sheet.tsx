"use client"

import { IntegrationProvider, InstalledIntegration } from "../types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect, useMemo } from "react"
import { Check, Crown, Loader2, Shield } from "lucide-react"
import { installIntegration, uninstallIntegration, getMetaAuthUrl } from "../actions"


import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"

interface IntegrationSetupSheetProps {
    provider: IntegrationProvider | null
    existingConnection?: InstalledIntegration
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export function IntegrationSetupSheet({
    provider,
    existingConnection,
    isOpen,
    onOpenChange
}: IntegrationSetupSheetProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [credentials, setCredentials] = useState<Record<string, string>>({})
    const [connectionName, setConnectionName] = useState("")
    const [selectedAssets, setSelectedAssets] = useState<string[]>([])

    // Detect if this is a "broken" Meta connection (created manually without OAuth)
    const isBrokenMetaConnection = useMemo(() => {
        if (!provider || provider.key !== 'meta_business') return false
        if (!existingConnection) return false
        // If it's active but has no assets metadata, it's broken
        return !existingConnection.metadata?.assets_preview
    }, [provider, existingConnection])

    // State initialization override
    useEffect(() => {
        if (isOpen && provider) {
            setCredentials(existingConnection?.credentials || {})
            setConnectionName(existingConnection?.connection_name || provider.name)

            // Pre-select logic
            if (existingConnection?.metadata?.selected_assets) {
                // Handle both Legacy (Strings) and New (Objects) formats
                const initial = existingConnection.metadata.selected_assets.map((a: any) =>
                    typeof a === 'string' ? a : a.id
                )
                setSelectedAssets(initial)
            } else if (existingConnection?.metadata?.assets_preview && existingConnection.status === 'action_required') {
                // Auto-select all only on FIRST setup
                setSelectedAssets(existingConnection.metadata.assets_preview.map((a: any) => a.id))
            }
        }
    }, [isOpen, provider, existingConnection])

    const handleDisconnect = async () => {
        if (!existingConnection) return

        const confirm = window.confirm("¿Estás seguro de que quieres desconectar esta integración? Se perderá la configuración actual.")
        if (!confirm) return

        setIsLoading(true)
        try {
            await uninstallIntegration(existingConnection.id)
            toast.success("Integración desconectada")
            onOpenChange(false)
            router.refresh()
        } catch (error: any) {
            toast.error("Error al desconectar", { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveAssets = async () => {
        if (!provider) return

        setIsLoading(true)
        try {
            // HYDRATE selected IDs to Full Objects
            const fullSelectedAssets = existingConnection?.metadata?.assets_preview?.filter(
                (asset: any) => selectedAssets.includes(asset.id)
            ) || []

            const result = await installIntegration({
                providerKey: provider.key,
                connectionName: connectionName || provider.name,
                credentials: {},
                metadata: {
                    ...existingConnection?.metadata,
                    selected_assets: fullSelectedAssets
                },
                status: 'active'
            })

            if (result.success) {
                toast.success("Canales Actualizados", {
                    description: `${selectedAssets.length} activos configurados.`
                })
                router.refresh()
            } else {
                toast.error("Error al guardar", { description: result.error })
            }
        } catch (e: any) {
            toast.error("Error", { description: e.message })
        } finally {
            setIsLoading(false)
        }
    }

    if (!provider) return null

    const schema = provider.config_schema
    const requiredFields = schema?.required || []
    const properties = schema?.properties || {}

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const result = await installIntegration({
                providerKey: provider.key,
                connectionName,
                credentials
            })

            if (result.success) {
                toast.success("Integración conectada", {
                    description: `${provider.name} se ha configurado correctamente`
                })
                onOpenChange(false)
                router.refresh()
            } else {
                toast.error("Error al conectar", {
                    description: result.error
                })
            }
        } catch (error: any) {
            toast.error("Error", { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    const isFormValid = requiredFields.every(field => credentials[field]?.trim())

    const showAssetSelector = provider?.key === 'meta_business' && existingConnection?.metadata?.assets_preview;

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            {/* ... (SheetContent/Header same) */}
            <SheetContent
                side="right"
                className="
                    sm:max-w-xl w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <SheetHeader className="sr-only">
                    <SheetTitle>Configuración de {provider?.name}</SheetTitle>
                    <SheetDescription>Gestiona tu conexión con {provider?.name}</SheetDescription>
                </SheetHeader>

                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">
                    {/* Header same ... */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/40 backdrop-blur-md border-b border-black/5">
                        <div className="flex items-center gap-3">
                            {/* ... Icon/Title ... */}
                            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 shadow-inner">
                                {provider?.is_premium ? <Crown className="h-5 w-5 text-amber-500" /> : <div className="h-2 w-2 rounded-full bg-gray-400" />}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                                    {provider?.name}
                                </h2>
                                <p className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">
                                    {provider?.description}
                                </p>
                            </div>
                        </div>
                    </div>


                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-8">
                        <div className="space-y-6 max-w-lg mx-auto">

                            {/* ASSET MANAGEMENT MODE */}
                            {showAssetSelector ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="text-center space-y-2">
                                        <div className="flex justify-center mb-4">
                                            <div className="bg-blue-100 text-blue-600 rounded-full p-3 ring-4 ring-blue-50">
                                                <Badge className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-3">
                                                    {existingConnection.metadata?.assets_preview?.length} Activos
                                                </Badge>
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900">Gestionar Canales</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Activa o desactiva los activos que deseas utilizar en el CRM.
                                        </p>
                                    </div>

                                    <div className="space-y-3 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                                        {existingConnection.metadata?.assets_preview?.map((asset: any) => {
                                            const isSelected = selectedAssets.includes(asset.id)
                                            return (
                                                <div
                                                    key={asset.id}
                                                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm transition-all hover:bg-gray-50/50"
                                                >
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="h-9 w-9 bg-gray-50 rounded-lg flex items-center justify-center text-lg border mb-auto">
                                                            {asset.type === 'whatsapp' ? '📱' : (asset.has_ig ? '📸' : '🚩')}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-semibold text-gray-900 truncate text-sm">
                                                                    {asset.name}
                                                                </p>
                                                                {isSelected && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                                                                        Activo
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                                <span className="font-mono bg-gray-100 px-1 rounded text-[10px]">
                                                                    {/* Simple Type Label */}
                                                                    {asset.type === 'whatsapp' ? 'WABA' : (asset.has_ig ? 'IG + Page' : 'Page')}
                                                                </span>
                                                                <span className="truncate">{asset.id}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setSelectedAssets(prev => prev.filter(id => id !== asset.id))
                                                            } else {
                                                                setSelectedAssets(prev => [...prev, asset.id])
                                                            }
                                                        }}
                                                        className={`
                                                            relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0
                                                            ${isSelected ? 'bg-green-500' : 'bg-gray-200'}
                                                        `}
                                                    >
                                                        <div className={`
                                                            absolute top-1 left-1 bg-white h-4 w-4 rounded-full transition-transform shadow
                                                            ${isSelected ? 'translate-x-5' : 'translate-x-0'}
                                                        `} />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Link to Refresh */}
                                    <div className="text-center text-xs text-gray-400 pt-4">
                                        ¿No ves tu página? <span
                                            onClick={() => window.open('https://facebook.com', '_blank')}
                                            className="text-blue-500 hover:underline cursor-pointer"
                                        >Verificar permisos en Meta</span>
                                    </div>
                                </div>
                            ) : (
                                // STANDARD FORM (Non-Meta or Broken)
                                <>
                                    {/* ... standard content ... */}
                                    {/* Keep existing form logic for non-assets */}
                                    {/* ALREADY CONNECTED (Active) */}
                                    {existingConnection && existingConnection.status === 'active' && !isBrokenMetaConnection && !showAssetSelector && (
                                        <div className="bg-green-50/50 p-4 rounded-lg">
                                            <p>Conexión Activa: {existingConnection.connection_name}</p>
                                        </div>
                                    )}
                                    {/* Meta Button Logic (Only if broken or new) */}
                                    {/* Meta Button Logic (Only if broken or new) */}
                                    {(provider?.key?.startsWith('meta') && !showAssetSelector && (!existingConnection || existingConnection.status !== 'active' || isBrokenMetaConnection)) && (
                                        <div className="space-y-6">
                                            <div className="bg-gradient-to-br from-[#1877F2]/5 to-[#1877F2]/10 border border-[#1877F2]/20 rounded-2xl p-6 text-center space-y-4">
                                                <div className="h-16 w-16 bg-white rounded-full mx-auto flex items-center justify-center shadow-sm">
                                                    <img src="https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg" alt="Meta" className="h-8 w-8" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900">Conectar con Meta</h3>
                                                    <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                                                        Unifica WhatsApp, Facebook e Instagram en una sola integración.
                                                    </p>
                                                </div>

                                                <Button
                                                    onClick={async () => {
                                                        try {
                                                            const url = await getMetaAuthUrl();
                                                            window.location.href = url;
                                                        } catch (e: any) {
                                                            toast.error("Error", { description: e.message });
                                                        }
                                                    }}
                                                    className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white shadow-lg shadow-blue-500/20 h-11 rounded-xl font-semibold transition-all hover:scale-[1.02]"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <span className="text-xl">∞</span> Continuar con Meta
                                                    </span>
                                                </Button>
                                            </div>

                                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                                <div className="flex gap-3">
                                                    <div className="h-8 w-8 shrink-0 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs">
                                                        1
                                                    </div>
                                                    <div className="text-sm">
                                                        <span className="font-semibold block text-gray-900">Conecta tu cuenta</span>
                                                        <span className="text-muted-foreground">Inicia sesión de forma segura con Meta Business.</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="h-8 w-8 shrink-0 bg-pink-100 rounded-lg flex items-center justify-center text-pink-600 font-bold text-xs">
                                                        2
                                                    </div>
                                                    <div className="text-sm">
                                                        <span className="font-semibold block text-gray-900">Selecciona Activos</span>
                                                        <span className="text-muted-foreground">Elige qué páginas de Facebook y cuentas de WhatsApp activar.</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="h-8 w-8 shrink-0 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-600 font-bold text-xs">
                                                        3
                                                    </div>
                                                    <div className="text-sm">
                                                        <span className="font-semibold block text-gray-900">Gestión Unificada</span>
                                                        <span className="text-muted-foreground">Cada activo se convertirá en un "Canal" independiente en tu CRM.</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-center">
                                                <p className="text-xs text-gray-400">
                                                    Utilizamos la API oficial de Meta para garantizar la seguridad y estabilidad de tu conexión.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-white/80 backdrop-blur-md p-6 border-t border-gray-100 flex items-center justify-between z-20">
                        <div className="flex gap-2">
                            {existingConnection && (
                                <Button variant="ghost" className="text-red-500" onClick={handleDisconnect}>Desconectar todo</Button>
                            )}
                        </div>
                        <Button
                            onClick={(e) => {
                                if (showAssetSelector) {
                                    handleSaveAssets()
                                } else {
                                    handleSubmit(e as any)
                                }
                            }}
                            disabled={isLoading || (showAssetSelector && selectedAssets.length === 0)}
                            className="bg-brand-pink text-white rounded-xl shadow-lg"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Guardar Configuración'}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
