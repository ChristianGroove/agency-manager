/**
 * Member Permission Types
 * Granular permission system for organization members
 */

export type OrganizationVertical = 'agency' | 'cleaning' | 'general'

/**
 * Module access permissions per member
 */
export interface ModulePermissions {
    crm?: boolean
    invoicing?: boolean
    projects?: boolean
    support?: boolean
    communications?: boolean
    payments?: boolean
    reports?: boolean
    settings?: boolean  // Access to settings/configuration modules
    // Cleaning vertical
    appointments?: boolean
    staff?: boolean
    payroll?: boolean
}

/**
 * Feature-level permissions
 */
export interface FeaturePermissions {
    // Team Management
    can_invite_members?: boolean
    can_remove_members?: boolean
    can_edit_member_permissions?: boolean

    // Settings
    can_edit_settings?: boolean
    can_edit_branding?: boolean
    can_manage_billing?: boolean

    // CRM
    can_create_clients?: boolean
    can_delete_clients?: boolean
    can_export_clients?: boolean

    // Invoicing
    can_create_invoices?: boolean
    can_delete_invoices?: boolean
    can_send_invoices?: boolean
    can_record_payments?: boolean

    // Projects
    can_create_projects?: boolean
    can_delete_projects?: boolean

    // Reports
    can_view_reports?: boolean
    can_export_data?: boolean

    // Cleaning Vertical
    can_manage_appointments?: boolean
    can_manage_staff?: boolean
    can_view_payroll?: boolean
    can_process_payroll?: boolean
}

/**
 * Complete member permissions structure
 */
export interface MemberPermissions {
    modules?: ModulePermissions
    features?: FeaturePermissions
}

/**
 * Permission preset names
 */
export type PermissionPreset = 'full_access' | 'read_only' | 'custom'

/**
 * Permission category for UI grouping
 */
export interface PermissionCategory {
    id: string
    label: string
    icon: string
    permissions: {
        key: keyof FeaturePermissions
        label: string
        description?: string
    }[]
}

/**
 * Module definition for UI
 */
export interface ModuleDefinition {
    id: keyof ModulePermissions
    label: string
    icon: string
    vertical?: OrganizationVertical[] // If specified, only show for these verticals
}
