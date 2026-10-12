/** Fixed public messages: never expose credentials or provider diagnostics to the chat. */
export class AIAccessError extends Error {
    constructor(code: 'disabled' | 'unverified') {
        super(code === 'disabled'
            ? 'Los servicios de IA no están disponibles mientras la organización o la IA estén suspendidas o desactivadas.'
            : 'No se pudo verificar la disponibilidad de IA. Intenta nuevamente en un momento.')
        this.name = 'AIAccessError'
    }
}
