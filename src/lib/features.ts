
export type FeatureFlag = 'meta_insights' | 'trash_bin' | 'new_portal'

const FEATURES: Record<FeatureFlag, boolean> = {
    meta_insights: true, // Enabled for development
    trash_bin: true,
    new_portal: true
}

export function isFeatureEnabled(feature: FeatureFlag): boolean {
    return FEATURES[feature] ?? false
}
