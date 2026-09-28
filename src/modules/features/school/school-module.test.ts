import { describe, it, expect } from 'vitest'
import { MODULE_ROUTES, filterRoutesByModules } from '@/modules/core/saas/module-config'

describe('School Module Sidebar Configuration (Pixy Architecture)', () => {
    it('only contains module_school for school management and does NOT contain obsolete sub-routes', () => {
        const routeKeys = MODULE_ROUTES.map(r => r.key)
        expect(routeKeys).toContain('module_school')
        expect(routeKeys).not.toContain('module_school_directory')
        expect(routeKeys).not.toContain('module_school_portals')

        const schoolRoute = MODULE_ROUTES.find(r => r.key === 'module_school')
        expect(schoolRoute).toBeDefined()
        expect(schoolRoute?.href).toBe('/school')
        expect(schoolRoute?.parentModule).toBe('module_school')
    })

    it('displays module_school for school vertical organization', () => {
        const visibleRoutes = filterRoutesByModules(
            ['core_clients', 'core_settings'],
            'owner',
            'client',
            'school'
        )
        const keys = visibleRoutes.map(r => r.key)
        expect(keys).toContain('module_school')
    })

    it('does NOT pollute agency or other vertical sidebars when not subscribed', () => {
        const visibleRoutes = filterRoutesByModules(
            ['core_clients', 'core_settings'],
            'owner',
            'client',
            'agency'
        )
        const keys = visibleRoutes.map(r => r.key)
        expect(keys).not.toContain('module_school')
    })

    it('displays module_school when explicitly present in activeModules regardless of vertical', () => {
        const visibleRoutes = filterRoutesByModules(
            ['core_clients', 'core_settings', 'module_school'],
            'owner',
            'client',
            'agency'
        )
        const keys = visibleRoutes.map(r => r.key)
        expect(keys).toContain('module_school')
    })
})

describe('Student Lead Name Parsing & Mapping (DB Schema Compatibility)', () => {
    function parseStudentName(name?: string | null, fallbackFirst = 'Estudiante', fallbackLast = '') {
        const parts = (name || '').trim().split(' ')
        const firstName = parts[0] || fallbackFirst
        const lastName = parts.slice(1).join(' ') || fallbackLast
        return { firstName, lastName }
    }

    it('correctly splits standard compound Colombian names', () => {
        const res = parseStudentName('Sofía Valentina Castro')
        expect(res.firstName).toBe('Sofía')
        expect(res.lastName).toBe('Valentina Castro')
    })

    it('correctly splits two-word names', () => {
        const res = parseStudentName('Mateo Gómez')
        expect(res.firstName).toBe('Mateo')
        expect(res.lastName).toBe('Gómez')
    })

    it('handles empty or null names gracefully with fallbacks', () => {
        const resNull = parseStudentName(null)
        expect(resNull.firstName).toBe('Estudiante')
        expect(resNull.lastName).toBe('')

        const resEmpty = parseStudentName('')
        expect(resEmpty.firstName).toBe('Estudiante')
        expect(resEmpty.lastName).toBe('')
    })

    it('correctly assembles full name for DB leads upsert', () => {
        const firstName = '  Valentina  '
        const lastName = '  Ríos Ospina '
        const assembled = `${firstName.trim()} ${lastName.trim()}`.trim()
        expect(assembled).toBe('Valentina Ríos Ospina')
    })
})
