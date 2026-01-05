"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Search, ExternalLink, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { regeneratePortalToken } from "@/modules/core/portal/actions"
import { getPortalUrl } from "@/lib/utils"

export default function DebugTokensPage() {
    const [clients, setClients] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [error, setError] = useState("")
    const [regenerating, setRegenerating] = useState<string | null>(null)

    useEffect(() => {
        fetchClients()
    }, [])

    const fetchClients = async () => {
        // 1. Get Organization ID from Cookie (Client Side)
        const getOrgId = () => {
            const match = document.cookie.match(new RegExp('(^| )pixy_org_id=([^;]+)'))
            return match ? match[2] : null
        }
        const currentOrgId = getOrgId()

        if (!currentOrgId) {
            // Fallback or Empty
            setClients([])
            return
        }

        const { data, error } = await supabase
            .from('clients')
            .select('id, name, portal_short_token')
            .eq('organization_id', currentOrgId) // CRITICAL SECURITY FIX
            .is('deleted_at', null)
            .order('name')

        if (error) {
            setError(error.message)
        } else {
            setClients(data || [])
        }
    }

    const handleRegenerate = async (clientId: string) => {
        setRegenerating(clientId)
        try {
            const res = await regeneratePortalToken(clientId)
            if (res.success) {
                // Update local state
                setClients(clients.map(c =>
                    c.id === clientId ? { ...c, portal_short_token: res.token } : c
                ))
            } else {
                throw new Error(res.error)
            }
        } catch (error) {
            console.error('Error generating token:', error)
            alert('Error al generar token')
        } finally {
            setRegenerating(null)
        }
    }

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (error) return <div className="p-8 text-red-500">Error: {error}</div>

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/clients">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Volver
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">Portal Tokens</h1>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar cliente..."
                        className="pl-9 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map(client => (
                    <Card key={client.id} className="overflow-hidden">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-base font-medium truncate" title={client.name}>
                                {client.name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 rounded px-2 py-1.5 font-mono text-xs text-gray-600 truncate select-all">
                                    {client.portal_short_token || "No token"}
                                </div>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 shrink-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={() => handleRegenerate(client.id)}
                                    disabled={regenerating === client.id}
                                    title="Regenerar Token"
                                >
                                    <RefreshCw className={`h-4 w-4 ${regenerating === client.id ? 'animate-spin' : ''}`} />
                                </Button>
                                {client.portal_short_token && (
                                    <a
                                        href={getPortalUrl(`/portal/${client.portal_short_token}`)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Button size="icon" variant="outline" className="h-8 w-8 shrink-0">
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                    </a>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {filteredClients.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                        No se encontraron clientes.
                    </div>
                )}
            </div>
        </div>
    )
}
