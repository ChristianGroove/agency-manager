"use client"

import { AdminOrganization } from '@/app/actions/admin-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Ban, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface OrganizationsTableProps {
    organizations: AdminOrganization[]
}

export function OrganizationsTable({ organizations }: OrganizationsTableProps) {
    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-green-500">Active</Badge>
            case 'suspended':
                return <Badge variant="destructive">Suspended</Badge>
            case 'past_due':
                return <Badge variant="secondary">Past Due</Badge>
            case 'archived':
                return <Badge variant="outline">Archived</Badge>
            default:
                return <Badge variant="outline">{status || 'Unknown'}</Badge>
        }
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Base App</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {organizations.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                No organizations found
                            </TableCell>
                        </TableRow>
                    ) : (
                        organizations.map((org) => (
                            <TableRow key={org.id}>
                                <TableCell className="font-medium">{org.name}</TableCell>
                                <TableCell className="font-mono text-sm">{org.slug}</TableCell>
                                <TableCell>{getStatusBadge(org.status)}</TableCell>
                                <TableCell>
                                    {org.base_app_slug ? (
                                        <Badge variant="outline">{org.base_app_slug}</Badge>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {format(new Date(org.created_at), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/platform/admin/organizations/${org.id}`}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    View Details
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            {org.status === 'active' ? (
                                                <DropdownMenuItem className="text-destructive">
                                                    <Ban className="mr-2 h-4 w-4" />
                                                    Suspend Service
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem className="text-green-600">
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    Reactivate
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
