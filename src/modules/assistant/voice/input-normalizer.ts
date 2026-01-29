
/**
 * Normalizes human input (voice or text) into machine-ready intent strings.
 * Removes filler words, standardizes affirmations/negations.
 */
export class InputNormalizer {

    // Spanish filler words common in voice
    private static FILLERS = [
        /^mmm+\s*/i,
        /^eh+\s*/i,
        /^este\.\.\.\s*/i,
        /^o sea\s*/i,
        /^bueno pues\s*/i,
        /\s*eh+\s*/i
    ];

    private static CONFIRMATIONS = ['sí', 'si', 'dale', 'hazlo', 'ok', 'vale', 'simón', 'adelante', 'confirmo'];
    private static CANCELLATIONS = ['no', 'cancela', 'cancelar', 'olvídalo', 'déjalo', 'abortar', 'basta', 'espera'];

    static normalize(raw: string): string {
        if (!raw) return "";

        let clean = raw.trim();

        // 1. Remove fillers
        this.FILLERS.forEach(regex => {
            clean = clean.replace(regex, '');
        });

        // 2. map to standard commands if isolated
        const lower = clean.toLowerCase();

        if (this.CONFIRMATIONS.includes(lower)) return "sí";
        if (this.CANCELLATIONS.includes(lower)) return "cancelar";

        // 3. strip punctuation at start/end
        clean = clean.replace(/^[¿¡]/, '').replace(/[?!.,;]$/, '');

        return clean.trim();
    }
}
