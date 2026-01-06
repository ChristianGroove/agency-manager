"use client"

import { memo } from "react"
import { Lead } from "@/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge" // Kept if we revert to badge usage, but currently unused in compact mode? Wait, imports needed.
import { GripVertical, MoreHorizontal, Eye, MessageSquare, UserPlus, Edit, ArrowRight, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface LeadCardProps {
    lead: Lead
    onConvert: (id: string) => void
    onMarkLost: (id: string) => void
    onEdit: (lead: Lead) => void
    onView: (lead: Lead) => void
    onAssign: (lead: Lead) => void
    onMessage: (lead: Lead) => void
    isDragging?: boolean
}

function LeadCardComponent({ lead, onConvert, onMarkLost, onEdit, onView, onAssign, onMessage, isDragging }: LeadCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: lead.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <Card
            ref={setNodeRef}
            style={style}
            onClick={() => !isDragging && onView(lead)}
            className={cn(
                "p-2.5 hover:shadow-sm transition-all cursor-pointer group relative border-l-2",
                isDragging && "opacity-50 scale-95",
                lead.score && lead.score > 80 ? "border-l-purple-500" :
                    lead.score && lead.score > 60 ? "border-l-green-500" :
                        lead.score && lead.score > 30 ? "border-l-yellow-500" : "border-l-transparent"
            )}
        >
            <div className="flex items-center gap-2">
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate leading-tight">{lead.name}</h4>
                    {lead.company_name && (
                        <p className="text-[11px] text-muted-foreground truncate">{lead.company_name}</p>
                    )}
                </div>
                <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView(lead)}>
                                <Eye className="mr-2 h-3.5 w-3.5" />
                                Ver Detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onMessage(lead)}>
                                <MessageSquare className="mr-2 h-3.5 w-3.5" />
                                Mensaje
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAssign(lead)}>
                                <UserPlus className="mr-2 h-3.5 w-3.5" />
                                Asignar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(lead)}>
                                <Edit className="mr-2 h-3.5 w-3.5" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onConvert(lead.id)}>
                                <ArrowRight className="mr-2 h-3.5 w-3.5" />
                                Convertir
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => onMarkLost(lead.id)}>
                                <XCircle className="mr-2 h-3.5 w-3.5" />
                                Perdido
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </Card>
    )
}

export const LeadCard = memo(LeadCardComponent)
