import { expect, it } from 'vitest'
import { casualHelpReply, naturalizeHelpUncertainty, isGeneralHelpRecommendation, previousHelpTopic } from './response-policy'

it.each(['sabes chistes?', '¿Conoces algún chiste?', 'Cuéntame un chiste', 'puedes contarme un chiste?'])('recognizes a direct casual request: %s', question => {
    expect(casualHelpReply(question)).toContain('Pixy')
    expect(casualHelpReply(question)).not.toMatch(/opción|error|pantalla|documentación/)
})

it.each(['¿Cómo guardo una respuesta rápida con un chiste en Inbox?', '¿Sabes cómo enviar chistes por una plantilla?', '¿Cómo funciona el historial?'])('does not intercept a product question: %s', question => {
    expect(casualHelpReply(question)).toBeNull()
})

it.each(['nada mas, gracias', 'Gracias por la ayuda.', 'Perfecto, gracias', 'hasta luego', 'hola, ¿cómo estás?', 'ah excelente'])('answers social turns without technical uncertainty: %s', question => {
    expect(casualHelpReply(question)).toBeTruthy()
    expect(casualHelpReply(question)).not.toMatch(/confirm|opción|estado|documentación/)
})

it.each(['Gracias, pero no puedo subir un archivo.', 'Hola, ¿cómo creo una tarea?', 'Listo, ¿cómo lo envío a revisión?', '¿Hay alguna recomendación para completar subtareas?'])('keeps mixed and explicit product questions in the help flow: %s', question => {
    expect(casualHelpReply(question)).toBeNull()
    expect(isGeneralHelpRecommendation(question)).toBe(false)
})

it.each(['ah excelente, alguna recomendacion?', 'algún consejo?', '¿Y qué me recomiendas?', 'Gracias, ¿alguna recomendación?'])('recognizes a generic follow-up for recommendations: %s', question => {
    expect(isGeneralHelpRecommendation(question)).toBe(true)
    expect(casualHelpReply(question)).toBeNull()
})

it('finds the substantive user topic through courtesy and recommendations without trusting assistant text', () => {
    expect(previousHelpTopic([{ role: 'user', content: '¿Cómo escribo comentarios?' }, { role: 'assistant', content: 'Nueva factura' },
        { role: 'user', content: 'excelente' }, { role: 'user', content: 'alguna recomendacion?' }, { role: 'user', content: 'gracias' }])).toBe('¿Cómo escribo comentarios?')
    expect(previousHelpTopic([{ role: 'user', content: 'hola' }, { role: 'assistant', content: 'Cambiar prioridades' }])).toBeUndefined()
})

it('keeps uncertainty without repeating source gaps or asserting lack of capability', () => {
    expect(naturalizeHelpUncertainty('No puedo confirmar si el chat de Inbox permite cargar stickers personalizados, ya que la documentación disponible no registra esa funcionalidad.'))
        .toBe('No puedo confirmarlo por ahora.')
})

it.each(['No puedo confirmar si puedes cargar stickers personalizados.', 'Pulsa **Nota** para guardar una nota interna.', 'La documentación de la API se configura desde el editor.', 'No se pueden enviar textos libres fuera de la ventana de atención.'])('preserves other answers without rewriting instructions: %s', answer => {
    expect(naturalizeHelpUncertainty(answer)).toBe(answer)
})
