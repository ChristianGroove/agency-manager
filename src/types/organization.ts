export type Organization = {
    id: string
    name: string
    slug: string
    logo_url?: string
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
