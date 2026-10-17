"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard, Calendar, Check, Package, Zap, History, Download, ExternalLink, AlertTriangle, AlertCircle, Clock } from "lucide-react"
import { SaasApp } from "@/types/saas"
import { 
    createSubscriptionPaymentTransactionAction as createSubscriptionPaymentTransaction, 
    getSubscriptionHistory,
    getOrganizationSubscription,
    getCurrentOrgPendingPlatformInvoicesAction,
    createManualInvoicePaymentTransactionAction
} from "@/modules/features/billing/billing-actions"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { es, enUS } from "date-fns/locale"
import { format } from "date-fns"
import { useTranslation } from "@/modules/core/i18n/use-translation"

interface SubscriptionSettingsTabProps {
    app: SaasApp | null | undefined
    allowDirectBilling?: boolean
}

// Declare global Wompi widget type
declare global {
    interface Window {
        WidgetCheckout: any
    }
}

export function SubscriptionSettingsTab({ app, allowDirectBilling }: SubscriptionSettingsTabProps) {
    const { t, locale } = useTranslation()
    const dateLocale = locale === 'en' ? enUS : es
    const [isLoading, setIsLoading] = useState(false)
    const [history, setHistory] = useState<any[]>([])
    const [sub, setSub] = useState<any>(null)
    const [pendingInvoices, setPendingInvoices] = useState<any[]>([])

    // Load history on mount
    useEffect(() => {
        if (app && allowDirectBilling) {
            getSubscriptionHistory().then(setHistory)
            getOrganizationSubscription().then(setSub)
            getCurrentOrgPendingPlatformInvoicesAction().then(setPendingInvoices)
        }
    }, [app, allowDirectBilling])

    const handlePay = async () => {
        setIsLoading(true)
        try {
            const result = await createSubscriptionPaymentTransaction() as any // Cast to any to avoid TS issues with dynamic signature

            if (!result.success) {
                toast.error(t('settings.subscription.toasts.init_tx_error'))
                setIsLoading(false)
                return
            }

            console.log('[Wompi Settings] Initializing:', result)

            if (!window.WidgetCheckout) {
                toast.error(t('settings.subscription.toasts.payment_system_loading'))
                setIsLoading(false)
                return
            }

            const checkout = new window.WidgetCheckout({
                currency: result.currency,
                amountInCents: result.amountInCents,
                reference: result.reference,
                publicKey: result.publicKey,
                ...(result.signature ? { signature: { integrity: result.signature } } : {})
            })

            checkout.open((res: any) => {
                const transaction = res.transaction
                if (transaction.status === 'APPROVED') {
                    toast.success(t('settings.subscription.toasts.payment_received'))
                    // Refresh history immediately
                    getSubscriptionHistory().then(setHistory)
                    // Double check in 2 seconds to ensure DB propagation
                    setTimeout(() => getSubscriptionHistory().then(setHistory), 2000)
                } else if (transaction.status === 'ERROR') {
                    toast.error(`${t('settings.subscription.toasts.tx_error_prefix')}${transaction.status_message}`)
                }
                setIsLoading(false)
            })

        } catch (error: any) {
            toast.error(`${t('settings.subscription.toasts.unexpected_error_prefix')}${error.message}`)
            setIsLoading(false)
        }
    }

    const handlePayInvoice = async (invoiceId: string) => {
        setIsLoading(true)
        try {
            const result = await createManualInvoicePaymentTransactionAction(invoiceId) as any
            if (!result.success) {
                toast.error(t('settings.subscription.toasts.invoice_init_error'))
                setIsLoading(false)
                return
            }

            if (!window.WidgetCheckout) {
                toast.error(t('settings.subscription.toasts.payment_system_loading'))
                setIsLoading(false)
                return
            }

            const checkout = new window.WidgetCheckout({
                currency: result.currency,
                amountInCents: result.amountInCents,
                reference: result.reference,
                publicKey: result.publicKey,
                ...(result.signature ? { signature: { integrity: result.signature } } : {})
            })

            checkout.open((res: any) => {
                const transaction = res.transaction
                if (transaction.status === 'APPROVED') {
                    toast.success(t('settings.subscription.toasts.invoice_paid_success'))
                    getCurrentOrgPendingPlatformInvoicesAction().then(setPendingInvoices)
                    getSubscriptionHistory().then(setHistory)
                    getOrganizationSubscription().then(setSub)
                    setTimeout(() => {
                        getCurrentOrgPendingPlatformInvoicesAction().then(setPendingInvoices)
                        getSubscriptionHistory().then(setHistory)
                        getOrganizationSubscription().then(setSub)
                    }, 2000)
                } else if (transaction.status === 'ERROR') {
                    toast.error(`${t('settings.subscription.toasts.tx_error_prefix')}${transaction.status_message}`)
                }
                setIsLoading(false)
            })
        } catch (error: any) {
            toast.error(`${t('settings.subscription.toasts.unexpected_error_prefix')}${error.message}`)
            setIsLoading(false)
        }
    }

    if (!app) {
        return (
            <Card className="glass-card rounded-2xl relative overflow-hidden">
                <CardHeader>
                    <CardTitle>{t('settings.subscription.no_plan_title')}</CardTitle>
                    <CardDescription>
                        {t('settings.subscription.no_plan_desc')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center py-10">
                    <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">{t('settings.subscription.no_active_plan')}</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                        {t('settings.subscription.no_plan_notice')}
                    </p>
                </CardContent>
            </Card>
        )
    }

    const rawPrice = app.price_monthly // || app.price if schema varies
    const priceValue = rawPrice ? Number(rawPrice) : 0

    const price = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
    }).format(isNaN(priceValue) ? 0 : priceValue)

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'active':
                return { label: t('settings.subscription.status.active_label'), desc: t('settings.subscription.status.active_desc'), color: 'green', icon: CreditCard }
            case 'past_due':
                return { label: t('settings.subscription.status.past_due_label'), desc: t('settings.subscription.status.past_due_desc'), color: 'amber', icon: AlertTriangle }
            case 'suspended':
                return { label: t('settings.subscription.status.suspended_label'), desc: t('settings.subscription.status.suspended_desc'), color: 'red', icon: AlertCircle }
            case 'legacy_manual':
                return { label: t('settings.subscription.status.legacy_manual_label'), desc: t('settings.subscription.status.legacy_manual_desc'), color: 'blue', icon: Clock }
            default:
                return { label: t('settings.subscription.status.unknown_label'), desc: t('settings.subscription.status.unknown_desc'), color: 'gray', icon: AlertCircle }
        }
    }

    const statusInfo = getStatusInfo(sub?.status || 'active')
    const bypassActive = sub?.bypass_until && new Date(sub.bypass_until) > new Date()

    return (
        <div className="space-y-8">
            {/* Wompi Script */}
            <script src="https://checkout.wompi.co/widget.js" async></script>

            {/* Current Plan Card */}
            <Card className="glass-card rounded-2xl relative overflow-hidden border-primary/20 bg-primary/5 dark:bg-primary/10">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-2xl flex items-center gap-3">
                                {app.name}
                                <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">
                                    {t('settings.subscription.active_badge')}
                                </Badge>
                            </CardTitle>
                            <CardDescription className="mt-2 text-base">
                                {app.description}
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-primary">
                                {price}
                                <span className="text-sm font-normal text-muted-foreground ml-1">{t('settings.subscription.per_month')}</span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1 flex items-center justify-end gap-1">
                                <Calendar className="h-3 w-3" />
                                {t('settings.subscription.monthly_renewal')}
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-primary/10">
                        <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-500" />
                                {t('settings.subscription.included_title')}
                            </h4>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" />
                                    {app.category === 'vertical' ? t('settings.subscription.included_module_vertical') : t('settings.subscription.included_module_agency')}
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" />
                                    {t('settings.subscription.included_support')}
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" />
                                    {t('settings.subscription.included_updates')}
                                </li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <div className="rounded-lg bg-background p-4 border shadow-sm relative overflow-hidden">
                                {bypassActive && (
                                    <div className="absolute top-0 left-0 w-full h-1 bg-brand-pink" />
                                )}
                                <h4 className="text-sm font-medium mb-2 text-muted-foreground flex items-center justify-between">
                                    {t('settings.subscription.billing_status_title')}
                                </h4>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full bg-${statusInfo.color}-100 dark:bg-${statusInfo.color}-900/30`}>
                                        <statusInfo.icon className={`h-5 w-5 text-${statusInfo.color}-600 dark:text-${statusInfo.color}-400`} />
                                    </div>
                                    <div>
                                        <div className={`font-medium text-${statusInfo.color}-700 dark:text-${statusInfo.color}-400`}>
                                            {statusInfo.label}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{statusInfo.desc}</div>
                                    </div>
                                </div>
                                {sub?.current_period_end && (
                                    <div className="mt-3 pt-3 border-t text-xs flex justify-between text-muted-foreground">
                                        <span>{t('settings.subscription.next_cutoff')}</span>
                                        <span className="font-medium text-foreground">{format(new Date(sub.current_period_end), 'PPP', { locale: dateLocale })}</span>
                                    </div>
                                )}
                                {bypassActive && (
                                    <div className="mt-2 bg-brand-pink/10 text-brand-pink text-xs p-2 rounded flex items-center gap-2">
                                        <Zap className="h-3 w-3" />
                                        <span>{t('settings.subscription.grace_period', { date: format(new Date(sub.bypass_until), 'd MMM', { locale: dateLocale }) })}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                {allowDirectBilling ? (
                                    <Button className="w-full bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md transition-all hover:scale-[1.02]" onClick={handlePay} disabled={isLoading}>
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                                        {t('settings.subscription.renew_button')}
                                    </Button>
                                ) : (
                                    <Button className="w-full" variant="secondary" disabled title={t('settings.subscription.managed_tooltip')}>
                                        {t('settings.subscription.managed_by_agency')}
                                    </Button>
                                )}
                            </div>
                            {!allowDirectBilling && (
                                <p className="text-xs text-center text-muted-foreground">
                                    {t('settings.subscription.managed_notice')}
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Pending Invoices */}
            {allowDirectBilling && pendingInvoices && pendingInvoices.length > 0 && (
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-red-600 dark:text-red-400">
                        <AlertCircle className="h-5 w-5" />
                        {t('settings.subscription.pending_invoices_title')}
                    </h3>
                    <div className="grid gap-4">
                        {pendingInvoices.map(invoice => (
                            <Card key={invoice.id} className="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10">
                                <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                                            <AlertTriangle className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-red-900 dark:text-red-300">
                                                {invoice.concept || t('settings.subscription.pending_payment_fallback')}
                                            </div>
                                            <div className="text-sm text-red-700/80 dark:text-red-400/80">
                                                {t('settings.subscription.issued_on', { date: format(new Date(invoice.created_at), 'PPP', { locale: dateLocale }) })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className="text-xl font-bold text-red-700 dark:text-red-400">
                                            ${invoice.amount?.toLocaleString()} {invoice.currency || 'USD'}
                                        </div>
                                        <Button 
                                            onClick={() => handlePayInvoice(invoice.id)} 
                                            disabled={isLoading}
                                            className="bg-red-600 hover:bg-red-700 text-white w-full md:w-auto shadow-md"
                                        >
                                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                                            {t('settings.subscription.pay_invoice_button')}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Payment History Table */}
            {allowDirectBilling && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <History className="h-5 w-5" />
                            {t('settings.subscription.history_title')}
                        </h3>
                        {history.length > 0 && (
                            <Badge variant="outline">
                                {history.length === 1
                                    ? t('settings.subscription.history_count_singular', { count: history.length })
                                    : t('settings.subscription.history_count_plural', { count: history.length })}
                            </Badge>
                        )}
                    </div>

                    {history.length > 0 ? (
                        <div className="border rounded-lg divide-y bg-white dark:bg-white/5 dark:divide-white/10">
                            {history.map((tx) => (
                                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                                            <Check className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{tx.metadata?.concept || t('settings.subscription.history_payment_fallback')}</div>
                                            <div className="text-xs text-muted-foreground flex gap-2">
                                                <span>{format(new Date(tx.created_at), 'PPP', { locale: dateLocale })}</span>
                                                <span>•</span>
                                                <span className="font-mono">{tx.reference.split('-').slice(-1)[0]}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold">${(tx.amount_in_cents / 100).toLocaleString()} {tx.currency}</div>
                                        <div className="flex justify-end mt-1">
                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-green-600 border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
                                                {t('settings.subscription.approved_badge')}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Card className="glass-card rounded-2xl relative overflow-hidden p-8 text-center border-dashed bg-muted/30">
                            <div className="mx-auto w-10 h-10 bg-muted rounded-full flex items-center justify-center mb-3">
                                <History className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <h4 className="font-medium text-sm">{t('settings.subscription.no_history_title')}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{t('settings.subscription.no_history_desc')}</p>
                        </Card>
                    )}
                </div>
            )}
        </div>
    )
}

