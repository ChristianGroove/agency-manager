"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase" // Direct client for admin view or use action
import { Organization } from "@/types/organization"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreateOrganizationSheet } from "@/components/organizations/create-organization-sheet"
import { Plus, Search, Building2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function PlatformOrganizationsPage() {
    const [orgs, setOrgs] = useState<Organization[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [search, setSearch] = useState("")

    useEffect(() => {
        fetchOrgs()
    }, [])

    const fetchOrgs = async () => {
        setIsLoading(true)
        // For Platform view, we likely need a specific admin action or RLS bypass read
        // But since we are "Staff" (assumed), we might rely on RLS allowing "service_role" or specific admin logic.
        // For simplicity in this demo, we'll try to fetch all if the policy allows, or assume we are mocking the "Platform View".
        // In reality, this page should be protected by a "Role = SuperAdmin" check.

        const { data, error } = await supabase
            .from('organizations')
            .select(`
                *,
                saas_products (
                    name
                )
            `)
            .order('created_at', { ascending: false })

        if (data) setOrgs(data as any)
        setIsLoading(false)
    }

    const filteredOrgs = orgs.filter(o =>
        o.name.toLowerCase().includes(search.toLowerCase()) ||
        o.slug.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Organizaciones</h1>
                    <p className="text-gray-500 mt-1">Gestión global de inquilinos (Tenants).</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="mr-2 h-4 w-4" /> Nueva Organización
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Buscar organización..."
                            className="pl-9 w-full md:w-80"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Identidad</TableHead>
                                <TableHead>Plan / App</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Creada</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        Cargando...
                                    </TableCell>
                                </TableRow>
                            ) : filteredOrgs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                                        No se encontraron organizaciones.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredOrgs.map((org: any) => (
                                    <TableRow key={org.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                                                    {org.logo_url ? (
                                                        <img src={org.logo_url} className="h-full w-full object-cover rounded-lg" />
                                                    ) : (
                                                        <Building2 className="h-4 w-4" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{org.name}</span>
                                                    <span className="text-xs text-gray-400">{org.slug}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                                {org.saas_products?.name || "Sin Plan"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={org.subscription_status === 'active' ? 'default' : 'destructive'} className="capitalize">
                                                {org.subscription_status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-500">
                                            {format(new Date(org.created_at), "d MMM, yyyy", { locale: es })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">Detalles</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <CreateOrganizationSheet
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSuccess={fetchOrgs}
            />
        </div>
    )
}
