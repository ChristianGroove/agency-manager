// Receiver Entity - Entity that receives documents
// Country-agnostic

import type { Address, Metadata } from '../types/CoreTypes'

/**
 * Receiver Type
 */
export type ReceiverType = 'INDIVIDUAL' | 'COMPANY'

/**
 * Receiver (entity that receives the document)
 */
export interface Receiver {
    id: string
    type: ReceiverType

    // Identification
    name: string
    companyName?: string
    taxId?: string
    taxIdType?: string

    // Contact
    address?: Address
    email?: string
    phone?: string

    // Extensibility
    metadata?: Metadata
}

/**
 * Factory to create a Receiver
 */
export function createReceiver(params: {
    type: ReceiverType
    name: string
    companyName?: string
    taxId?: string
    taxIdType?: string
    address?: Address
    email?: string
    phone?: string
    metadata?: Metadata
}): Receiver {
    return {
        id: crypto.randomUUID(),
        ...params
    }
}
