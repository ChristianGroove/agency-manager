"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, UserPlus, Loader2 } from "lucide-react"
import { createStaffProfile, getPotentialStaff } from "@/app/actions/workforce-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function CreateStaffDialog({ orgId }: { orgId: string }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(false)
    const [candidates, setCandidates] = useState<any[]>([])
    const [selectedMember, setSelectedMember] = useState<string>("")
    const [rate, setRate] = useState<string>("0")

    const router = useRouter()

    useEffect(() => {
        if (open) {
            setFetching(true)
            getPotentialStaff(orgId)
                .then(data => setCandidates(data))
                .catch(err => toast.error("Error cargando usuarios"))
                .finally(() => setFetching(false))
        }
    }, [open, orgId])

    const handleSubmit = async () => {
        if (!selectedMember) return

        setLoading(true)
        const selectedUser = candidates.find(c => c.id === selectedMember)

        if (!selectedUser?.user_id) {
            toast.error("El usuario seleccionado no tiene un ID de auth válido")
            setLoading(false)
            return
        }

        const res = await createStaffProfile(orgId, {
            member_id: selectedMember,
            user_id: selectedUser.user_id,
            hourly_rate: Number(rate),
            color: "#3b82f6" // Default Blue
        })

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Staff añadido correctamente")
            setOpen(false)
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Nuevo Staff
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Añadir Miembro al Staff</DialogTitle>
                    <DialogDescription>
                        Selecciona un usuario existente de tu organización para asignarlo como fuerza laboral.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="member">Usuario</Label>
                        <Select onValueChange={setSelectedMember} value={selectedMember}>
                            <SelectTrigger>
                                <SelectValue placeholder={fetching ? "Cargando..." : "Seleccionar usuario"} />
                            </SelectTrigger>
                            <SelectContent>
                                {candidates.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.full_name || c.email}
                                    </SelectItem>
                                ))}
                                {!fetching && candidates.length === 0 && (
                                    <div className="p-2 text-sm text-center text-muted-foreground">
                                        No hay usuarios disponibles
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="rate">Tarifa por Hora (Base)</Label>
                        <Input
                            id="rate"
                            type="number"
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            min="0"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={loading || !selectedMember}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Añadir Staff
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
