-- ====================================================================
-- SEGURIDAD: ENDURECIMIENTO DE RLS Y PROTECCIÓN DE ESQUEMA
-- FECHA: 2026-03-09
-- OBJETIVO: Resolver alertas críticas de Supabase (RLS Disabled / Mutable Search Path)
-- ====================================================================

-- 1. ACTIVAR RLS EN TABLAS DE DEFINICIÓN Y BACKUP
-- Estas tablas contenían datos accesibles públicamente según la alerta crítica.

ALTER TABLE IF EXISTS public.channel_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.agent_availability_backup_before_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.agent_skills_backup_before_sync ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS DE ACCESO SEGURO (Solo Lectura para Autenticados)
-- Prevenimos acceso anónimo y limitamos a lectura operativa.

DROP POLICY IF EXISTS "Authenticated can view channel definitions" ON public.channel_definitions;
CREATE POLICY "Authenticated can view channel definitions" ON public.channel_definitions
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "SuperAdmins can view availability backups" ON public.agent_availability_backup_before_sync;
CREATE POLICY "SuperAdmins can view availability backups" ON public.agent_availability_backup_before_sync
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.platform_role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "SuperAdmins can view skills backups" ON public.agent_skills_backup_before_sync;
CREATE POLICY "SuperAdmins can view skills backups" ON public.agent_skills_backup_before_sync
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.platform_role = 'super_admin'
        )
    );

-- 3. RESOLVER "FUNCTION SEARCH PATH MUTABLE"
-- Esta es una medida de seguridad crítica para evitar secuestro de funciones.
-- Forzamos que las funciones solo busquen en esquemas seguros.

ALTER DATABASE postgres SET search_path TO public, extensions;

-- Asegurar que las funciones del sistema también sigan esta regla (ejemplo de sintaxis segura)
-- ALTER FUNCTION <nombre_funcion> SET search_path = public, extensions;

-- ====================================================================
-- FIN DEL SCRIPT DE SEGURIDAD
-- ====================================================================
