import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { HelpMessageContent } from './help-message-content'
afterEach(cleanup)
describe('help answer presentation', () => {
    it('hides internal access identifiers in an old answer while preserving the conditional restriction', () => {
        render(<HelpMessageContent text={'Puedes eliminar tareas (si cuentas con el permiso `can_bulk_delete_tasks`).'} />)
        expect(screen.getByText(/si cuentas con la autorización para eliminar tareas en grupo/)).toBeInTheDocument()
        expect(screen.queryByText(/can_bulk_delete_tasks/)).not.toBeInTheDocument()
    })
    it('renders emphasis and ordered steps while suppressing the old source footer', () => {
        const view = render(<HelpMessageContent text={'## Cambiar el tema\n\nUsa **Luna**.\n\n1. Abre el panel.\n2. Pulsa el botón.\n\nGuías consultadas: Cambiar tema'} />)
        expect(view.container.querySelector('strong')).toHaveTextContent('Luna')
        expect(view.container.querySelectorAll('ol li')).toHaveLength(2)
        expect(screen.queryByText(/Guías consultadas/)).not.toBeInTheDocument()
    })
    it('does not allow HTML, images or executable links from model output', () => {
        const view = render(<HelpMessageContent text={'<script>alert(1)</script>\n\n![imagen](https://example.org/image.png)\n\n[Continuar](javascript:alert(1))'} />)
        expect(view.container.querySelector('script')).toBeNull()
        expect(view.container.querySelector('img')).toBeNull()
        expect(view.container.querySelector('a')).toBeNull()
        expect(screen.getByText('Continuar')).toBeInTheDocument()
    })
})
