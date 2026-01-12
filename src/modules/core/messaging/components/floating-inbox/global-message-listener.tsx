"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { usePathname, useRouter } from "next/navigation"
import { useInboxPreferences } from "@/modules/core/preferences/use-inbox-preferences"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useGlobalInbox } from "../../context/global-inbox-context"
import { MessageSquare, X, Reply, CheckCheck } from "lucide-react"
import { markConversationAsRead } from "../../actions"
import { Button } from "@/components/ui/button"

type Message = any // Replace with proper type import

export function GlobalMessageListener() {
    const pathname = usePathname()
    const { preferences } = useInboxPreferences()
    const { openInbox } = useGlobalInbox()
    const processedMessages = useRef<Set<string>>(new Set())

    useEffect(() => {
        // Define channel colors
        const getChannelColor = (channel: string) => {
            switch (channel) {
                case 'whatsapp': return 'text-[#25D366] bg-[#25D366]/10'
                case 'messenger': return 'text-[#0084FF] bg-[#0084FF]/10'
                case 'instagram': return 'text-[#E1306C] bg-[#E1306C]/10'
                default: return 'text-primary bg-primary/10'
            }
        }

        const getChannelIcon = (channel: string) => {
            // Simplified icon logic, could use actual SVGs
            return <MessageSquare className="h-3 w-3" />
        }

        const channel = supabase
            .channel('global-messages')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' }, // Removed filter to avoid binding mismatch errors
                async (payload) => {
                    const msg = payload.new as Message

                    // Filter inbound messages client-side
                    if (msg.direction !== 'inbound') return

                    // 1. Deduplication
                    if (processedMessages.current.has(msg.id)) return
                    processedMessages.current.add(msg.id)
                    // Cleanup set periodically if needed
                    setTimeout(() => processedMessages.current.delete(msg.id), 10000)

                    // 2. Suppress if on Inbox Page
                    // Note: This matches /platform/inbox or similar. Adjust based on real route.
                    if (pathname?.includes('/inbox')) return

                    console.log('[GlobalListener] New Inbound Message:', msg)

                    // 3. Play Sound
                    if (preferences.notifications.sound_enabled) {
                        try {
                            const audio = new Audio('/sounds/notification.mp3') // Ensure this file exists
                            audio.volume = 0.5
                            await audio.play()
                        } catch (e) {
                            // Audio blocked depending on interaction policies
                        }
                    }

                    // 4. Show Custom Toast
                    // Fetch sender info context here or just show partial?
                    // We might need the lead name. For now, use "New Message" or try to infer.
                    // Ideally we'd join with conversations, but realtime payload is just the row.
                    // We can do a quick fetch or just generic.

                    // For "Super App" feel, let's fetch the conversation briefly to get the name
                    // This is an optimization trade-off.
                    const { data: conversation } = await supabase
                        .from('conversations')
                        .select('leads(name, phone), channel, last_message')
                        .eq('id', msg.conversation_id)
                        .single()

                    // Handle leads being returned as an array or object depending on Supabase type generation
                    const leadData = conversation?.leads
                    const lead = Array.isArray(leadData) ? leadData[0] : leadData

                    const senderName = lead?.name || lead?.phone || "Unknown Sender"
                    const messageText = typeof msg.content === 'string'
                        ? msg.content
                        : (msg.content?.text || msg.content?.body || "Sent a media file")

                    const channelColorClass = getChannelColor(msg.channel)

                    toast.custom((t) => (
                        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-4 flex gap-4 pointer-events-auto ring-1 ring-black/5 animate-in slide-in-from-top-2">
                            {/* Avatar */}
                            <div className="flex-shrink-0 relative">
                                <Avatar className="h-12 w-12 border-2 border-white dark:border-zinc-800 shadow-sm">
                                    <AvatarImage src="" />
                                    <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 font-bold text-zinc-700 dark:text-zinc-300">
                                        {senderName.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center ${channelColorClass}`}>
                                    {getChannelIcon(msg.channel)}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                    <h4 className="text-sm font-bold text-foreground truncate">{senderName}</h4>
                                    <span className="text-[10px] text-muted-foreground ml-2 whitespace-nowrap">Ahora</span>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                                    {messageText}
                                </p>

                                <div className="flex items-center gap-2 mt-3">
                                    <Button
                                        size="sm"
                                        variant="default"
                                        className="h-7 px-3 text-xs bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                                        onClick={() => {
                                            toast.dismiss(t)
                                            openInbox(msg.conversation_id)
                                        }}
                                    >
                                        <Reply className="h-3 w-3 mr-1.5" />
                                        Responder
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() => {
                                            toast.dismiss(t)
                                            markConversationAsRead(msg.conversation_id)
                                        }}
                                    >
                                        <CheckCheck className="h-3 w-3 mr-1.5" />
                                        Marcar leído
                                    </Button>
                                </div>
                            </div>

                            {/* Dismiss */}
                            <button
                                onClick={() => toast.dismiss(t)}
                                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ), {
                        id: `global-notification-${msg.conversation_id}`, // Updates existing toast instead of creating new one
                        duration: 8000,
                        position: 'top-right'
                    })
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [pathname, preferences.notifications.sound_enabled])

    return null
}
