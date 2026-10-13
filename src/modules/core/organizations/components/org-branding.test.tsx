import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type BrandingConfig } from '@/types/branding'
import { OrgBranding } from './org-branding'

const mocks = vi.hoisted(() => ({ getEffectiveBranding: vi.fn() }))
vi.mock('@/modules/core/branding/actions', () => ({ getEffectiveBranding: mocks.getEffectiveBranding }))
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'dark' }) }))
const brand = (name: string, logo: string): BrandingConfig => ({ name,
    logos: { main: logo, main_light: null, portal: null, favicon: null }, colors: { primary: '#000000', secondary: '#ffffff' }, socials: {} })

afterEach(cleanup)
beforeEach(() => vi.resetAllMocks())

describe('sidebar branding updates', () => {
    it('accepts refreshed server branding for the same organization', () => {
        const { rerender } = render(<OrgBranding orgId="org-1" initialBranding={brand('Pixy', '/old.svg')} />)
        rerender(<OrgBranding orgId="org-1" initialBranding={brand('Pixy', '/new.svg')} />)
        expect(screen.getByRole('img', { name: 'Pixy' })).toHaveAttribute('src', '/new.svg')
        expect(mocks.getEffectiveBranding).not.toHaveBeenCalled()
    })

    it('fetches the new tenant and discards responses from the previous tenant', async () => {
        let finishOld!: (value: BrandingConfig) => void
        mocks.getEffectiveBranding.mockImplementation((id: string) => id === 'org-1'
            ? new Promise<BrandingConfig>(resolve => { finishOld = resolve })
            : Promise.resolve(brand('Tenant B', '/tenant-b.svg')))
        const { rerender } = render(<OrgBranding orgId="org-1" />)
        rerender(<OrgBranding orgId="org-2" />)
        await waitFor(() => expect(screen.getByRole('img', { name: 'Tenant B' })).toHaveAttribute('src', '/tenant-b.svg'))
        await act(async () => finishOld(brand('Tenant A', '/tenant-a.svg')))
        expect(screen.queryByRole('img', { name: 'Tenant A' })).not.toBeInTheDocument()
        expect(screen.getByRole('img', { name: 'Tenant B' })).toHaveAttribute('src', '/tenant-b.svg')
    })

    it('reloads branding on a saved-branding event', async () => {
        mocks.getEffectiveBranding.mockResolvedValue(brand('Pixy', '/new.svg'))
        render(<OrgBranding orgId="org-1" initialBranding={brand('Pixy', '/old.svg')} />)
        await act(async () => window.dispatchEvent(new Event('branding-updated')))
        expect(mocks.getEffectiveBranding).toHaveBeenCalledWith('org-1')
        expect(screen.getByRole('img', { name: 'Pixy' })).toHaveAttribute('src', '/new.svg')
    })
})
