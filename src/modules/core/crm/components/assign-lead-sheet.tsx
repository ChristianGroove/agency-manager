'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Search, UserPlus, Check } from 'lucide-react'
import { getOrganizationMembers } from '@/modules/core/settings/actions/team-actions'
import { assignLeads } from '../crm-advanced-actions'
import { toast } from 'sonner'
// Removed useQuery dependency to avoid install issues, using useEffect

interface AssignLeadSheetProps {
    open: boolean
    onClose: () => void
    leadIds: string[]
    currentAssigneeId?: string
    onSuccess: () => void
}

export function AssignLeadSheet({ open, onClose, leadIds, currentAssigneeId, onSuccess }: AssignLeadSheetProps) {
    const [search, setSearch] = useState('')
    const [selectedUserId, setSelectedUserId] = useState<string | null>(currentAssigneeId || null)
    const [assigning, setAssigning] = useState(false)
    const [members, setMembers] = useState<any[]>([]) // Using any[] for members to avoid strict typing issues for now as structure matches
    const [loadingMembers, setLoadingMembers] = useState(false)

    // Fetch members with useEffect
    useEffect(() => {
        if (open) {
            loadMembers()
        }
    }, [open])

    async function loadMembers() {
        setLoadingMembers(true)
        try {
            const data = await getOrganizationMembers()
            setMembers(data || [])
        } catch (error) {
            console.error('Error loading members:', error)
            toast.error('Error cargando miembros del equipo')
        } finally {
            setLoadingMembers(false)
        }
    }

    // Filter members
    const filteredMembers = members.filter(member => {
        const term = search.toLowerCase()
        const name = member.user?.full_name?.toLowerCase() || ''
        const email = member.user?.email?.toLowerCase() || ''
        return name.includes(term) || email.includes(term)
    })

    async function handleAssign() {
        setAssigning(true)
        try {
            const result = await assignLeads({
                lead_ids: leadIds,
                assigned_to: selectedUserId
            })

            if (result.success) {
                toast.success(selectedUserId ? 'Lead asignado exitosamente' : 'Lead desasignado')
                onSuccess()
                onClose()
            } else {
                toast.error('Error al asignar lead')
            }
        } catch (error) {
            console.error('Assign error:', error)
            toast.error('Error al asignar lead')
        } finally {
            setAssigning(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Asignar Lead{leadIds.length > 1 ? 's' : ''}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar miembro..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>

                    <ScrollArea className="h-[300px] border rounded-md p-2">
                        {loadingMembers ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Cargando miembros...
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <div
                                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${selectedUserId === null ? 'bg-slate-100 dark:bg-slate-800' : ''
                                        }`}
                                    onClick={() => setSelectedUserId(null)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                            <UserPlus className="h-4 w-4" />
                                        </div>
                                        <span className="text-sm font-medium">Sin Asignar</span>
                                    </div>
                                    {selectedUserId === null && <Check className="h-4 w-4 text-primary" />}
                                </div>

                                {filteredMembers.map((member) => (
                                    <div
                                        key={member.user_id}
                                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${selectedUserId === member.user_id ? 'bg-slate-100 dark:bg-slate-800' : ''
                                            }`}
                                        onClick={() => setSelectedUserId(member.user_id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={member.user?.avatar_url || ''} />
                                                <AvatarFallback>{member.user?.full_name?.[0] || 'U'}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-medium">{member.user?.full_name || 'Usuario'}</p>
                                                <p className="text-xs text-muted-foreground">{member.role}</p>
                                            </div>
                                        </div>
                                        {selectedUserId === member.user_id && <Check className="h-4 w-4 text-primary" />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleAssign} disabled={assigning}>
                        {assigning ? 'Asignando...' : 'Confirmar Asignación'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
