"use client"

import { Channel } from "../types"
import { ChannelCard } from "./channel-card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import { ConnectChannelModal } from "./connect-channel-modal"

interface ChannelsListProps {
    channels: Channel[]
}

export function ChannelsList({ channels }: ChannelsListProps) {
    const [isConnectOpen, setIsConnectOpen] = useState(false)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium">Messaging Channels</h2>
                    <p className="text-sm text-muted-foreground">
                        Connect WhatsApp accounts to manage conversations and automation.
                    </p>
                </div>
                <Button onClick={() => setIsConnectOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Connect Channel
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {channels.map((channel) => (
                    <ChannelCard key={channel.id} channel={channel} />
                ))}

                {channels.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg text-center space-y-4">
                        <div className="p-3 bg-muted rounded-full">
                            <Plus className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="font-medium">No channels connected</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Connect your first WhatsApp account to get started.
                            </p>
                        </div>
                        <Button variant="outline" onClick={() => setIsConnectOpen(true)}>
                            Connect Channel
                        </Button>
                    </div>
                )}
            </div>

            <ConnectChannelModal open={isConnectOpen} onOpenChange={setIsConnectOpen} />
        </div>
    )
}
