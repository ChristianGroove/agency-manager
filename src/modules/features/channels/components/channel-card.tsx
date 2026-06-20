"use client"

import { Channel } from "../types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageCircle, MoreVertical, Trash2, Edit, Star, StarOff, Facebook, Instagram, Smartphone } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { updateChannel, deleteChannel, checkChannelStatus } from "../actions"
import { toast } from "sonner"
import { useEffect, useState } from "react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

import { EditChannelSheet } from "./edit-channel-sheet"

// Helper for Icon and Color
const getChannelVisuals = (key: string, isVirtual: boolean, virtType?: string) => {
    const k = key.toLowerCase();

    // WhatsApp
    if (k === 'meta_whatsapp' || k === 'whatsapp_cloud' || k === 'whatsapp') return { iconSrc: '/social media icons/whatsapp.png', bg: 'bg-green-50' }

    // Facebook Page / Messenger
    if (k === 'meta_facebook' || k === 'facebook_page' || k === 'facebook_dm') return { iconSrc: '/social media icons/facebook.png', bg: 'bg-blue-50' }
    if (k === 'meta_messenger' || k === 'messenger') return { iconSrc: '/social media icons/messenger.png', bg: 'bg-blue-50' }

    // Instagram
    if (k === 'meta_instagram' || k === 'instagram_dm' || k === 'instagram_dme' || k === 'instagram') return { iconSrc: '/social media icons/instagram.png', bg: 'bg-pink-50' }

    // Virtual Types (from assets)
    if (virtType === 'whatsapp') return { iconSrc: '/social media icons/whatsapp.png', bg: 'bg-green-50' }
    if (virtType === 'instagram') return { iconSrc: '/social media icons/instagram.png', bg: 'bg-pink-50' }
    if (virtType === 'facebook') return { iconSrc: '/social media icons/facebook.png', bg: 'bg-blue-50' }

    // Fallback/Standard
    return { iconSrc: null, bg: 'bg-zinc-100', FallbackIcon: MessageCircle }
}

interface ChannelCardProps {
    channel: Channel
    pipelineStages?: any[]
    agents?: any[]
    isVirtual?: boolean
}

/**
 * ChannelCard Component
 * Renders a visual card representing a connected messaging channel (Meta, WhatsApp, etc.)
 * 
 * Features:
 * - Real-time health status indicator (pulsing dot).
 * - Metadata-driven info display (Handle, Phone, Provider).
 * - Dynamic handle extraction from nested metadata objects.
 * - Managed asset detection (_virtual_asset_type).
 */
export function ChannelCard({ channel, pipelineStages = [], agents = [], isVirtual = false }: ChannelCardProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [liveStatus, setLiveStatus] = useState<'active' | 'inactive' | 'error' | 'unknown' | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)

    // VISUAL CONSTANTS
    const { iconSrc, bg: iconBg, FallbackIcon } = getChannelVisuals(
        channel.provider_key,
        isVirtual,
        channel.metadata?._virtual_asset_type
    )

    useEffect(() => {
        let mounted = true
        const check = async () => {
            try {
                const result = await checkChannelStatus(channel.id)
                if (mounted) setLiveStatus(result.status as any)
            } catch (err) {
                console.error("Status check failed", err)
                if (mounted) setLiveStatus('error')
            }
        }
        check()
        // Poll every 30s
        const interval = setInterval(check, 30000)
        return () => {
            mounted = false
            clearInterval(interval)
        }
    }, [channel.id])

    const handleSetPrimary = async () => {
        setIsLoading(true)
        try {
            await updateChannel(channel.id, { is_primary: true })
            toast.success("Updated", { description: `${channel.connection_name} is now primary.` })
            router.refresh()
        } catch (error: any) {
            toast.error("Error", { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm("Are you sure? This will stop all automation.")) return
        setIsLoading(true)
        try {
            await deleteChannel(channel.id)
            toast.success("Disconnected", { description: "Channel removed successfully." })
            router.refresh()
        } catch (error: any) {
            toast.error("Error", { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    const statusColor = liveStatus === 'active' ? 'bg-green-500' :
        liveStatus === 'inactive' ? 'bg-orange-500' :
            liveStatus === 'error' ? 'bg-red-500' : 'bg-slate-300'

    const handleConfigure = () => {
        setIsEditOpen(true)
    }

    const handleCardClick = () => {
        setIsEditOpen(true)
    }

    // Determine connection name to display
    const metadata = channel.metadata as any
    const handle = metadata?.instagram_username || metadata?.page_name || metadata?.display_phone_number || metadata?.asset_name
    const displayName = channel.connection_name || handle || 'Sin nombre'

    return (
        <>
            <Card className={`glass-card relative cursor-pointer group hover:-translate-y-1 transition-all ${channel.is_primary ? 'border-primary/50 bg-primary/[0.02]' : ''}`} onClick={handleCardClick}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl ${iconBg} shadow-sm border border-black/5`}>
                            {iconSrc ? (
                                <img src={iconSrc} alt="Icon" className="h-5 w-5 object-contain" />
                            ) : (
                                FallbackIcon && <FallbackIcon className="h-5 w-5 text-zinc-500" />
                            )}
                        </div>
                        <div className="space-y-0.5">
                            <CardTitle className="text-sm font-bold flex items-center gap-1.5 leading-none">
                                {displayName}
                                {channel.is_primary && (
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                )}
                            </CardTitle>
                            
                            <div className="flex items-center gap-2 mt-1.5 leading-none">
                                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-sm">
                                    {(channel.metadata as any)?._virtual_asset_type?.toUpperCase()
                                        || ({
                                            'meta_whatsapp': 'WhatsApp',
                                            'whatsapp_cloud': 'WhatsApp',
                                            'evolution_api': 'Evolution',
                                            'instagram_dm': 'Instagram',
                                            'instagram_dme': 'Instagram',
                                            'meta_instagram': 'Instagram',
                                            'meta_business': 'Meta Business',
                                            'facebook_page': 'Messenger',
                                        } as Record<string, string>)[channel.provider_key]
                                        || channel.provider_key.replace(/_/g, ' ').toUpperCase()
                                    }
                                </span>

                                {liveStatus && liveStatus !== 'unknown' && (
                                    <TooltipProvider delayDuration={0}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className={`h-2 w-2 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)] ${liveStatus === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="text-[10px] py-1 px-2">
                                                {liveStatus === 'active' ? 'Conectado y Operativo' : 'Error de Conexión'}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                {!isVirtual && (
                                    <>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSetPrimary() }} disabled={channel.is_primary}>
                                            <Star className="mr-2 h-4 w-4" /> Hacer Principal
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleConfigure() }} disabled={isLoading}>
                                            <Edit className="mr-2 h-4 w-4" /> Editar Configuración
                                        </DropdownMenuItem>
                                    </>
                                )}
                                <DropdownMenuSeparator />
                                {isVirtual ? (
                                    <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        toast.info("Gestionar en Conexión Principal", {
                                            description: "Para eliminar este activo, edita la conexión principal de Meta."
                                        })
                                    }} className="text-muted-foreground cursor-not-allowed opacity-70">
                                        <Trash2 className="mr-2 h-4 w-4" /> Deshabilitar (Gestionado)
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete() }} className="text-red-600" disabled={isLoading}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Desconectar
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent>
                    {isVirtual ? (
                        <div className="text-xs text-muted-foreground space-y-2 mt-2">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                <span className="font-semibold text-[10px] uppercase tracking-wider text-gray-500">ID Meta</span>
                                <span className="font-mono bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                    {(channel.metadata as any)._virtual_asset_id || 'N/A'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-[10px] uppercase tracking-wider text-gray-500">
                                    {channel.provider_key.includes('whatsapp') ? 'Teléfono' : 'Handle'}
                                </span>
                                <span className="font-mono font-medium text-gray-700">
                                    {handle || 'No Info'}
                                </span>
                            </div>
                            
                            <div className="text-[10px] bg-blue-50 text-blue-600 p-1.5 rounded border border-blue-100 mt-2 flex items-center justify-center gap-1 font-medium">
                                🔗 Gestionado por Meta Business
                            </div>
                        </div>
                    ) : (
                        channel.provider_key === 'meta_business' && (channel.metadata as any)?.selected_assets ? (
                            <div className="space-y-3">
                                <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 opacity-80 uppercase tracking-tight">
                                    Activos Conectados ({(channel.metadata as any).selected_assets.length}):
                                </div>
                                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                                    {(channel.metadata as any).selected_assets.map((asset: any, index: number) => (
                                        <div key={asset.id ? `${asset.id}-${index}` : index} className="flex items-center gap-2 text-[11px] p-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800 shadow-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                            {asset.type === 'whatsapp' 
                                                ? <img src="/social media icons/whatsapp.png" className="h-3.5 w-3.5" alt="WA" /> 
                                                : <img src="/social media icons/facebook.png" className="h-3.5 w-3.5" alt="FB" />
                                            }
                                            <span className="truncate flex-1 font-medium text-zinc-700 dark:text-zinc-300">
                                                {asset.name || asset.display_phone_number}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground space-y-2 mt-1">
                                <div className="flex items-center justify-between">
                                    <span className="opacity-70 uppercase text-[10px] font-bold tracking-wider">Proveedor</span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{({
                                        'meta_whatsapp': 'WhatsApp',
                                        'whatsapp_cloud': 'WhatsApp',
                                        'evolution_api': 'Evolution API',
                                        'meta_instagram': 'Instagram',
                                        'instagram_dm': 'Instagram',
                                        'instagram_dme': 'Instagram',
                                        'meta_business': 'Meta Business',
                                        'facebook_page': 'Messenger',
                                    } as Record<string, string>)[channel.provider_key] || channel.provider_key.replace(/_/g, ' ').toUpperCase()}</span>
                                </div>
                                
                                {handle && handle !== displayName && (
                                    <div className="flex items-center justify-between">
                                        <span className="opacity-70 uppercase text-[10px] font-bold tracking-wider">
                                            {channel.provider_key.includes('whatsapp') ? 'Teléfono' : 'Handle'}
                                        </span>
                                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{handle}</span>
                                    </div>
                                )}
                                
                                <div className="flex items-center justify-between pt-1 border-t border-zinc-50 dark:border-zinc-800/50 mt-1">
                                    <span className="opacity-70 uppercase text-[10px] font-bold tracking-wider">Creado</span>
                                    <span className="text-[11px]">{format(new Date(channel.created_at), 'MMM d, yyyy')}</span>
                                </div>
                            </div>
                        )
                    )}
                </CardContent>
            </Card>

            <EditChannelSheet
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                channel={channel}
                pipelineStages={pipelineStages}
                agents={agents}
            />
        </>
    )
}
