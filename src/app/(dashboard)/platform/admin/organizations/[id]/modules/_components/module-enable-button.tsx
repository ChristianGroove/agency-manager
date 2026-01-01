'use client'

import { useState } from 'react'
import { activateModuleForOrganization, getModuleActivationPlan } from '@/modules/core/saas/module-management-actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Check, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ModuleEnableButtonProps {
    moduleKey: string
    moduleName: string
    organizationId: string
    dependencies?: any[]
    isPremium?: boolean
    priceMonthly?: number
}

export function ModuleEnableButton({
    moduleKey,
    moduleName,
    organizationId,
    dependencies = [],
    isPremium,
    priceMonthly
}: ModuleEnableButtonProps) {
    const router = useRouter()
    const [isExpanded, setIsExpanded] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [plan, setPlan] = useState<any>(null)

    const hasDependencies = dependencies && dependencies.length > 0

    // Fetch activation plan when expanding
    const handleExpand = async () => {
        if (!isExpanded && !plan) {
            setIsLoading(true)
            try {
                const result = await getModuleActivationPlan({
                    module_key: moduleKey,
                    organization_id: organizationId
                })

                setPlan(result)
            } catch (error) {
                console.error('Error fetching plan:', error)
            } finally {
                setIsLoading(false)
            }
        }
        setIsExpanded(!isExpanded)
    }

    // Enable module with auto-dependency resolution
    const handleEnable = async () => {
        setIsLoading(true)
        try {
            const result = await activateModuleForOrganization({
                organization_id: organizationId,
                module_key: moduleKey,
                auto_enable_dependencies: true
            })

            if (result.success) {
                const enabledCount = result.data?.activated?.length || 1
                toast.success(
                    `${moduleName} enabled!`,
                    {
                        description: enabledCount > 1
                            ? `Automatically enabled ${enabledCount} modules including dependencies`
                            : undefined
                    }
                )
                router.refresh()
            } else {
                toast.error('Failed to enable module', {
                    description: result.error
                })
            }
        } catch (error: any) {
            toast.error('Error enabling module', {
                description: error.message
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <Button
                    size="sm"
                    onClick={hasDependencies ? handleExpand : handleEnable}
                    disabled={isLoading}
                >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {hasDependencies ? (
                        isExpanded ? (
                            <>
                                <ChevronUp className="mr-2 h-4 w-4" />
                                Hide Details
                            </>
                        ) : (
                            <>
                                <ChevronDown className="mr-2 h-4 w-4" />
                                Enable (with deps)
                            </>
                        )
                    ) : (
                        'Enable'
                    )}
                </Button>

                {isPremium && priceMonthly && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-amber-600">
                        +${priceMonthly}/mo
                    </Badge>
                )}
            </div>

            {/* Expanded dependency preview */}
            {isExpanded && (
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4 space-y-3">
                        {isLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Checking dependencies...
                            </div>
                        ) : plan ? (
                            <>
                                <div className="text-sm font-medium">
                                    Will enable {plan.modules_to_enable?.length || 1} module(s):
                                </div>

                                <div className="space-y-2">
                                    {plan.modules_to_enable?.map((mod: string, idx: number) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-2 text-sm"
                                        >
                                            <Check className="h-3 w-3 text-green-500" />
                                            <span className={mod === moduleKey ? 'font-medium' : 'text-muted-foreground'}>
                                                {mod}
                                            </span>
                                            {mod !== moduleKey && (
                                                <Badge variant="outline" className="text-xs">
                                                    Required
                                                </Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {plan.warnings && plan.warnings.length > 0 && (
                                    <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 text-sm">
                                        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                                        <div className="text-amber-700 dark:text-amber-400">
                                            {plan.warnings.map((warning: string, idx: number) => (
                                                <div key={idx}>{warning}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={handleEnable}
                                    disabled={isLoading}
                                    className="w-full"
                                    size="sm"
                                >
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Enable All
                                </Button>
                            </>
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                No dependencies required
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
