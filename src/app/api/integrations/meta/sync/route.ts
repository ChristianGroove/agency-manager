
import { NextResponse } from "next/server"
import { MetaCacheManager } from "@/lib/integrations/meta/cache-manager"
import { createClient } from "@/lib/supabase-server"

export async function POST(req: Request) {
    // 1. Verify Admin Auth
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // In a real app, we would verify the user is an admin.
    // For now, any authenticated user can trigger a sync (if they have the URL).
    // The MetaCacheManager itself only processes active configs.

    try {
        const body = await req.json().catch(() => ({}))
        const { clientId } = body

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
        console.error("Sync error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
