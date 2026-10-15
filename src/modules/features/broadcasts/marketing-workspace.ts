import { z } from 'zod'

export const campaignStates = ['draft', 'active', 'paused', 'completed', 'archived'] as const
export const campaignStateLabels: Record<string, string> = {
    draft: 'Borrador', active: 'Activa', paused: 'Pausada', completed: 'Completada', archived: 'Archivada',
}
export const campaignPageSchema = z.object({
    search: z.string().trim().max(100).default(''), status: z.enum(['all', ...campaignStates]).default('all'),
    channel: z.union([z.string().uuid(), z.string().startsWith('smtp:').transform(value => value.slice(5)).pipe(z.string().uuid())]).nullable().default(null),
    cursor: z.object({ createdAt: z.string().datetime({ offset: true }), id: z.string().uuid() }).strict().nullable().default(null),
}).strict()
export type CampaignPageInput = z.input<typeof campaignPageSchema>
export interface CampaignRow {
    id: string; name: string; status: string; createdAt: string; scheduledFor: string | null;
    channel: string | null; channelName: string | null; channelType?: 'whatsapp' | 'email';
    recipients: number; completed: number; failed: number; cancelled: number;
    accepted: number; delivered: number; read: number; deliveryFailed: number; unknown: number;
}
export interface CampaignPage { rows: CampaignRow[]; next: { createdAt: string; id: string } | null }
export const audiencePageSchema = campaignPageSchema.pick({ search: true, cursor: true }).strict()
export const contactListPageSchema = audiencePageSchema.extend({ selected: z.string().uuid().nullable().default(null) }).strict()
export interface ContactListPage { rows: Array<{ id: string; name: string; createdAt: string; contacts: number }>; next: CampaignPage['next']; selected: { id: string; name: string } | null }
export interface AudiencePage { rows: Array<{ id: string; name: string; createdAt: string; filters: Record<string, unknown> }>; next: CampaignPage['next'] }

export const stepOrderSchema = z.object({
    campaignId: z.string().uuid(), sequenceId: z.string().uuid(),
    expected: z.array(z.string().uuid()).min(1).max(500), order: z.array(z.string().uuid()).min(1).max(500),
}).strict().refine(value => new Set(value.order).size === value.order.length &&
    new Set(value.expected).size === value.expected.length && value.order.length === value.expected.length &&
    value.order.every(id => value.expected.includes(id)), 'El orden debe contener todos los pasos una sola vez.')
export const assigneePageSchema = z.object({
    search: z.string().trim().max(100).default(''),
    cursor: z.string().uuid().nullable().default(null), selected: z.string().uuid().nullable().default(null),
}).strict()
export interface AssigneePage { rows: Array<{ id: string; name: string }>; next: string | null; selected: { id: string; name: string; active: boolean } | null }

/** These are recipient processing states, not message delivery percentages. */
export function campaignProgress(row: Pick<CampaignRow, 'recipients' | 'completed' | 'failed' | 'cancelled'>) {
    return row.recipients ? Math.min(100, Math.round(100 * (row.completed + row.failed + row.cancelled) / row.recipients)) : 0
}
