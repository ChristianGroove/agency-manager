import { PERMISSIONS, PERMISSION_GROUPS } from '@/modules/core/iam/actions/permissions'

// Presentation only. Authorization continues to use the original keys on the server.
const permissionLabels = new Map<string, string>(PERMISSION_GROUPS.flatMap(group => group.permissions.map(permission =>
    [permission.id, permission.label.charAt(0).toLowerCase() + permission.label.slice(1)] as [string, string])))
permissionLabels.set('can_bulk_delete_tasks', 'eliminar tareas en grupo')
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const known = Object.values(PERMISSIONS).flatMap(group => Object.values(group)).map(escape)
const namespaces = [...new Set(Object.values(PERMISSIONS).flatMap(group => Object.values(group)).map(key => key.split('.')[0]))]
const keys = `(?:${known.join('|')}|(?:${namespaces.join('|')})\\.[a-z0-9_]+(?:\\.[a-z0-9_]+)*|can_[a-z0-9_]+)`
const formatting = '(?:`{1,3}|\\*{1,2})?'
const token = formatting + '(' + keys + ')' + formatting + '(?![\\w@-]|\\.[a-z0-9_])'
const permissionPhrase = new RegExp(`\\b(?:(el|un|los|unos|del)\\s+)?(permisos?)(?:\\s+(?:especial|granular|interno|tecnico))?\\s+${token}`, 'gi')
const permissionToken = new RegExp(`(?<![\\w.@-])${token}`, 'gi')
const technicalNames: Record<string, string> = {
    module_tasks: 'Tasks', module_crm: 'CRM', module_messaging: 'Inbox', module_inbox: 'Inbox',
    module_invoicing: 'Facturación', module_automation: 'Automatizaciones', module_platform: 'Plataforma',
    'tasks.management': 'gestión de tareas', bulk_delete: 'eliminar tareas en grupo', vcs_code: 'acceso a código y versiones',
    design_preview: 'acceso a vistas de diseño', finance_costs: 'acceso a costos',
}
const technicalToken = new RegExp('(?<![\\w.@-])' + formatting + '(' + Object.keys(technicalNames).map(escape).join('|') + '|module_[a-z0-9_]+)' + formatting + '(?![\\w@-]|\\.[a-z0-9_])', 'gi')

/** Remove internal access identifiers without changing negation or inventing granted access. */
export function publicHelpText(text: string): string {
    return text.replace(permissionPhrase, (_match, article: string | undefined, noun: string, key: string) => {
        const prefixes: Record<string, string> = { el: 'la ', un: 'una ', los: 'las ', unos: 'unas ', del: 'de la ' }
        return `${prefixes[article?.toLowerCase() || ''] || ''}${noun.toLowerCase() === 'permisos' ? 'autorizaciones' : 'autorización'} para ${permissionLabels.get(key.toLowerCase()) || 'esta acción'}`
    }).replace(permissionToken, (_match, key: string) => `autorización para ${permissionLabels.get(key.toLowerCase()) || 'esta acción'}`)
        .replace(technicalToken, (_match, key: string) => technicalNames[key.toLowerCase()] || 'el módulo correspondiente')
}

export function publicHelpHistory<T extends { role: string; content: string }>(history: T[]): T[] {
    return history.map(message => message.role === 'assistant' ? { ...message, content: publicHelpText(message.content) } : message)
}
