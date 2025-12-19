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
    pendingBriefingsCount: number
    onClick: () => void
}

export function PortalServiceCard({ service, pendingInvoicesCount, pendingBriefingsCount, onClick }: PortalServiceCardProps) {
    // Determine overall status
    const hasPending = pendingInvoicesCount > 0 || pendingBriefingsCount > 0

    return (
        <Card
            className="group hover:shadow-md transition-all duration-300 border-gray-100 hover:border-pink-200 cursor-pointer overflow-hidden relative bg-white"
            onClick={onClick}
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />

            <CardHeader className="p-5 pb-3">
                <div className="flex justify-between items-start gap-4">
                    {/* Icon + Title */}
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-lg bg-pink-50 flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                            <Monitor className="h-4.5 w-4.5 text-pink-500" />
                        </div>
                        <CardTitle className="text-base font-bold text-gray-900 group-hover:text-pink-600 transition-colors leading-tight">
                            {service.name}
                        </CardTitle>
                    </div>

                    {/* Status Tags (Moved to top right) */}
                    <div className="shrink-0 flex gap-2">
                        {pendingInvoicesCount > 0 && (
                            <Badge variant="outline" className="border-red-100 text-red-600 bg-red-50 px-2 py-0.5 h-6 text-xs">
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

            <CardContent className="px-5 pb-5 pt-0">
                <p className="text-sm text-gray-500 line-clamp-2 pl-[48px]">
                    {service.description || "Servicio activo"}
                </p>
            </CardContent>
        </Card>
    )
}
