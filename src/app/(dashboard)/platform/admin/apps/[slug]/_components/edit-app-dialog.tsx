'use client'

import { useState } from 'react'
import { updateApp } from '@/modules/core/saas/app-management-actions'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Settings, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface EditAppDialogProps {
    app: {
        id: string
        name: string
        description: string
        category: string
        price_monthly: number
        color: string
        is_active: boolean
    }
}

export function EditAppDialog({ app }: EditAppDialogProps) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)

        const formData = new FormData(e.currentTarget)

        try {
            const updates = {
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                category: formData.get('category') as string,
                price_monthly: parseFloat(formData.get('price_monthly') as string),
                color: formData.get('color') as string,
                is_active: formData.get('is_active') === 'true'
            }

            const result = await updateApp(app.id, updates)

            if (result.success) {
                toast.success('Template updated successfully!', {
                    description: `Changes to "${updates.name}" have been saved.`,
                    duration: 4000
                })
                setIsOpen(false)
                router.refresh()
            } else {
                toast.error('Failed to update app', {
                    description: result.error || 'Please try again',
                    duration: 5000
                })
            }
        } catch (error: any) {
            toast.error('Error updating app', {
                description: error.message,
                duration: 5000
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Settings className="mr-2 h-4 w-4" />
                    Edit Template
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Settings className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <DialogTitle>Edit Solution Template</DialogTitle>
                            <DialogDescription>
                                Update template details. Changes will affect all organizations using this template.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Warning Alert */}
                    <div className="flex gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-700 dark:text-amber-400">
                            <strong>Important:</strong> Changing the name or price will be visible to all organizations currently using this template.
                        </div>
                    </div>

                    {/* App Name */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Template Name *</Label>
                        <Input
                            id="edit-name"
                            name="name"
                            defaultValue={app.name}
                            placeholder="e.g., Marketing Agency Starter"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-description">Description *</Label>
                        <Textarea
                            id="edit-description"
                            name="description"
                            defaultValue={app.description}
                            placeholder="Brief description"
                            rows={3}
                            required
                        />
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-category">Category *</Label>
                        <Input
                            id="edit-category"
                            name="category"
                            defaultValue={app.category}
                            placeholder="e.g., Agency, Business"
                            required
                        />
                    </div>

                    {/* Pricing */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-price">Monthly Price ($) *</Label>
                        <Input
                            id="edit-price"
                            name="price_monthly"
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={app.price_monthly}
                            placeholder="49.99"
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Price changes will apply to renewals for existing organizations
                        </p>
                    </div>

                    {/* Color */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-color">Brand Color</Label>
                        <div className="flex gap-2">
                            <Input
                                id="edit-color"
                                name="color"
                                type="color"
                                defaultValue={app.color}
                                className="w-16 h-10"
                            />
                            <Input
                                type="text"
                                value={app.color}
                                className="flex-1"
                                readOnly
                            />
                        </div>
                    </div>

                    {/* Active Status */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-active">Status *</Label>
                        <select
                            id="edit-active"
                            name="is_active"
                            defaultValue={app.is_active.toString()}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            required
                        >
                            <option value="true">Active (visible to organizations)</option>
                            <option value="false">Inactive (hidden from marketplace)</option>
                        </select>
                        <p className="text-xs text-muted-foreground">
                            Inactive apps cannot be selected by new organizations
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setIsOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
