"use client"

import { Channel } from "../types"
import { ChannelCard } from "./channel-card"
import { Button } from "@/components/ui/button"
import { Plus, MessageCircle, Store } from "lucide-react"
import { useState } from "react"
import { ConnectWhatsAppSheet } from "./connect-whatsapp-sheet"
import { useRouter } from "next/navigation"

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
                    <Button onClick={() => setIsWhatsAppOpen(true)} className="bg-[#25D366] hover:bg-[#128C7E] text-white">
                        <MessageCircle className="mr-2 h-4 w-4" /> Conectar WhatsApp
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {channels.map((channel) => (
                    <ChannelCard
                        key={channel.id}
                        channel={channel}
                        pipelineStages={pipelineStages}
                        agents={agents}
                    />
                ))}

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
