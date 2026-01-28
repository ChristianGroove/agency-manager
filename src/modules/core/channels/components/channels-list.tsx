"use client"

import { Channel } from "../types"
import { ChannelCard } from "./channel-card"
import { Button } from "@/components/ui/button"
import { Plus, MessageCircle, Store, Instagram } from "lucide-react"
import { useState } from "react"
import { EvolutionConnectSheet } from "./evolution-connect-sheet"
import { useRouter } from "next/navigation"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

// Facebook/Messenger icon (lucide doesn't have a good one)
function FacebookIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
    )
}

interface ChannelsListProps {
    channels: Channel[]
    pipelineStages: any[]
    agents: any[]
}

import { SectionHeader } from "@/components/layout/section-header"

export function ChannelsList({ channels, pipelineStages, agents }: ChannelsListProps) {
    const [isEvolutionOpen, setIsEvolutionOpen] = useState(false)
    const router = useRouter()

    const handleSuccess = () => {
        router.refresh()
    }

    // OAuth handler with specific channel type
    const handleMetaConnect = async (channelType?: 'whatsapp' | 'messenger' | 'instagram') => {
        try {
            const { getMetaAuthUrl } = await import('@/modules/core/integrations/marketplace/actions')
            const url = await getMetaAuthUrl(channelType)
            window.location.assign(url)
        } catch (error) {
            console.error("Meta Connect Error:", error)
        }
    }

    // Flatten channels for display (handle meta_business with selected_assets)
    const displayChannels = channels.flatMap((channel) => {
        const selectedAssets = channel.metadata?.selected_assets
        if (channel.provider_key === 'meta_business' && selectedAssets && selectedAssets.length > 0) {
            return selectedAssets.map((asset: any, index: number) => {
                const isPage = asset.category || asset.name === 'Facebook Page'
                const assetName = asset.name || (isPage ? 'Facebook Page' : 'WhatsApp Business')

                return {
                    ...channel,
                    id: channel.id,
                    connection_name: assetName,
                    display_phone_number: asset.display_phone_number,
                    provider_key: asset.type === 'whatsapp'
                        ? 'meta_whatsapp'
                        : (asset.has_ig ? 'meta_instagram' : 'meta_facebook'),
                    metadata: {
                        ...channel.metadata,
                        _virtual_asset_id: asset.id,
                        _virtual_asset_type: asset.type,
                        display_phone_number: asset.display_phone_number
                    },
                    _isVirtual: true,
                    _key: `${channel.id}-${asset.id}-${index}`
                } as Channel & { _isVirtual?: boolean; _key?: string }
            })
        }
        return [{ ...channel, _key: channel.id }]
    })

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Canales de Mensajería"
                subtitle="Conecta tus cuentas para gestionar conversaciones."
                titleClassName="text-2xl"
                action={
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Marketplace Link */}
                        <Button variant="ghost" onClick={() => router.push('/platform/integrations')}>
                            <Store className="mr-2 h-4 w-4" /> Marketplace
                        </Button>

                        {/* WhatsApp Button - Official Meta API */}
                        <Button
                            onClick={() => handleMetaConnect('whatsapp')}
                            className="bg-[#25D366] hover:bg-[#128C7E] text-white shadow-sm"
                        >
                            <MessageCircle className="mr-2 h-4 w-4" />
                            WhatsApp
                        </Button>

                        {/* Messenger Button */}
                        <Button
                            onClick={() => handleMetaConnect('messenger')}
                            className="bg-[#1877F2] hover:bg-[#166FE5] text-white shadow-sm"
                        >
                            <FacebookIcon className="mr-2 h-4 w-4" />
                            Messenger
                        </Button>

                        {/* Instagram Button */}
                        <Button
                            onClick={() => handleMetaConnect('instagram')}
                            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm hover:from-pink-600 hover:to-purple-700"
                        >
                            <Instagram className="mr-2 h-4 w-4" />
                            Instagram
                        </Button>

                        {/* Evolution (QR) - Small Plus Button */}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={() => setIsEvolutionOpen(true)}
                                        variant="outline"
                                        size="icon"
                                        className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 dark:border-green-600 dark:text-green-500"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Conectar con QR (Legacy)</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                }
            />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {displayChannels.map((channel) => (
                    <ChannelCard
                        key={(channel as any)._key || channel.id}
                        channel={channel}
                        pipelineStages={pipelineStages}
                        agents={agents}
                        isVirtual={(channel as any)._isVirtual}
                    />
                ))}

                {channels.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl text-center space-y-4 bg-muted/20 dark:bg-muted/10">
                        <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full">
                            <MessageCircle className="h-8 w-8 text-[#25D366]" />
                        </div>
                        <div className="max-w-md space-y-2">
                            <h3 className="font-semibold text-lg">No hay canales conectados</h3>
                            <p className="text-sm text-muted-foreground">
                                Conecta WhatsApp, Messenger o Instagram para centralizar tus conversaciones.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <EvolutionConnectSheet
                open={isEvolutionOpen}
                onOpenChange={setIsEvolutionOpen}
                onSuccess={handleSuccess}
            />
        </div>
    )
}
