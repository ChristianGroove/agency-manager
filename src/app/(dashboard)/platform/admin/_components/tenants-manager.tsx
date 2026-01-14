"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, MoreVertical, ExternalLink, ShieldAlert, Building, RefreshCw, Plus } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { CreateOrganizationSheet } from "@/components/organizations/create-organization-sheet"

interface TenantsManagerProps {
    organizations: any[]
    allModules: any[]
}

export function TenantsManager({ organizations, allModules }: TenantsManagerProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [filter, setFilter] = useState<'all' | 'active' | 'suspended'>('all')
    const [creationOpen, setCreationOpen] = useState(false)
    const router = useRouter() // Need router to refresh on success if sheet doesn't handle it fully, but sheet does router.refresh().

    const filteredOrgs = organizations.filter(org => {
        const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            org.slug.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesFilter = filter === 'all' || org.status === filter
        return matchesSearch && matchesFilter
    })

    return (
        <Card className="border-none shadow-none bg-transparent">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">Red de Organizaciones</h2>
                        <p className="text-sm text-muted-foreground">Gestión centralizada de todos los tenants del sistema.</p>
                    </div>
                    <Button onClick={() => setCreationOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Organización
                    </Button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-3 bg-white dark:bg-zinc-900/50 p-2 rounded-lg border">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre o slug..."
                            className="pl-9 bg-transparent border-none shadow-none focus-visible:ring-0"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="h-6 w-px bg-border mx-2" />
                    <div className="flex gap-2">
                        <Badge
                            variant={filter === 'all' ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => setFilter('all')}
                        >
                            Todos
                        </Badge>
                        <Badge
                            variant={filter === 'active' ? 'secondary' : 'outline'}
                            className="cursor-pointer hover:bg-green-100 hover:text-green-800"
                            onClick={() => setFilter('active')}
                        >
                            Activos
                        </Badge>
                        <Badge
                            variant={filter === 'suspended' ? 'destructive' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => setFilter('suspended')}
                        >
                            Suspendidos
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-white dark:bg-zinc-900/50">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Organización</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Membresía</TableHead>
                            <TableHead>Creada</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrgs.map((org) => (
                            <TableRow key={org.id}>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium flex items-center gap-2">
                                            <Building className="h-4 w-4 text-muted-foreground" />
                                            {org.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground font-mono">
                                            {org.slug}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="capitalize">
                                        {org.organization_type}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={org.status === 'active' ? 'default' : 'destructive'} className="capitalize">
                                        {org.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {/* Placeholder for plan info if available */}
                                    <span className="text-sm text-muted-foreground">Free Tier</span>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {format(new Date(org.created_at), 'dd MMM yyyy', { locale: es })}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/platform/admin/organizations/${org.id}`}>
                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                    Gestionar en Detalle
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem>
                                                <RefreshCw className="h-4 w-4 mr-2" />
                                                Sincronizar Módulos
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600">
                                                <ShieldAlert className="h-4 w-4 mr-2" />
                                                Suspender Acceso
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="mt-4 text-xs text-muted-foreground text-center">
                Mostrando {filteredOrgs.length} de {organizations.length} organizaciones
            </div>

            <CreateOrganizationSheet
                open={creationOpen}
                onOpenChange={setCreationOpen}
                onSuccess={() => {
                    router.refresh()
                }}
            />
        </Card>
    )
}
