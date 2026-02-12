"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Lightbulb, Check } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n/use-translation"

interface SaveAsFAQModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    conversationId: string
}

export function SaveAsFAQModal({ open, onOpenChange, conversationId }: SaveAsFAQModalProps) {
    const { t } = useTranslation()
    const [isExtracting, setIsExtracting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [extracted, setExtracted] = useState<{
        question: string
        answer: string
        category: string
    } | null>(null)

    const handleExtract = async () => {
        setIsExtracting(true)

        try {
            // First, fetch conversation messages
            const messagesRes = await fetch(`/api/conversations/${conversationId}/messages`)
            const messagesData = await messagesRes.json()

            if (!messagesData.messages || messagesData.messages.length === 0) {
                toast.error(t('crm.inbox.chat.faq.no_messages'))
                return
            }

            // Format conversation text
            const conversationText = messagesData.messages
                .slice(-10) // Last 10 messages
                .map((m: any) => `[${m.direction === 'incoming' ? t('common.client') : t('common.agent')}]: ${m.content?.text || ''}`)
                .join('\n')

            // Call extraction API
            const extractRes = await fetch('/api/ai/extract-faq', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationText })
            })

            const extractData = await extractRes.json()

            if (extractData.success && extractData.faq) {
                setExtracted(extractData.faq)
            } else {
                toast.error(extractData.error || t('crm.inbox.chat.faq.extract_error'))
            }
        } catch (error: any) {
            toast.error(error.message || t('common.connection_error'))
        } finally {
            setIsExtracting(false)
        }
    }

    const handleSave = async () => {
        if (!extracted) return
        setIsSaving(true)

        try {
            const res = await fetch('/api/ai/save-faq', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(extracted)
            })

            const data = await res.json()

            if (data.success) {
                toast.success(t('crm.inbox.chat.faq.save_success'))
                onOpenChange(false)
                setExtracted(null)
            } else {
                toast.error(data.error || t('crm.inbox.chat.faq.save_error'))
            }
        } catch (error: any) {
            toast.error(error.message || t('common.connection_error'))
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-500" />
                        {t('crm.inbox.chat.faq.save_as')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('crm.inbox.chat.faq.desc')}
                    </DialogDescription>
                </DialogHeader>

                {!extracted ? (
                    <div className="py-8 text-center">
                        <Button
                            onClick={handleExtract}
                            disabled={isExtracting}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {isExtracting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('crm.inbox.chat.faq.analyzing')}
                                </>
                            ) : (
                                <>
                                    <Lightbulb className="mr-2 h-4 w-4" />
                                    {t('crm.inbox.chat.faq.extract')}
                                </>
                            )}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('crm.inbox.chat.faq.question')}</Label>
                            <Input
                                value={extracted.question}
                                onChange={(e) => setExtracted({ ...extracted, question: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('crm.inbox.chat.faq.answer')}</Label>
                            <Textarea
                                value={extracted.answer}
                                onChange={(e) => setExtracted({ ...extracted, answer: e.target.value })}
                                rows={4}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('crm.inbox.chat.faq.category')}</Label>
                            <Select
                                value={extracted.category}
                                onValueChange={(val) => setExtracted({ ...extracted, category: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="General">{t('crm.inbox.chat.faq.categories.general')}</SelectItem>
                                    <SelectItem value="Billing">{t('crm.inbox.chat.faq.categories.billing')}</SelectItem>
                                    <SelectItem value="Support">{t('crm.inbox.chat.faq.categories.support')}</SelectItem>
                                    <SelectItem value="Product">{t('crm.inbox.chat.faq.categories.product')}</SelectItem>
                                    <SelectItem value="Shipping">{t('crm.inbox.chat.faq.categories.shipping')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('common.cancel')}
                    </Button>
                    {extracted && (
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Check className="mr-2 h-4 w-4" />
                            )}
                            {t('crm.inbox.chat.faq.save_as')}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
