
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
        skills: string[]
        status: 'active' | 'inactive' | 'suspended'
        created_at: string
    }
}

export interface StaffShift {
    id: string
    organization_id: string
    staff_id: string
    day_of_week: number // 0-6
    start_time: string // HH:mm:ss
    end_time: string
    is_active: boolean
}

export type CreateStaffProfileDTO = Omit<StaffProfile, 'id' | 'organization_id' | 'created_at' | 'member'>
export type UpdateStaffProfileDTO = Partial<CreateStaffProfileDTO>
