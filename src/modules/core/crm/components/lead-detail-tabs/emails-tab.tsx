'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Mail, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import type { LeadEmail } from '@/types/crm-advanced'
import { sendLeadEmail } from '../../crm-advanced-actions'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'

interface LeadEmailsTabProps {
    leadId: string
    leadEmail?: string
    emails: LeadEmail[]
    onUpdate: () => void
}

export function LeadEmailsTab({ leadId, leadEmail, emails, onUpdate }: LeadEmailsTabProps) {
    const [isSending, setIsSending] = useState(false)
    const [isComposeOpen, setIsComposeOpen] = useState(false)
    const [formData, setFormData] = useState({
        to: leadEmail || '',
        subject: '',
        body: ''
    })

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.to || !formData.subject || !formData.body) {
            toast.error("Por favor completa todos los campos")
            return
        }

        setIsSending(true)
        try {
            const result = await sendLeadEmail({
                lead_id: leadId,
                to_email: formData.to,
                subject: formData.subject,
                body_html: `<p>${formData.body.replace(/\n/g, '<br>')}</p>`, // Simple text to html
                body_text: formData.body
            })

            if (result.success) {
                toast.success("Correo enviado (simulado)")
                setFormData({ ...formData, subject: '', body: '' })
                setIsComposeOpen(false)
                onUpdate()
            } else {
                toast.error(result.error || "Error al enviar correo")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error inesperado")
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Compose Section */}
            <Card>
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors" onClick={() => setIsComposeOpen(!isComposeOpen)}>
                    <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-600" />
                        <CardTitle className="text-sm font-medium">Redactar Nuevo Correo</CardTitle>
                    </div>
                    {isComposeOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </CardHeader>
                {isComposeOpen && (
                    <CardContent className="pt-0 pb-4 px-4">
                        <form onSubmit={handleSend} className="space-y-4 mt-2">
                            <div className="grid grid-cols-1 gap-2">
                                <Label htmlFor="to" className="text-xs">Para</Label>
                                <Input
                                    id="to"
                                    value={formData.to}
                                    onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                                    className="h-8"
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <Label htmlFor="subject" className="text-xs">Asunto</Label>
                                <Input
                                    id="subject"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    className="h-8"
                                    placeholder="Asunto del correo..."
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <Label htmlFor="body" className="text-xs">Mensaje</Label>
                                <Textarea
                                    id="body"
                                    value={formData.body}
                                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                    rows={5}
                                    placeholder="Escribe tu mensaje aquí..."
                                    className="resize-none"
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button size="sm" type="submit" disabled={isSending}>
                                    {isSending ? (
                                        <>
                                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-3 w-3" />
                                            Enviar Correo
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                )}
            </Card>

            {/* History Section */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <h3 className="text-sm font-semibold mb-3 px-1 text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    Historial de Correos
                    <Badge variant="secondary" className="text-xs font-normal">
                        {emails.length}
                    </Badge>
                </h3>

                <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4">
                        {emails.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                                No hay correos registrados
                            </div>
                        ) : (
                            emails.map((email) => (
                                <Card key={email.id} className="overflow-hidden">
                                    <div className={`h-1 w-full ${email.direction === 'outbound' ? 'bg-blue-500' : 'bg-green-500'}`} />
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100">{email.subject}</h4>
                                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                    <span>{email.direction === 'outbound' ? 'Enviado a:' : 'Recibido de:'} {email.direction === 'outbound' ? email.to_email : email.from_email}</span>
                                                    <span>•</span>
                                                    <span>{formatDistanceToNow(new Date(email.created_at), { addSuffix: true, locale: es })}</span>
                                                </div>
                                            </div>
                                            <Badge variant={email.status === 'sent' ? 'default' : 'secondary'} className="capitalize">
                                                {email.status}
                                            </Badge>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap border">
                                            {email.body_text || "Sin contenido de texto"}
                                        </div>

                                        <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                                            <div>ID: {email.id.substring(0, 8)}...</div>
                                            <div>{format(new Date(email.created_at), "dd MMM yyyy HH:mm", { locale: es })}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}
