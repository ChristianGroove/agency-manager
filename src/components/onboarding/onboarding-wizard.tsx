"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, Check, Building2, LayoutGrid } from "lucide-react"
import { createClientOrganization } from "@/modules/core/organizations/actions"
import { getAvailableApps } from "@/modules/core/saas/actions"

import { useBranding } from "@/components/providers/branding-provider"

import { AppSlider } from "./app-slider"

export function OnboardingWizard() {
    const router = useRouter()
    const branding = useBranding()
    const primaryColor = branding?.colors?.primary || "#4f46e5"

    const [isLoading, setIsLoading] = useState(false)
    const [isAppsLoading, setIsAppsLoading] = useState(true)
    const [apps, setApps] = useState<any[]>([])
    const [domainBase, setDomainBase] = useState("")

    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        app_id: ""
    })

    // Domain Detection
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname
            if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
                setDomainBase('.localhost:3000')
            } else {
                if (hostname.startsWith('app.')) {
                    setDomainBase('.' + hostname.substring(4))
                } else {
                    const parts = hostname.split('.')
                    if (parts.length > 2) {
                        setDomainBase('.' + parts.slice(1).join('.'))
                    } else {
                        setDomainBase('.' + hostname)
                    }
                }
            }
        }
    }, [])

    // Load Apps
    useEffect(() => {
        async function loadApps() {
            try {
                const data = await getAvailableApps()
                setApps(data || [])
                // Pre-select Agency
                const marketingApp = data?.find((a: any) => a.id === 'app_marketing_starter')
                if (marketingApp) {
                    setFormData(prev => ({ ...prev, app_id: marketingApp.id }))
                } else if (data && data.length > 0) {
                    setFormData(prev => ({ ...prev, app_id: data[0].id }))
                }
            } catch (e) {
                console.error("Failed to load apps", e)
                toast.error("Error cargando aplicaciones")
            } finally {
                setIsAppsLoading(false)
            }
        }
        loadApps()
    }, [])

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value
        const slug = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        setFormData(prev => ({ ...prev, name, slug }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name || !formData.slug || !formData.app_id) {
            toast.error("Por favor completa todos los campos")
            return
        }
        setIsLoading(true)
        try {
            const result = await createClientOrganization({
                name: formData.name,
                slug: formData.slug,
                app_id: formData.app_id
            })
            if (result.success) {
                toast.success("Organización creada exitosamente")
                router.push('/')
                router.refresh()
            } else {
                toast.error(result.error || "Error al crear la organización")
                setIsLoading(false)
            }
        } catch (error) {
            console.error(error)
            toast.error("Error inesperado")
            setIsLoading(false)
        }
    }

    if (isAppsLoading) {
        return (
            <div className="w-full h-[600px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
        )
    }

    return (
        <div className="w-full max-w-md mx-auto h-full flex flex-col justify-center animate-in fade-in zoom-in duration-500 py-6">

            {/* Top: 3D Slider (Compact & Magnetic) */}
            <div className="w-full mb-6 relative z-10">
                <div className="text-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Elige tu Motor</h2>
                </div>
                <AppSlider
                    apps={apps}
                    selectedAppId={formData.app_id}
                    onSelect={(id) => setFormData(prev => ({ ...prev, app_id: id }))}
                    primaryColor={primaryColor}
                />
            </div>

            {/* Bottom: Minimal Form */}
            <div className="w-full bg-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/50 relative z-20">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-gray-600 text-[10px] uppercase font-bold tracking-wider pl-1">Organización</Label>
                        <Input
                            id="name"
                            placeholder="Nombre de tu empresa"
                            value={formData.name}
                            onChange={handleNameChange}
                            className="bg-white/80 border-gray-200 focus:ring-2 focus:ring-offset-0 transition-all shadow-sm h-10 text-sm"
                            style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="slug" className="text-gray-600 text-[10px] uppercase font-bold tracking-wider pl-1">URL del Espacio</Label>
                        <div className="flex rounded-md shadow-sm h-9">
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                className="rounded-r-none bg-white/80 border-gray-200 focus:z-10 focus:ring-2 focus:ring-offset-0 text-right font-medium text-sm h-full"
                                style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
                                placeholder="slug"
                            />
                            <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-200 bg-gray-50/50 text-gray-500 text-[10px] select-none font-medium h-full">
                                {domainBase || '.pixy.com.co'}
                            </span>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full text-white shadow-lg h-10 font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all mt-2"
                        style={{
                            backgroundColor: primaryColor,
                            boxShadow: `0 8px 16px -4px ${primaryColor}50`
                        }}
                        disabled={isLoading || !formData.app_id}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                <span>Lanzando...</span>
                            </>
                        ) : (
                            "Comenzar"
                        )}
                    </Button>
                </form>
            </div>
        </div>
    )
}
