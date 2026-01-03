"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Zap, Search, Plus, Trash2 } from "lucide-react"

interface QuickReply {
    id: string
    name: string
    content: string
    shortcut?: string
    category?: string
}

interface QuickRepliesPanelProps {
    onSelect: (content: string) => void
}

export function QuickRepliesPanel({ onSelect }: QuickRepliesPanelProps) {
    const [replies, setReplies] = useState<QuickReply[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadReplies()
    }, [])

    const loadReplies = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('quick_replies')
            .select('*')
            .order('name', { ascending: true })

        if (!error && data) {
            setReplies(data)
        }
        setLoading(false)
    }

    const filteredReplies = replies.filter(reply => {
        const query = searchQuery.toLowerCase()
        return (
            reply.name.toLowerCase().includes(query) ||
            reply.content.toLowerCase().includes(query) ||
            reply.shortcut?.toLowerCase().includes(query)
        )
    })

    return (
        <div className="flex flex-col h-full border rounded-lg bg-white dark:bg-zinc-950">
            <div className="p-3 border-b">
                <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4" />
                    <h3 className="font-semibold text-sm">Quick Replies</h3>
                </div>
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-7 h-8 text-sm"
                    />
                </div>
            </div>

            <ScrollArea className="flex-1">
                {loading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        Loading...
                    </div>
                ) : filteredReplies.length === 0 ? (
                    <div className="p-4 text-center">
                        <Zap className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                        <p className="text-xs text-muted-foreground">
                            {searchQuery ? 'No results' : 'No quick replies'}
                        </p>
                    </div>
                ) : (
                    <div className="p-2 space-y-1">
                        {filteredReplies.map((reply) => (
                            <button
                                key={reply.id}
                                onClick={() => onSelect(reply.content)}
                                className="w-full p-2 text-left hover:bg-muted rounded-md transition-colors text-sm"
                            >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <span className="font-medium text-xs">{reply.name}</span>
                                    {reply.shortcut && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                                            {reply.shortcut}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {reply.content}
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
