import 'server-only'
import published from './published.json'
import { corpusSchema } from './schema'

// Only the reviewed build artifact is imported. Runtime never scans Gemini's draft directory.
const parsed = corpusSchema.safeParse(published)
export const helpCorpus = parsed.success ? parsed.data : { schema_version: 1, revision: 'unavailable', articles: [] }
export function helpV2Enabled(org: string): boolean {
    const tenants = (process.env.PIXY_HELP_V2_TENANTS || '').split(',').map(value => value.trim())
    return process.env.PIXY_HELP_V2_ENABLED === 'true' && (tenants.includes(org) || tenants.includes('*'))
}
