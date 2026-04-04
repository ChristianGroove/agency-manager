"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Clock, DollarSign, MoreVertical, Plus, History, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"
import { QuickPayModal } from "./quick-pay-modal"
import { AddWorkLogModal } from "./add-work-log-modal"
import { ViewHistoryDialog } from "./view-history-dialog"

interface StaffPayrollCardProps {
    id: string
    name: string
    firstName: string
    lastName: string
    email: string
    avatar?: string
    totalHours: number
    totalEarned: number
    amountOwed: number
    status: 'debt' | 'clear'
    mode: 'period' | 'debt'
    onRefresh: () => void
}

export function StaffPayrollCard({
    id,
    name,
    firstName,
    lastName,
    email,
    avatar,
    totalHours,
    totalEarned,
    amountOwed,
    status,
    mode,
    onRefresh
}: StaffPayrollCardProps) {
    const [isQuickPayOpen, setIsQuickPayOpen] = useState(false)
    const [isAddHoursOpen, setIsAddHoursOpen] = useState(false)
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)

    const initials = `${firstName[0]}${lastName[0]}`.toUpperCase()

    const handleQuickPay = () => {
        setIsQuickPayOpen(true)
    }

    const handlePaymentSuccess = () => {
        setIsQuickPayOpen(false)
        onRefresh()
    }

    const handleAddHours = () => {
        setIsAddHoursOpen(true)
    }

    const handleHoursAdded = () => {
        setIsAddHoursOpen(false)
        onRefresh()
    }

    const handleViewHistory = () => {
        setIsHistoryOpen(true)
    }

    return (
        <>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between p-4 pb-3 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                            <AvatarImage src={avatar} alt={name} />
                            <AvatarFallback className="bg-blue-600 text-white font-semibold">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-base truncate">{name}</h4>
                            <Badge
                                variant={status === 'debt' ? 'destructive' : 'outline'}
                                className={cn(
                                    "text-xs font-medium",
                                    status === 'debt' ? 'bg-red-600' : 'bg-green-50 text-green-700 border-green-200'
                                )}
                            >
                                {status === 'debt' ? '🔴 DEUDA' : '🟢 AL DÍA'}
                            </Badge>
                        </div>
                    </div>

                    {/* Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleAddHours}>
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar Horas
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleQuickPay} disabled={amountOwed <= 0}>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Registrar Pago
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleViewHistory}>
                                <History className="h-4 w-4 mr-2" />
                                Ver Historial
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Body */}
                <div className="px-4 pb-4 space-y-3">
                    {/* Hours */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>Horas trabajadas</span>
                        </div>
                        <span className="font-semibold text-lg">{totalHours}h</span>
                    </div>

                    {/* Amount Owed */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span>Adeudado</span>
                        </div>
                        <span className={cn(
                            "font-bold text-xl",
                            amountOwed > 0 ? "text-red-600" : "text-green-600"
                        )}>
                            ${amountOwed.toLocaleString()}
                        </span>
                    </div>

                    {/* Primary Action Button */}
                    <div className="mt-6">
                        {mode === 'debt' && amountOwed > 0 ? (
                            <Button
                                onClick={handleQuickPay}
                                className="w-full bg-red-600 hover:bg-red-700 text-white"
                                size="lg"
                            >
                                <DollarSign className="mr-2 h-5 w-5" />
                                💸 Liquidar Deuda
                            </Button>
                        ) : mode === 'period' ? (
                            <Button
                                onClick={() => setIsHistoryOpen(true)}
                                className="w-full"
                                variant="outline"
                                size="lg"
                            >
                                <History className="mr-2 h-5 w-5" />
                                Ver Historial
                            </Button>
                        ) : (
                            <div className="text-center text-sm text-green-600 font-medium py-3 bg-green-50 rounded-lg">
                                ✓ Al día - Sin deuda pendiente
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Modals */}
            <QuickPayModal
                open={isQuickPayOpen}
                onOpenChange={setIsQuickPayOpen}
                staffId={id}
                staffName={name}
                amountOwed={amountOwed}
                onSuccess={handlePaymentSuccess}
            />

            <AddWorkLogModal
                open={isAddHoursOpen}
                onOpenChange={setIsAddHoursOpen}
                preselectedStaffId={id}
                onSuccess={handleHoursAdded}
            />

            <ViewHistoryDialog
                open={isHistoryOpen}
                onOpenChange={setIsHistoryOpen}
                staffId={id}
                staffName={name}
            />
        </>
    )
}
