"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Service } from "@/types"
import { ArrowRight, Box, Clock, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"

interface PortalServiceCardProps {
    service: Service
    pendingInvoicesCount: number
    overdueInvoicesCount: number
    pendingBriefingsCount: number
    onClick?: () => void // Make optional since we're removing main navigation
    onPay?: (serviceId: string) => void // New: for quick payment
}

export function PortalServiceCard({ service, pendingInvoicesCount, overdueInvoicesCount, pendingBriefingsCount, onClick, onPay }: PortalServiceCardProps) {
    // Determine overall status
    const hasPending = pendingInvoicesCount > 0 || pendingBriefingsCount > 0

    return (
        <Card
            className="group hover:shadow-md transition-all duration-300 border-gray-100 hover:border-pink-200 overflow-hidden relative bg-white"
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />

            <CardHeader className="p-5 pb-3">
                <div className="flex justify-between items-start gap-4">
                    {/* Icon + Title */}
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100">
                            <Monitor className="h-4.5 w-4.5 text-gray-500" />
                        </div>
                        <CardTitle className="text-base font-bold text-gray-900 leading-tight">
                            {service.name}
                        </CardTitle>
                    </div>

                    {/* Status Tags (Moved to top right) */}
                    <div className="shrink-0 flex gap-2">
                        {(service.quantity || 1) > 1 && (
                            <Badge variant="outline" className="border-gray-200 text-gray-600 bg-gray-50 px-2 py-0.5 h-6 text-xs font-medium">
                                x{service.quantity}
                            </Badge>
                        )}
                        {pendingInvoicesCount > 0 && (
                            <Badge
                                variant="outline"
                                className={cn(
                                    "px-2 py-0.5 h-6 text-xs border-0",
                                    overdueInvoicesCount > 0
                                        ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
                                        : "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20"
                                )}
                            >
                                {pendingInvoicesCount} Fac.
                            </Badge>
                        )}
                        {pendingBriefingsCount > 0 && (
                            <Badge variant="outline" className="border-amber-100 text-amber-600 bg-amber-50 px-2 py-0.5 h-6 text-xs">
                                {pendingBriefingsCount} Brief.
                            </Badge>
                        )}
                        {!hasPending && (
                            <Badge variant="outline" className="border-green-100 text-green-600 bg-green-50 px-2 py-0.5 h-6 text-xs">
                                Al día
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-5 pb-3 pt-0 space-y-3">
                <p className="text-sm text-gray-500 line-clamp-2 pl-[48px]">
                    {service.description || "Servicio activo"}
                </p>

                {/* Service Details - Compact */}
                <div className="flex items-center gap-4 pl-[48px] text-sm">
                    <div className="flex items-center gap-1.5 text-gray-600">
                        <span className="font-semibold">${service.amount?.toLocaleString() || '0'}</span>
                        <span className="text-gray-400">/ {service.frequency === 'monthly' ? 'mes' : service.frequency === 'yearly' ? 'año' : 'único'}</span>
                    </div>
                </div>
            </CardContent>

            {/* Quick Actions Footer */}
            {pendingInvoicesCount > 0 && onPay && (
                <CardFooter className="px-5 py-3 border-t bg-gray-50/50">
                    <Button
                        size="sm"
                        className="w-full bg-pink-500 hover:bg-pink-600 text-white"
                        onClick={(e) => {
                            e.stopPropagation()
                            onPay(service.id)
                        }}
                    >
                        💰 Pagar {pendingInvoicesCount} factura{pendingInvoicesCount > 1 ? 's' : ''}
                    </Button>
                </CardFooter>
            )}
        </Card>
    )
}
