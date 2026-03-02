/**
 * Phone number normalization utility.
 * 
 * Ensures all phone numbers are stored and queried in a consistent
 * international format WITHOUT the "+" prefix (matching Meta/WhatsApp format).
 * 
 * Examples (Colombia, default):
 *   "3001234567"     → "573001234567"
 *   "573001234567"   → "573001234567"
 *   "+573001234567"  → "573001234567"
 *   "03001234567"    → "573001234567"
 *   " 300-123-4567 " → "573001234567"
 */

/** Country phone configuration */
interface CountryPhoneConfig {
    /** International dialing code (without +) */
    code: string
    /** Valid lengths for national numbers (without country code) */
    nationalLengths: number[]
    /** Leading digits that identify a mobile/national number */
    mobilePrefix?: string[]
}

/** 
 * Registry of supported countries.
 * Add new countries here to extend multi-country support. 
 */
const COUNTRY_CONFIGS: Record<string, CountryPhoneConfig> = {
    CO: {
        code: '57',
        nationalLengths: [10],       // Colombian mobile: 10 digits (3XX XXX XXXX)
        mobilePrefix: ['3'],         // All Colombian mobile numbers start with 3
    },
    // ── Future countries ──────────────────────────────────
    // MX: {
    //     code: '52',
    //     nationalLengths: [10],
    //     mobilePrefix: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    // },
    // US: {
    //     code: '1',
    //     nationalLengths: [10],
    // },
    // EC: {
    //     code: '593',
    //     nationalLengths: [9, 10],
    //     mobilePrefix: ['9'],
    // },
}

/** Default country when none is specified */
const DEFAULT_COUNTRY = 'CO'

/**
 * Normalize a phone number to consistent international format (no "+" prefix).
 * 
 * @param phone    - Raw phone string from user input, DB, or webhook
 * @param country  - ISO country code (default: 'CO' for Colombia)
 * @returns Normalized phone string, e.g. "573001234567"
 * 
 * If the input is empty or cannot be normalized, returns the cleaned digits as-is.
 */
export function normalizePhone(phone: string, country: string = DEFAULT_COUNTRY): string {
    if (!phone) return ''

    // 1. Strip everything except digits
    let digits = phone.replace(/\D/g, '')

    if (digits.length === 0) return ''

    // 2. Get country config
    const config = COUNTRY_CONFIGS[country.toUpperCase()] || COUNTRY_CONFIGS[DEFAULT_COUNTRY]
    if (!config) return digits // Fallback: return raw digits

    const { code, nationalLengths, mobilePrefix } = config

    // 3. Remove leading "0" (local dialing prefix in many countries)
    if (digits.startsWith('0')) {
        digits = digits.substring(1)
    }

    // 4. Check if already has country code
    if (digits.startsWith(code)) {
        const withoutCode = digits.substring(code.length)
        if (nationalLengths.includes(withoutCode.length)) {
            // Already correctly prefixed
            return digits
        }
    }

    // 5. Check if it's a national-length number that needs the country code
    if (nationalLengths.includes(digits.length)) {
        // Optional: verify mobile prefix if configured
        if (mobilePrefix && mobilePrefix.length > 0) {
            const startsWithMobile = mobilePrefix.some(p => digits.startsWith(p))
            if (startsWithMobile) {
                return code + digits
            }
        } else {
            // No mobile prefix filter — assume all national-length numbers are valid
            return code + digits
        }
    }

    // 6. Fallback: return digits as-is (already international or unrecognized format)
    return digits
}
