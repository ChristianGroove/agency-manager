import type { ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
const mocks = vi.hoisted(() => ({ create: vi.fn(), resend: vi.fn(), close: vi.fn(), success: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))
vi.mock('@/modules/core/organizations/organization-actions', () => ({ createOrganization: mocks.create, resendOrganizationActivation: mocks.resend,
    getCurrentOrgDetails: async () => ({ id: 'platform', organization_type: 'platform' }) }))
vi.mock('@/modules/core/saas/saas-actions', () => ({ getSaaSProducts: async () => [{ id: 'app', name: 'SaaS Space', is_active: true, price_monthly: 99 }] }))
vi.mock('@/modules/core/iam/actions/invitation-actions', () => ({ createInviteLink: vi.fn() }))
vi.mock('@/components/ui/sheet', () => {
    const Container = ({ children }: { children: ReactNode }) => <div>{children}</div>
    return { Sheet: Container, SheetContent: Container, SheetHeader: Container, SheetTitle: Container, SheetDescription: Container }
})
vi.mock('@/components/ui/scroll-area', () => ({ ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }))
import { CreateOrganizationSheet } from './create-organization-sheet'
beforeEach(() => {
    vi.resetAllMocks()
    mocks.create.mockResolvedValue({ success: true, data: { id: 'tenant', invitation_error: 'Email failed' } })
    mocks.resend.mockResolvedValue({ success: true })
})
it('retries activation on the already-created tenant after mail failure, without a second creation', async () => {
    render(<CreateOrganizationSheet open onOpenChange={mocks.close} onSuccess={mocks.success} />)
    await screen.findAllByText('SaaS Space')
    fireEvent.change(screen.getByPlaceholderText('Ej: Barbería El Bigote'), { target: { value: 'Empresa' } })
    fireEvent.change(screen.getByPlaceholderText('admin@cliente.com (Opcional)'), { target: { value: 'owner@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear Organización' }))
    await screen.findByRole('button', { name: 'Reenviar activación' })
    expect(mocks.close).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('La organización ya está creada')
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar activación' }))
    await waitFor(() => expect(mocks.close).toHaveBeenCalledWith(false))
    expect(mocks.resend).toHaveBeenCalledWith('tenant')
    expect(mocks.create).toHaveBeenCalledTimes(1)
})
it('keeps activation retry available when sending fails again', async () => {
    mocks.resend.mockResolvedValue({ success: false, error: 'Delivery unavailable' })
    render(<CreateOrganizationSheet open onOpenChange={mocks.close} />)
    await screen.findAllByText('SaaS Space')
    fireEvent.change(screen.getByPlaceholderText('Ej: Barbería El Bigote'), { target: { value: 'Empresa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear Organización' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Reenviar activación' }))
    await waitFor(() => expect(mocks.resend).toHaveBeenCalledTimes(1))
    expect(mocks.close).not.toHaveBeenCalled()
    expect(mocks.create).toHaveBeenCalledTimes(1)
})
