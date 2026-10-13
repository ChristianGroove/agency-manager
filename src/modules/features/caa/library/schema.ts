import { z } from 'zod'
import { PERMISSIONS } from '@/modules/core/iam/actions/permissions'
import { HELP_SURFACES, TASK_PORTAL_PROFILES, TASK_PORTAL_CAPABILITIES, type HelpSurface, type TaskPortalProfile, type TaskPortalCapability } from './scope'

export const knownPermissions = Object.values(PERMISSIONS).flatMap(group => Object.values(group)) as string[]
const id = z.string().regex(/^[a-z0-9][a-z0-9.-]{1,99}$/)
const moduleKey = z.string().regex(/^[a-z][a-z0-9_.-]{1,99}$/)
const localRoute = z.string().max(200).regex(/^\/[a-zA-Z0-9_/[\].-]*$/)
    .refine(route => !route.startsWith('//') && !route.split('/').some(segment => segment === '.' || segment === '..'), 'Ruta no local')
const draftMetadataSchema = z.object({
    schema_version: z.literal(1), id, title: z.string().min(4).max(160), module: moduleKey,
    status: z.literal('draft'), audience: z.enum(['tenant-user', 'tenant-admin', 'platform-admin', 'portal-collaborator']),
    surface: z.enum(HELP_SURFACES).optional(),
    source_revision: z.string().regex(/^[a-f0-9]{7,40}$/),
    verified_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), verification: z.literal('source-only'),
    routes: z.array(localRoute).max(12), keywords: z.array(z.string().min(1).max(80)).min(1).max(30),
    requirements: z.array(z.string().max(300)).max(20),
    evidence: z.array(z.object({ path: z.string().min(1).max(300), symbol: z.string().min(1).max(150), claim: z.string().min(1).max(500) }).strict()).min(1).max(30),
}).strict()

function validateSurface(value: { surface?: HelpSurface; audience: string; module: string; routes: string[] }, ctx: z.RefinementCtx) {
    const portal = value.surface === 'portal.tasks'
    if (portal !== (value.audience === 'portal-collaborator')) ctx.addIssue({ code: 'custom', message: 'Audiencia incompatible con la superficie' })
    if (portal && (value.module !== 'tasks' || value.routes.some(route => route !== '/portal/tasks/[token]'))) {
        ctx.addIssue({ code: 'custom', message: 'El portal Tasks no puede incluir rutas o módulos del dashboard' })
    }
    if (!portal && value.routes.some(route => route.startsWith('/portal/'))) ctx.addIssue({ code: 'custom', message: 'Ruta de portal fuera de su superficie' })
}
export const draftSchema = draftMetadataSchema.superRefine(validateSurface)

// A reviewer maps editorial requirements to real authorization. Draft audience alone never grants access.
export const reviewSchema = z.object({
    schema_version: z.literal(1), hash_encoding: z.literal('utf8-lf').optional(), articles: z.array(z.object({
        id, draft_sha256: z.string().regex(/^[a-f0-9]{64}$/), reviewed_by: z.string().min(3).max(100),
        reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        evidence_sha256: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)),
        required_modules: z.array(moduleKey).max(20),
        required_permissions: z.array(z.string().refine(value => knownPermissions.includes(value), 'Permiso IAM desconocido')).max(30),
        portal_profiles: z.array(z.enum(TASK_PORTAL_PROFILES)).min(1).max(4).optional(),
        required_portal_capabilities: z.array(z.enum(TASK_PORTAL_CAPABILITIES)).max(5).optional(),
        verticals: z.array(z.enum(['agency', 'resto', 'cleaning', 'platform', 'retail', 'saas', 'real_estate'])).max(7),
        link_route: localRoute.nullable(),
    }).strict()).max(1000),
}).strict()

export const articleSchema = draftMetadataSchema.pick({ id: true, title: true, module: true, audience: true, routes: true, keywords: true, surface: true }).extend({
    content: z.string().min(100).max(16000), required_modules: z.array(moduleKey),
    required_permissions: z.array(z.string().refine(value => knownPermissions.includes(value))),
    verticals: z.array(z.string()), link_route: localRoute.nullable(), revision: z.string().regex(/^[a-f0-9]{64}$/),
    portal_profiles: z.array(z.enum(TASK_PORTAL_PROFILES)).min(1).max(4).optional(),
    required_portal_capabilities: z.array(z.enum(TASK_PORTAL_CAPABILITIES)).max(5).optional(),
}).strict().superRefine((value, ctx) => {
    validateSurface(value, ctx)
    if (value.surface === 'portal.tasks') {
        if (!value.portal_profiles?.length || !value.required_modules.includes('module_tasks') || value.required_permissions.length || value.link_route !== null) {
            ctx.addIssue({ code: 'custom', message: 'Guía de portal sin perfiles/módulo o con permisos/enlace de dashboard' })
        }
    } else if (value.portal_profiles || value.required_portal_capabilities) ctx.addIssue({ code: 'custom', message: 'Filtros de portal en una guía del dashboard' })
})
export const corpusSchema = z.object({ schema_version: z.literal(1), revision: z.string().min(1).max(80), articles: z.array(articleSchema).max(1000) }).strict()
export type HelpArticle = z.infer<typeof articleSchema>
export interface HelpAccess {
    platformAdmin: boolean; tenantAdmin: boolean; modules: string[]; permissions: string[]; vertical: string; route: string | null
    surface?: HelpSurface; portalProfiles?: TaskPortalProfile[]; portalCapabilities?: TaskPortalCapability[]
}
