import {
    MemberPermissions,
    FeaturePermissions,
    ModulePermissions,
    PermissionCategory,
    ModuleDefinition,
    OrganizationVertical
} from './types'
import {
    Users,
    Settings,
    FileText,
    FolderKanban,
    BarChart3,
    Calendar,
    UserCog,
    Wallet,
    MessageSquare,
    CreditCard,
    Headphones
} from 'lucide-react'

/**
 * Default permissions by role
 */
export const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, MemberPermissions> = {
    owner: {
        modules: {
            crm: true,
            invoicing: true,
            projects: true,
            support: true,
            communications: true,
            payments: true,
            reports: true,
            settings: true,
            appointments: true,
            staff: true,
            payroll: true,
        },
        features: {
            can_invite_members: true,
            can_remove_members: true,
            can_edit_member_permissions: true,
            can_edit_settings: true,
            can_edit_branding: true,
            can_manage_billing: true,
            can_create_clients: true,
            can_delete_clients: true,
            can_export_clients: true,
            can_create_invoices: true,
            can_delete_invoices: true,
            can_send_invoices: true,
            can_record_payments: true,
            can_create_projects: true,
            can_delete_projects: true,
            can_view_reports: true,
            can_export_data: true,
            can_manage_appointments: true,
            can_manage_staff: true,
            can_view_payroll: true,
            can_process_payroll: true,
        }
    },
    admin: {
        modules: {
            crm: true,
            invoicing: true,
            projects: true,
            support: true,
            communications: true,
            payments: true,
            reports: true,
            settings: true,
            appointments: true,
            staff: true,
            payroll: true,
        },
        features: {
            can_invite_members: true,
            can_remove_members: true,
            can_edit_member_permissions: false, // Only owner can edit permissions
            can_edit_settings: true,
            can_edit_branding: true,
            can_manage_billing: true,
            can_create_clients: true,
            can_delete_clients: true,
            can_export_clients: true,
            can_create_invoices: true,
            can_delete_invoices: true,
            can_send_invoices: true,
            can_record_payments: true,
            can_create_projects: true,
            can_delete_projects: true,
            can_view_reports: true,
            can_export_data: true,
            can_manage_appointments: true,
            can_manage_staff: true,
            can_view_payroll: true,
            can_process_payroll: false,
        }
    },
    member: {
        modules: {
            crm: true,
            invoicing: true,
            projects: true,
            support: true,
            communications: false,
            payments: false,
            reports: false,
            settings: false,  // Members cannot access settings by default
            appointments: true,
            staff: false,
            payroll: false,
        },
        features: {
            can_invite_members: false,
            can_remove_members: false,
            can_edit_member_permissions: false,
            can_edit_settings: false,
            can_edit_branding: false,
            can_manage_billing: false,
            can_create_clients: true,
            can_delete_clients: false,
            can_export_clients: false,
            can_create_invoices: true,
            can_delete_invoices: false,
            can_send_invoices: true,
            can_record_payments: true,
            can_create_projects: true,
            can_delete_projects: false,
            can_view_reports: false,
            can_export_data: false,
            can_manage_appointments: true,
            can_manage_staff: false,
            can_view_payroll: false,
            can_process_payroll: false,
        }
    }
}

/**
 * Available modules for the UI
 */
export const AVAILABLE_MODULES: ModuleDefinition[] = [
    { id: 'crm', label: 'CRM / Clientes', icon: 'Users' },
    { id: 'invoicing', label: 'Facturación', icon: 'FileText' },
    { id: 'projects', label: 'Proyectos', icon: 'FolderKanban' },
    { id: 'support', label: 'Soporte', icon: 'Headphones' },
    { id: 'communications', label: 'Comunicaciones', icon: 'MessageSquare' },
    { id: 'payments', label: 'Pagos', icon: 'CreditCard' },
    { id: 'reports', label: 'Reportes', icon: 'BarChart3' },
    // Cleaning vertical modules
    { id: 'appointments', label: 'Citas', icon: 'Calendar', vertical: ['cleaning'] },
    { id: 'staff', label: 'Personal', icon: 'UserCog', vertical: ['cleaning'] },
    { id: 'payroll', label: 'Nómina', icon: 'Wallet', vertical: ['cleaning'] },
]

/**
 * Permission categories for UI grouping
 */
export const PERMISSION_CATEGORIES: PermissionCategory[] = [
    {
        id: 'team',
        label: 'Equipo',
        icon: 'Users',
        permissions: [
            { key: 'can_invite_members', label: 'Invitar miembros', description: 'Puede enviar invitaciones a nuevos usuarios' },
            { key: 'can_remove_members', label: 'Eliminar miembros', description: 'Puede remover usuarios del equipo' },
            { key: 'can_edit_member_permissions', label: 'Editar permisos', description: 'Puede modificar permisos de otros miembros' },
        ]
    },
    {
        id: 'settings',
        label: 'Configuración',
        icon: 'Settings',
        permissions: [
            { key: 'can_edit_settings', label: 'Editar configuración', description: 'Acceso a configuración general' },
            { key: 'can_edit_branding', label: 'Editar branding', description: 'Puede modificar logos y colores' },
            { key: 'can_manage_billing', label: 'Gestionar facturación', description: 'Acceso a suscripción y pagos de la plataforma' },
        ]
    },
    {
        id: 'crm',
        label: 'CRM',
        icon: 'Users',
        permissions: [
            { key: 'can_create_clients', label: 'Crear clientes' },
            { key: 'can_delete_clients', label: 'Eliminar clientes' },
            { key: 'can_export_clients', label: 'Exportar clientes' },
        ]
    },
    {
        id: 'invoicing',
        label: 'Facturación',
        icon: 'FileText',
        permissions: [
            { key: 'can_create_invoices', label: 'Crear facturas' },
            { key: 'can_delete_invoices', label: 'Eliminar/Anular facturas' },
            { key: 'can_send_invoices', label: 'Enviar facturas' },
            { key: 'can_record_payments', label: 'Registrar pagos' },
        ]
    },
    {
        id: 'projects',
        label: 'Proyectos',
        icon: 'FolderKanban',
        permissions: [
            { key: 'can_create_projects', label: 'Crear proyectos' },
            { key: 'can_delete_projects', label: 'Eliminar proyectos' },
        ]
    },
    {
        id: 'reports',
        label: 'Reportes',
        icon: 'BarChart3',
        permissions: [
            { key: 'can_view_reports', label: 'Ver reportes', description: 'Acceso a dashboards y métricas' },
            { key: 'can_export_data', label: 'Exportar datos', description: 'Puede descargar reportes en Excel/CSV' },
        ]
    },
]

/**
 * Cleaning vertical specific permissions
 */
export const CLEANING_PERMISSION_CATEGORIES: PermissionCategory[] = [
    {
        id: 'cleaning',
        label: 'Operaciones (Limpieza)',
        icon: 'Calendar',
        permissions: [
            { key: 'can_manage_appointments', label: 'Gestionar citas' },
            { key: 'can_manage_staff', label: 'Gestionar personal' },
            { key: 'can_view_payroll', label: 'Ver nómina' },
            { key: 'can_process_payroll', label: 'Procesar pagos de nómina' },
        ]
    }
]

/**
 * Get effective permissions for a member
 * Merges role defaults with custom overrides
 */
export function getEffectivePermissions(
    role: string,
    customPermissions?: MemberPermissions
): MemberPermissions {
    const defaults = DEFAULT_PERMISSIONS_BY_ROLE[role] || DEFAULT_PERMISSIONS_BY_ROLE.member

    if (!customPermissions) return defaults

    return {
        modules: { ...defaults.modules, ...customPermissions.modules },
        features: { ...defaults.features, ...customPermissions.features },
    }
}

/**
 * Check if a specific permission is enabled
 */
export function hasPermission(
    permissions: MemberPermissions,
    permission: keyof FeaturePermissions
): boolean {
    return permissions.features?.[permission] ?? false
}

/**
 * Check if a module is accessible
 */
export function hasModuleAccess(
    permissions: MemberPermissions,
    module: keyof ModulePermissions
): boolean {
    return permissions.modules?.[module] ?? false
}
