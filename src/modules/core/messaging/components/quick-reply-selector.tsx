"use client"

import { useEffect, useState } from "react"
import { SavedReply, getSavedReplies, incrementUsageCount } from "../template-actions"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Zap, Settings2, Plus, Star, LayoutGrid } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface QuickReplySelectorProps {
    onSelect: (content: string) => void
    onManage: () => void
}

export function QuickReplySelector({ onSelect, onManage }: QuickReplySelectorProps) {
    const [replies, setReplies] = useState<SavedReply[]>([])
    const [open, setOpen] = useState(false)

    useEffect(() => {
        if (open) {
            getSavedReplies().then(data => {
                // Client-side filtering for favorites/quick access
                setReplies(data.filter(r => r.is_favorite))
            })
        }
    }, [open])

    const handleSelect = (reply: SavedReply) => {
        incrementUsageCount(reply.id)
        onSelect(reply.content)
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "text-muted-foreground hover:text-yellow-600 transition-colors rounded-full h-10 w-10",
                        open && "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20"
                    )}
                    title="Quick Replies"
                >
                    <Zap className={cn("h-5 w-5", open && "fill-current")} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start" side="top">
                <Command>
                    <div className="flex items-center px-2 py-1.5 border-b bg-muted/20">
                        <Star className="mr-2 h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-semibold text-muted-foreground">Quick Access</span>
                    </div>

                    <CommandList>
                        <CommandEmpty className="py-4 text-center text-xs text-muted-foreground px-4">
                            No favorites set. <br /> Click 'Manage' to add some.
                        </CommandEmpty>
                        <CommandGroup>
                            {replies.map(reply => (
                                <CommandItem
                                    key={reply.id}
                                    onSelect={() => handleSelect(reply)}
                                    className="cursor-pointer py-2.5"
                                >
                                    <span className="mr-2 text-base">{reply.icon || "📄"}</span>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm">{reply.title}</span>
                                        <span className="text-[10px] text-muted-foreground line-clamp-1 opacity-70">
                                            {reply.content}
                                        </span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>

                    <Separator />

                    <div className="p-1 bg-muted/30">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs h-8"
                            onClick={() => { setOpen(false); onManage(); }}
                        >
                            <LayoutGrid className="mr-2 h-3.5 w-3.5" />
                            Manage & Create...
                        </Button>
                    </div>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
