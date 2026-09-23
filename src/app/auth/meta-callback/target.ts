export function buildMetaCallbackTarget(target: string, params: {
    success?: string | null
    error?: string | null
    action?: string | null
}) {
    const safeTarget = target.startsWith('/') && !target.startsWith('//') && !target.includes('\\')
        ? target : '/platform/integrations'
    const url = new URL(safeTarget, 'https://pixy.invalid')
    if (params.error) url.searchParams.set('error', params.error)
    if (params.success) url.searchParams.set('success', params.success)
    if (params.success === 'meta_connected' && params.action === 'configure_assets') {
        url.searchParams.set('action', 'configure_assets')
    }
    return url.pathname + url.search
}
