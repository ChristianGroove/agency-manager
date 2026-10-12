/** Match direct small-talk requests, never a product question merely containing the word. */
export function casualHelpReply(question: string): string | null {
    const normalized = question.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/[¿?¡!.,]/g, '').replace(/\s+/g, ' ').trim()
    const jokeRequest = /^(?:sabes|conoces|tienes|cuentame|cuenta|dime|hazme|cuentanos)(?: (?:un|unos|algun|algunos|mas|buenos))? chistes?(?: (?:buenos|cortos|de programadores))?$/.test(normalized)
        || /^(?:puedes|podrias) (?:contar|contarme|decir|decirme)(?: (?:un|algun|algunos|unos))? chistes?$/.test(normalized)
    return jokeRequest ? 'Aquí me enfoco en ayudarte con Pixy; los chistes los dejamos para después.' : null
}

/** A failed confirmation remains uncertain; never turn absent sources into a denial. */
export function naturalizeHelpUncertainty(answer: string): string {
    const uncertain = /no (?:puedo|podemos) confirmar|no (?:tengo|tenemos|hay) informaci[oó]n/i.test(answer)
    const sourceGap = /(?:documentaci[oó]n|gu[ií]as?)(?:\s+\w+){0,5}\s+no\s+(?:incluye[n]?|registra[n]?|contiene[n]?|menciona[n]?|cubre[n]?|describe[n]?)/i.test(answer)
    // Replace only the unsupported confirmation as a whole, rather than deleting fragments
    // that could change the meaning of a verified instruction or denial.
    return uncertain && sourceGap ? 'No puedo confirmarlo por ahora.' : answer
}
