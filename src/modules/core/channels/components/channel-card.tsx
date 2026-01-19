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
import { updateChannel, deleteChannel, checkChannelStatus } from "../actions"
import { toast } from "sonner"
import { useEffect, useState } from "react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

import { EditChannelSheet } from "./edit-channel-sheet"

// Helper for Icon and Color
const getChannelVisuals = (key: string, isVirtual: boolean, virtType?: string) => {
    // If virtual, use virtual type or fallback to key
    if (key === 'meta_whatsapp') return { icon: Smartphone, color: 'text-green-600', bg: 'bg-green-100' }
    if (key === 'meta_facebook') return { icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-100' }
    if (key === 'meta_instagram') return { icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-100' }
    // Fallback/Standard
    return { icon: MessageCircle, color: 'text-primary', bg: 'bg-primary/10' }
}

interface ChannelCardProps {
    channel: Channel
    pipelineStages?: any[]
    agents?: any[]
    isVirtual?: boolean
}

export function ChannelCard({ channel, pipelineStages = [], agents = [], isVirtual = false }: ChannelCardProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [liveStatus, setLiveStatus] = useState<'active' | 'inactive' | 'error' | 'unknown' | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)

    // VISUAL CONSTANTS
    const { icon: Icon, color: iconColor, bg: iconBg } = getChannelVisuals(
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
    const displayName = channel.connection_name

    return (
        <>
            <Card className={`relative overflow-hidden cursor-pointer transition-all hover:shadow-md ${channel.is_primary ? 'border-primary/50 ring-1 ring-primary/20 bg-primary/5' : ''}`} onClick={handleCardClick}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${iconBg} ${iconColor} relative`}>
                            <Icon className="h-5 w-5" />
                            {isVirtual && (
                                <div className="absolute top-0 right-0 h-2 w-2 bg-blue-500 rounded-full ring-2 ring-white" />
                            )}
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                {displayName}
                                {channel.is_primary && (
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                )}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant={liveStatus === 'active' ? 'default' : 'secondary'} className={`text-[10px] h-5 ${liveStatus === 'active' ? 'bg-green-500 hover:bg-green-600' : ''}`}>
                                    {liveStatus || 'unknown'}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                    {(channel.metadata as any)?._virtual_asset_type?.toUpperCase() || channel.provider_key.replace('meta_', '').toUpperCase()}
                                </span>
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
                    {/* Render logic depending on Virtual or Standard */}
                    {isVirtual ? (
                        <div className="text-xs text-muted-foreground space-y-2 mt-2">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                <span className="font-semibold text-[10px] uppercase tracking-wider text-gray-500">ID Meta</span>
                                <span className="font-mono bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                    {(channel.metadata as any)._virtual_asset_id || 'N/A'}
                                </span>
                            </div>

                            {(channel.provider_key === 'meta_whatsapp') ? (
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-[10px] uppercase tracking-wider text-gray-500">Teléfono</span>
                                    <span className="font-mono font-medium text-gray-700">
                                        {(channel.metadata as any)?.display_phone_number || 'No Info'}
                                    </span>
                                </div>
                            ) : null}

                            <div className="text-[10px] bg-blue-50 text-blue-600 p-1.5 rounded border border-blue-100 mt-2 flex items-center justify-center gap-1 font-medium">
                                🔗 Gestionado por Meta Business
                            </div>
                        </div>
                    ) : (
                        channel.provider_key === 'meta_business' && channel.metadata?.selected_assets ? (
                            <div className="space-y-2">
                                <div className="text-xs text-muted-foreground font-semibold mb-1">Activos Conectados ({channel.metadata.selected_assets.length}):</div>
                                <div className="max-h-24 overflow-y-auto space-y-1 scrollbar-thin">
                                    {channel.metadata.selected_assets.map((asset: any, index: number) => (
                                        <div key={asset.id ? `${asset.id}-${index}` : index} className="flex items-center gap-2 text-xs p-1 bg-muted/50 rounded opacity-75">
                                            {asset.type === 'whatsapp'
                                                ? <span className="text-[10px]">📱</span>
                                                : <span className="text-[10px]">🚩</span>
                                            }
                                            <span className="truncate flex-1">{asset.name || asset.display_phone_number}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground space-y-2">
                                <div>Provider: <span className="font-medium text-gray-900">{channel.provider_key.replace(/_/g, ' ').toUpperCase()}</span></div>
                                {(channel.metadata as any)?.display_phone_number && (
                                    <div>Phone: {(channel.metadata as any).display_phone_number}</div>
                                )}
                                <div>Created: {format(new Date(channel.created_at), 'MMM d, yyyy')}</div>
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
