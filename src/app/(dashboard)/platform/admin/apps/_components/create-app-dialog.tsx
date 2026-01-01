'use client'

import { useState } from 'react'
import { createApp } from '@/modules/core/saas/app-management-actions'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Package, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function CreateAppDialog() {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)

        const formData = new FormData(e.currentTarget)

        try {
            const result = await createApp({
                name: formData.get('name') as string,
                slug: (formData.get('name') as string).toLowerCase().replace(/\s+/g, '-'),
                description: formData.get('description') as string,
                category: formData.get('category') as string,
                price_monthly: parseFloat(formData.get('price_monthly') as string),
                color: formData.get('color') as string || '#8B5CF6',
            })

            if (result.success) {
                toast.success('Template created successfully!')
                setIsOpen(false)
                router.refresh()
                    // Reset form
                    ; (e.target as HTMLFormElement).reset()
            } else {
                toast.error('Failed to create app', {
                    description: result.error
                })
            }
        } catch (error: any) {
            toast.error('Error creating app', {
                description: error.message
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                            <Package className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                            <DialogTitle>Create Solution Template</DialogTitle>
                            <DialogDescription>
                                Build a new pre-configured module bundle
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* App Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Template Name *</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="e.g., Marketing Agency Starter"
                            required
                        />
                    </div>

                    {/* Short Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Short Description *</Label>
                        <Input
                            id="description"
                            name="description"
                            placeholder="Brief description (max 100 chars)"
                            maxLength={100}
                            required
                        />
                    </div>

                    {/* Long Description */}
                    <div className="space-y-2">
                        <Label htmlFor="long_description">Full Description</Label>
                        <Textarea
                            id="long_description"
                            name="long_description"
                            placeholder="Detailed description (optional)"
                            rows={3}
                        />
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Input
                            id="category"
                            name="category"
                            placeholder="e.g., Agency, Business"
                            required
                        />
                    </div>

                    {/* Pricing */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="price_monthly">Monthly Price ($) *</Label>
                            <Input
                                id="price_monthly"
                                name="price_monthly"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="49.99"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="trial_days">Trial Days</Label>
                            <Input
                                id="trial_days"
                                name="trial_days"
                                type="number"
                                min="0"
                                placeholder="14"
                                defaultValue={0}
                            />
                        </div>
                    </div>

                    {/* Color */}
                    <div className="space-y-2">
                        <Label htmlFor="color">Brand Color</Label>
                        <div className="flex gap-2">
                            <Input
                                id="color"
                                name="color"
                                type="color"
                                defaultValue="#8B5CF6"
                                className="w-16 h-10"
                            />
                            <Input
                                type="text"
                                placeholder="#8B5CF6"
                                className="flex-1"
                                defaultValue="#8B5CF6"
                                readOnly
                            />
                        </div>
                    </div>

                    {/* Info Note */}
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-600 dark:text-blue-400">
                        <strong>Note:</strong> Configure modules and add-ons from the template detail page after creation.
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? 'Creating...' : 'Create Template'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
