"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { inviteOrgOwner, removeOrgUser } from '@/modules/core/admin/actions'
import { toast } from "sonner"
import { Loader2, Mail, Trash2, Copy, Check } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface AdminOrgUsersProps {
    organizationId: string
    ownerId?: string
    users: any[]
}

export function AdminOrgUsers({ organizationId, ownerId, users }: AdminOrgUsersProps) {
    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [inviteEmail, setInviteEmail] = useState("")

    // Invite Link Success State
    const [generatedLink, setGeneratedLink] = useState<string | null>(null)
    const [hasCopied, setHasCopied] = useState(false)

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteEmail) return

        setIsLoading(true)
        setGeneratedLink(null)

        try {
            const result = await inviteOrgOwner(inviteEmail, organizationId)

            if (result.inviteLink) {
                setGeneratedLink(result.inviteLink)
                toast.success("Link generated successfully!")
            } else {
                // Should not happen if backend is fixed, but fallback
                toast.success("User invited (Check logs if no link appeared).")
                // setIsInviteOpen(false) // Keep open to show state
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to invite user")
        } finally {
            setIsLoading(false)
        }
    }

    const handleRemoveUser = async (userId: string) => {
        if (!confirm("Are you sure you want to remove this user from the organization?")) return

        try {
            await removeOrgUser(userId, organizationId)
            toast.success("User removed successfully")
            // Optional: window.location.reload() or let revalidatePath handle it if using router refresh
            // For immediate feedback
            window.location.reload()
        } catch (error: any) {
            toast.error(error.message || "Failed to remove user")
        }
    }

    const copyToClipboard = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink)
            setHasCopied(true)
            toast.success("Link copied to clipboard!")
            setTimeout(() => setHasCopied(false), 2000)
        }
    }

    // Reset state when dialog closes
    const handleOpenChange = (open: boolean) => {
        setIsInviteOpen(open)
        if (!open) {
            setGeneratedLink(null)
            setInviteEmail("")
            setHasCopied(false)
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>Members of this organization.</CardDescription>
                </div>

                <Dialog open={isInviteOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button>
                            <Mail className="mr-2 h-4 w-4" />
                            Invite Owner
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Invite Organization Owner</DialogTitle>
                            <DialogDescription>
                                {generatedLink
                                    ? "User created successfully! Share this link manually:"
                                    : "Enter the email. A manual invite link will be generated."}
                            </DialogDescription>
                        </DialogHeader>

                        {!generatedLink ? (
                            <form onSubmit={handleInvite}>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">User Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="new.owner@company.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            This will create a user and generate a unique invite link.
                                        </p>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isLoading} className="w-full">
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Generate Invite Link
                                    </Button>
                                </DialogFooter>
                            </form>
                        ) : (
                            <div className="space-y-6 py-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                    <div className="flex justify-center mb-2">
                                        <Check className="h-8 w-8 text-green-600" />
                                    </div>
                                    <h3 className="font-semibold text-green-900">User Created Successfully!</h3>
                                    <p className="text-sm text-green-700 mt-1">
                                        The user has been added to the organization.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-muted-foreground font-bold">Manual Invite Link</Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                readOnly
                                                value={generatedLink}
                                                className="pr-10 font-mono text-xs bg-muted"
                                                onClick={(e) => e.currentTarget.select()}
                                            />
                                        </div>
                                        <Button onClick={copyToClipboard} size="icon" variant="secondary">
                                            {hasCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Copy and send this link to the user. They will set their password instantly.
                                    </p>
                                </div>

                                <DialogFooter className="sm:justify-center">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => {
                                            setIsInviteOpen(false)
                                            window.location.reload() // Force reload to see new user
                                        }}
                                    >
                                        Done & Refresh List
                                    </Button>
                                </DialogFooter>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {users.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        No users assigned yet.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {users.map((member) => (
                            <div key={member.user_id} className="flex items-center justify-between p-2 rounded-lg border">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarFallback>{member.user?.email?.[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        {/* Corrected HTML Structure: div instead of p */}
                                        <div className="font-medium text-sm flex items-center">
                                            {member.user?.email}
                                            {member.user?.platform_role === 'super_admin' && (
                                                <Badge variant="destructive" className="ml-2 text-[10px] px-1 h-4">Super Admin</Badge>
                                            )}
                                        </div>
                                        <div className="flex gap-2 text-xs text-muted-foreground capitalize items-center">
                                            <code className="text-[10px] bg-muted px-1 rounded">{member.user_id.slice(0, 8)}...</code>
                                            <span>{member.role}</span>
                                            {member.user?.email === ownerId || member.role === 'owner' ? (
                                                <Badge variant="secondary" className="h-4 text-[10px] px-1">Owner</Badge>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* Safe Actions Only - Removed Key Button */}
                                    {member.user?.platform_role !== 'super_admin' && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive"
                                            onClick={() => handleRemoveUser(member.user_id)}
                                            title="Remove User"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
