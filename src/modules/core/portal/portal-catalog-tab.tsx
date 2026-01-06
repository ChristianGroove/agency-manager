"use client"

import { useEffect, useState } from "react"
import { ServiceCatalogItem } from "@/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, CheckCircle, ArrowRight, MessageCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { getPortalCatalog, registerServiceInterest } from "@/modules/core/portal/actions"

export function PortalCatalogTab({ settings, client, token }: { settings: any, client: any, token: string }) {
    const [items, setItems] = useState<ServiceCatalogItem[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string>("all")
    const [requestedItems, setRequestedItems] = useState<string[]>([]) // Track requested/interested items locally

    useEffect(() => {
        loadCatalog()
    }, [])

    const loadCatalog = async () => {
        try {
            const data = await getPortalCatalog(token)
            setItems(data || [])
        } catch (error) {
            console.error("Error loading catalog:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleRequestInterest = async (item: ServiceCatalogItem) => {
        // 1. Optimistic Update
        setRequestedItems(prev => [...prev, item.id])

        // 2. Open WhatsApp Immediately
        const phone = settings.agency_phone || '573000000000' // Fallback
        const message = `Hola, estoy interesado en el servicio *${item.name}* que vi en el portal de clientes. Me gustaría recibir más información.`
        const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`

        window.open(whatsappUrl, '_blank')

        // 3. Log event in background (Server Action)
        // We need the portal token. Since we don't have it explicitly in props, we can rely on client ID or pass token.
        // For security, server actions usually act on session or verified token. 
        // We will assume 'client.portal_short_token' or 'client.portal_token' is available in the client prop we just added.
        if (client?.portal_short_token || client?.portal_token) {
            await registerServiceInterest(client.portal_short_token || client.portal_token || '', item.id, item.name)
        }
    }

    const categories = Array.from(new Set(items.map(i => i.category)))
    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
        return matchesSearch && matchesCategory
    })

    const formatPrice = (price?: number) => {
        if (!price) return "Consultar"
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price)
    }

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-gray-300" /></div>

    return (
        <div className="max-w-6xl mx-auto w-full pb-24 animate-in fade-in duration-500">
            <div className="mb-8 text-center space-y-4">
                <h2 className="text-3xl font-bold text-gray-900">Explora nuestros servicios</h2>
                <p className="text-gray-500 max-w-2xl mx-auto">
                    Descubre cómo podemos ayudarte a seguir creciendo. Solicita información sobre cualquiera de nuestros servicios premium.
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md p-4 rounded-xl -mx-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar servicios..."
                        className="pl-9 bg-white border-gray-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                    <Button
                        variant={selectedCategory === "all" ? "default" : "outline"}
                        onClick={() => setSelectedCategory("all")}
                        className={cn("rounded-full whitespace-nowrap", selectedCategory === "all" ? "bg-black text-white" : "bg-white")}
                    >
                        Todos
                    </Button>
                    {categories.map(cat => (
                        <Button
                            key={cat}
                            variant={selectedCategory === cat ? "default" : "outline"}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn("rounded-full whitespace-nowrap capitalize", selectedCategory === cat ? "bg-black text-white" : "bg-white")}
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map(item => {
                    const isRequested = requestedItems.includes(item.id)
                    return (
                        <Card key={item.id} className="group overflow-hidden border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
                            <div className="p-6 flex-1 space-y-4">
                                <div className="flex justify-between items-start">
                                    <Badge variant="secondary" className="capitalize bg-gray-100 text-gray-600">
                                        {item.category}
                                    </Badge>
                                    {item.type === 'recurring' && <Badge variant="outline" className="text-xs">Suscripción</Badge>}
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-brand-pink transition-colors">
                                        {item.name}
                                    </h3>
                                    <p className="text-gray-500 text-sm mt-2 line-clamp-3">
                                        {item.description}
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 pt-0 mt-auto border-t border-gray-50 bg-gray-50/30">
                                <div className="flex items-center justify-between mb-4 mt-4">
                                    <div className="text-sm text-gray-500">
                                        {item.type === 'recurring' ? 'Desde / mes' : 'Precio base'}
                                    </div>
                                    <div className="text-lg font-bold text-gray-900">
                                        {formatPrice(item.base_price)}
                                    </div>
                                </div>

                                <Button
                                    className={cn("w-full transition-all", isRequested ? "bg-green-600 hover:bg-green-700" : "bg-green-600 hover:bg-green-700 text-white")}
                                    onClick={() => handleRequestInterest(item)}
                                >
                                    {isRequested ? (
                                        <>
                                            <MessageCircle className="h-4 w-4 mr-2" />
                                            Solicitar de nuevo
                                        </>
                                    ) : (
                                        <>
                                            <MessageCircle className="h-4 w-4 mr-2" />
                                            Solicitar por WhatsApp
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
