"use client"

import { useEffect, useState } from "react"
import { OrgModuleCard } from "@/modules/admin/components/org-module-card"
import { getOrganizationActiveModules } from "@/modules/core/saas/module-management-actions"
import { Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface OrgSmartModulesViewProps {
    orgId: string
    allModules: any[]
}

export function OrgSmartModulesView({ orgId, allModules }: OrgSmartModulesViewProps) {
    const [activeModuleKeys, setActiveModuleKeys] = useState<string[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true

        async function fetchActiveModules() {
            setLoading(true)
            try {
                const keys = await getOrganizationActiveModules(orgId)
                if (mounted) {
                    setActiveModuleKeys(keys)
                }
            } catch (error) {
                console.error("Failed to fetch active modules", error)
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        if (orgId) {
            fetchActiveModules()
        }

        return () => {
            mounted = false
        }
    }, [orgId])

    if (loading) {
        return (
            <div className="flex items-center justify-center p-10 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Cargando módulos...
            </div>
        )
    }

    const activeModules = allModules.filter(m => activeModuleKeys.includes(m.key))
    const availableModules = allModules.filter(m => !activeModuleKeys.includes(m.key))

    return (
        <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                        Módulos Activos ({activeModules.length})
                    </h3>
                    {activeModules.length === 0 ? (
                        <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground bg-muted/30">
                            No hay módulos activos
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {activeModules.map(module => (
                                <OrgModuleCard
                                    key={module.id}
                                    module={module}
                                    isActive={true}
                                    organizationId={orgId}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                        Disponibles ({availableModules.length})
                    </h3>
                    {availableModules.length === 0 ? (
                        <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground bg-muted/30">
                            Todos los módulos están activos
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {availableModules.map(module => (
                                <OrgModuleCard
                                    key={module.id}
                                    module={module}
                                    isActive={false}
                                    organizationId={orgId}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </ScrollArea>
    )
}
