import { redirect } from 'next/navigation'
import { getCurrentOrganizationId, getCurrentOrgDetails } from '@/modules/core/organizations/actions/crud'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'

interface PortalRootPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PortalRootPage({ searchParams }: PortalRootPageProps) {
  const resolvedParams = searchParams ? await searchParams : {}
  const token = (resolvedParams.token || resolvedParams.slug || resolvedParams.org) as string | undefined

  // 1. If explicit token or slug in query params, redirect to dynamic token route
  if (token) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(resolvedParams)) {
      if (key !== 'token' && key !== 'slug' && key !== 'org' && typeof value === 'string') {
        params.set(key, value)
      }
    }
    const queryString = params.toString() ? `?${params.toString()}` : ''
    redirect(`/portal/${token}${queryString}`)
  }

  // 2. Try resolving currently logged-in user's active organization
  try {
    const orgId = await getCurrentOrganizationId()
    if (orgId) {
      const org = await getCurrentOrgDetails(orgId)
      if (org?.slug) {
        redirect(`/portal/${org.slug}`)
      }
    }
  } catch {
    // Ignore session errors for guest access
  }

  // 3. Fallback: Lookup default public organization
  const { data: defaultOrg } = await supabaseAdmin
    .from('organizations')
    .select('slug, id')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (defaultOrg?.slug) {
    redirect(`/portal/${defaultOrg.slug}`)
  }

  // 4. Ultimate fallback if no organizations exist
  redirect('/')
}
