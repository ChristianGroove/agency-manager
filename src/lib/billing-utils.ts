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
