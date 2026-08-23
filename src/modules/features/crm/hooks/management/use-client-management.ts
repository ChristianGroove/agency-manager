import { useState, useEffect, useCallback } from "react"
import { Client } from "@/types"
import { supabase } from "@/modules/core/database/supabase"
import { toast } from "sonner"
import { useTranslation } from "@/modules/core/i18n/use-translation"

export interface EditFormState {
    name: string
    company_name: string
    nit: string
    email: string
    phone: string
    address: string
    logo_url: string
    website: string
    instagram: string
    facebook: string
    tiktok: string
    linkedin: string
    youtube: string
    twitter: string
    category_id: string | null
    notes: string
    // Real Estate & Custom Metadata
    role?: string
    city?: string
    occupation?: string
    bank?: string
    account_type?: "savings" | "checking"
    account_number?: string
    account_holder?: string
    id_number?: string
    credit_status?: string
    monthly_income?: number | string
    metadata?: Record<string, any>
}

export function useClientManagement(clientId: string | null, open: boolean, initialData?: Client) {
    const { t } = useTranslation()
    
    // States
    const [client, setClient] = useState<Client | null>(initialData || null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState<any>(null)
    
    const [editForm, setEditForm] = useState<EditFormState>({
        name: "",
        company_name: "",
        nit: "",
        email: "",
        phone: "",
        address: "",
        logo_url: "",
        website: "",
        instagram: "",
        facebook: "",
        tiktok: "",
        linkedin: "",
        youtube: "",
        twitter: "",
        category_id: null,
        notes: "",
        role: "tenant",
        city: "",
        occupation: "",
        bank: "Bancolombia",
        account_type: "savings",
        account_number: "",
        account_holder: "",
        id_number: "",
        credit_status: "approved",
        monthly_income: "",
        metadata: {}
    })

    const fetchClientData = useCallback(async () => {
        if (!clientId) return

        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('leads')
                .select(`
                    *,
                    services:services!client_id(*),
                    invoices:invoices!client_id(*),
                    quotes:quotes!client_id(*),
                    subscriptions:subscriptions!client_id(*),
                    hosting_accounts:hosting_accounts!client_id(*)
                `)
                .eq('id', clientId)
                .single()

            if (error) throw error

            if (data.services) data.services = data.services.filter((s: any) => !s.deleted_at)
            if (data.invoices) data.invoices = data.invoices.filter((i: any) => !i.deleted_at)
            
            setClient(data)

            const meta = data.metadata || {}
            const bankDetails = meta.bank_details || {}

            // Sync Edit Form
            setEditForm({
                name: data.name || "",
                company_name: data.company_name || "",
                nit: data.nit || "",
                email: data.email || "",
                phone: data.phone || "",
                address: data.address || "",
                logo_url: data.logo_url || "",
                website: data.website || "",
                instagram: data.metadata?.instagram || data.instagram || "",
                facebook: data.metadata?.facebook || data.facebook || "",
                tiktok: data.metadata?.tiktok || data.tiktok || "",
                linkedin: data.metadata?.linkedin || data.linkedin || "",
                youtube: data.metadata?.youtube || data.youtube || "",
                twitter: data.metadata?.twitter || data.twitter || "",
                category_id: data.category_id || null,
                notes: data.notes || "",
                role: meta.role || "other",
                city: meta.city || "",
                occupation: meta.occupation || "",
                bank: bankDetails.bank || "Bancolombia",
                account_type: bankDetails.account_type || "savings",
                account_number: bankDetails.account_number || "",
                account_holder: bankDetails.account_holder || data.name || "",
                id_number: bankDetails.id_number || data.nit || "",
                credit_status: meta.credit_status || "approved",
                monthly_income: meta.monthly_income || "",
                metadata: meta
            })

            // Settings
            const { data: settingsData } = await supabase.from('user_settings').select('*').single()
            if (settingsData) setSettings(settingsData)

        } catch (error) {
            console.error("Error fetching client details:", error)
            toast.error("Error al cargar detalles")
        } finally {
            setLoading(false)
        }
    }, [clientId])

    useEffect(() => {
        if (open && clientId) {
            fetchClientData()
        }
    }, [open, clientId, fetchClientData])

    // Mutators
    const handleUpdateProfile = async () => {
        if (!client) return false
        setSaving(true)
        try {
            const currentMeta = client.metadata || {}
            const updatedMeta: Record<string, any> = {
                ...currentMeta,
                ...(editForm.role ? { role: editForm.role } : {}),
                ...(editForm.city !== undefined ? { city: editForm.city } : {}),
                ...(editForm.occupation !== undefined ? { occupation: editForm.occupation } : {}),
                ...(editForm.credit_status ? { credit_status: editForm.credit_status } : {}),
                ...(editForm.monthly_income ? { monthly_income: Number(editForm.monthly_income) } : {}),
            }

            if (editForm.bank && editForm.account_number) {
                updatedMeta.bank_details = {
                    bank: editForm.bank,
                    account_type: editForm.account_type || "savings",
                    account_number: editForm.account_number,
                    account_holder: editForm.account_holder || editForm.name,
                    id_number: editForm.id_number || editForm.nit
                }
            }

            const { error } = await supabase
                .from('leads')
                .update({
                    name: editForm.name,
                    company_name: editForm.company_name,
                    nit: editForm.nit,
                    email: editForm.email,
                    phone: editForm.phone,
                    address: editForm.address,
                    logo_url: editForm.logo_url,
                    website: editForm.website,
                    instagram: editForm.instagram,
                    facebook: editForm.facebook,
                    tiktok: editForm.tiktok,
                    linkedin: editForm.linkedin,
                    youtube: editForm.youtube,
                    twitter: editForm.twitter,
                    category_id: editForm.category_id,
                    notes: editForm.notes,
                    metadata: updatedMeta
                })
                .eq('id', client.id)

            if (error) throw error
            toast.success("Perfil actualizado")
            fetchClientData()
            return true
        } catch (error) {
            toast.error("Error al actualizar perfil")
            return false
        } finally {
            setSaving(false)
        }
    }

    const handleMarkInvoicePaid = async (invoiceId: string) => {
        try {
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'paid', payment_status: 'PAID' })
                .eq('id', invoiceId)
            if (error) throw error
            toast.success("Factura pagada")
            fetchClientData()
        } catch (error) {
            toast.error("Error al actualizar factura")
        }
    }

    const handlePauseService = async (serviceId: string) => {
        if (!confirm("¿Pausar servicio?")) return
        try {
            const { error } = await supabase
                .from('services')
                .update({ status: 'cancelled', next_billing_date: null })
                .eq('id', serviceId)
            if (error) throw error
            toast.success("Servicio pausado")
            fetchClientData()
        } catch (error) {
            toast.error("Error al pausar")
        }
    }

    const handleLogoUpload = async (file: File) => {
        if (!client) return
        setSaving(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${client.id}-${Math.random()}.${fileExt}`
            const filePath = `company-logos/${fileName}`

            const { error: uploadError } = await supabase.storage.from('public-assets').upload(filePath, file)
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('public-assets').getPublicUrl(filePath)
            setEditForm(prev => ({ ...prev, logo_url: publicUrl }))

            await supabase.from('leads').update({ logo_url: publicUrl }).eq('id', client.id)
            fetchClientData()
            toast.success("Logo actualizado")
        } catch (error) {
            toast.error("Error al subir logo")
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteService = async (serviceId: string) => {
        if (!confirm("¿Eliminar servicio permanentemente?")) return
        try {
            const { deleteInvoicesAction: deleteServices } = await import("@/modules/features/billing/billing-actions")
            const result = await deleteServices([serviceId])
            if (result.success) {
                toast.success("Servicio eliminado")
                fetchClientData()
            } else throw new Error()
        } catch (error) {
            toast.error("Error al eliminar")
        }
    }

    return {
        client,
        loading,
        saving,
        settings,
        editForm,
        setEditForm,
        handleUpdateProfile,
        handleMarkInvoicePaid,
        handlePauseService,
        handleDeleteService,
        handleLogoUpload,
        refresh: fetchClientData
    }
}
