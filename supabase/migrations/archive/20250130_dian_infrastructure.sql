-- Create DIAN Status Enum
CREATE TYPE dian_status AS ENUM (
    'EN_PROCESO',      -- Generando/Firmando
    'ENVIADA',         -- Enviada a DIAN, esperando respuesta asíncrona
    'ACEPTADA',        -- Validada OK por DIAN
    'RECHAZADA',       -- Rechazada por DIAN (Error fiscal)
    'CON_ERRORES',     -- Error técnico local o de validación previa
    'CONTINGENCIA'     -- Fallo servicio DIAN, emitido en papel/contingencia
);

-- Create DIAN Documents Table
-- Almacena el ciclo de vida fiscal LEGAL de un documento.
-- ESTRICTO: No borrar filas de aquí.
CREATE TABLE IF NOT EXISTS dian_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT, -- No permitir borrar factura si tiene documento legal
    organization_id UUID NOT NULL, -- Para RLS

    -- Identificadores Fiscales
    cufe TEXT, -- Código Único de Facturación Electrónica (SHA-384)
    track_id TEXT, -- ID de seguimiento entregado por la DIAN (TrackId)

    -- Evidencia XML (Inmutable)
    xml_unsigned TEXT, -- XML UBL generado antes de firma
    xml_signed TEXT,   -- XML XAdES firmado (lo que se envió legalmente)

    -- Estado y Respuesta
    dian_status dian_status NOT NULL DEFAULT 'EN_PROCESO',
    dian_response_xml TEXT, -- XML del ApplicationResponse (oficial)
    dian_message TEXT,      -- Mensaje legible de la respuesta
    validation_errors JSONB, -- Array de errores detallados

    -- Metadatos de Auditoría
    environment TEXT NOT NULL DEFAULT 'TEST', -- 'TEST' (Habilitación) o 'PROD'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Index for quick lookup by invoice
CREATE INDEX IF NOT EXISTS idx_dian_documents_invoice_id ON dian_documents(invoice_id);
CREATE INDEX IF NOT EXISTS idx_dian_documents_org_id ON dian_documents(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dian_documents_cufe ON dian_documents(cufe) WHERE cufe IS NOT NULL;

-- Enable RLS
ALTER TABLE dian_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view dian_documents of their organization"
    ON dian_documents FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert dian_documents for their organization"
    ON dian_documents FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_dian_documents_modtime
    BEFORE UPDATE ON dian_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
