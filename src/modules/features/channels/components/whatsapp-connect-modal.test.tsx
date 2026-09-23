import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { WhatsAppConnectModal } from './whatsapp-connect-modal'

vi.mock('@/modules/core/i18n/use-translation', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock('./meta-embedded-signup', () => ({
    MetaEmbeddedSignup: ({ mode }: { mode: string }) => <output data-testid="signup-mode">{mode}</output>,
}))

describe('WhatsApp connection choices', () => {
    it('routes new and existing Cloud API numbers through standard signup, and phone app numbers through coexistence', () => {
        render(<WhatsAppConnectModal open onOpenChange={vi.fn()} organizationId="org" />)
        expect(screen.queryByTestId('signup-mode')).toBeNull()
        fireEvent.click(screen.getByRole('radio', { name: 'meta.connect_modal.choices.new.title' }))
        expect(screen.getByTestId('signup-mode').textContent).toBe('cloud')
        fireEvent.click(screen.getByRole('radio', { name: 'meta.connect_modal.choices.app.title' }))
        expect(screen.getByTestId('signup-mode').textContent).toBe('coexistence')
        fireEvent.click(screen.getByRole('radio', { name: 'meta.connect_modal.choices.cloud.title' }))
        expect(screen.getByTestId('signup-mode').textContent).toBe('cloud')
    })
})
