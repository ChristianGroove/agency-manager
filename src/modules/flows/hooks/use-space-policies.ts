import { useMemo } from 'react';
import { VERTICAL_REGISTRY, VerticalType, VerticalConfig } from '@/modules/core/organizations/vertical-registry';

export interface UseSpacePoliciesReturn {
    spaceType: VerticalType;
    config: VerticalConfig;
    policy: VerticalConfig;
    vocabulary: VerticalConfig['terminology'];
    t: (text: string) => string;
}

/**
 * Hook to consume vertical-specific UI policies.
 * Uses the VerticalRegistry to provide terminology, insights, and visibility rules.
 */
export function useSpacePolicies(spaceType: string = 'agency'): UseSpacePoliciesReturn {
    
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
        policy: config, // Alias for wizard compatibility
        vocabulary: config.terminology, // Alias for wizard compatibility
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
