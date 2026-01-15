"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getPortalData } from "@/modules/core/portal/actions"
import { Loader2, AlertTriangle } from "lucide-react"
import { WorkerPortalLayout } from "@/modules/core/portal/worker-portal-layout"

/**
 * Staff Portal Page
 * 
 * Dedicated route for worker/staff access to their jobs and schedule.
 * Separated from client portal for cleaner UX and future vertical-specific logic.
 * 
 * URL: /staff/[token]
 */
export default function StaffPortalPage() {
    const params = useParams()

    // Staff Data
    const [staff, setStaff] = useState<any>(null)
    const [jobs, setJobs] = useState<any[]>([])
    const [settings, setSettings] = useState<any>({})

    // UI State
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        if (params.token) {
            fetchData(params.token as string)
        }
    }, [params.token])

    const fetchData = async (token: string) => {
        try {
            const data = await getPortalData(token)

            if (data.type !== 'staff') {
                // This is a client token, redirect to client portal
                window.location.href = `/portal/${token}`
                return
            }

            setStaff(data.staff)
            setJobs(data.jobs || [])
            setSettings(data.settings || {})
        } catch (err: any) {
            console.error(err)
            if (err.message === 'PORTAL_TOKEN_EXPIRED') {
                setError("Este enlace ha expirado. Solicita un nuevo enlace a tu administrador.")
            } else {
                setError("No se pudo cargar la información. El enlace puede ser inválido.")
            }
        } finally {
            setLoading(false)
        }
    }

    // Loading State
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                    <p className="text-sm text-gray-500">Cargando tu portal...</p>
                </div>
            </div>
        )
    }

    // Error State
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Error de Acceso</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        )
    }

    // Staff Portal
    if (staff) {
        return (
            <WorkerPortalLayout
                staff={staff}
                jobs={jobs}
                settings={settings}
                token={params.token as string}
            />
        )
    }

    // Fallback
    return null
}
