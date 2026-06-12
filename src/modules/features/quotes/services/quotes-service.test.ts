import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getCurrentOrganizationId: vi.fn(),
  supabaseAdminFrom: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
  createClient: mocks.createClient,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
  getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
  supabaseAdmin: {
    from: mocks.supabaseAdminFrom,
  },
}))

function collectConsoleCalls(...spies: ReturnType<typeof vi.spyOn>[]) {
  return spies
    .flatMap(spy => spy.mock.calls as unknown[][])
    .map(call => call.map(value => {
      if (typeof value === 'string') return value
      if (value instanceof Error) return `${value.name}: ${value.message}`
      try {
        return JSON.stringify(value)
      } catch {
        return String(value)
      }
    }).join(' '))
    .join('\n')
}

function selectEqEqSingleQuery(result: unknown) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    single: vi.fn(async () => result),
  }

  return query
}

function selectEqIsSingleQuery(result: unknown) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    single: vi.fn(async () => result),
  }

  return query
}

function insertSelectSingleQuery(result: unknown) {
  const query: any = {
    insert: vi.fn(() => query),
    select: vi.fn(() => query),
    single: vi.fn(async () => result),
  }

  return query
}

function updateEqQuery(result: unknown) {
  const query: any = {
    update: vi.fn(() => query),
    eq: vi.fn(async () => result),
  }

  return query
}

function createSupabaseMock(queues: Record<string, unknown[]> = {}, rpcResult: unknown = { data: 1, error: null }) {
  const tableQueues = Object.fromEntries(
    Object.entries(queues).map(([table, tableQueue]) => [table, [...tableQueue]])
  )

  return {
    from: vi.fn((table: string) => {
      const queue = tableQueues[table]
      if (!queue?.length) throw new Error(`Unexpected table ${table}`)
      return queue.shift()
    }),
    rpc: vi.fn(async () => rpcResult),
  }
}

function useAdminTableQueues(queues: Record<string, unknown[]>) {
  const tableQueues = Object.fromEntries(
    Object.entries(queues).map(([table, tableQueue]) => [table, [...tableQueue]])
  )

  mocks.supabaseAdminFrom.mockImplementation((table: string) => {
    const queue = tableQueues[table]
    if (!queue?.length) throw new Error(`Unexpected admin table ${table}`)
    return queue.shift()
  })
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  vi.resetModules()
  mocks.createClient.mockReset()
  mocks.getCurrentOrganizationId.mockReset()
  mocks.supabaseAdminFrom.mockReset()
})

describe('quotes service', () => {
  it('loads a quote without changing the success contract', async () => {
    const quote = { id: 'quote-current', number: 'COT-00001', organization_id: 'org-current' }
    const supabase = createSupabaseMock({
      quotes: [
        selectEqEqSingleQuery({ data: quote, error: null }),
      ],
    })
    mocks.createClient.mockResolvedValue(supabase)
    mocks.getCurrentOrganizationId.mockResolvedValue('org-current')

    const { getQuote } = await import('./quotes-service')
    const result = await getQuote('quote-current')

    expect(result).toEqual({ success: true, data: quote })
    expect(supabase.from).toHaveBeenCalledWith('quotes')
  })

  it('does not expose quote fetch failures in deployed runtimes', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const supabase = createSupabaseMock({
      quotes: [
        selectEqEqSingleQuery({
          data: null,
          error: {
            code: '42501',
            message: 'quote denied org-secret-id quote-secret-token',
          },
        }),
      ],
    })
    mocks.createClient.mockResolvedValue(supabase)
    mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')

    const { getQuote } = await import('./quotes-service')
    const result = await getQuote('quote-secret-id')

    expect(result).toEqual({ success: false, error: 'No se pudo cargar la cotizacion' })
    const logText = collectConsoleCalls(errorSpy)
    expect(logText).not.toContain('org-secret-id')
    expect(logText).not.toContain('quote-secret-id')
    expect(logText).not.toContain('quote-secret-token')
    expect(logText).not.toContain('quote denied')
    expect(logText).toContain('42501')
  })

  it('does not expose sequence generation failures when creating quotes', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const supabase = createSupabaseMock({}, {
      data: null,
      error: {
        code: '42501',
        message: 'sequence denied org-secret-id sequence-secret-token',
      },
    })
    mocks.createClient.mockResolvedValue(supabase)
    mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')

    const { createQuote } = await import('./quotes-service')
    const result = await createQuote({ title: 'Secret quote title', total: 1200 } as any)

    expect(result).toEqual({ success: false, error: 'No se pudo crear la cotizacion' })
    const logText = collectConsoleCalls(errorSpy)
    expect(logText).not.toContain('org-secret-id')
    expect(logText).not.toContain('sequence-secret-token')
    expect(logText).not.toContain('Secret quote title')
    expect(logText).not.toContain('sequence denied')
    expect(logText).toContain('42501')
  })

  it('does not expose lead linking failures after creating a quote', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const supabase = createSupabaseMock({
      leads: [
        selectEqEqSingleQuery({
          data: {
            id: 'lead-secret-id',
            estimated_value: 1200,
            quote_id: null,
          },
          error: null,
        }),
        updateEqQuery({
          error: {
            code: '42501',
            message: 'lead link denied org-secret-id lead-secret-id quote-secret-id link-token-secret',
          },
        }),
      ],
      quotes: [
        insertSelectSingleQuery({
          data: { id: 'quote-secret-id', organization_id: 'org-secret-id' },
          error: null,
        }),
      ],
    }, { data: 7, error: null })
    mocks.createClient.mockResolvedValue(supabase)
    mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')

    const { createQuoteFromLead } = await import('./quotes-service')
    const result = await createQuoteFromLead('lead-secret-id')

    expect(result).toEqual({ success: true, quoteId: 'quote-secret-id' })
    const logText = collectConsoleCalls(errorSpy)
    expect(logText).not.toContain('org-secret-id')
    expect(logText).not.toContain('lead-secret-id')
    expect(logText).not.toContain('quote-secret-id')
    expect(logText).not.toContain('link-token-secret')
    expect(logText).not.toContain('lead link denied')
    expect(logText).toContain('42501')
  })

  it('does not expose public quote lookup failures in deployed runtimes', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    useAdminTableQueues({
      quotes: [
        selectEqIsSingleQuery({
          data: null,
          error: {
            code: '42501',
            message: 'public quote denied org-secret-id public-token-secret',
          },
        }),
      ],
    })

    const { getPublicQuote } = await import('./quotes-service')
    const result = await getPublicQuote('quote-secret-id')

    expect(result.success).toBe(false)
    expect(result.error).not.toContain('public-token-secret')
    const logText = collectConsoleCalls(errorSpy)
    expect(logText).not.toContain('quote-secret-id')
    expect(logText).not.toContain('org-secret-id')
    expect(logText).not.toContain('public-token-secret')
    expect(logText).not.toContain('public quote denied')
    expect(logText).toContain('42501')
  })
})
