"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { CreateBriefingForm } from "@/components/modules/briefings/create-briefing-form"
import { getBriefingTemplates } from "@/lib/actions/briefings"
import { supabase } from "@/lib/supabase"
import { BriefingTemplate } from "@/types/briefings"
import { Loader2 } from "lucide-react"

interface BriefingFormModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function BriefingFormModal({ isOpen, onClose, onSuccess }: BriefingFormModalProps) {
    const [loading, setLoading] = useState(true)
    const [templates, setTemplates] = useState<BriefingTemplate[]>([])
    const [clients, setClients] = useState<{ id: string, name: string }[]>([])

    useEffect(() => {
        if (isOpen) {
            fetchData()
        }
    }, [isOpen])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [templatesData, clientsRes] = await Promise.all([
                getBriefingTemplates(),
                supabase.from('clients').select('id, name, company_name').order('name')
            ])

            setTemplates(templatesData || [])
            setClients(clientsRes.data || [])
        } catch (error) {
            console.error("Error fetching dependencies:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] top-[5%] translate-y-0">
                <DialogHeader>
                    <DialogTitle>Nuevo Briefing</DialogTitle>
                    <DialogDescription>
                        Selecciona una plantilla y un cliente para generar un nuevo enlace.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <CreateBriefingForm
                        templates={templates}
                        clients={clients}
                        onSuccess={() => {
                            if (onSuccess) onSuccess()
                            onClose()
                        }}
                    />
                )}
            </DialogContent>
        </Dialog>
    )
}
