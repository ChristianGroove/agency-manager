import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { supabaseAdmin } from "./src/lib/supabase-admin"

async function debug() {
    console.log("🔍 Starting Assignment Diagnosis...")

    // 1. Get all agents in availability
    const { data: agents, error: err1 } = await supabaseAdmin
        .from('agent_availability')
        .select('*, organization_members(role, permissions), agent_channels(channel_type, is_active)')
    
    if (err1) {
        console.error("❌ Error fetching agents:", err1)
        return
    }

    console.log(`\nFound ${agents.length} agents in availability table:`)
    
    const now = new Date()
    const heartbeatThreshold = new Date(Date.now() - 3 * 60 * 1000)

    agents.forEach(a => {
        const lastSeen = new Date(a.last_seen_at)
        const isOnline = a.status === 'online'
        const isAutoEnabled = a.auto_assign_enabled
        const isHeartbeatActive = lastSeen > heartbeatThreshold
        
        console.log(`\nAgent: ${a.agent_id}`)
        console.log(`- Status: ${a.status} (Enabled: ${isAutoEnabled})`)
        console.log(`- Last Seen: ${a.last_seen_at} (${isHeartbeatActive ? 'ACTIVE' : 'EXPIRED'})`)
        console.log(`- Load: ${a.current_load} / ${a.max_capacity}`)
        
        if (a.organization_members) {
             const om = a.organization_members as any
             console.log(`- Role: ${om.role}`)
             console.log(`- Permissions: ${JSON.stringify(om.permissions)}`)
        } else {
            console.log(`- ⚠️ No organization_members record found!`)
        }
        
        if (a.agent_channels) {
            const channels = (a.agent_channels as any[]).filter(c => c.is_active).map(c => c.channel_type)
            console.log(`- Active Channels: ${channels.join(', ') || 'NONE'}`)
        }
    })

    // 2. Simulate a check for a typical WhatsApp channel
    console.log("\n\n🧪 Simulating Qualification Check for 'whatsapp' channel...")
    const qualified = agents.filter(a => {
        const lastSeen = new Date(a.last_seen_at)
        const isBasicOnline = a.status === 'online' && a.auto_assign_enabled && lastSeen > heartbeatThreshold
        if (!isBasicOnline) return false
        
        const om = a.organization_members as any
        if (!om) return false
        
        const isAdmin = ['admin', 'owner'].includes(om.role?.toLowerCase())
        if (isAdmin) return true
        
        const channels = (a.agent_channels as any[]) || []
        const hasChannel = channels.some(c => c.is_active && c.channel_type === 'whatsapp')
        if (hasChannel) return true
        
        return false
    })

    console.log(`Qualified Agents for 'whatsapp': ${qualified.length}`)
    qualified.forEach(a => console.log(`- ${a.agent_id}`))
}

debug()
