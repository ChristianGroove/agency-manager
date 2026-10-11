import 'server-only'

export function emailEnvironmentIssues(): string[] {
    const issues: string[] = []
    try {
        const url = new URL(process.env.NEXT_PUBLIC_APP_URL || '')
        if (url.protocol !== 'https:' || url.username || url.password) throw new Error()
    } catch { issues.push('Configura la URL pública HTTPS de Pixy para el enlace de baja.') }
    if (process.env.NODE_ENV === 'production' && (!process.env.SMTP_ENC_KEY || process.env.SMTP_ENC_KEY.length !== 32)) issues.push('Configura la clave de cifrado SMTP del servicio antes de enviar campañas.')
    return issues
}
