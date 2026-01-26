
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    console.log("🔍 Starting CRM Debug...")

    // 1. Get Org
    const { data: orgs } = await supabase.from('organizations').select('id, name').limit(1)
    if (!orgs || orgs.length === 0) return console.error("No orgs found")
    const orgId = orgs[0].id
    console.log(`🏢 Org: ${orgs[0].name}`)

    // 2. Count Total Leads (Raw)
    const { count: totalCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)

    console.log(`🔢 Total Leads in DB: ${totalCount}`)

    // 3. Fetch Leads with Filter Logic (Emulate getLeads)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const cutoffDate = sixMonthsAgo.toISOString()

    const { data: visibleLeads } = await supabase
        .from('leads')
        .select('id, name, status, created_at')
        .eq('organization_id', orgId)
        .or(`status.neq.lost,created_at.gt.${cutoffDate}`)

    console.log(`👀 Visible Leads (Filter applied): ${visibleLeads?.length}`)

    if (visibleLeads && visibleLeads.length > 0) {
        console.log("   --- Status Breakdown of Visible Leads ---")
        const breakdown: Record<string, number> = {}
        visibleLeads.forEach(l => {
            breakdown[l.status] = (breakdown[l.status] || 0) + 1
        })
        console.table(breakdown)
    }

    // 4. Fetch Stages
    const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('id, name, status_key')
        .eq('organization_id', orgId)
        .order('order_index')

    console.log("\n🛤️  Pipeline Stages:")
    if (stages && stages.length > 0) {
        stages.forEach(s => console.log(`   - [${s.status_key}] ${s.name}`))
    } else {
        console.log("   ❌ No stages found!")
    }

    // 5. Check Filtering/Orphaning
    if (visibleLeads && stages) {
        const stageKeys = new Set(stages.map(s => s.status_key))
        const orphans = visibleLeads.filter(l => !stageKeys.has(l.status))

        console.log(`\n👻 Orphaned Leads (Visible but no Stage): ${orphans.length}`)
        orphans.forEach(l => {
            console.log(`   - ${l.name} (Status: '${l.status}')`)
        })
    }
}

main()
