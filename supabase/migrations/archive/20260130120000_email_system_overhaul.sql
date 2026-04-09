-- EMAIL SYSTEM OVERHAUL
-- Force clean state to avoid conflicts with old schemas
drop table if exists public.email_campaigns cascade;
drop table if exists public.email_templates cascade;

-- 1. Email Templates (Unified storage for branded templates)
create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade, -- Nullable for system templates
  
  -- Template Identification
  name text not null, -- e.g. "Factura Corporativa"
  template_key text not null, -- e.g. "invoice_new", "quote_new", "payment_reminder"
  variant_name text default 'standard', -- e.g. "minimal", "bold", "corporate"
  is_active boolean default false, -- Only one active per template_key per org
  
  -- Content
  subject_template text not null, -- e.g. "Factura #{{invoice_number}} de {{agency_name}}"
  body_html text not null, -- The HTML structure with Handlebars-like placeholders
  design_config jsonb default '{}'::jsonb, -- Store colors, fonts, logo alignment overrides
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Email Campaigns (For automation sequences like Payment Reminders)
create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  
  name text not null,
  trigger_event text not null, -- "invoice_due", "invoice_overdue", "quote_created"
  time_offset interval default '0 minutes', -- e.g. '3 days' (before/after depending on logic)
  
  template_id uuid references public.email_templates(id),
  is_enabled boolean default false,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. RLS Policies
alter table public.email_templates enable row level security;
alter table public.email_campaigns enable row level security;

-- Templates Policies
create policy "Users can view their org templates"
  on public.email_templates for select
  using ( 
    organization_id in (select organization_id from public.organization_members where user_id = auth.uid())
    or organization_id is null -- Allow viewing system templates
  );

create policy "Users can manage their org templates"
  on public.email_templates for all
  using ( 
    organization_id in (select organization_id from public.organization_members where user_id = auth.uid())
  );

-- Campaigns Policies
create policy "Users can view their org campaigns"
  on public.email_campaigns for select
  using ( 
    organization_id in (select organization_id from public.organization_members where user_id = auth.uid())
  );

create policy "Users can manage their org campaigns"
  on public.email_campaigns for all
  using ( 
    organization_id in (select organization_id from public.organization_members where user_id = auth.uid())
  );

-- 4. Seed "Agency Template Bank" (Global Templates)
-- We use organization_id IS NULL for system-wide templates that can be copied to orgs

-- ====================================================================================
-- STYLE 1: MINIMALIST (Clean, whitespace, simple)
-- ====================================================================================

-- 1.1 Invoice (Minimal)
INSERT INTO public.email_templates (template_key, name, variant_name, subject_template, body_html, design_config, is_active)
VALUES (
    'invoice_new',
    'Minimalist Invoice',
    'minimal',
    'Recibo de Pago #{{invoice_number}}',
    '<!DOCTYPE html>
    <html>
    <body style="font-family: sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 40px;">
                {{#if logo_url}}
                    <img src="{{logo_url}}" alt="{{agency_name}}" style="height: 50px; display: block; margin: 0 auto;">
                {{else}}
                    <h1 style="margin: 0; font-size: 24px; color: {{primary_color}};">{{agency_name}}</h1>
                {{/if}}
            </div>
            
            <h2 style="font-weight: normal; margin-bottom: 30px; text-align: center;">Recibo #{{invoice_number}}</h2>
            
            <p>Hola {{client_name}},</p>
            <p>Gracias por tu pago de <strong>{{formatted_amount}}</strong> por {{concept}}.</p>
            
            <div style="margin: 40px 0; text-align: center;">
                <a href="{{link_url}}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 4px;">Ver Factura</a>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center; margin-top: 50px;">
                © {{year}} {{agency_name}}.
            </p>
        </div>
    </body>
    </html>',
    '{"primary_color": "#000000"}'::jsonb,
    false
);

-- 1.2 Quote (Minimal)
INSERT INTO public.email_templates (template_key, name, variant_name, subject_template, body_html, design_config, is_active)
VALUES (
    'quote_new',
    'Minimalist Quote',
    'minimal',
    'Cotización #{{quote_number}}',
    '<!DOCTYPE html>
    <html>
    <body style="font-family: sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 30px;">
                 {{#if logo_url}}
                    <img src="{{logo_url}}" alt="{{agency_name}}" style="height: 40px;">
                {{else}}
                    <span style="font-weight: bold; font-size: 18px;">{{agency_name}}</span>
                {{/if}}
            </div>
            
            <p>Hola {{client_name}},</p>
            <p>Adjunto encontrarás la cotización solicitada para el proyecto <strong>{{project_name}}</strong>.</p>
            
            <div style="margin: 30px 0;">
                <a href="{{link_url}}" style="text-decoration: underline; color: {{primary_color}};">Revisar Propuesta</a>
            </div>
            
            <p style="color: #999; font-size: 12px;">
                Validez hasta: {{valid_until}}
            </p>
        </div>
    </body>
    </html>',
    '{"primary_color": "#000000"}'::jsonb,
    false
);

-- 1.3 Reminder (Minimal)
INSERT INTO public.email_templates (template_key, name, variant_name, subject_template, body_html, design_config, is_active)
VALUES (
    'payment_reminder',
    'Minimalist Reminder',
    'minimal',
    'Recordatorio de Pago: #{{invoice_number}}',
    '<!DOCTYPE html>
    <html>
    <body style="font-family: sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <p>Hola {{client_name}},</p>
            <p>Un recordatorio amable de que la factura <strong>#{{invoice_number}}</strong> vence el {{due_date}}.</p>
             <p>Monto pendiente: <strong>{{formatted_amount}}</strong></p>
            
            <div style="margin: 30px 0;">
                <a href="{{link_url}}" style="color: {{primary_color}};">Realizar Pago</a>
            </div>
        </div>
    </body>
    </html>',
    '{"primary_color": "#000000"}'::jsonb,
    false
);


-- ====================================================================================
-- STYLE 2: CORPORATE (Professional, header/footer, structured)
-- ====================================================================================

-- 2.1 Invoice (Corporate)
INSERT INTO public.email_templates (template_key, name, variant_name, subject_template, body_html, design_config, is_active)
VALUES (
    'invoice_new',
    'Corporate Professional',
    'corporate',
    'Factura #{{invoice_number}} - {{agency_name}}',
    '<!DOCTYPE html>
    <html>
    <body style="font-family: Helvetica, Arial, sans-serif; color: #1F2937; margin: 0; padding: 0; background-color: #F3F4F6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background-color: {{primary_color}}; padding: 24px 30px; text-align: center;">
                 {{#if logo_url}}
                    <img src="{{logo_url}}" alt="{{agency_name}}" style="height: 48px; display: block; margin: 0 auto; filter: brightness(0) invert(1);">
                {{else}}
                    <h1 style="margin: 0; color: #ffffff; font-size: 20px; letter-spacing: 1px;">{{agency_name}}</h1>
                {{/if}}
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
                <h2 style="margin-top: 0; color: #111827; font-size: 20px;">Detalles de Facturación</h2>
                <p style="color: #4B5563;">Estimado/a {{client_name}},</p>
                <p style="color: #4B5563;">Se ha generado una nueva factura para su cuenta.</p>
                
                <table style="width: 100%; margin: 24px 0; border-collapse: collapse;">
                    <tr style="border-bottom: 2px solid #F3F4F6;">
                        <td style="padding: 12px 0; color: #6B7280; font-size: 14px;">Factura #</td>
                        <td style="padding: 12px 0; text-align: right; font-weight: bold;">{{invoice_number}}</td>
                    </tr>
                    <tr style="border-bottom: 2px solid #F3F4F6;">
                        <td style="padding: 12px 0; color: #6B7280; font-size: 14px;">Fecha</td>
                        <td style="padding: 12px 0; text-align: right; font-weight: bold;">{{date}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; color: #6B7280; font-size: 14px;">Total</td>
                        <td style="padding: 12px 0; text-align: right; font-weight: bold; color: {{primary_color}}; font-size: 18px;">{{formatted_amount}}</td>
                    </tr>
                </table>

                <div style="text-align: center; margin-top: 32px;">
                    <a href="{{link_url}}" style="display: inline-block; padding: 12px 30px; background-color: {{primary_color}}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Descargar PDF</a>
                </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #F9FAFB; padding: 20px; text-align: center; color: #9CA3AF; font-size: 12px; border-top: 1px solid #E5E7EB;">
                <p style="margin: 0;">Gracias por confiar en {{agency_name}}</p>
                <p style="margin: 5px 0 0;">{{website_url}}</p>
            </div>
        </div>
    </body>
    </html>',
    '{"primary_color": "#2563EB"}'::jsonb,
    false
);

-- 2.2 Quote (Corporate)
INSERT INTO public.email_templates (template_key, name, variant_name, subject_template, body_html, design_config, is_active)
VALUES (
    'quote_new',
    'Corporate Quote',
    'corporate',
    'Propuesta Comercial: {{project_name}}',
    '<!DOCTYPE html>
    <html>
    <body style="font-family: Helvetica, Arial, sans-serif; color: #1F2937; background-color: #F3F4F6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-top: 4px solid {{primary_color}};">
            <div style="padding: 40px 30px;">
                <div style="margin-bottom: 24px;">
                     {{#if logo_url}}
                        <img src="{{logo_url}}" alt="{{agency_name}}" style="height: 40px;">
                    {{else}}
                         <h2 style="margin: 0; color: {{primary_color}};">{{agency_name}}</h2>
                    {{/if}}
                </div>
                
                <h3 style="margin-top: 0;">Nueva Propuesta Disponible</h3>
                <p>Hola {{client_name}}, hemos preparado una propuesta detallada para <strong>{{project_name}}</strong>.</p>
                
                <div style="background-color: #eff6ff; border-left: 4px solid {{primary_color}}; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #1e40af;">Esta propuesta es válida hasta el {{valid_until}}.</p>
                </div>

                <a href="{{link_url}}" style="display: inline-block; background-color: {{primary_color}}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: 500;">Ver Propuesta Online</a>
            </div>
        </div>
    </body>
    </html>',
    '{"primary_color": "#2563EB"}'::jsonb,
    false
);

-- 2.3 Reminder (Corporate)
INSERT INTO public.email_templates (template_key, name, variant_name, subject_template, body_html, design_config, is_active)
VALUES (
    'payment_reminder',
    'Corporate Reminder',
    'corporate',
    'AVISO: Factura Vencida #{{invoice_number}}',
    '<!DOCTYPE html>
    <html>
    <body style="font-family: Helvetica, Arial, sans-serif; color: #1F2937; background-color: #F3F4F6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
            <div style="padding: 30px;">
                <h2 style="color: #b91c1c; margin-top: 0;">Acción Requerida</h2>
                <p>Estimado Cliente,</p>
                <p>No hemos recibido el pago de su factura <strong>#{{invoice_number}}</strong> por valor de <strong>{{formatted_amount}}</strong>.</p>
                <p>Por favor, regule su situación lo antes posible.</p>
                <div style="margin-top: 25px;">
                     <a href="{{link_url}}" style="background-color: #b91c1c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Pagar Ahora</a>
                </div>
            </div>
            <div style="background-color: #f9fafb; padding: 15px; font-size: 12px; color: #6b7280; text-align: center;">
                {{agency_name}} Accounting Team
            </div>
        </div>
    </body>
    </html>',
    '{"primary_color": "#2563EB"}'::jsonb,
    false
);


-- ====================================================================================
-- STYLE 3: BOLD (Dark mode-ish, vibrant, high contrast)
-- ====================================================================================

-- 3.1 Invoice (Bold)
INSERT INTO public.email_templates (template_key, name, variant_name, subject_template, body_html, design_config, is_active)
VALUES (
    'invoice_new',
    'Bold Modern',
    'bold',
    '⚡ Invoice Ready: {{concept}}',
    '<!DOCTYPE html>
    <html>
    <body style="font-family: system-ui, -apple-system, sans-serif; background-color: #111827; color: #ffffff; margin: 0; padding: 40px 0;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #1F2937; border-radius: 16px; padding: 40px; text-align: center; border: 1px solid #374151;">
             
             <!-- Logo/Brand -->
             <div style="margin-bottom: 30px;">
                {{#if logo_url}}
                    <img src="{{logo_url}}" alt="{{agency_name}}" style="height: 60px; display: inline-block;">
                {{else}}
                    <h2 style="margin: 0; font-size: 28px; font-weight: 800; background: linear-gradient(90deg, {{primary_color}}, {{secondary_color}}); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">{{agency_name}}</h2>
                {{/if}}
             </div>

            <h1 style="font-size: 32px; font-weight: 900; margin-bottom: 10px; line-height: 1.1;">Es hora de crecer.</h1>
            <p style="color: #9CA3AF; margin-bottom: 40px; font-size: 16px;">Hola {{client_name}}, tu factura para <strong>{{concept}}</strong> está lista.</p>
            
            <div style="background: linear-gradient(135deg, {{primary_color}} 0%, {{secondary_color}} 100%); padding: 30px; border-radius: 12px; margin-bottom: 40px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);">
                <span style="display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8; margin-bottom: 5px;">Total a Pagar</span>
                <span style="display: block; font-size: 36px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">{{formatted_amount}}</span>
            </div>

            <a href="{{link_url}}" style="display: inline-block; width: 100%; padding: 16px 0; background-color: #ffffff; color: #000000; font-weight: bold; text-decoration: none; border-radius: 8px; font-size: 16px; transition: transform 0.2s;">Realizar Pago Ahora →</a>
            
            <div style="margin-top: 40px; border-top: 1px solid #374151; padding-top: 20px; color: #6B7280; font-size: 12px;">
                Impulsado por {{agency_name}}
            </div>
        </div>
    </body>
    </html>',
    '{"primary_color": "#8B5CF6", "secondary_color": "#EC4899"}'::jsonb,
    false
);

-- 3.2 Quote (Bold)
INSERT INTO public.email_templates (template_key, name, variant_name, subject_template, body_html, design_config, is_active)
VALUES (
    'quote_new',
    'Bold Quote',
    'bold',
    '🚀 Propuesta: {{project_name}}',
    '<!DOCTYPE html>
    <html>
    <body style="font-family: system-ui, -apple-system, sans-serif; background-color: #111827; color: #ffffff; padding: 40px 0;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #1F2937; border-radius: 16px; padding: 40px; border: 1px solid #374151;">
             <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                {{#if logo_url}}
                    <img src="{{logo_url}}" style="height: 40px;">
                {{else}}
                    <strong style="color: white; font-size: 20px;">{{agency_name}}</strong>
                {{/if}}
                <span style="background-color: {{primary_color}}; padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: bold;">NUEVA</span>
             </div>

             <h2 style="font-size: 28px; font-weight: 800; margin-bottom: 15px;">Hagamos esto realidad.</h2>
             <p style="color: #9CA3AF; line-height: 1.6;">Hola {{client_name}}, hemos diseñado una estrategia única para <strong>{{project_name}}</strong>.</p>
             
             <div style="margin: 30px 0;">
                <a href="{{link_url}}" style="display: block; text-align: center; background: {{primary_color}}; color: white; padding: 15px; border-radius: 8px; font-weight: bold; text-decoration: none;">Ver Propuesta Completa</a>
             </div>
        </div>
    </body>
    </html>',
    '{"primary_color": "#8B5CF6"}'::jsonb,
    false
);

-- 3.3 Reminder (Bold)
INSERT INTO public.email_templates (template_key, name, variant_name, subject_template, body_html, design_config, is_active)
VALUES (
    'payment_reminder',
    'Bold Reminder',
    'bold',
    '⚠️ Action Needed: Invoice #{{invoice_number}}',
    '<!DOCTYPE html>
    <html>
    <body style="font-family: system-ui, -apple-system, sans-serif; background-color: #111827; color: #ffffff; padding: 40px 0;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #000000; border-radius: 16px; padding: 40px; border: 1px solid #ef4444;">
             <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 40px;">⏰</span>
             </div>
             <h2 style="text-align: center; color: #ef4444; margin-top: 0;">Pago Vencido</h2>
             <p style="text-align: center; color: #D1D5DB;">La factura <strong>#{{invoice_number}}</strong> requiere tu atención inmediata.</p>
             
             <div style="background-color: #1f2937; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
                <span style="display: block; color: #9CA3AF; font-size: 12px;">Total Pendiente</span>
                <span style="font-size: 24px; font-weight: bold; color: white;">{{formatted_amount}}</span>
             </div>

             <a href="{{link_url}}" style="display: block; text-align: center; background: #ef4444; color: white; padding: 15px; border-radius: 8px; font-weight: bold; text-decoration: none;">Pagar Ahora</a>
        </div>
    </body>
    </html>',
    '{"primary_color": "#ef4444"}'::jsonb,
    false
);
