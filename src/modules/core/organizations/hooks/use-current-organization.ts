
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export function useCurrentOrganization() {
    const [organizationId, setOrganizationId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchOrg = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setLoading(false)
                return
            }

            // Get the first organization for now
            // In a multi-tenant app, this should come from the URL or a global context/cookie
            const { data } = await supabase
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', user.id)
                .single()

            if (data) {
                setOrganizationId(data.organization_id)
            }
            setLoading(false)
        }

        fetchOrg()
    }, [])

    return { organizationId, loading }
}
