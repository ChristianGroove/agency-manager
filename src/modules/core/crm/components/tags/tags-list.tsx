"use client"

import { Tag } from "../../tags-actions"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Pencil, Trash2, Tag as TagIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface TagsListProps {
    tags: Tag[]
    onEdit: (tag: Tag) => void
    onDelete: (tagId: string) => void
    isLoading?: boolean
}

export function TagsList({ tags, onEdit, onDelete, isLoading }: TagsListProps) {
    if (tags.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                    <TagIcon className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Sin Etiquetas</h3>
                <p className="text-sm max-w-xs mt-1">Crea etiquetas para organizar tus leads y automatizar flujos de trabajo.</p>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {tags.map((tag) => (
                <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-white/5 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-4 h-4 rounded-full shadow-sm"
                            style={{ backgroundColor: tag.color }}
                        />
                        <span className="font-medium text-sm text-gray-700 dark:text-gray-200">
                            {tag.name}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-blue-500"
                            onClick={() => onEdit(tag)}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/10"
                                    onClick={() => onDelete(tag.id)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            ))}
        </div>
    )
}
