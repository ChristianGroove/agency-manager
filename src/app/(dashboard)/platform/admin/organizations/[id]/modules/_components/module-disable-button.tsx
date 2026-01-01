'use client'

import { useState } from 'react'
import { deactivateModuleForOrganization, getModuleDeactivationPlan } from '@/modules/core/saas/module-management-actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { X, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ModuleDisableButtonProps {
    moduleKey: string
    moduleName: string
    organizationId: string
    isCore?: boolean
}

export function ModuleDisableButton({
    moduleKey,
    moduleName,
    organizationId,
    isCore
}: ModuleDisableButtonProps) {
    const router = useRouter()
    const [isChecking, setIsChecking] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [plan, setPlan] = useState<any>(null)
    const [isDisabling, setIsDisabling] = useState(false)

    // Core modules cannot be disabled
    if (isCore) {
        return (
            <Badge variant="secondary">
                Always Active
            </Badge>
        )
    }

    // Check for orphaned modules before showing confirm
    const handleCheckDisable = async () => {
        setIsChecking(true)
        try {
            const plan = await getModuleDeactivationPlan({
                module_key: moduleKey,
                organization_id: organizationId
            })

            setPlan(plan)

            // If no orphans, disable immediately
            const orphanCount = plan.modules_to_disable?.length - 1 || 0
            if (orphanCount === 0) {
                await handleDisable(false)
            } else {
                // Show confirmation for orphans
                setShowConfirm(true)
            }
        } catch (error) {
            console.error('Error checking disable:', error)
            toast.error('Error checking dependencies')
        } finally {
            setIsChecking(false)
        }
    }

    // Disable module (with or without force)
    const handleDisable = async (force: boolean = false) => {
        setIsDisabling(true)
        try {
            const result = await deactivateModuleForOrganization({
                organization_id: organizationId,
                module_key: moduleKey,
                force
            })

            if (result.success) {
                const disabledCount = result.data?.deactivated?.length || 1
                toast.success(
                    `${moduleName} disabled`,
                    {
                        description: disabledCount > 1
                            ? `Also disabled ${disabledCount - 1} dependent module(s)`
                            : undefined
                    }
                )
                setShowConfirm(false)
                router.refresh()
            } else {
                toast.error('Failed to disable module', {
                    description: result.error
                })
            }
        } catch (error: any) {
            toast.error('Error disabling module', {
                description: error.message
            })
        } finally {
            setIsDisabling(false)
        }
    }

    return (
        <div className="space-y-2">
            <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleCheckDisable}
                disabled={isChecking || isDisabling}
            >
                {(isChecking || isDisabling) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isChecking ? 'Checking...' : 'Disable'}
            </Button>

            {/* Orphan warning & confirmation */}
            {showConfirm && plan && (
                <Card className="border-l-4 border-l-destructive">
                    <CardContent className="pt-4 space-y-3">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                            <div>
                                <div className="font-medium text-destructive">
                                    Dependent Modules Detected
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    Disabling this module will also disable:
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {plan.modules_to_disable
                                ?.filter((mod: string) => mod !== moduleKey)
                                .map((mod: string, idx: number) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10"
                                    >
                                        <X className="h-3 w-3 text-destructive" />
                                        <span className="text-sm font-medium">{mod}</span>
                                    </div>
                                ))}
                        </div>

                        {plan.warnings && plan.warnings.length > 0 && (
                            <div className="text-sm text-muted-foreground p-2 rounded-lg bg-muted">
                                {plan.warnings.map((warning: string, idx: number) => (
                                    <div key={idx}>{warning}</div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowConfirm(false)}
                                disabled={isDisabling}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDisable(true)}
                                disabled={isDisabling}
                                className="flex-1"
                            >
                                {isDisabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Disable All
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
