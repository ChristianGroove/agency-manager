import 'server-only'
import nodemailer from 'nodemailer'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { decrypt } from '@/modules/core/security/encryption'
import { normalizeMarketingEmail, renderCampaignEmail, type EmailContent } from './marketing-email-contracts'

export type CampaignSmtp = { host: string; port: number; user_email: string; password_encrypted: string; iv: string; from_email: string; from_name: string }
/** Reject private destinations and pin the validated address, avoiding a second DNS lookup. */
export function publicSmtpAddress(address: string) {
    if (isIP(address) === 6) return /^2[0-9a-f]{3}:/i.test(address) && !/^2001:(db8|0|10|20):/i.test(address) && !/^2002:/i.test(address)
    if (isIP(address) !== 4) return false
    const [a, b, c] = address.split('.').map(Number)
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 0 && c === 2))) ||
        (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113))
}
export function smtpFailure(error: unknown): { status: 'failed' | 'unknown'; reason: string; retry: boolean } {
    const value = error as { responseCode?: number; command?: string; code?: string }
    if (value?.responseCode && value.responseCode >= 400 && value.responseCode < 600) return { status: 'failed',
        reason: `smtp_${value.responseCode}`, retry: value.responseCode < 500 }
    if (['CONN', 'EHLO', 'HELO', 'STARTTLS', 'AUTH'].includes(value?.command || '') || value?.code === 'EAUTH') return { status: 'failed', reason: 'smtp_connection', retry: false }
    return { status: 'unknown', reason: 'smtp_unconfirmed', retry: false }
}
export async function openCampaignSmtp(config: CampaignSmtp) {
    if (![465, 587].includes(config.port) || !normalizeMarketingEmail(config.from_email) || !config.user_email ||
        !/^[a-z0-9.-]{1,253}$/i.test(config.host) || config.host.endsWith('.') || config.host === 'localhost') throw new Error('Configuración SMTP no apta para campañas.')
    if (process.env.NODE_ENV === 'production' && (!process.env.SMTP_ENC_KEY || process.env.SMTP_ENC_KEY.length !== 32)) throw new Error('Configura la clave de cifrado SMTP antes de habilitar campañas.')
    let dnsTimeout: ReturnType<typeof setTimeout> | undefined
    const addresses = await Promise.race([
        lookup(config.host, { all: true }),
        new Promise<never>((_, reject) => { dnsTimeout = setTimeout(() => reject(new Error('El servidor SMTP no respondió a la consulta DNS.')), 5000) }),
    ]).finally(() => { if (dnsTimeout) clearTimeout(dnsTimeout) })
    if (!addresses.length || addresses.some(value => !publicSmtpAddress(value.address))) throw new Error('El servidor SMTP debe tener una dirección pública válida.')
    const transport = nodemailer.createTransport({ host: addresses[0].address, port: config.port, secure: config.port === 465,
        requireTLS: true, tls: { servername: config.host, rejectUnauthorized: true },
        auth: { user: config.user_email, pass: decrypt(config.password_encrypted, config.iv) },
        connectionTimeout: 8000, greetingTimeout: 5000, socketTimeout: 15000,
        disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false,
    })
    return { async send(input: { recipient: string; content: EmailContent; unsubscribeUrl: string; messageId: string }) {
        const recipient = normalizeMarketingEmail(input.recipient)
        if (!recipient) throw new Error('Destinatario inválido.')
        const message = renderCampaignEmail(input.content, config.from_name, input.unsubscribeUrl)
        const info = await transport.sendMail({ ...message, from: { name: config.from_name, address: config.from_email },
            to: recipient, replyTo: config.from_email, messageId: input.messageId,
            headers: { 'List-Unsubscribe': `<${input.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
        const accepted = (info.accepted || []).some(value => normalizeMarketingEmail(typeof value === 'string' ? value : value.address) === recipient)
        if (!accepted) return { status: info.rejected?.length ? 'failed' as const : 'unknown' as const, messageId: null }
        return { status: 'accepted' as const, messageId: info.messageId || input.messageId }
    }, close: () => transport.close() }
}
