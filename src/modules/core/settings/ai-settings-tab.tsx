"use client"

import { useTransition, useState } from "react"
import { Plus, Trash2, Key, Bot, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { addAICredential, deleteAICredential } from "@/modules/core/ai-engine/actions"

interface AISettingsTabProps {
    credentials: any[]
    providers: any[]
}

export function AISettingsTab({ credentials, providers }: AISettingsTabProps) {
    const [isPending, startTransition] = useTransition()
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    // Form State
    const [selectedProvider, setSelectedProvider] = useState<string>("")
    const [apiKey, setApiKey] = useState("")

    const handleAddKey = () => {
        if (!selectedProvider || !apiKey) return

        startTransition(async () => {
            try {
                await addAICredential(selectedProvider, apiKey)
                toast.success("Credential added successfully")
                setIsDialogOpen(false)
                setApiKey("")
                setSelectedProvider("")
            } catch (error) {
                toast.error("Failed to add credential")
            }
        })
    }

    const handleDelete = (id: string) => {
        if (!confirm("Are you sure? This action cannot be undone.")) return

        startTransition(async () => {
            try {
                await deleteAICredential(id)
                toast.success("Credential deleted")
            } catch (error) {
                toast.error("Failed to delete credential")
            }
        })
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                        <Bot className="h-5 w-5 text-purple-600" />
                        AI Engine Governance
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Manage your AI providers, API keys, and consumption limits.
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-900/20">
                            <Plus className="mr-2 h-4 w-4" /> Add Provider Key
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New AI Credential</DialogTitle>
                            <CardDescription>
                                Your API Key will be encrypted at rest using AES-256.
                            </CardDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Provider</Label>
                                <Select onValueChange={setSelectedProvider} value={selectedProvider}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {providers.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>API Key</Label>
                                <Input
                                    type="password"
                                    placeholder="sk-..."
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddKey} disabled={isPending || !apiKey || !selectedProvider}>
                                {isPending ? "Encrypting & Saving..." : "Save Securely"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Strategy Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="md:col-span-2 border-purple-100 bg-purple-50/50 dark:border-purple-900/20 dark:bg-purple-900/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-800 dark:text-purple-300">
                            <Key className="h-4 w-4" /> Smart Routing Strategy
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            The Engine will attempt to use your credentials in the order listed below (Priority).
                            If a key is exhausted (quota limit) or fails (error 429), it will automatically
                            fallback to the next available key ensuring 99.9% uptime for your AI features.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Global Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            {credentials.filter(c => c.status === 'active').length} / {credentials.length}
                            <span className="text-sm font-normal text-muted-foreground">Active Keys</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* List */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Priority</TableHead>
                            <TableHead>Provider</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Key (Masked)</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {credentials.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No AI credentials configured using <b>BYOK</b> (Bring Your Own Key).
                                </TableCell>
                            </TableRow>
                        ) : (
                            credentials.map((cred, idx) => (
                                <TableRow key={cred.id}>
                                    <TableCell>
                                        <Badge variant="outline" className="font-mono bg-muted">
                                            #{cred.priority}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {cred.providerName}
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={cred.status} />
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {cred.api_key_encrypted}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDelete(cred.id)}
                                            disabled={isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'active') return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">Active</Badge>
    if (status === 'exhausted') return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">Exhausted</Badge>
    return <Badge variant="secondary">{status}</Badge>
}
