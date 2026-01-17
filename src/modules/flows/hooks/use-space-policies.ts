import { useMemo } from 'react';

// In a real app, this would consume the 'SpaceContext' or fetch from DB
// For MVP, we mock the behavior to demonstrate the architectural pattern

export type SpaceType = 'agency' | 'clinic' | 'restaurant' | 'real_estate' | 'generic';

export interface SpacePolicy {
    vocabulary: {
        client: string; // 'Cliente', 'Paciente', 'Comensal'
        project: string; // 'Proyecto', 'Tratamiento', 'Reserva'
        sale: string; // 'Venta', 'Consulta', 'Ticket'
    };
    rules: {
        allowedChannels: ('whatsapp' | 'email' | 'sms')[];
        restrictedDays: number[]; // 0 = Sunday
        tone: 'formal' | 'casual' | 'warm';
    };
}

const DEFAULT_POLICY: SpacePolicy = {
    vocabulary: { client: 'Cliente', project: 'Proyecto', sale: 'Venta' },
    rules: { allowedChannels: ['email'], restrictedDays: [], tone: 'formal' }
};

const POLICIES: Record<SpaceType, SpacePolicy> = {
    agency: {
        vocabulary: { client: 'Cliente', project: 'Campaña', sale: 'Contrato' },
        rules: { allowedChannels: ['email', 'whatsapp', 'sms'], restrictedDays: [0, 6], tone: 'casual' }
    },
    clinic: {
        vocabulary: { client: 'Paciente', project: 'Tratamiento', sale: 'Consulta' },
        rules: { allowedChannels: ['whatsapp', 'sms'], restrictedDays: [0], tone: 'warm' }
    },
    real_estate: {
        vocabulary: { client: 'Interesado', project: 'Propiedad', sale: 'Operación' },
        rules: { allowedChannels: ['whatsapp', 'email'], restrictedDays: [], tone: 'formal' }
    },
    restaurant: {
        vocabulary: { client: 'Comensal', project: 'Reserva', sale: 'Cuenta' },
        rules: { allowedChannels: ['whatsapp'], restrictedDays: [], tone: 'warm' }
    },
    generic: DEFAULT_POLICY
};

export function useSpacePolicies(spaceId: string = 'generic') {
    // In MVP, we might treat 'spaceId' as the type key directly for demo purposes
    // Or look up the type from the spaceId

    // MOCK: Infer type from ID for demo (e.g., 'space_clinic_123')
    const spaceType: SpaceType = useMemo(() => {
        if (spaceId.includes('clinic')) return 'clinic';
        if (spaceId.includes('agency')) return 'agency';
        if (spaceId.includes('food')) return 'restaurant';
        return 'generic';
    }, [spaceId]);

    const policy = POLICIES[spaceType] || DEFAULT_POLICY;

    return {
        spaceType,
        policy,
        // Helper to format text dynamically: t("Nuevo {client}") -> "Nuevo Paciente"
        t: (text: string) => {
            let res = text;
            res = res.replace('{client}', policy.vocabulary.client);
            res = res.replace('{project}', policy.vocabulary.project);
            res = res.replace('{sale}', policy.vocabulary.sale);
            return res;
        }
    };
}
