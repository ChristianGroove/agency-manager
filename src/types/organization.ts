export type Organization = {
    id: string
    name: string
    slug: string
    logo_url?: string

    // V2 Hierarchy fields
    organization_type?: 'platform' | 'reseller' | 'operator' | 'client'
    parent_organization_id?: string | null
    parent_organization?: { name: string } // Joined

    // V2 Status fields
    status?: 'active' | 'limited' | 'suspended'
    payment_status?: 'good_standing' | 'past_due'

    subscription_product_id?: string
    subscription_status: 'active' | 'past_due' | 'canceled'
    created_at: string
}

export type OrganizationMember = {
    organization_id: string
    user_id: string
    role: 'owner' | 'admin' | 'member'
    created_at: string
    organization?: Organization
    user?: {
        email: string
        full_name?: string
        avatar_url?: string
    }
}
