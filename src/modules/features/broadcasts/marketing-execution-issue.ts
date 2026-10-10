/** Only controlled, non-sensitive text may be persisted as a campaign execution error. */
export class MarketingExecutionIssue extends Error {
    constructor(code?: number) {
        super(code ? `Meta rechazó el envío (código ${code}). Revisa el número o la plantilla en Meta antes de continuar.`
            : 'El resultado del envío no está confirmado. Requiere revisión y no se reenviará automáticamente.')
    }
}
