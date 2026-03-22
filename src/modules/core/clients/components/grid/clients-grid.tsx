"use client"

import React from "react"
import { useClients } from "../../context/clients-context"
import { useTranslation } from "@/lib/i18n/use-translation"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
    MoreVertical, 
    Phone, 
    FileText, 
    Trash2, 
    AlertTriangle, 
    Clock, 
    CheckCircle2,
    Wifi,
    Shield,
    Globe,
    ArrowRight,
    StickyNote
} from "lucide-react"
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { VERTICAL_REGISTRY } from "@/modules/core/organizations/vertical-registry"

export function ClientsGrid({ 
    clients, 
    loading,
    onManage,
    onDelete,
    onCommunication,
    onConnectivity,
    onPortal,
    onInvoices,
    onGoToPortal,
    getPortalUrl,
    onNotes,
    isCompactView
}: any) {
    const { t } = useTranslation()
    const { spaceType } = useClients()
    const config = VERTICAL_REGISTRY[spaceType]

    if (loading) {
        return (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
                {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="h-[300px] animate-pulse bg-gray-100 border-0" />
                ))}
            </div>
        )
    }

    if (clients.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                {t('clients.empty')}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
            {clients.map((client: any, index: number) => {
                const { debt, futureDebt, nextPayment, daysToPay, activeServicesCount } = client
                const isAgency = config.management.actions.showBilling
                const isOverdue = isAgency && daysToPay !== null && daysToPay < 0 && debt > 0
                const isUrgent = isAgency && daysToPay !== null && ((daysToPay <= 5 && daysToPay >= 0) || (daysToPay < 0 && futureDebt > 0))

                return (
                    <div key={client.id || `client-${index}`} className="group relative">
                        <Card className={cn(
                            "relative h-full flex flex-col hover:shadow-lg transition-all duration-300 bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 backdrop-blur-sm",
                            debt > 0 ? "animate-shadow-pulse-slow-red" : futureDebt > 0 ? "animate-shadow-pulse-slow-amber" : ""
                        )}>
                            <CardHeader className="pb-3 pt-5 px-5 relative">
                                <div className="absolute top-4 right-4 z-20">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100">
                                                <MoreVertical className="h-4 w-4 text-gray-400" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56">
                                            <DropdownMenuLabel>{t('clients.actions.administration')}</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {isAgency && (
                                                <>
                                                    <DropdownMenuItem onClick={() => onConnectivity(client)}>
                                                        <Wifi className="mr-2 h-4 w-4" /> {t('clients.actions.connectivity')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => onPortal(client)}>
                                                        <Shield className="mr-2 h-4 w-4" /> {t('clients.actions.portal_governance')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                </>
                                            )}
                                            <DropdownMenuItem className="text-red-600" onClick={() => onDelete(client.id)}>
                                                <Trash2 className="mr-2 h-4 w-4" /> {t('clients.actions.delete')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="flex items-start gap-4">
                                    <Avatar className="h-14 w-14">
                                        <AvatarImage src={client.logo_url} />
                                        <AvatarFallback>{client.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0 pr-10">
                                        <h3 className="font-semibold text-lg line-clamp-2">{client.name}</h3>
                                        <p className="text-sm text-gray-500 truncate">{client.company_name}</p>
                                    </div>
                                </div>
                            </CardHeader>

                            {!isCompactView && (
                                <CardContent className="px-5 space-y-3 flex-1 pb-5">
                                    {isAgency && (
                                    <>
                                        {/* Status Block */}
                                        <div className={cn(
                                            "w-full px-4 py-3 rounded-lg border flex items-center justify-between transition-colors shadow-sm",
                                            debt > 0 ? "bg-red-50 border-red-100 text-red-900" : 
                                            isUrgent ? "bg-amber-50 border-amber-100 text-amber-900" : 
                                            "bg-gray-50 border-gray-100 text-gray-700"
                                        )}>
                                            <div className="flex items-center gap-2">
                                                {debt > 0 ? <AlertTriangle className="h-4 w-4 text-red-600" /> : 
                                                 isUrgent ? <Clock className="h-4 w-4 text-amber-600" /> : 
                                                 <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                                <span className={cn(
                                                    "text-sm font-bold uppercase tracking-wide",
                                                    debt > 0 ? "text-red-700" : isUrgent ? "text-amber-700" : "text-gray-700"
                                                )}>
                                                    {debt > 0 ? t('clients.status.overdue') : isUrgent ? t('clients.status.urgent') : t('clients.status.active')}
                                                </span>
                                            </div>
                                            {(debt > 0 || futureDebt > 0) && (
                                                <span className={cn(
                                                    "text-xl font-black",
                                                    debt > 0 ? "text-red-700" : "text-amber-700"
                                                )}>
                                                    ${(debt + futureDebt).toLocaleString()}
                                                </span>
                                            )}
                                        </div>

                                        {/* Next Payment Section */}
                                        {nextPayment ? (
                                            <div className={cn(
                                                "p-3 rounded-lg border transition-all h-[74px] flex flex-col justify-center",
                                                isOverdue
                                                    ? "bg-red-50 border-red-100"
                                                    : (isUrgent || futureDebt > 0)
                                                        ? "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20"
                                                        : "bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10"
                                            )}>
                                                <div className="flex items-center justify-between mb-1.5 pt-1">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className={cn(
                                                            "h-3.5 w-3.5",
                                                            isOverdue ? "text-red-600" : isUrgent ? "text-amber-600" : "text-gray-500"
                                                        )} />
                                                        <span className={cn(
                                                            "text-xs font-medium uppercase tracking-wide",
                                                            isOverdue ? "text-red-700" : isUrgent ? "text-amber-700" : "text-gray-600"
                                                        )}>
                                                            {isOverdue
                                                                ? t('clients.next_payment.overdue_badge')
                                                                : (daysToPay !== null && daysToPay < 0 && (debt > 0 || futureDebt > 0))
                                                                    ? t('clients.next_payment.pending_badge')
                                                                    : t('clients.next_payment.next_badge')
                                                            }
                                                        </span>
                                                    </div>
                                                    <Badge variant="secondary" className={cn(
                                                        "text-[10px] font-semibold h-5 px-2",
                                                        isOverdue
                                                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                                                            : isUrgent
                                                                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                    )}>
                                                        {daysToPay !== null && daysToPay < 0
                                                            ? (debt > 0 || futureDebt > 0)
                                                                ? t('clients.next_payment.days_ago', { days: Math.abs(daysToPay!) })
                                                                : t('clients.next_payment.up_to_date')
                                                            : t('clients.next_payment.days_left', { days: daysToPay })}
                                                    </Badge>
                                                </div>
                                                <p className={cn(
                                                    "text-sm font-medium truncate pb-1",
                                                    isOverdue ? "text-red-900" : isUrgent ? "text-amber-900" : "text-gray-900"
                                                )}>
                                                    {nextPayment.source}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="p-3 rounded-lg border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-center h-[74px] flex flex-col justify-center items-center">
                                                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">{t('clients.next_payment.no_payment')}</p>
                                            </div>
                                        )}
                                    </>
                                )}

                                </CardContent>
                            )}

                            <CardFooter className="px-5 pb-5 pt-0 flex gap-1 items-center">
                                <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-9 w-9 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" 
                                   onClick={() => onCommunication(client)}
                                   title="Contactar"
                                >
                                    <Phone className="h-4 w-4" />
                                </Button>
                                {isAgency && (
                                    <Button 
                                       variant="ghost" 
                                       size="icon" 
                                       className="h-9 w-9 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" 
                                       onClick={() => onInvoices(client)}
                                       title="Documentos Rápidos"
                                    >
                                        <FileText className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-9 w-9 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" 
                                   onClick={() => onNotes?.(client)}
                                   title="Notas"
                                >
                                    <StickyNote className="h-4 w-4" />
                                </Button>
                                {(spaceType === 'agency' || spaceType === 'platform') && (
                                    <Button 
                                       variant="ghost" 
                                       size="icon" 
                                       className="h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" 
                                       onClick={() => onGoToPortal?.(client)}
                                       title="Ir al Portal"
                                    >
                                        <Globe className="h-4 w-4" />
                                    </Button>
                                )}

                                <Button 
                                   size="sm" 
                                   className="ml-auto bg-slate-900 hover:bg-black text-white rounded-xl px-4 h-9 font-bold text-xs shadow-sm" 
                                   onClick={() => onManage(client)}
                                >
                                    {t('clients.actions.manage')} <ArrowRight className="h-3 w-3 ml-2" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )
            })}
        </div>
    )
}
