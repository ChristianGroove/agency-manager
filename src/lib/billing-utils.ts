import { DocumentType, Emitter } from "@/types/billing";

export const getDocumentTypeLabel = (type: DocumentType | string): string => {
    switch (type) {
        case DocumentType.CUENTA_DE_COBRO:
        case 'CUENTA_DE_COBRO':
            return 'Cuenta de Cobro';
        case DocumentType.FACTURA_ELECTRONICA:
        case 'FACTURA_ELECTRONICA':
            return 'Factura Electrónica';
        case DocumentType.COTIZACION:
        case 'COTIZACION':
            return 'Cotización';
        default:
            return 'Documento';
    }
}

export const getEmitterTypeLabel = (type: 'NATURAL' | 'JURIDICO'): string => {
    return type === 'NATURAL' ? 'Persona Natural' : 'Persona Jurídica (Empresa)';
}

export const getEmitterDocumentType = (emitterType: 'NATURAL' | 'JURIDICO'): DocumentType => {
    return emitterType === 'NATURAL'
        ? DocumentType.CUENTA_DE_COBRO
        : DocumentType.FACTURA_ELECTRONICA;
}

export const calculateDV = (nit: string): string => {
    if (!nit || isNaN(Number(nit))) return '';

    const primeNumbers = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    let sum = 0;
    const nitReverse = nit.split('').reverse();

    for (let i = 0; i < nitReverse.length; i++) {
        sum += Number(nitReverse[i]) * primeNumbers[i];
    }

    const mod = sum % 11;
    if (mod === 0 || mod === 1) {
        return mod.toString();
    }
    return (11 - mod).toString();
}

export const isEmittersModuleEnabled = (): boolean => {
    // Required to be true for now
    return true;
}

/**
 * Calculates the next billing date based on a start date and frequency.
 * Consistent with "Quincenal" = 15 days.
 */
export const calculateFrequencyNextDate = (startDate: Date | string, frequency: string): Date => {
    const date = new Date(startDate);
    const next = new Date(date);
    
    switch (frequency) {
        case 'biweekly':
            next.setDate(next.getDate() + 15);
            break;
        case 'quarterly':
            next.setMonth(next.getMonth() + 3);
            break;
        case 'semiannual':
            next.setMonth(next.getMonth() + 6);
            break;
        case 'yearly':
            next.setFullYear(next.getFullYear() + 1);
            break;
        case 'one_off':
        case 'one-time':
            next.setDate(next.getDate() + 30); // Default due date
            break;
        case 'monthly':
        default:
            next.setMonth(next.getMonth() + 1);
            break;
    }
    return next;
}

/**
 * Calculates the previous billing date (start of cycle) based on an end date and frequency.
 */
export const calculateFrequencyPreviousDate = (endDate: Date | string, frequency: string): Date => {
    const date = new Date(endDate);
    const prev = new Date(date);

    switch (frequency) {
        case 'biweekly':
            prev.setDate(prev.getDate() - 15);
            break;
        case 'quarterly':
            prev.setMonth(prev.getMonth() - 3);
            break;
        case 'semiannual':
            prev.setMonth(prev.getMonth() - 6);
            break;
        case 'yearly':
            prev.setFullYear(prev.getFullYear() - 1);
            break;
        case 'one-time':
        case 'one_off':
            prev.setDate(prev.getDate() - 30);
            break;
        case 'monthly':
        default:
            prev.setMonth(prev.getMonth() - 1);
            break;
    }
    return prev;
}
