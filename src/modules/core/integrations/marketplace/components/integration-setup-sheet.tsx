"use client"

import { IntegrationProvider, InstalledIntegration } from "../types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { Check, Loader2, Facebook, Instagram, MessageCircle, CheckCircle2 } from "lucide-react"
import { uninstallIntegration, getMetaAuthUrl } from "../actions"
import { activateMetaChannel } from "@/modules/core/integrations/marketplace/meta-channel-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"
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
    existingChannels?: any[]  // Already activated channels to mark as "connected"
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

interface MetaAsset {
    id: string
    name: string
    type: 'page' | 'instagram' | 'whatsapp'
    display_phone_number?: string
    waba_id?: string
    has_ig?: boolean
    access_token?: string
}

export function IntegrationSetupSheet({
    provider,
    existingConnection,
    existingChannels = [],
    isOpen,
    onOpenChange
}: IntegrationSetupSheetProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [activating, setActivating] = useState(false)

    // Meta assets from connection metadata
    const metaAssets: MetaAsset[] = existingConnection?.metadata?.assets_preview || []
    const isMetaConnected = provider?.key === 'meta_business' && existingConnection?.status !== 'deleted' && metaAssets.length > 0
    const needsMetaOAuth = provider?.key === 'meta_business' && !isMetaConnected

    // IDs of already connected channels (to disable selection)
    const connectedAssetIds = new Set(
        existingChannels
            .filter(c => c.metadata?.asset_id && c.status === 'active')
            .map(c => c.metadata.asset_id)
    )

    // Reset selection when sheet opens/closes
    useEffect(() => {
        if (!isOpen) {
            setSelected(new Set())
        }
    }, [isOpen])

    const handleMetaOAuth = async () => {
        setIsLoading(true)
        try {
            const url = await getMetaAuthUrl()
            window.location.assign(url)
        } catch (e: any) {
            toast.error("Error", { description: e.message })
            setIsLoading(false)
        }
    }

    const toggleSelect = (assetId: string) => {
        const newSelected = new Set(selected)
        if (newSelected.has(assetId)) {
            newSelected.delete(assetId)
        } else {
            newSelected.add(assetId)
        }
        setSelected(newSelected)
    }

    const selectAll = () => {
        const available = metaAssets.filter(a => !connectedAssetIds.has(a.id))
        if (selected.size === available.length) {
            setSelected(new Set())
        } else {
            setSelected(new Set(available.map(a => a.id)))
        }
    }

    const handleActivateSelected = async () => {
        if (!existingConnection || selected.size === 0) return

        setActivating(true)
        let successCount = 0
        let errors: string[] = []

        for (const assetId of selected) {
            const asset = metaAssets.find(a => a.id === assetId)
            if (!asset) continue

            try {
                const result = await activateMetaChannel({
                    parentConnectionId: existingConnection.id,
                    assetId: asset.id,
                    assetType: asset.type,
                    assetName: asset.name,
                    accessToken: existingConnection.credentials?.access_token,
                    wabaId: asset.waba_id
                })

                if (result.success) {
                    successCount++
                } else {
                    errors.push(`${asset.name}: ${result.error}`)
                }
            } catch (e: any) {
                errors.push(`${asset.name}: ${e.message}`)
            }
        }

        setActivating(false)
        setSelected(new Set())

        if (successCount > 0) {
            toast.success(`✅ ${successCount} canal${successCount > 1 ? 'es' : ''} creado${successCount > 1 ? 's' : ''}`, {
                description: "Los canales están listos para recibir mensajes"
            })
            router.refresh()
        }

        if (errors.length > 0) {
            toast.error(`⚠️ Algunos canales no pudieron activarse`, {
                description: errors.join(', ')
            })
        }
    }

    const handleDisconnect = async () => {
        if (!existingConnection) return

        const confirm = window.confirm("¿Estás seguro de que quieres desconectar Meta? Se eliminarán todos los canales asociados.")
        if (!confirm) return

        setIsLoading(true)
        try {
            await uninstallIntegration(existingConnection.id)
            toast.success("Meta desconectado")
            onOpenChange(false)
            router.refresh()
        } catch (error: any) {
            toast.error("Error al desconectar", { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    const getAssetIcon = (type: string) => {
        switch (type) {
            case "page": return <Facebook className="h-5 w-5 text-blue-600" />
            case "instagram": return <Instagram className="h-5 w-5 text-pink-600" />
            case "whatsapp": return <MessageCircle className="h-5 w-5 text-green-600" />
            default: return null
        }
    }

    const getAssetLabel = (type: string) => {
        switch (type) {
            case "page": return "Facebook Page"
            case "instagram": return "Instagram"
            case "whatsapp": return "WhatsApp"
            default: return type
        }
    }

    if (!provider) return null

    const selectableAssets = metaAssets.filter(a => !connectedAssetIds.has(a.id))
    const allSelected = selected.size === selectableAssets.length && selectableAssets.length > 0

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
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
                    <SheetDescription>Gestiona tu conexión con Meta</SheetDescription>
                </SheetHeader>

                <div className="flex flex-col h-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border-b border-black/5 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                                <span className="text-white text-xl">∞</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                    {provider?.name}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {isMetaConnected ? 'Selecciona los canales a crear' : 'Conexión Omnicanal'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-8">
                        <div className="space-y-6 max-w-lg mx-auto">

                            {/* OAUTH SECTION - Not connected yet */}
                            {needsMetaOAuth && (
                                <div className="space-y-6 animate-in fade-in">
                                    <div className="bg-gradient-to-br from-[#1877F2]/5 to-[#1877F2]/10 dark:from-[#1877F2]/10 dark:to-[#1877F2]/20 border border-[#1877F2]/20 rounded-2xl p-6 text-center space-y-4">
                                        <div className="h-16 w-16 bg-white dark:bg-zinc-800 rounded-full mx-auto flex items-center justify-center shadow-sm">
                                            <img
                                                src="https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg"
                                                alt="Meta"
                                                className="h-8 w-8"
                                            />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Conectar con Meta</h3>
                                            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                                                Unifica WhatsApp, Facebook e Instagram en una sola integración.
                                            </p>
                                        </div>

                                        <Button
                                            onClick={handleMetaOAuth}
                                            disabled={isLoading}
                                            className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white shadow-lg h-11 rounded-xl font-semibold"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <span className="text-xl">∞</span> Continuar con Meta
                                                </span>
                                            )}
                                        </Button>
                                    </div>

                                    <div className="text-center">
                                        <p className="text-xs text-gray-400">
                                            Utilizamos la API oficial de Meta para garantizar seguridad.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ASSET SELECTION - Connected, checkbox selection */}
                            {isMetaConnected && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="text-center space-y-2">
                                        <div className="flex justify-center mb-4">
                                            <Badge className="bg-green-600 text-white rounded-full px-3">
                                                ✓ Meta Conectado
                                            </Badge>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Tus Activos de Meta</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Selecciona los activos que deseas convertir en canales.
                                        </p>
                                    </div>

                                    {/* Select All / Deselect All */}
                                    {selectableAssets.length > 0 && (
                                        <div className="flex items-center justify-between px-2">
                                            <button
                                                onClick={selectAll}
                                                className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                                            >
                                                {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                                            </button>
                                            <span className="text-sm text-muted-foreground">
                                                {selected.size} de {selectableAssets.length} seleccionados
                                            </span>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {metaAssets.map((asset) => {
                                            const isConnected = connectedAssetIds.has(asset.id)
                                            const isSelected = selected.has(asset.id)

                                            return (
                                                <Card
                                                    key={asset.id}
                                                    onClick={() => !isConnected && toggleSelect(asset.id)}
                                                    className={`
                                                        p-4 transition-all cursor-pointer border-2
                                                        ${isConnected
                                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 opacity-70 cursor-not-allowed'
                                                            : isSelected
                                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                                                                : 'hover:bg-muted/50 border-transparent'
                                                        }
                                                    `}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        {/* Checkbox or Connected Icon */}
                                                        <div className="flex-shrink-0">
                                                            {isConnected ? (
                                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                            ) : (
                                                                <Checkbox
                                                                    checked={isSelected}
                                                                    onCheckedChange={() => toggleSelect(asset.id)}
                                                                    className="h-5 w-5"
                                                                />
                                                            )}
                                                        </div>

                                                        {/* Asset Icon */}
                                                        <div className="flex-shrink-0">
                                                            {getAssetIcon(asset.type)}
                                                        </div>

                                                        {/* Asset Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h3 className="font-medium truncate">{asset.name}</h3>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {getAssetLabel(asset.type)}
                                                                </Badge>
                                                                {isConnected && (
                                                                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                                                                        Ya conectado
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            {asset.display_phone_number && (
                                                                <p className="text-sm text-muted-foreground mt-1">
                                                                    📱 {asset.display_phone_number}
                                                                </p>
                                                            )}

                                                            {asset.has_ig && asset.type === "page" && (
                                                                <p className="text-sm text-pink-600 mt-1">
                                                                    📸 Instagram vinculado
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Card>
                                            )
                                        })}
                                    </div>

                                    {metaAssets.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <p>No se encontraron activos disponibles.</p>
                                            <p className="text-xs mt-2">Verifica los permisos en Meta Business.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-6 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between z-20">
                        <div className="flex gap-2">
                            {existingConnection && (
                                <Button
                                    variant="ghost"
                                    className="text-red-500"
                                    onClick={handleDisconnect}
                                    disabled={isLoading}
                                >
                                    Desconectar
                                </Button>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cerrar
                            </Button>

                            {selected.size > 0 && (
                                <Button
                                    onClick={handleActivateSelected}
                                    disabled={activating}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                                >
                                    {activating ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Creando...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-4 w-4 mr-2" />
                                            Crear {selected.size} Canal{selected.size > 1 ? 'es' : ''}
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
