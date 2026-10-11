import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ context: vi.fn(), complete: vi.fn(), apps: vi.fn() }))
vi.mock('@/modules/core/organizations/actions/provisioning', () => ({ getOnboardingContext: mocks.context, completeOrganizationOnboarding: mocks.complete }))
vi.mock('@/modules/core/saas/saas-actions', () => ({ getAvailableApps: mocks.apps }))
vi.mock('@/components/providers/branding-provider', () => ({ useBranding: () => ({ colors: { primary: '#000000' } }) }))
vi.mock('./app-slider', () => ({ AppSlider: () => <div>Selector de espacios</div> }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { OnboardingWizard } from './onboarding-wizard'

beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    mocks.apps.mockResolvedValue([{ id: 'saas-space', name: 'SaaS Space' }])
    mocks.context.mockResolvedValue({ success: true, data: { organization: { id: 'tenant', name: 'Empresa preparada', slug: 'empresa', app_name: 'SaaS Space' },
        requiresPassword: true, fullName: '', invitation: null } })
})

describe('onboarding UX', () => {
    it('shows preconfigured organization and password without repeating the organization form', async () => {
        render(<OnboardingWizard />)
        expect(await screen.findByText('Empresa preparada')).toBeInTheDocument()
        expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
        expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument()
        expect(screen.queryByLabelText('Organización')).not.toBeInTheDocument()
        expect(screen.queryByText('Selector de espacios')).not.toBeInTheDocument()
        expect(mocks.apps).not.toHaveBeenCalled()
    })

    it('lets autonomous invitations choose their app and organization with their existing signup password', async () => {
        mocks.context.mockResolvedValue({ success: true, data: { organization: null, requiresPassword: false, fullName: 'María', invitation: { target_app_id: 'saas-space' } } })
        render(<OnboardingWizard />)
        expect(await screen.findByText('Selector de espacios')).toBeInTheDocument()
        expect(screen.getByLabelText('Organización')).toBeInTheDocument()
        expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Crear y entrar' })).toBeEnabled()
    })

    it('shows actionable activation errors and releases the submit button', async () => {
        mocks.context.mockResolvedValue({ success: true, data: { organization: { name: 'Empresa preparada', app_name: 'SaaS Space' }, requiresPassword: false, invitation: null } })
        mocks.complete.mockResolvedValue({ success: false, error: 'Tu sesión expiró. Intenta de nuevo.' })
        render(<OnboardingWizard />)
        const button = await screen.findByRole('button', { name: 'Guardar y entrar' })
        fireEvent.click(button)
        expect(await screen.findByRole('alert')).toHaveTextContent('Tu sesión expiró')
        await waitFor(() => expect(button).toBeEnabled())
    })

    it('does not enable organization creation when context cannot be verified', async () => {
        mocks.context.mockResolvedValue({ success: false, error: 'No tienes acceso a la organización invitada.' })
        render(<OnboardingWizard />)
        expect(await screen.findByRole('alert')).toHaveTextContent('No tienes acceso')
        expect(screen.getByRole('button')).toBeDisabled()
        expect(screen.queryByLabelText('Organización')).not.toBeInTheDocument()
    })
})
