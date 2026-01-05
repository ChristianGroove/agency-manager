-- Migration: Create Email Templates Table
-- Date: 2026-01-05
-- Description: Stores manageable HTML email templates with multi-tenant/vertical support.

CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL, -- e.g. 'password-reset', 'invite-user'
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    
    -- Scoping
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    vertical_slug TEXT, -- e.g. 'dental', 'restaurant'. NULL = Global Default

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: Only one template per slug per scope
    -- Global default: (slug, null, null)
    -- Vertical default: (slug, null, vertical)
    -- Org specific: (slug, org_id, null)
    CONSTRAINT email_templates_slug_scope_key UNIQUE NULLS NOT DISTINCT (slug, organization_id, vertical_slug)
);

-- RLS Policies
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Admins can view/edit templates
CREATE POLICY "Admins can manage templates" ON email_templates
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT user_id FROM organization_members 
            WHERE role IN ('owner', 'admin') 
            AND organization_id = email_templates.organization_id
        )
        OR 
        (SELECT platform_role FROM profiles WHERE id = auth.uid()) = 'super_admin'
    );

-- Read access for service role (Internal functions bypass RLS anyway, but good for admin dashboard)
CREATE POLICY "Service Role full access" ON email_templates
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Seed Default Templates
INSERT INTO email_templates (slug, subject, body_html)
VALUES 
(
    'password-reset', 
    'Recuperación de Contraseña - {{agency_name}}',
    '<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px;">
        <h2 style="color: #333;">Hola,</h2>
        <p style="color: #555;">Has solicitado restablecer tu contraseña para <strong>{{agency_name}}</strong>.</p>
        <p style="color: #555;">Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{link}}" style="background-color: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Restablecer Contraseña</a>
        </div>
        <p style="color: #999; font-size: 12px;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #aaa; font-size: 11px;">Enviado por Agencia OS</p>
    </div>
</body>
</html>'
),
(
    'invite-user',
    'Te han invitado a {{agency_name}}',
    '<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px;">
        <h2 style="color: #333;">Bienvenido/a,</h2>
        <p style="color: #555;">Has sido invitado a unirte a la organización <strong>{{agency_name}}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{link}}" style="background-color: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Aceptar Invitación</a>
        </div>
        <p style="color: #999; font-size: 12px;">Este enlace expirará en 24 horas.</p>
    </div>
</body>
</html>'
)
ON CONFLICT DO NOTHING;
