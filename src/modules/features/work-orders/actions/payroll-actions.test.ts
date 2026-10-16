import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    revalidatePath: vi.fn(),
    requirePermission: vi.fn().mockResolvedValue(undefined),
    getCurrentOrganizationId: vi.fn().mockResolvedValue('org-payroll-123'),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('@/modules/core/iam/services/role-service', () => ({
    requirePermission: mocks.requirePermission,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

function createQueryChain(result: { data?: any; error?: any } = { data: null, error: null }) {
    const chain: any = {}
    chain.select = vi.fn(() => chain)
    chain.insert = vi.fn(() => chain)
    chain.update = vi.fn(() => chain)
    chain.delete = vi.fn(() => chain)
    chain.eq = vi.fn(() => chain)
    chain.gte = vi.fn(() => chain)
    chain.lte = vi.fn(() => chain)
    chain.order = vi.fn(() => chain)
    chain.limit = vi.fn(() => chain)
    chain.single = vi.fn(async () => result)
    chain.maybeSingle = vi.fn(async () => result)
    chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
    return chain
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.requirePermission.mockReset()
    mocks.requirePermission.mockResolvedValue(undefined)
    mocks.getCurrentOrganizationId.mockReset()
    mocks.getCurrentOrganizationId.mockResolvedValue('org-payroll-123')
})

describe('Payroll Server Actions IAM Enforcement', () => {
    const ORG_ID = 'org-payroll-123'

    describe('Payroll Processing Permissions (PAYROLL.PROCESS)', () => {
        it('enforces PAYROLL.PROCESS on createPayrollPeriod', async () => {
            const query = createQueryChain({ data: { id: 'period-1' }, error: null })
            mocks.createClient.mockResolvedValue({
                from: vi.fn(() => query),
            })

            const { createPayrollPeriod } = await import('./payroll-actions')
            const result = await createPayrollPeriod({
                periodStart: '2026-10-01',
                periodEnd: '2026-10-15',
                periodName: 'Primera Quincena Octubre',
            })

            expect(result.success).toBe(true)
            expect(mocks.requirePermission).toHaveBeenCalledWith('payroll.process', ORG_ID)
        })

        it('enforces PAYROLL.PROCESS on processPayrollPeriod', async () => {
            const periodQuery = createQueryChain({
                data: {
                    id: 'period-1',
                    organization_id: ORG_ID,
                    status: 'open',
                    period_start: '2026-10-01',
                    period_end: '2026-10-15',
                },
                error: null,
            })
            const staffQuery = createQueryChain({ data: [], error: null })
            const updatePeriodQuery = createQueryChain({ data: null, error: null })

            const tableMap: Record<string, any> = {
                staff_payroll_periods: periodQuery,
                organization_staff: staffQuery,
            }

            mocks.createClient.mockResolvedValue({
                from: vi.fn((table: string) => tableMap[table] || updatePeriodQuery),
            })

            const { processPayrollPeriod } = await import('./payroll-actions')
            await processPayrollPeriod('period-1')

            expect(mocks.requirePermission).toHaveBeenCalledWith('payroll.process', ORG_ID)
        })

        it('enforces PAYROLL.PROCESS and tenant isolation on updateSettlement', async () => {
            const query = createQueryChain({ data: null, error: null })
            mocks.createClient.mockResolvedValue({
                from: vi.fn(() => query),
            })

            const { updateSettlement } = await import('./payroll-actions')
            const result = await updateSettlement('settlement-1', { bonuses: 50000, notes: 'Bonus puntualidad' })

            expect(result.success).toBe(true)
            expect(mocks.requirePermission).toHaveBeenCalledWith('payroll.process', ORG_ID)
            expect(query.eq).toHaveBeenCalledWith('organization_id', ORG_ID)
        })
    })

    describe('Payroll Payment Permissions (PAYROLL.PAY)', () => {
        it('enforces PAYROLL.PAY on registerPayment and alias registerPayrollPayment', async () => {
            const settlementQuery = createQueryChain({
                data: { staff_id: 'staff-1', amount_owed: '100000' },
                error: null,
            })
            const insertPaymentQuery = createQueryChain({ data: null, error: null })

            const tableMap: Record<string, any> = {
                staff_payroll_settlements: settlementQuery,
                staff_payments: insertPaymentQuery,
            }

            mocks.createClient.mockResolvedValue({
                from: vi.fn((table: string) => tableMap[table] || insertPaymentQuery),
            })

            const { registerPayment, registerPayrollPayment } = await import('./payroll-actions')
            const result = await registerPayment('settlement-1', {
                amount: 50000,
                paymentMethod: 'transfer',
                paymentDate: '2026-10-16',
            })

            expect(result.success).toBe(true)
            expect(mocks.requirePermission).toHaveBeenCalledWith('payroll.pay', ORG_ID)
            expect(registerPayrollPayment).toBe(registerPayment)
        })
    })

    describe('Payroll View Permissions (PAYROLL.VIEW)', () => {
        it('enforces PAYROLL.VIEW on getPayrollPeriods, getPayrollHistory, and getSettlementPayments', async () => {
            const periodsQuery = createQueryChain({ data: [], error: null })
            const paymentsQuery = createQueryChain({ data: [], error: null })

            mocks.createClient.mockResolvedValue({
                from: vi.fn((table: string) => table === 'staff_payments' ? paymentsQuery : periodsQuery),
            })

            const { getPayrollPeriods, getPayrollHistory, getSettlementPayments } = await import('./payroll-actions')

            await getPayrollPeriods()
            expect(mocks.requirePermission).toHaveBeenCalledWith('payroll.view', ORG_ID)
            expect(getPayrollHistory).toBe(getPayrollPeriods)

            mocks.requirePermission.mockClear()
            await getSettlementPayments('settlement-1')
            expect(mocks.requirePermission).toHaveBeenCalledWith('payroll.view', ORG_ID)
        })
    })
})
