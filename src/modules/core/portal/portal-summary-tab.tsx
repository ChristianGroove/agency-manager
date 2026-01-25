"use client"

import { Client, Invoice, Quote, Briefing } from "@/types"
import { Button } from "@/components/ui/button"
import { CheckCircle2, FileText, MessageSquare } from "lucide-react"
import { LottieAnimation } from "@/components/ui/lottie-animation"
import { useEffect, useState } from "react"
import { PortalTimeline } from "./portal-timeline"
import { ClientEvent } from "@/types"
import { SplitText } from "@/components/ui/split-text"

// Animations (Moved locally to avoid duplication if we want, or keep separate)
function EmptyStateAnimation() {
    const [animationData, setAnimationData] = useState<any>(null)
    useEffect(() => {
        fetch('/animations/comfortable-reading-with-digital-data-overlay-2025-10-20-06-18-32-utc.json')
            .then(res => res.json()).then(data => setAnimationData(data))
            .catch(err => console.error("Failed to load animation", err))
    }, [])
    if (!animationData) return null
    return <LottieAnimation animationData={animationData} loop={true} />
}

function PendingTasksAnimation() {
    const [animationData, setAnimationData] = useState<any>(null)
    useEffect(() => {
        fetch('/animations/cartoon-task-list-illustration-2025-10-20-03-26-27-utc.json')
            .then(res => res.json()).then(data => setAnimationData(data))
            .catch(err => console.error("Failed to load animation", err))
    }, [])
    if (!animationData) return null
    return <LottieAnimation animationData={animationData} loop={true} />
}

interface PortalSummaryTabProps {
    client: Client
    invoices: Invoice[]
    quotes: Quote[]
    briefings: Briefing[]
    events: ClientEvent[]
    onViewQuote: (quote: Quote) => void
    onViewBriefing: (id: string) => void // New prop to navigate to briefing
}

import { useTranslation } from "@/lib/i18n/use-translation"

export function PortalSummaryTab({ client, invoices, quotes, briefings, events, onViewQuote, onViewBriefing }: PortalSummaryTabProps) {
    const { t } = useTranslation()
    const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'overdue')
    const openQuotes = quotes.filter(q => q.status === 'sent' || q.status === 'draft')
    const pendingBriefings = briefings.filter(b => b.status === 'sent' || b.status === 'in_progress' || b.status === 'draft')

    const hasPending = pendingInvoices.length > 0 || openQuotes.length > 0 || pendingBriefings.length > 0

    return (
        <div className="max-w-4xl mx-auto w-full pb-24 space-y-8 animate-in fade-in duration-500">

            {/* Header Greeting */}
            <div className="text-center space-y-2 mt-8">
                <h1 className="text-3xl font-bold text-gray-900">
                    <SplitText>{`${t('portal.dashboard.welcome').replace('{name}', (client.name?.trim() || client.company_name?.trim() || 'Cliente').split(' ')[0])} 👋`}</SplitText>
                </h1>

                <p className="text-gray-500">{t('portal.summary.subtitle')}</p>
            </div>

            {/* Priority Actions Card */}
            {
                hasPending ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-8">
                            <div className="w-48 h-48 shrink-0 relative">
                                <PendingTasksAnimation />
                            </div>
                            <div className="text-center md:text-left space-y-4 flex-1">
                                <h3 className="text-xl font-bold text-gray-900">{t('portal.summary.pending_tasks_title')}</h3>
                                <p className="text-gray-600">
                                    {pendingInvoices.length > 0 && t('portal.summary.pending_docs').replace('{count}', pendingInvoices.length.toString()) + ' '}
                                    {openQuotes.length > 0 && t('portal.summary.pending_quotes').replace('{count}', openQuotes.length.toString()) + ' '}
                                    {pendingBriefings.length > 0 && t('portal.summary.pending_briefings').replace('{count}', pendingBriefings.length.toString())}
                                </p>
                                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                    {openQuotes.map(quote => (
                                        <Button key={quote.id} onClick={() => onViewQuote(quote)} className="rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 border-0">
                                            <FileText className="h-4 w-4 mr-2" /> {t('portal.summary.buttons.view_quote')}
                                        </Button>
                                    ))}
                                    {pendingBriefings.map(briefing => (
                                        <Button key={briefing.id} onClick={() => onViewBriefing(briefing.id)} className="rounded-full bg-brand-pink/10 text-brand-pink hover:bg-brand-pink/20 border-0">
                                            <MessageSquare className="h-4 w-4 mr-2" /> {t('portal.summary.buttons.answer_briefing')}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center">
                        <div className="w-48 h-48">
                            <EmptyStateAnimation />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mt-4">{t('portal.summary.all_clear_title')}</h3>
                        <p className="text-gray-500 mt-2">{t('portal.summary.all_clear_desc')}</p>
                    </div>
                )
            }

            {/* Timeline Preview */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold mb-4 text-center">{t('portal.summary.recent_activity')}</h3>
                {events && events.length > 0 ? (
                    <PortalTimeline events={events.slice(0, 5)} />
                ) : (
                    <p className="text-gray-400 text-sm text-center py-4">{t('portal.summary.no_activity')}</p>
                )}
            </div>
        </div >
    )
}
