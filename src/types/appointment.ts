export type AppointmentStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type LocationType = 'at_headquarters' | 'at_client_address' | 'remote';

export interface Appointment {
    id: string
    organization_id: string
    title: string
    description?: string
    start_time: string
    end_time: string
    status: AppointmentStatus

    // Field Services Location Context
    location_type: LocationType
    address_text?: string
    gps_coordinates?: { lat: number, lng: number } // JSONB in DB

    // Staffing & Client
    staff_id?: string
    client_id?: string

    created_at: string
    updated_at: string

    // Joined data (optional)
    staff?: {
        id: string
        member?: {
            full_name: string
        }
    }
    client?: {
        name: string
    }
}
