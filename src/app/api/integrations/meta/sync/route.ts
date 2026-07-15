
import { NextResponse } from "next/server"
import { isProductionRuntime, requirePlatformAdminOrInternalSecret } from "@/app/api/_guards/request-guards"

function summarizeSyncRouteError(error: unknown) {
    return error instanceof Error
        ? { name: error.name }
        : { type: typeof error }
}

function logSyncRouteError(label: string, error: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizeSyncRouteError(error))
}

export async function POST(req: Request) {
    const guard = await requirePlatformAdminOrInternalSecret(req)
    if (guard) return guard;

    try {
        const body = await req.json().catch(() => ({}))
        const { clientId } = body

        const { MetaCacheManager } = await import("@/modules/infrastructure/meta/services/cache-manager")
        const manager = new MetaCacheManager()

        // If clientId is provided, sync specific client (Manual Test)
        if (clientId) {
            // We can extend CacheManager to support singular syncs,
            // or just let it sync all (it iterates anyway).
            // For efficiency, let's just run syncAll for now as it's MVP.
            // Ideally: await manager.syncClient(clientId)
        }

        const result = await manager.syncAll(clientId)

        // Even if some syncs failed, we return 200 but include errors in body
        return NextResponse.json(result)
    } catch (error) {
        logSyncRouteError("Sync error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
