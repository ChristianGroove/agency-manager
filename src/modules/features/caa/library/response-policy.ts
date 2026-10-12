function normalizedConversationText(question: string): string {
    return question.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/[¿?¡!.,]/g, '').replace(/\s+/g, ' ').trim()
}

/** Match whole conversational turns; courtesy inside a product question is not an intent. */
export function casualHelpReply(question: string): string | null {
    const normalized = normalizedConversationText(question)
    if (/^(?:(?:ok|vale|bien|perfecto) )?(?:nada mas|eso es todo|hasta luego|hasta pronto|adios|nos vemos|listo)(?: (?:muchas )?gracias)?$/.test(normalized)) return '¡Con gusto! Que te vaya bien.'
    if (/^(?:(?:ok|vale|bien|perfecto|excelente) )?(?:(?:muchas|mil) )?gracias(?: (?:por (?:la ayuda|todo)|ya (?:entendi|quedo claro)))?$/.test(normalized)) return '¡Con gusto!'
    if (/^(?:hola|buenas|buenos dias|buenas tardes|buenas noches)(?: (?:como estas|que tal))?$/.test(normalized)) return '¡Hola! ¿En qué puedo ayudarte?'
    if (/^(?:ah )?(?:ok|vale|bien|perfecto|genial|excelente|entendido|de acuerdo)(?: (?:ya entendi|gracias))?$/.test(normalized)) return 'Perfecto.'
    const jokeRequest = /^(?:sabes|conoces|tienes|cuentame|cuenta|dime|hazme|cuentanos)(?: (?:un|unos|algun|algunos|mas|buenos))? chistes?(?: (?:buenos|cortos|de programadores))?$/.test(normalized)
        || /^(?:puedes|podrias) (?:contar|contarme|decir|decirme)(?: (?:un|algun|algunos|unos))? chistes?$/.test(normalized)
    return jokeRequest ? 'Aquí me enfoco en ayudarte con Pixy; los chistes los dejamos para después.' : null
}

/** A generic recommendation refers to the last substantive user topic, not a courtesy turn. */
export function isGeneralHelpRecommendation(question: string): boolean {
    const text = normalizedConversationText(question).replace(/^(?:(?:ah|ok|vale|bien|perfecto|genial|excelente|gracias|y|entonces)\s+)+/, '')
    return /^(?:(?:alguna|algunas|otra|otras|una|mas) recomendacion(?:es)?|(?:algun|algunos|otro|otros|un) consejos?|que (?:me )?recomiendas(?: al respecto)?|algo me recomiendas|(?:tienes|me das|puedes darme) (?:alguna recomendacion|algun consejo))$/.test(text)
}

export function previousHelpTopic(history: { role: 'user' | 'assistant'; content: string }[]): string | undefined {
    return history.filter(message => message.role === 'user').reverse()
        .find(message => !casualHelpReply(message.content) && !isGeneralHelpRecommendation(message.content))?.content
}

/** A failed confirmation remains uncertain; never turn absent sources into a denial. */
export function naturalizeHelpUncertainty(answer: string): string {
    const uncertain = /no (?:puedo|podemos) confirmar|no (?:tengo|tenemos|hay) informaci[oó]n/i.test(answer)
    const sourceGap = /(?:documentaci[oó]n|gu[ií]as?)(?:\s+\w+){0,5}\s+no\s+(?:incluye[n]?|registra[n]?|contiene[n]?|menciona[n]?|cubre[n]?|describe[n]?)/i.test(answer)
    // Replace only the unsupported confirmation as a whole, rather than deleting fragments
    // that could change the meaning of a verified instruction or denial.
    return uncertain && sourceGap ? 'No puedo confirmarlo por ahora.' : answer
}
