'use client'

import { useState } from 'react'
import { createApp } from '@/modules/core/saas/app-management-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Package, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function AppBuilderPage() {
    const router = useRouter()
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
                long_description: formData.get('long_description') as string,
                category: formData.get('category') as string,
                price_monthly: parseFloat(formData.get('price_monthly') as string),
                trial_days: parseInt(formData.get('trial_days') as string) || 0,
                color: formData.get('color') as string || '#8B5CF6',
            })

            if (result.success) {
                toast.success('App created successfully!')
                router.push('/platform/admin/apps')
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
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Back Button */}
            <Link href="/platform/admin/apps">
                <Button variant="ghost" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Apps
                </Button>
            </Link>

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Create App Template</h1>
                <p className="text-muted-foreground mt-1">
                    Build a new pre-configured module bundle
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                                <Package className="h-6 w-6 text-purple-500" />
                            </div>
                            <div>
                                <CardTitle>App Details</CardTitle>
                                <CardDescription>
                                    Basic information about your app template
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* App Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">App Name *</Label>
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
                                placeholder="Brief description shown in gallery (max 100 chars)"
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
                                placeholder="Detailed description shown on app detail page"
                                rows={4}
                            />
                        </div>

                        {/* Category */}
                        <div className="space-y-2">
                            <Label htmlFor="category">Category *</Label>
                            <Input
                                id="category"
                                name="category"
                                placeholder="e.g., Agency, Business, Professional Services"
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
                                    className="w-20 h-10"
                                />
                                <Input
                                    type="text"
                                    placeholder="#8B5CF6"
                                    className="flex-1"
                                    defaultValue="#8B5CF6"
                                />
                            </div>
                        </div>

                        {/* Info Note */}
                        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <div className="text-sm text-blue-600 dark:text-blue-400">
                                <strong>Note:</strong> After creating the app, you'll be able to add modules and configure add-ons from the app detail page.
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-4 border-t">
                            <Link href="/platform/admin/apps" className="flex-1">
                                <Button type="button" variant="outline" className="w-full" disabled={isSubmitting}>
                                    Cancel
                                </Button>
                            </Link>
                            <Button type="submit" className="flex-1" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSubmitting ? 'Creating...' : 'Create App Template'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    )
}
