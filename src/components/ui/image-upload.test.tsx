import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImageUpload } from './image-upload'

const mocks = vi.hoisted(() => ({ remove: vi.fn(), upload: vi.fn() }))
vi.mock('@/modules/core/branding/actions', () => ({
    uploadBrandingAsset: mocks.upload,
    deleteBrandingAsset: mocks.remove,
}))

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('saved and inherited branding assets', () => {
    it('removes only the draft reference and keeps the shared file available', () => {
        const onChange = vi.fn()
        render(<ImageUpload value="https://example.com/shared-logo.png" onChange={onChange} />)
        fireEvent.click(screen.getByRole('button'))
        expect(onChange).toHaveBeenCalledWith('')
        expect(mocks.remove).not.toHaveBeenCalled()
        expect(mocks.upload).not.toHaveBeenCalled()
    })

    it('does not remove a logo from a disabled form', () => {
        const onChange = vi.fn()
        render(<ImageUpload value="https://example.com/shared-logo.png" onChange={onChange} disabled />)
        fireEvent.click(screen.getByRole('button'))
        expect(onChange).not.toHaveBeenCalled()
        expect(mocks.remove).not.toHaveBeenCalled()
    })
})
