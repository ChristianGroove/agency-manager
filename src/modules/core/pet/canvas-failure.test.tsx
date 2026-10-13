import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RobotHead } from './vendor/robot-heads/src/RobotHead'

afterEach(() => { cleanup(); vi.restoreAllMocks() })
describe('real renderer canvas recovery', () => {
    it('reports missing canvas support during static initialization without throwing into the dashboard', () => {
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
        const recover = vi.fn()
        expect(() => render(<RobotHead size={64} paused onRenderError={recover} />)).not.toThrow()
        expect(recover).toHaveBeenCalledWith(expect.objectContaining({ message: 'Canvas 2D unavailable' }))
    })
    it('reports a drawing initialization exception through the same recovery path', () => {
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => { throw new Error('Canvas blocked') })
        const recover = vi.fn()
        expect(() => render(<RobotHead size={64} paused onRenderError={recover} />)).not.toThrow()
        expect(recover).toHaveBeenCalledWith(expect.objectContaining({ message: 'Canvas blocked' }))
    })
})
