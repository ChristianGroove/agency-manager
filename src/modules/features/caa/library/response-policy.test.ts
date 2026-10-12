import { expect, it } from 'vitest'
import { casualHelpReply, naturalizeHelpUncertainty } from './response-policy'

it.each(['sabes chistes?', '¿Conoces algún chiste?', 'Cuéntame un chiste', 'puedes contarme un chiste?'])('recognizes a direct casual request: %s', question => {
    expect(casualHelpReply(question)).toContain('Pixy')
    expect(casualHelpReply(question)).not.toMatch(/opción|error|pantalla|documentación/)
})

it.each(['¿Cómo guardo una respuesta rápida con un chiste en Inbox?', '¿Sabes cómo enviar chistes por una plantilla?', '¿Cómo funciona el historial?'])('does not intercept a product question: %s', question => {
    expect(casualHelpReply(question)).toBeNull()
})

it('keeps uncertainty without repeating source gaps or asserting lack of capability', () => {
    expect(naturalizeHelpUncertainty('No puedo confirmar si el chat de Inbox permite cargar stickers personalizados, ya que la documentación disponible no registra esa funcionalidad.'))
        .toBe('No puedo confirmarlo por ahora.')
})

it.each(['No puedo confirmar si puedes cargar stickers personalizados.', 'Pulsa **Nota** para guardar una nota interna.', 'La documentación de la API se configura desde el editor.', 'No se pueden enviar textos libres fuera de la ventana de atención.'])('preserves other answers without rewriting instructions: %s', answer => {
    expect(naturalizeHelpUncertainty(answer)).toBe(answer)
})
