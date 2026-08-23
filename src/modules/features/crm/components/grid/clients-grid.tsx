"use client"

import React from "react"
import { useClients } from "../../context/clients-context"
import { useTranslation } from "@/modules/core/i18n/use-translation"
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
    StickyNote,
    Building2,
    Landmark,
    Users,
    MapPin,
    Briefcase,
    ShieldCheck,
    CreditCard,
    DollarSign,
    Mail
} from "lucide-react"
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { cn } from "@/modules/infrastructure/utils/utils"
import { VERTICAL_REGISTRY, VerticalType } from "@/modules/core/organizations/vertical-registry"

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
    const config = VERTICAL_REGISTRY[spaceType as VerticalType]

    const isRealEstate = spaceType === 'real_estate'
    const isAgency = (spaceType === 'agency' || spaceType === 'platform') && config?.management?.actions?.showBilling

    if (loading) {
        return (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
                {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="h-[300px] animate-pulse bg-gray-100 dark:bg-zinc-800/50 border-0 rounded-3xl" />
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

    const getRealEstateRoleBadge = (role?: string) => {
        switch (role) {
            case 'tenant':
                return (
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                        ● Inquilino
                    </Badge>
                )
            case 'owner':
                return (
                    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/20 text-[10px] font-bold">
                        ● Propietario
                    </Badge>
                )
            case 'buyer':
                return (
                    <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 text-[10px] font-bold">
                        ● Comprador
                    </Badge>
                )
            case 'seller':
                return (
                    <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[10px] font-bold">
                        ● Vendedor
                    </Badge>
                )
            default:
                return (
                    <Badge variant="outline" className="text-[10px] font-semibold text-zinc-500">
                        ● Contacto
                    </Badge>
                )
        }
    }

    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
            {clients.map((client: any, index: number) => {
                const { debt = 0, futureDebt = 0, nextPayment, daysToPay } = client
                const meta = client.metadata || {}
                const isOverdue = isAgency && daysToPay !== null && daysToPay < 0 && debt > 0
                const isUrgent = isAgency && daysToPay !== null && ((daysToPay <= 5 && daysToPay >= 0) || (daysToPay < 0 && futureDebt > 0))

                return (
                    <div key={client.id || `client-${index}`} className="group relative">
                        <Card className={cn(
                            "glass-card relative h-full flex flex-col hover:-translate-y-1 transition-all duration-200 rounded-3xl border border-zinc-200/80 dark:border-white/10 shadow-sm hover:shadow-md",
                            isAgency && debt > 0 ? "animate-shadow-pulse-slow-red" : isAgency && futureDebt > 0 ? "animate-shadow-pulse-slow-amber" : ""
                        )}>
                            <CardHeader className="pb-3 pt-5 px-5 relative">
                                <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5">
                                    {isRealEstate && getRealEstateRoleBadge(meta.role)}

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                                                <MoreVertical className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56 rounded-2xl">
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

                                <div className="flex items-start gap-3.5 pr-20">
                                    <Avatar className="h-12 w-12 rounded-2xl border border-zinc-200/80 dark:border-white/10">
                                        <AvatarImage src={client.logo_url} />
                                        <AvatarFallback className="bg-brand-pink/10 text-brand-pink font-bold text-sm">
                                            {client.name ? client.name.substring(0, 2).toUpperCase() : "CO"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-base text-zinc-900 dark:text-white line-clamp-1 leading-snug">{client.name}</h3>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{client.company_name || meta.occupation || (isRealEstate ? "Contacto Inmobiliario" : "Cliente")}</p>
                                    </div>
                                </div>
                            </CardHeader>

                            {!isCompactView && (
                                <CardContent className="px-5 space-y-3 flex-1 pb-4">
                                    {/* REAL ESTATE SPACE CUSTOM CARD CONTENT */}
                                    {isRealEstate && (
                                        <div className="space-y-2.5 text-xs">
                                            {/* Contact Details Pill */}
                                            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-white/5 space-y-1.5">
                                                {client.phone && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                                            <Phone className="h-3.5 w-3.5 text-emerald-500" /> Teléfono:
                                                        </span>
                                                        <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{client.phone}</span>
                                                    </div>
                                                )}
                                                {client.email && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                                            <Mail className="h-3.5 w-3.5 text-blue-500" /> Email:
                                                        </span>
                                                        <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate max-w-[170px]">{client.email}</span>
                                                    </div>
                                                )}
                                                {meta.city && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                                            <MapPin className="h-3.5 w-3.5 text-brand-pink" /> Ciudad:
                                                        </span>
                                                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{meta.city}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Financial / Profile Information */}
                                            {meta.bank_details?.bank && (
                                                <div className="p-2.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-300/40 dark:border-amber-500/20 flex items-center justify-between text-[11px]">
                                                    <span className="text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5">
                                                        <Landmark className="h-3.5 w-3.5 text-amber-600" /> Dispersión:
                                                    </span>
                                                    <span className="font-bold text-zinc-900 dark:text-white font-mono">
                                                        {meta.bank_details.bank}
                                                    </span>
                                                </div>
                                            )}

                                            {meta.credit_status && (
                                                <div className="p-2.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-[11px]">
                                                    <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                                                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Estudio de Crédito:
                                                    </span>
                                                    <span className="font-bold text-emerald-700 dark:text-emerald-400 capitalize">
                                                        {meta.credit_status === 'approved' ? 'Aprobado' : meta.credit_status}
                                                    </span>
                                                </div>
                                            )}

                                            {client.notes && (
                                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 italic px-1">
                                                    "{client.notes}"
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* AGENCY SPACE CARD CONTENT */}
                                    {isAgency && (
                                        <>
                                            {/* Status Block */}
                                            <div className={cn(
                                                "w-full px-4 py-3 rounded-lg border flex items-center justify-between transition-colors shadow-sm",
                                                debt > 0 ? "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-900 dark:text-red-400" : 
                                                isUrgent ? "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-900 dark:text-amber-400" : 
                                                "bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 text-gray-700 dark:text-gray-300"
                                            )}>
                                                <div className="flex items-center gap-2">
                                                    {debt > 0 ? <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-500" /> : 
                                                     isUrgent ? <Clock className="h-4 w-4 text-amber-600 dark:text-amber-500" /> : 
                                                     <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                                    <span className={cn(
                                                        "text-sm font-bold uppercase tracking-wide",
                                                        debt > 0 ? "text-red-700 dark:text-red-400" : isUrgent ? "text-amber-700 dark:text-amber-400" : "text-gray-700 dark:text-gray-300"
                                                    )}>
                                                        {debt > 0 ? t('clients.status.overdue') : isUrgent ? t('clients.status.urgent') : t('clients.status.active')}
                                                    </span>
                                                </div>
                                                {(debt > 0 || futureDebt > 0) && (
                                                    <span className={cn(
                                                        "text-xl font-black",
                                                        debt > 0 ? "text-red-700 dark:text-red-500" : "text-amber-700 dark:text-amber-500"
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
                                                        ? "bg-red-50 dark:bg-red-500/5 border-red-100 dark:border-red-500/20"
                                                        : (isUrgent || futureDebt > 0)
                                                            ? "bg-amber-50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/20"
                                                            : "bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 shadow-sm"
                                                )}>
                                                    <div className="flex items-center justify-between mb-1.5 pt-1">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className={cn(
                                                                "h-3.5 w-3.5",
                                                                isOverdue ? "text-red-600 dark:text-red-500" : isUrgent ? "text-amber-600 dark:text-amber-500" : "text-gray-500 dark:text-gray-400"
                                                            )} />
                                                            <span className={cn(
                                                                "text-xs font-medium uppercase tracking-wide",
                                                                isOverdue ? "text-red-700 dark:text-red-400" : isUrgent ? "text-amber-700 dark:text-amber-400" : "text-gray-600 dark:text-gray-400"
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
                                                                ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-none shadow-none"
                                                                : isUrgent
                                                                    ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-none shadow-none"
                                                                    : "bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 border-none shadow-none"
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
                                                        isOverdue ? "text-red-900 dark:text-red-400" : isUrgent ? "text-amber-900 dark:text-amber-400" : "text-gray-900 dark:text-white/80"
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

                                    {/* GENERIC / OTHER SPACES (RESTO, CLEANING, RETAIL, SAAS) */}
                                    {!isAgency && !isRealEstate && (
                                        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-white/5 space-y-1.5 text-xs">
                                            {client.phone && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                                        <Phone className="h-3.5 w-3.5 text-emerald-500" /> Teléfono:
                                                    </span>
                                                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{client.phone}</span>
                                                </div>
                                            )}
                                            {client.email && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                                        <Mail className="h-3.5 w-3.5 text-blue-500" /> Email:
                                                    </span>
                                                    <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate max-w-[170px]">{client.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            )}

                            <CardFooter className="px-5 pb-5 pt-0 flex gap-1.5 items-center border-t border-zinc-100 dark:border-white/5 mt-auto">
                                <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-9 w-9 text-slate-400 dark:text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-all" 
                                   onClick={() => onCommunication(client)}
                                   title="Contactar"
                                >
                                    <Phone className="h-4 w-4" />
                                </Button>
                                {isAgency && (
                                    <Button 
                                       variant="ghost" 
                                       size="icon" 
                                       className="h-9 w-9 text-slate-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-all" 
                                       onClick={() => onInvoices(client)}
                                       title="Documentos Rápidos"
                                    >
                                        <FileText className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-9 w-9 text-slate-400 dark:text-gray-500 hover:text-amber-600 dark:hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl transition-all" 
                                   onClick={() => onNotes?.(client)}
                                   title="Notas"
                                >
                                    <StickyNote className="h-4 w-4" />
                                </Button>
                                {(spaceType === 'agency' || spaceType === 'platform') && (
                                    <Button 
                                       variant="ghost" 
                                       size="icon" 
                                       className="h-9 w-9 text-slate-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all" 
                                       onClick={() => onGoToPortal?.(client)}
                                       title="Ir al Portal"
                                    >
                                        <Globe className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button 
                                   size="sm" 
                                   className="ml-auto bg-brand-pink hover:bg-brand-pink/90 text-white rounded-xl px-4 h-9 font-bold text-xs shadow-sm transition-all active:scale-95" 
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
