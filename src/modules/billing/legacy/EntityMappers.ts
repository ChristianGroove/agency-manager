// Emitter/Client Mappers - Convert between legacy and core entities

import type { Emitter as LegacyEmitter } from '@/types/billing'
import type { Client } from '@/types'
import { IssuerType } from '../core/entities/Issuer'
import type { Issuer } from '../core/entities/Issuer'
import type { Receiver, ReceiverType } from '../core/entities/Receiver'

/**
 * Emitter Mapper
 * 
 * Converts legacy Emitter to core Issuer
 */
export class EmitterMapper {
    /**
     * Convert legacy Emitter to Core Issuer
     */
    static legacyToCore(emitter: LegacyEmitter): Issuer {
        return {
            id: emitter.id,
            type: this.mapEmitterType(emitter.emitter_type),
            legalName: emitter.legal_name,
            tradeName: emitter.display_name !== emitter.legal_name
                ? emitter.display_name
                : undefined,
            taxId: emitter.identification_number,
            taxIdType: emitter.identification_type,
            address: emitter.address ? {
                street: emitter.address,
                country: 'CO' // Default to Colombia for current system
            } : undefined,
            email: emitter.email,
            phone: emitter.phone,
            logo: emitter.logo_url,
            fiscalResponsibilities: [], // Not stored in current system
            taxRegime: undefined, // Not stored in current system
            metadata: {
                verification_digit: emitter.verification_digit,
                allowed_document_types: emitter.allowed_document_types,
                is_active: emitter.is_active,
                is_default: emitter.is_default
            }
        }
    }

    /**
     * Map emitter_type to IssuerType
     */
    private static mapEmitterType(type: 'NATURAL' | 'JURIDICO'): IssuerType {
        return type === 'NATURAL' ? IssuerType.INDIVIDUAL : IssuerType.COMPANY
    }
}

/**
 * Client Mapper
 * 
 * Converts legacy Client to core Receiver
 */
export class ClientMapper {
    /**
     * Convert legacy Client to Core Receiver
     */
    static legacyToCore(client: Client): Receiver {
        return {
            id: client.id,
            type: client.company_name ? 'COMPANY' : 'INDIVIDUAL',
            name: client.name,
            companyName: client.company_name,
            taxId: client.nit,
            taxIdType: 'NIT', // Default for current system
            address: client.address ? {
                street: client.address,
                country: 'CO' // Default
            } : undefined,
            email: client.email,
            phone: client.phone,
            metadata: {
                logo_url: client.logo_url
            }
        }
    }
}
