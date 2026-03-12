import { useMemo } from 'react';
import { VERTICAL_REGISTRY, VerticalType, VerticalConfig } from '@/modules/core/organizations/vertical-registry';

/**
 * Hook to consume vertical-specific UI policies.
 * Uses the VerticalRegistry to provide terminology, insights, and visibility rules.
 */
export function useSpacePolicies(spaceType: string = 'agency') {
    
    // Normalize spaceType to VerticalType
    const verticalKey = useMemo((): VerticalType => {
        const type = spaceType.toLowerCase();
        if (['agency', 'resto', 'cleaning', 'retail', 'saas', 'platform'].includes(type)) {
            return type as VerticalType;
        }
        return 'agency'; // Fallback
    }, [spaceType]);

    const config = useMemo(() => VERTICAL_REGISTRY[verticalKey], [verticalKey]);

    return {
        spaceType: verticalKey,
        config,
        t: (text: string) => {
            let res = text;
            const { terminology } = config;
            res = res.replace('{client}', terminology.client);
            res = res.replace('{clients}', terminology.clients);
            res = res.replace('{project}', terminology.project);
            res = res.replace('{sale}', terminology.sale);
            return res;
        }
    };
}
