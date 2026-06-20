import { useEffect, useState } from "react"
import { supabase } from "@/modules/core/database/supabase"

export function useCurrentOrganization() {
    const [organizationId, setOrganizationId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchOrg = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setLoading(false)
                    return
                }

                // 1. Try to get from cookie first (alignment with server-side context)
                const getCookie = (name: string) => {
                    const value = `; ${document.cookie}`;
                    const parts = value.split(`; ${name}=`);
                    if (parts.length === 2) return parts.pop()?.split(';').shift();
                }

                const orgCookie = getCookie('pixy_org_id')

                if (orgCookie) {
                    // Check if superadmin first
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('is_super_admin')
                        .eq('id', user.id)
                        .maybeSingle()

                    if (profile?.is_super_admin) {
                        setOrganizationId(orgCookie)
                        setLoading(false)
                        return
                    }

                    // Validate membership for safety
                    const { data: membership } = await supabase
                        .from('organization_members')
                        .select('organization_id')
                        .eq('organization_id', orgCookie)
                        .eq('user_id', user.id)
                        .maybeSingle()

                    if (membership) {
                        setOrganizationId(membership.organization_id)
                        setLoading(false)
                        return
                    }
                }

                // 2. Fallback: Get the first organization
                const { data } = await supabase
                    .from('organization_members')
                    .select('organization_id')
                    .eq('user_id', user.id)
                    .limit(1)
                    .maybeSingle()

                if (data) {
                    setOrganizationId(data.organization_id)
                    // Auto-heal the cookie to prevent server-side spam and security fallback loops
                    document.cookie = `pixy_org_id=${data.organization_id}; path=/; max-age=31536000; SameSite=Lax`
                }
            } catch (error) {
                console.error("[useCurrentOrganization] Error:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchOrg()
    }, [])

    return { organizationId, loading }
}
