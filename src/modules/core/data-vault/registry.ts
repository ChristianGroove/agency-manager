
import { DataModule } from "./types"

class ModuleRegistry {
    private modules: Map<string, DataModule> = new Map()

    register(module: DataModule) {
        if (this.modules.has(module.key)) {
            console.warn(`Module ${module.key} is already registered. Overwriting.`)
        }
        this.modules.set(module.key, module)
    }

    getModule(key: string): DataModule | undefined {
        return this.modules.get(key)
    }

    getAllModules(): DataModule[] {
        return Array.from(this.modules.values())
    }

    /**
     * Returns modules sorted by dependencies (topological sort).
     * If A depends on B, B comes before A.
     */
    getSortedModules(): DataModule[] {
        const visited = new Set<string>()
        const sorted: DataModule[] = []
        const modules = this.getAllModules()

        // Simple implementation assuming no circular deps for now
        // A more robust topo-sort would be better for complex graphs

        const visit = (mod: DataModule) => {
            if (visited.has(mod.key)) return

            // Visit dependencies first
            for (const depKey of mod.dependencies) {
                const depModule = this.modules.get(depKey)
                if (depModule) {
                    visit(depModule)
                }
            }

            visited.add(mod.key)
            sorted.push(mod)
        }

        for (const mod of modules) {
            visit(mod)
        }

        return sorted
    }
}


export const vaultRegistry = new ModuleRegistry()

// Register Core Modules
import { crmDataAdapter } from "@/modules/core/crm/data-adapter"
import { messagingDataAdapter } from "@/modules/core/messaging/data-adapter"
import { automationDataAdapter } from "@/modules/core/automation/data-adapter"

vaultRegistry.register(crmDataAdapter)
vaultRegistry.register(messagingDataAdapter)
vaultRegistry.register(automationDataAdapter)

