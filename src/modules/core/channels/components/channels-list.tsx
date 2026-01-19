"use client"

import { Channel } from "../types"
import { ChannelCard } from "./channel-card"
import { Button } from "@/components/ui/button"
import { Plus, MessageCircle, Store, Facebook } from "lucide-react"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { ConnectWhatsAppSheet } from "./connect-whatsapp-sheet"
import { useRouter } from "next/navigation"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ChannelsListProps {
    channels: Channel[]
    pipelineStages: any[]
    agents: any[]
}

export function ChannelsList({ channels, pipelineStages, agents }: ChannelsListProps) {
    const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false)
    const router = useRouter()

    const handleSuccess = () => {
        router.refresh()
    }

    const handleMetaConnect = async () => {
        try {
            // Dynamic import to avoid server-action issues in client component if strict
            const { getMetaAuthUrl } = await import('@/modules/core/integrations/marketplace/actions')
            const url = await getMetaAuthUrl()
            window.location.href = url
        } catch (error) {
            console.error("Meta Connect Error:", error)
            // toast.error("Error connecting Meta") 
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium">Canales de Mensajería</h2>
                    <p className="text-sm text-muted-foreground">
                        Conecta tus cuentas de WhatsApp para gestionar conversaciones.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => router.push('/platform/integrations')}>
                        <Store className="mr-2 h-4 w-4" /> Marketplace
                    </Button>

                    {/* DROPDOWN FOR WHATSAPP CONNECTION CHOICE */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="bg-[#25D366] hover:bg-[#128C7E] text-white">
                                <MessageCircle className="mr-2 h-4 w-4" /> Conectar WhatsApp
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Selecciona Método</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleMetaConnect}>
                                <div className="flex flex-col">
                                    <span className="font-semibold">API Oficial (Meta)</span>
                                    <span className="text-xs text-muted-foreground">Recomendado. Estable y seguro.</span>
                                </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setIsWhatsAppOpen(true)}>
                                <div className="flex flex-col">
                                    <span className="font-semibold">Código QR (Legacy)</span>
                                    <span className="text-xs text-muted-foreground">Para líneas existentes.</span>
                                </div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button onClick={handleMetaConnect} className="bg-[#1877F2] hover:bg-[#166FE5] text-white">
                        <Facebook className="mr-2 h-4 w-4" /> Conectar Meta
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {channels.flatMap((channel) => {
                    // IF Meta Business, EXPLODE assets into individual cards
                    if (channel.provider_key === 'meta_business' && channel.metadata?.selected_assets && channel.metadata.selected_assets.length > 0) {
                        return channel.metadata.selected_assets.map((asset: any, index: number) => {
                            // Create a "Virtual Channel" for this asset
                            // It inherits the connection ID but overrides metadata for display
                            const isPage = asset.category || asset.name === 'Facebook Page';
                            const assetName = asset.name || (isPage ? 'Facebook Page' : 'WhatsApp Business');

                            // Virtual Channel Object
                            const virtualChannel = {
                                ...channel,
                                // Create a composite ID so React keys works, BUT actions use real ID
                                id: channel.id,
                                connection_name: assetName,
                                display_phone_number: asset.display_phone_number || undefined,
                                provider_key: asset.type === 'whatsapp'
                                    ? 'meta_whatsapp'
                                    : (asset.has_ig ? 'meta_instagram' : 'meta_facebook'),
                                metadata: {
                                    ...channel.metadata,
                                    _virtual_asset_id: asset.id,
                                    _virtual_asset_type: asset.type,
                                    display_phone_number: asset.display_phone_number
                                }
                            } as any;

                            return (
                                <ChannelCard
                                    key={`${channel.id}-${asset.id}-${index}`}
                                    channel={virtualChannel}
                                    pipelineStages={pipelineStages}
                                    agents={agents}
                                    // Pass original channel ID for actions if needed, though virtualChannel.id is same
                                    isVirtual={true}
                                />
                            )
                        })
                    }

                    // Default behavior for other channels
                    return (
                        <ChannelCard
                            key={channel.id}
                            channel={channel}
                            pipelineStages={pipelineStages}
                            agents={agents}
                        />
                    )
                })}

                {channels.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl text-center space-y-4 bg-muted/20">
                        <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full">
                            <MessageCircle className="h-8 w-8 text-[#25D366]" />
                        </div>
                        <div className="max-w-md space-y-2">
                            <h3 className="font-semibold text-lg">No hay canales conectados</h3>
                            <p className="text-sm text-muted-foreground">
                                Conecta tu número de WhatsApp Business para empezar a recibir mensajes centralizados en el inbox.
                            </p>
                        </div>
                        <Button onClick={() => setIsWhatsAppOpen(true)} size="lg" className="mt-4 bg-[#25D366] hover:bg-[#128C7E] text-white">
                            Conectar WhatsApp Ahora
                        </Button>
                    </div>
                )}
            </div>

            <ConnectWhatsAppSheet open={isWhatsAppOpen} onOpenChange={setIsWhatsAppOpen} onSuccess={handleSuccess} />
        </div>
    )
}
