-- Create saved_replies table
CREATE TABLE IF NOT EXISTS "public"."saved_replies" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "organization_id" uuid NOT NULL DEFAULT 'db9d1288-80ab-48df-b130-a0739881c6f2', -- Hardcoded for dev environment as requested generally
    "title" text NOT NULL,
    "content" text NOT NULL,
    "category" text DEFAULT 'General',
    "tags" text[] DEFAULT '{}',
    "usage_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE "public"."saved_replies" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated" ON "public"."saved_replies"
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated" ON "public"."saved_replies"
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update for authenticated" ON "public"."saved_replies"
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow delete for authenticated" ON "public"."saved_replies"
    FOR DELETE TO authenticated USING (true);

-- Seed some initial cool templates
INSERT INTO "public"."saved_replies" (title, content, category, tags) VALUES
('👋 Bienvenida', '¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte hoy?', 'General', ARRAY['saludo', 'inicio']),
('💸 Precios Estándar', 'Nuestros paquetes comienzan desde $500 USD. Incluyen gestión de redes y diseño.', 'Ventas', ARRAY['precio', 'info']),
('✅ Confirmación Cita', 'Perfecto, tu cita ha quedado confirmada para el día acordado. Te enviaremos un recordatorio.', 'Citas', ARRAY['confirmacion']),
('⏳ Espera', 'Dame un momento por favor, estoy verificando esa información en el sistema.', 'Soporte', ARRAY['espera']);
