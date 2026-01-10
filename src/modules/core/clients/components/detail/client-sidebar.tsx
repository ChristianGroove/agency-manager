"use client"

import { Client } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Phone,
    Mail,
    MapPin,
    TrendingUp,
    AlertTriangle,
    Clock,
    ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ClientSidebarProps {
    client: Client
    onWhatsAppClick: () => void
}

export function ClientSidebar({ client, onWhatsAppClick }: ClientSidebarProps) {
    // Calculations
    const totalDebt = client.invoices
        ?.filter(inv => inv.status === 'pending' || inv.status === 'overdue')
        .reduce((sum, inv) => sum + (inv.total || 0), 0) || 0

    const totalSpent = client.invoices
        ?.filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + (inv.total || 0), 0) || 0

    const activeServices = (client.services?.filter(svc => svc.status === 'active').length || 0)

    return (
        <div className="space-y-6">
            {/* Identity Card */}
            <Card className="overflow-hidden border-gray-200 shadow-sm">
                <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200/50 relative">
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                        <Badge variant="outline" className={cn(
                            "bg-white/90 backdrop-blur shadow-sm border-0 font-semibold",
                            totalDebt > 0 ? "text-red-600" : "text-emerald-600"
                        )}>
                            {totalDebt > 0 ? "Saldo Pendiente" : "Al día"}
                        </Badge>
                    </div>
                </div>
                <CardContent className="px-6 pb-6 relative">
                    <div className="-mt-12 mb-4 flex justify-between items-end">
                        <Avatar className="h-24 w-24 border-4 border-white shadow-md bg-white rounded-2xl">
                            <AvatarImage src={client.logo_url} className="object-cover" />
                            <AvatarFallback className="text-2xl font-bold bg-gray-50 text-gray-400 rounded-2xl">
                                {client.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex gap-2 mb-1">
                            {/* Quick Contact Buttons */}
                            {client.phone && (
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-9 w-9 rounded-full bg-white hover:text-green-600 hover:border-green-200 hover:bg-green-50"
                                    onClick={onWhatsAppClick}
                                    title="WhatsApp"
                                >
                                    <Phone className="h-4 w-4" />
                                </Button>
                            )}
                            {client.email && (
                                <a href={`mailto:${client.email}`}>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-9 w-9 rounded-full bg-white hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50"
                                    >
                                        <Mail className="h-4 w-4" />
                                    </Button>
                                </a>
                            )}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-gray-900 leading-tight mb-1">{client.name}</h2>
                        {client.company_name && (
                            <p className="text-sm text-gray-500 font-medium mb-4">{client.company_name}</p>
                        )}

                        <div className="space-y-3 text-sm text-gray-600">
                            {client.nit && (
                                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">NIT / ID</span>
                                    <span className="font-mono text-xs bg-gray-50 px-2 py-0.5 rounded">{client.nit}</span>
                                </div>
                            )}

                            {client.address && (
                                <div className="flex items-start gap-3 py-1">
                                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                                    <span className="leading-snug">{client.address}</span>
                                </div>
                            )}

                            {client.website && (
                                <div className="flex items-center gap-3 py-1">
                                    <ExternalLink className="h-4 w-4 text-gray-400 shrink-0" />
                                    <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate">
                                        {client.website}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="border-gray-100 shadow-sm bg-indigo-50/50 border-indigo-100">
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-indigo-600" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Total Invertido</span>
                        </div>
                        <p className="text-lg font-bold text-indigo-900">${totalSpent.toLocaleString()}</p>
                    </CardContent>
                </Card>

                <Card className={cn(
                    "border-gray-100 shadow-sm",
                    totalDebt > 0 ? "bg-red-50/50 border-red-100" : "bg-emerald-50/50 border-emerald-100"
                )}>
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                        <div className="flex items-center gap-2 mb-2">
                            {totalDebt > 0 ? (
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                            ) : (
                                <Clock className="h-4 w-4 text-emerald-600" />
                            )}
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider",
                                totalDebt > 0 ? "text-red-400" : "text-emerald-400"
                            )}>
                                {totalDebt > 0 ? "Pendiente" : "Próximo cobro"}
                            </span>
                        </div>
                        <p className={cn(
                            "text-lg font-bold",
                            totalDebt > 0 ? "text-red-900" : "text-emerald-900"
                        )}>
                            {totalDebt > 0 ? `$${totalDebt.toLocaleString()}` : "Al día"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Active Services Summary */}
            <Card className="border-gray-100 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">Servicios Activos</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{activeServices}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                        <div className="grid grid-cols-2 gap-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
