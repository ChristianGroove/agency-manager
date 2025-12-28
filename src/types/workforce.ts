
export interface StaffProfile {
    id: string
    organization_id: string
    member_id: string
    user_id: string
    hourly_rate: number
    skills: string[]
    color: string
    created_at: string
    updated_at: string

    // Joined Data
    member?: {
        id: string
        full_name: string | null
        email: string
        avatar_url: string | null
    }
}

export interface CreateStaffProfileDTO {
    member_id: string
    user_id: string
    hourly_rate?: number
    skills?: string[]
    color?: string
}

export interface UpdateStaffProfileDTO {
    hourly_rate?: number
    skills?: string[]
    color?: string
}
