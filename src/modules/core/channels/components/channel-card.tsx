"use client"

import { Channel } from "../types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageCircle, MoreVertical, Trash2, Edit, Star, StarOff } from "lucide-react"
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

interface ChannelCardProps {
    channel: Channel
}

export function ChannelCard({ channel }: ChannelCardProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [liveStatus, setLiveStatus] = useState<'active' | 'inactive' | 'error' | 'unknown' | null>(null)

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

    return (
        <Card className="relative overflow-hidden">
            {channel.is_primary && (
                <div className="absolute top-0 right-0 p-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                </div>
            )}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    {channel.connection_name}
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Badge variant={channel.status === 'active' ? 'default' : 'destructive'} className="text-xs">
                        {channel.status}
                    </Badge>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={handleSetPrimary} disabled={isLoading}>
                                {channel.is_primary ? (
                                    <>
                                        <StarOff className="mr-2 h-4 w-4" /> Unset Primary
                                    </>
                                ) : (
                                    <>
                                        <Star className="mr-2 h-4 w-4" /> Set as Primary
                                    </>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={isLoading}>
                                <Edit className="mr-2 h-4 w-4" /> Configure
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleDelete} className="text-red-600" disabled={isLoading}>
                                <Trash2 className="mr-2 h-4 w-4" /> Disconnect
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-xs text-muted-foreground space-y-1">
                    <div>Provider: {channel.provider_key === 'meta_whatsapp' ? 'Meta Cloud API' : 'Evolution API'}</div>
                    <div>Phone: {channel.metadata?.display_phone_number || channel.metadata?.phone_number || 'N/A'}</div>
                    <div>Created: {format(new Date(channel.created_at), 'MMM d, yyyy')}</div>
                </div>
            </CardContent>
        </Card>
    )
}
