import type { MarketingClientApi } from './marketing-client-api'
import type { Campaign, MarketingStep, Sequence } from './marketing-actions'
import type { CampaignMetrics } from './marketing-metrics'
import type { CampaignTemplate } from './marketing-template-contract'

export const marketingScenarios = [
    { id: 'new-whatsapp', label: 'Crear WhatsApp', description: 'Emisor → plantilla → lista → iniciar. Guarda sin crear borradores al abrir.' },
    { id: 'new-email', label: 'Crear email', description: 'Asunto, contenido personalizado y vista previa antes de guardar.' },
    { id: 'ready-whatsapp', label: 'Lista para revisar', description: 'Borrador completo: comprueba las exclusiones y inicia con una sola acción simulada.' },
    { id: 'scheduled-email', label: 'Email programado', description: 'Mensaje preparado, ventana diaria y fecha futura; puedes editarlo y programarlo.' },
    { id: 'active', label: 'En ejecución', description: 'Progreso, entregas, historial y pausa con conservación del avance.' },
    { id: 'paused', label: 'Pausada', description: 'Diseño protegido y reanudación directa de los mismos destinatarios.' },
    { id: 'completed', label: 'Completada', description: 'Resultados finales y detalle de los pasos por destinatario.' },
    { id: 'unknown-email', label: 'Email sin confirmar', description: 'Un resultado ambiguo se investiga en el historial; no se reenvía.' },
    { id: 'failed-whatsapp', label: 'WhatsApp con fallos', description: 'Revisa mensajes fallidos, contactos pendientes y el avance conservado.' },
    { id: 'save-error', label: 'Error recuperable al guardar', description: 'Cambia el nombre y guarda: el primer intento falla y conserva los cambios para reintentar.' },
    { id: 'missing-channel', label: 'Sin emisor', description: 'Requisito pendiente con una salida clara hacia la configuración.' },
    { id: 'missing-consent', label: 'Sin autorización', description: 'La revisión bloquea la activación y explica qué falta.' },
    { id: 'execution-disabled', label: 'Motor deshabilitado', description: 'Puedes preparar y guardar; iniciar el envío permanece bloqueado.' },
    { id: 'read-only', label: 'Solo lectura', description: 'El formulario respeta los permisos de consulta sin habilitar modificaciones.' },
] as const
export type MarketingScenario = typeof marketingScenarios[number]['id']
const uid = (n: number) => `da000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const wa = uid(1), smtp = uid(2), list = uid(3), sequenceId = uid(4), campaignId = uid(5)

/** Every method is handled locally or denied. There is deliberately no live-action fallback. */
export function createMarketingExample(scenario: MarketingScenario) {
    const email = ['new-email', 'scheduled-email', 'unknown-email'].includes(scenario)
    const creating = scenario.startsWith('new-') || scenario === 'missing-channel'
    let exists = !creating
    let failNextSave = scenario === 'save-error'
    let authorized = scenario !== 'missing-consent'
    const canManage = scenario !== 'read-only'
    const enabled = scenario !== 'execution-disabled'
    let campaign: Campaign = {
        id: campaignId, name: email ? 'Novedades de octubre · clientes' : 'Lanzamiento de temporada · WhatsApp',
        status: scenario === 'paused' ? 'paused' : scenario === 'completed' ? 'completed' : ['active', 'unknown-email', 'failed-whatsapp'].includes(scenario) ? 'active' : 'draft',
        channel: email ? 'email' : 'whatsapp', connection_id: email ? null : wa, smtp_config_id: email ? smtp : null,
        scheduled_for: scenario === 'scheduled-email' ? new Date(Date.now() + 86400000).toISOString() : null,
        delivery_config: { mode: 'growth', humanize: true, timezone: 'America/Bogota', recipient_cooldown_hours: 24, schedule_window: { start: 9, end: 18 } },
        total_enrolled: 0, total_completed: 0, engagement_score: 0, created_at: new Date().toISOString(),
    }
    if (campaign.status !== 'draft') campaign.execution_version = email ? 3 : 2
    let filters: Record<string, unknown> = email ? { has_email: true, list_id: list } : { has_phone: true, list_id: list }
    const template: CampaignTemplate = { id: uid(6), channel_id: wa, name: 'nueva_temporada', language: 'es', category: 'MARKETING', status: 'APPROVED', meta_id: '123456789', components: [{ type: 'BODY', text: 'Hola {{1}}, descubre nuestra nueva colección. Responde a este mensaje si quieres conocer más.' }, { type: 'FOOTER', text: 'Escribe BAJA para dejar de recibir promociones.' }] }
    let steps: MarketingStep[] = creating ? [] : [{ id: uid(7), sequence_id: sequenceId, order_index: 0, type: email ? 'email' : 'whatsapp', name: 'Mensaje de lanzamiento', content: email ? { subject: 'Una novedad para ti, {{nombre}}', body: 'Hola {{nombre}},\n\nEsta semana estrenamos nuestra colección de temporada. Nos encantará ayudarte a encontrar lo que buscas.\n\nConoce las novedades en https://example.com/novedades\n\nGracias por acompañarnos.' } : { template_id: template.id, template_name: template.name, template_language: 'es', bindings: { 'body.1': '{{nombre}}' } } }]
    let lists = [{ id: list, name: 'Clientes interesados · octubre', createdAt: new Date().toISOString(), contacts: 12 }]
    const sequence = (): Sequence => ({ id: sequenceId, campaign_id: campaign.id, name: 'Mensajes de campaña', trigger_type: 'manual', trigger_config: {}, is_active: true, steps })
    const audience = () => ({ matched: 12, eligible: authorized ? 10 : 0, duplicates: 0, invalidFormat: 0, optedOut: 1, missingConsent: authorized ? 1 : 11 })
    const metrics = (): CampaignMetrics => {
        const running = campaign.status !== 'draft'
        const waiting = !!campaign.scheduled_for && Date.parse(campaign.scheduled_for) > Date.now()
        const completed = campaign.status === 'completed' ? 10 : running && !waiting ? 6 : 0
        return { channel: campaign.channel, stats: { total: running ? 10 : 0, active: running ? 10 - completed - (scenario === 'failed-whatsapp' ? 2 : scenario === 'unknown-email' ? 1 : 0) : 0, completed, failed: scenario === 'failed-whatsapp' ? 2 : scenario === 'unknown-email' ? 1 : 0, cancelled: 0 },
            delivery: { queued: 0, sending: 0, accepted: completed, delivered: email ? 0 : completed, read: email ? 0 : Math.max(0, completed - 2), failed: scenario === 'failed-whatsapp' ? 2 : 0, unknown: scenario === 'unknown-email' ? 1 : 0 },
            channelHealth: { ready: true, quality: 'GREEN', checkedAt: new Date().toISOString(), holdCode: null, holdAt: null, holdUntil: null },
            runtime: { startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), status: 'success' }, recentActivity: [] }
    }
    const handlers: Partial<MarketingClientApi> = {
        getMarketingSetup: async () => ({ success: true as const, canManage, canExecute: canManage, canImport: canManage, executionEnabled: enabled, channels: scenario === 'missing-channel' ? [] : [{ id: wa, name: 'Equipo comercial (ejemplo)' }], templates: [template] }),
        getMarketingEmailSenders: async () => ({ success: true as const, channels: scenario === 'missing-channel' ? [] : [{ id: `smtp:${smtp}`, name: 'Equipo comercial · novedades@example.com', type: 'email' as const }] }),
        getMarketingStats: async () => ({ totalCampaigns: exists ? 1 : 0, totalMessages: metrics().delivery.accepted, totalDelivered: metrics().delivery.delivered, whatsappAccepted: email ? 0 : metrics().delivery.accepted, emailAccepted: email ? metrics().delivery.accepted : 0, deliveryRate: !email && metrics().delivery.accepted ? 100 : null }),
        getCampaign: async () => ({ success: true, campaign: { ...campaign }, executionEnabled: enabled }),
        createCampaign: async input => { exists = true; campaign = { ...campaign, ...input }; return { success: true, campaign: { ...campaign } } },
        updateCampaign: async (_id, input) => { if (failNextSave) { failNextSave = false; return { success: false, error: 'No se pudo guardar por un fallo temporal de ejemplo. Reintenta; tus cambios se conservaron.' } } campaign = { ...campaign, ...input }; return { success: true } },
        saveCampaignSender: async (_id, sender) => { campaign = { ...campaign, connection_id: sender.startsWith('smtp:') ? null : sender, smtp_config_id: sender.startsWith('smtp:') ? sender.slice(5) : null }; return { success: true as const } },
        getSequences: async () => ({ success: true, sequences: steps.length ? [sequence()] : [] }),
        createSequence: async () => ({ success: true, sequence: sequence() }),
        addStepToSequence: async (_id, input) => { const item = { ...input, id: uid(20 + steps.length), sequence_id: sequenceId, order_index: steps.length }; steps = [...steps, item]; return { success: true, step: item } },
        updateStep: async (id, input) => { steps = steps.map(step => step.id === id ? { ...step, ...input } : step); return { success: true } },
        deleteStep: async id => { steps = steps.filter(step => step.id !== id); return { success: true } },
        reorderCampaignSteps: async input => { steps = input.order.map((id, order_index) => ({ ...steps.find(step => step.id === id)!, order_index })); return { success: true as const } },
        setPrincipalSequence: async () => ({ success: true as const }),
        getCampaignStats: async () => ({ success: true as const, ...metrics() }),
        getCampaignAudience: async () => ({ success: true as const, audience: { id: uid(8), name: 'Destinatarios de ejemplo', filters } }),
        saveCampaignAudience: async (_id, value) => { filters = value as Record<string, unknown>; return { success: true as const } },
        getAudienceReadiness: async () => ({ success: true as const, audience: audience() }),
        getMarketingContactListPage: async (input = {}) => ({ success: true as const, page: { rows: lists, next: null, selected: lists.find(item => item.id === input.selected) || null } }),
        getMarketingAudiencePage: async () => ({ success: true as const, page: { rows: [{ id: uid(9), name: 'Clientes con interés reciente', filters, createdAt: new Date().toISOString() }], next: null } }),
        getMarketingAssignees: async () => ({ success: true as const, page: { rows: [], next: null, selected: null } }),
        refreshMarketingChannelHealth: async () => ({ success: true as const, quality: 'GREEN' }),
        prepareCampaignActivation: async () => ({ success: true as const, review: { token: uid(10), expiresAt: new Date(Date.now() + 600000).toISOString(), enabled, resume: campaign.status === 'paused', channel: campaign.channel, issues: authorized ? [] : ['No hay destinatarios con autorización vigente. Registra el permiso de la lista o selecciona otra audiencia.'], audience: audience(), connectionId: campaign.connection_id || null, channelName: email ? 'Equipo comercial · novedades@example.com' : 'WhatsApp · Equipo comercial (ejemplo)', scheduledFor: campaign.scheduled_for || null, mode: campaign.delivery_config?.mode || 'growth', timezone: 'America/Bogota', window: campaign.delivery_config?.schedule_window || null, recipientCooldownHours: 24, steps: steps.map(step => ({ id: step.id, name: step.name, type: step.type, template: step.content?.subject || step.content?.template_name || null, language: email ? null : 'es', text: email ? step.content?.body || '' : template.components[0].text || '', bindings: step.content?.bindings || {}, delay: step.delay_config || null })) } }),
        enrollAudienceInCampaign: async () => { campaign = { ...campaign, status: 'active', execution_version: email ? 3 : 2 }; return { success: true as const, enrolled: 10, resumed: scenario === 'paused' } },
        getMarketingCampaignPage: async (input = {}) => ({ success: true as const, page: { rows: !exists ? [] : (input.search && !campaign.name.toLowerCase().includes(input.search.toLowerCase())) || (input.status && input.status !== 'all' && input.status !== campaign.status) ? [] : [{ id: campaign.id, name: campaign.name, status: campaign.status, channel: campaign.connection_id || smtp, channelType: campaign.channel, channelName: email ? 'novedades@example.com' : 'Equipo comercial', createdAt: campaign.created_at, scheduledFor: campaign.scheduled_for || null, recipients: metrics().stats.total, completed: metrics().stats.completed, failed: 0, cancelled: 0, accepted: metrics().delivery.accepted, delivered: metrics().delivery.delivered, read: metrics().delivery.read, deliveryFailed: 0, unknown: metrics().delivery.unknown }], next: null } }),
        getMarketingHistory: async input => {
            const query = input.filters as { status?: string; delivery?: string; search?: string }
            const names = ['Ana', 'Luis', 'Marta', 'Carlos', 'Sofía', 'Diego', 'Lucía', 'Mateo', 'Sara', 'Pablo']
            const rows = names.map((name, index) => {
                const unknown = scenario === 'unknown-email' && index === 0
                const failed = scenario === 'failed-whatsapp' && [6, 7].includes(index)
                const completed = campaign.status === 'completed' || (scenario === 'unknown-email' ? index > 0 && index <= 6 : index < metrics().stats.completed)
                const status = unknown || failed ? 'failed' : completed ? 'completed' : 'active'
                return { id: uid(40 + index), name: `${name} de ejemplo`, phone: email ? `contacto${index + 1}@example.com` : `+57 000 000 000${index}`, status,
                    issue: unknown ? 'El servidor no confirmó el resultado.' : failed ? 'El proveedor rechazó este mensaje.' : null,
                    started_at: new Date().toISOString(), last_run_at: new Date().toISOString(), completed_at: status === 'completed' ? new Date().toISOString() : null, next_run_at: status === 'active' ? new Date(Date.now() + 60000).toISOString() : null,
                    counts: { total: 1, queued: 0, sending: 0, accepted: status === 'completed' ? 1 : 0, delivered: !email && status === 'completed' && index >= 4 ? 1 : 0, read: !email && status === 'completed' && index < 4 ? 1 : 0, failed: failed ? 1 : 0, unknown: unknown ? 1 : 0 } }
            }).filter(row => (!query.status || query.status === 'all' || query.status === row.status) && (!query.delivery || query.delivery === 'all' || row.counts[query.delivery as keyof typeof row.counts] > 0) && (!query.search || `${row.name} ${row.phone}`.toLowerCase().includes(query.search.toLowerCase())))
            return { success: true as const, canExport: false, page: { items: rows, hasMore: false, nextCursor: null, queriedAt: new Date().toISOString(), total: rows.length } }
        },
        getMarketingStepHistory: async input => ({ success: true as const, page: { items: steps.map(step => ({ enrollment_id: input.enrollmentId, enrollment_status: 'active', name: 'Contacto de ejemplo', phone: email ? 'contacto@example.com' : '+57 000 000 0000', step_id: step.id, order_index: step.order_index, step_name: step.name, type: step.type, template_name: step.content?.subject || step.content?.template_name || null, progress: 'current' as const, delivery: scenario === 'unknown-email' ? 'unknown' : 'accepted', queued_at: new Date().toISOString(), updated_at: new Date().toISOString(), receipt_at: null, error_code: null })), hasMore: false, nextCursor: null, queriedAt: new Date().toISOString() } }),
    }
    const authorizationReview = async () => ({ success: true as const, review: { token: uid(11), expiresAt: new Date(Date.now() + 600000).toISOString(), listName: lists[0].name, contacts: 12, toAuthorize: 10, excluded: 2 } })
    handlers.prepareMarketingListAuthorization = authorizationReview
    handlers.prepareEmailListAuthorization = authorizationReview
    const authorize = async () => { authorized = true; return { success: true as const, result: { authorized: 10 } } }
    handlers.confirmMarketingListAuthorization = authorize
    handlers.confirmEmailListAuthorization = authorize
    handlers.recordMarketingPermission = async () => { authorized = true; return { success: true as const } }
    handlers.recordEmailPermission = async () => { authorized = true; return { success: true as const } }
    const prepareImport = async (rows: unknown) => ({ success: true as const, review: { token: uid(12), expiresAt: new Date(Date.now() + 600000).toISOString(), rows: (rows as Array<{ row: number; name: string; phone?: string; email?: string }>).map(row => ({ row: row.row, name: row.name, phone: row.email || row.phone || '', eligible: true, reason: 'new_contact' })) } })
    handlers.prepareMarketingContactImport = prepareImport
    handlers.prepareEmailContactImport = prepareImport
    const confirmImport = async (input: unknown) => { const name = (input as { listName: string }).listName; const created = { id: uid(13), name, contacts: 3, createdAt: new Date().toISOString() }; lists = [...lists, created]; return { success: true as const, result: { created: 3, existing: 0, consents: 0, listId: created.id, listName: name } } }
    handlers.confirmMarketingImport = confirmImport
    handlers.confirmEmailContactImport = confirmImport
    const api = new Proxy(handlers, { get(target, key) { return target[key as keyof MarketingClientApi] || (async () => ({ success: false, error: 'Esta acción no modifica datos en el ejemplo. Vuelve al recorrido principal.' })) } }) as MarketingClientApi
    return { api, initialCampaign: creating ? { id: '', name: '', initialChannel: email ? 'email' as const : 'whatsapp' as const } : { id: campaign.id, name: campaign.name } }
}
