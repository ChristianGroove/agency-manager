"use client"

import { Badge } from "@/components/ui/badge"
import { Check, X, Package } from "lucide-react"
import { ModuleEnableButton } from "@/app/(dashboard)/platform/admin/organizations/[id]/modules/_components/module-enable-button"
import { ModuleDisableButton } from "@/app/(dashboard)/platform/admin/organizations/[id]/modules/_components/module-disable-button"

interface OrgModuleCardProps {
    module: any
    isActive: boolean
    organizationId: string
}

export function OrgModuleCard({ module, isActive, organizationId }: OrgModuleCardProps) {
    const isPremium = module.is_premium
    const isCore = module.is_core

    return (
        <div className={`flex items-start justify-between p-4 rounded-lg border ${isActive ? 'bg-card border-gray-200' : 'bg-muted/30 border-dashed'}`}>
            <div className="flex items-start gap-3">
                <div
                    className={`p-2 rounded-lg ${isActive ? 'bg-primary/10' : 'bg-muted'}`}
                    style={isActive && module.color ? { backgroundColor: `${module.color}15`, color: module.color } : {}}
                >
                    {isActive ? (
                        <Check className={`h-4 w-4 ${module.color ? '' : 'text-primary'}`} style={module.color ? { color: module.color } : {}} />
                    ) : (
                        <Package className="h-4 w-4 text-muted-foreground" />
                    )}
                </div>
                <div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                        {module.name}
                        {isCore && <Badge variant="secondary" className="text-[10px] h-5">Core</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5 max-w-[400px]">
                        {module.description || module.key}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                            {module.category}
                        </Badge>

                        {isPremium && (
                            <Badge className="text-[10px] bg-gradient-to-r from-amber-500 to-amber-600 border-0 h-5">
                                Premium ${module.price_monthly}/mo
                            </Badge>
                        )}

                        {!isActive && module.dependencies?.length > 0 && (
                            <Badge variant="outline" className="text-[10px] border-blue-200 bg-blue-50 text-blue-700 h-5">
                                +{module.dependencies.length} deps
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-shrink-0 ml-4">
                {isActive ? (
                    <ModuleDisableButton
                        moduleKey={module.key}
                        moduleName={module.name}
                        organizationId={organizationId}
                        isCore={isCore}
                    />
                ) : (
                    <ModuleEnableButton
                        moduleKey={module.key}
                        moduleName={module.name}
                        organizationId={organizationId}
                        dependencies={module.dependencies}
                        isPremium={isPremium}
                        priceMonthly={module.price_monthly}
                    />
                )}
            </div>
        </div>
    )
}
