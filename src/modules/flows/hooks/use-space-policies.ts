import { useMemo } from 'react';
import { VERTICAL_REGISTRY, VerticalType, VerticalConfig } from '@/modules/core/organizations/vertical-registry';
import { 
    CAPABILITY_PRESETS, 
    DynamicSpaceConfig, 
    UICapability, 
    TerminologyConfig 
} from '@/modules/core/organizations/capabilities-registry';

export interface UseSpacePoliciesReturn {
    spaceType: VerticalType;
    config: VerticalConfig | DynamicSpaceConfig;
    policy: VerticalConfig | DynamicSpaceConfig;
    vocabulary: TerminologyConfig;
    t: (text: string) => string;
    hasCapability: (capability: UICapability) => boolean;
}

/**
 * Hook to consume vertical-specific UI policies.
 * Uses the Capabilities Registry to provide dynamic terminology and visibility rules.
 * 
 * @param spaceType The vertical key (e.g., 'agency', 'resto'). 
 * @param dynamicConfig Optional override from the organization context/database.
 */
export function useSpacePolicies(
    spaceType: string = 'agency', 
    dynamicConfig?: DynamicSpaceConfig
): UseSpacePoliciesReturn {
    
    // Normalize spaceType to VerticalType
    const verticalKey = useMemo((): VerticalType => {
        const type = spaceType.toLowerCase();
        const validTypes = ['agency', 'resto', 'cleaning', 'retail', 'saas', 'platform'];
        return (validTypes.includes(type) ? type : 'agency') as VerticalType;
    }, [spaceType]);

    // Resolve the core configuration (Dynamic > Preset > Legacy Registry)
    const resolvedConfig = useMemo(() => {
        if (dynamicConfig) return dynamicConfig;
        
        // Try to get from modern presets first
        if (CAPABILITY_PRESETS[verticalKey]) {
            return CAPABILITY_PRESETS[verticalKey];
        }

        // Fallback to legacy registry for backward compatibility
        return VERTICAL_REGISTRY[verticalKey];
    }, [verticalKey, dynamicConfig]);

    // Safety guard for terminology
    const terminology = useMemo(() => {
        return resolvedConfig.terminology;
    }, [resolvedConfig]);

    const activeCapabilities = useMemo(() => {
        if ('capabilities' in resolvedConfig) return resolvedConfig.capabilities;
        return [] as UICapability[]; // Legacy configs don't have explicit capabilities yet
    }, [resolvedConfig]);

    return {
        spaceType: verticalKey,
        config: resolvedConfig as any,
        policy: resolvedConfig as any,
        vocabulary: terminology,
        t: (text: string) => {
            if (!text) return '';
            let res = text;
            
            // Reemplazo dinámico de placeholders comunes
            const replacements: Record<string, string> = {
                '{client}': terminology.client,
                '{clients}': terminology.clients,
                '{project}': terminology.project,
                '{sale}': terminology.sale,
            };

            Object.entries(replacements).forEach(([placeholder, value]) => {
                res = res.replaceAll(placeholder, value);
            });

            return res;
        },
        hasCapability: (capability: UICapability) => {
            return activeCapabilities.includes(capability);
        }
    };
}
