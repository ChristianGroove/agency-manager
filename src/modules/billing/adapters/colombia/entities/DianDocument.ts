/**
 * Estados posibles ante la DIAN
 */
export enum DianStatus {
    EN_PROCESO = 'EN_PROCESO',
    ENVIADA = 'ENVIADA',
    ACEPTADA = 'ACEPTADA',
    RECHAZADA = 'RECHAZADA',
    CON_ERRORES = 'CON_ERRORES',
    CONTINGENCIA = 'CONTINGENCIA'
}

/**
 * Entidad de Base de Datos: dian_documents
 * Representa la evidencia legal inmutable de la facturación electrónica.
 */
export interface DianDocument {
    id: string
    invoice_id: string
    organization_id: string

    // Identificadores
    cufe?: string
    track_id?: string

    // Payloads
    xml_unsigned?: string
    xml_signed?: string

    // Estado y Respuesta
    dian_status: DianStatus
    dian_response_xml?: string
    dian_message?: string
    validation_errors?: any[] // JSONB

    // Metadata
    environment: 'TEST' | 'PROD'
    created_at: Date
    updated_at: Date
}
