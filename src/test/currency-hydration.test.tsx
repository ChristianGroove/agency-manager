import React from 'react'
import { act } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }))
vi.mock('react-countup', () => ({ default: () => null }))
vi.mock('@/modules/core/i18n/use-translation', () => ({ useTranslation: () => ({ t: (key: string) => key, tArray: () => [] }) }))
vi.mock('@/modules/features/caa/context/view-context', () => ({ useRegisterView: () => {} }))
vi.mock('@/modules/features/crm/context/clients-context', () => ({ useClients: () => ({ spaceType: 'agency' }) }))
vi.mock('@/modules/core/organizations/vertical-registry', () => ({ VERTICAL_REGISTRY: { agency: { management: { actions: { showBilling: true } } } } }))
vi.mock('@/modules/core/dashboard/modular-dashboard-layout', () => ({ ModularDashboardLayout: ({ data }: { data: { smartAlert?: { message: React.ReactNode } } }) => <div>{data.smartAlert?.message}</div> }))
vi.mock('@/modules/features/crm/components/create-client-sheet', () => ({ CreateClientSheet: () => null }))
vi.mock('@/modules/features/quotes/components/create-quote-sheet', () => ({ CreateQuoteSheet: () => null }))
vi.mock('@/modules/features/billing/components/create-invoice-sheet', () => ({ CreateInvoiceSheet: () => null }))
vi.mock('@/modules/features/forms/create-form-sheet', () => ({ CreateFormSheet: () => null }))
vi.mock('@/modules/core/organizations/components/create-organization-sheet', () => ({ CreateOrganizationSheet: () => null }))

import { ResellerDashboard } from '@/modules/core/dashboard/components/reseller-dashboard'
import { AgencyDashboard } from '@/modules/core/dashboard/components/agency-dashboard'
import AnimatedAvatarGroup from '@/components/ui/animated-avatar-group'
import { ClientsGrid } from '@/modules/features/crm/components/grid/clients-grid'

afterEach(() => vi.restoreAllMocks())

const debtors = [{ id: 'client-test', name: 'Cliente de prueba', debt: 53004500 }]
const dashboardData = { metrics: { revenue: 0, pending: 53004500, overdue: 53004500, debtors }, settings: {} }

describe('currency hydration across different server and browser locales', () => {
  it.each([
    ['reseller alert', <ResellerDashboard key="reseller" dashboardData={dashboardData} extraData={{ tenantCount: 1 }} />],
    ['agency alert', <AgencyDashboard key="agency" dashboardData={dashboardData} extraData={{}} />],
    ['debtor avatars', <AnimatedAvatarGroup key="avatars" users={debtors} />],
    ['contact cards', <ClientsGrid key="contacts" clients={[{ id: 'client-test', name: 'Cliente de prueba', first_name: 'Cliente', debt: 53004500, futureDebt: 0, daysToPay: -1 }]} loading={false} />],
  ])('%s keeps the same monetary text during hydration', async (_name, element) => {
    const numberToLocaleString = Number.prototype.toLocaleString
    let defaultLocale = 'es-CO'
    vi.spyOn(Number.prototype, 'toLocaleString').mockImplementation(function (this: number, locales, options) {
      return numberToLocaleString.call(this, locales ?? defaultLocale, options)
    })
    const container = document.createElement('div')
    container.innerHTML = renderToString(element)
    document.body.appendChild(container)
    expect(container.textContent).toContain('53.004.500')

    defaultLocale = 'en-US'
    const onRecoverableError = vi.fn()
    let root: Root | undefined
    try {
      await act(async () => { root = hydrateRoot(container, element, { onRecoverableError }) })
      expect(onRecoverableError).not.toHaveBeenCalled()
      expect(container.textContent).toContain('53.004.500')
      expect(container.textContent).not.toContain('53,004,500')
    } finally {
      await act(async () => root?.unmount())
      container.remove()
    }
  })
})
