import type { ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
const mocks = vi.hoisted(() => ({ switch: vi.fn(), error: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/modules/core/organizations/organization-actions', () => ({
    switchOrganization: mocks.switch,
    getCurrentOrgName: async () => 'Original', getCurrentOrganizationId: async () => 'original',
    getUserOrganizations: async () => [
        { organization_id: 'original', role: 'owner', organization: { id: 'original', name: 'Original', slug: 'original' } },
        { organization_id: 'duplicate', role: 'owner', organization: { id: 'duplicate', name: 'Duplicado', slug: 'duplicate' } }
    ]
}))
vi.mock('./create-organization-sheet', () => ({ CreateOrganizationSheet: () => null }))
vi.mock('@/components/ui/sheet', () => {
    const Container = ({ children }: { children: ReactNode }) => <div>{children}</div>
    return { Sheet: Container, SheetContent: Container, SheetHeader: Container, SheetTitle: Container, SheetDescription: Container }
})
vi.mock('@/components/ui/scroll-area', () => ({ ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('sonner', () => ({ toast: { loading: vi.fn(), dismiss: vi.fn(), error: mocks.error } }))
import { OrganizationSwitcher } from './organization-switcher'
it('keeps the current cookie when the server rejects an unavailable target', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.switch.mockRejectedValue(new Error('Archived target'))
    document.cookie = 'pixy_org_id=original; path=/'
    render(<OrganizationSwitcher initialOrgDetails={{ id: 'original' }} />)
    fireEvent.click(await screen.findByText('Duplicado'))
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Error cambiando de organización'))
    expect(document.cookie).toContain('pixy_org_id=original')
    expect(mocks.switch).toHaveBeenCalledWith('duplicate')
    document.cookie = 'pixy_org_id=; path=/; max-age=0'
    log.mockRestore()
})
