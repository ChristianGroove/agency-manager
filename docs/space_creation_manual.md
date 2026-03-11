# 🛠️ MANUAL PARA CREACIÓN Y PUESTA EN PRODUCCIÓN DE NUEVOS SPACES OFICIALES

Esta guía técnica detalla todos los pasos necesarios para configurar, activar y poner en operación un nuevo **Space Oficial** en el ecosistema Pixy, asegurando que se visualice correctamente en el Marketplace y Dashboard.

---

## 1. Fase de Definición (Database Setup)

Para que un Space exista en el sistema, debe registrarse en el catálogo de apps de SaaS.

### A. Registro de la App (Space)
Inserta el nuevo Space en la tabla `saas_apps`. 

```sql
INSERT INTO public.saas_apps (
    id, name, slug, description, long_description, 
    category, vertical_compatibility, icon, color, 
    price_monthly, is_active, space_category
) VALUES (
    'app_nombre_del_space', 
    'Nombre del Space', 
    'nombre-del-space', 
    'Breve descripción del valor del space.',
    'Descripción larga detallando todas las funcionalidades.',
    'vertical_name', -- Categoría técnica
    ARRAY['vertical_name', '*'], -- Compatibilidad
    'LayoutDashboard', -- Icono de Lucide
    '#hex_color', -- Color de marca del space
    0, -- Precio base (si aplica)
    true, -- is_active: CRÍTICO para que aparezca en Onboarding/Selectores
    'space_category_name', -- Identificador para el Dashboard (ej: 'agency', 'retail', etc.)
    true, -- is_featured: Lo posiciona primero en el slider de Onboarding
    0, -- sort_order: Controla el orden manual en listas
    'LayoutGrid' -- icon: Nombre exacto de un icono de Lucide
);
```

> [!IMPORTANT]
> Para que el Space sea visible en el **Onboarding** y en el **Sheet de Creación de Organizaciones**, la flag `is_active` debe estar en `true`.

### B. Configuración de Módulos (Default Packs)
Define qué módulos se activarán automáticamente. Por defecto, todo Space incluye **CRM Completo** y **Plataforma**.

```sql
-- Módulos Core (CRM + Settings)
INSERT INTO public.saas_app_modules (app_id, module_key, auto_enable, is_core) VALUES
('app_nombre_del_space', 'core_clients', true, true),
('app_nombre_del_space', 'core_settings', true, true),
('app_nombre_del_space', 'module_quotes', true, false),
('app_nombre_del_space', 'module_invoicing', true, false),
('app_nombre_del_space', 'module_payments', true, false);
```

---

## 2. Configuración del Dashboard (Visual Evidence)

El Dashboard de Pixy es adaptativo. Para un nuevo Space, se utiliza el componente `DefaultDashboard` como punto de partida oficial, evitando el uso redundante de dashboards de otras verticales (como Agency).

### A. Registro del Banner de Publicidad
Los anuncios se gestionan desde la tabla `global_dashboard_banners`.

```sql
INSERT INTO public.global_dashboard_banners (
    title, description, space_type, is_active, cta_text, cta_url
) VALUES (
    '¡Bienvenido a tu nuevo Space!',
    '["Descubre todas las herramientas que tenemos para potenciar tu negocio."]',
    'space_category_name', -- Debe coincidir con el space_category del paso 1A
    true,
    'Ver Guía',
    '/docs'
);
```

### B. Implementación del Dashboard Component
Para que la interfaz cargue el diseño correcto:

1.  **Registrar la Categoría**: En `src/modules/core/dashboard/actions.ts`, dentro de `getDashboardPayload`, añadir la lógica de detección para el nuevo `space_category`.
2.  **Activar el Template**: El sistema ahora utiliza `DefaultDashboard` (ver `src/modules/core/dashboard/components/default-dashboard.tsx`) como el fallback universal para nuevos spaces.

### C. Elementos por Defecto (UI Mockup)
El dashboard incluirá automáticamente:
- **Card Premium 3D**: Implementada vía `SocialGlassWidget`.
- **Botones de Acción Rápida**: 
    - `Crear contacto` (abre el modal de creación).
    - `Inbox` (redirige a la sección de mensajería).
- **Magic Cards (Insights)**: 3 tarjetas en blanco esperando asignación de métricas.

---

## 3. Visibilidad y Distribución (Auto-Discovery)

El sistema de Pixy está diseñado para que los nuevos Spaces se integren automáticamente sin cambios adicionales en el código de la UI, siempre que se sigan estas reglas:

### A. Onboarding Wizard
El componente `OnboardingWizard` carga dinámicamente todas las apps con `is_active = true`.
- **is_featured**: Si se marca como `true`, el Space aparecerá destacado o en las primeras posiciones del carrusel.
- **Iconos**: Usa nombres válidos de [Lucide Icons](https://lucide.dev/icons) (ej: `Package`, `Store`, `Users`).

### B. SaaS Engine (Admin)
En el panel de control de plataforma (`/platform/admin`), el nuevo Space aparecerá automáticamente en la pestaña **"Spaces"**, permitiendo editar sus módulos y add-ons recomendados de forma visual.

### C. Creación Manual de Organizaciones
El componente `CreateOrganizationSheet` (usado por SuperAdmins y Resellers) listará el nuevo Space en el selector de "App Base" automáticamente.

---

## 4. Activación y Puesta en Producción

### A. Asignación a una Organización
Una vez creado el template, el SuperAdmin puede activarlo para cualquier organización mediante las **SaaS Engine Actions**.

**Backend Action**: `assignAppToOrganization({ organization_id, app_id })`

### B. Checklist de Producción
- [ ] Módulos Core verificados en `manual_module_overrides`.
- [ ] Banner activo en `global_dashboard_banners` para el `space_type` correcto.
- [ ] Categoría de Space mapeada en el `DashboardPage` switch logic.
- [ ] Assets (Iconos y colores) configurados en `saas_apps`.

---

## 📝 Notas de Implementación
> [!IMPORTANT]
> El sistema de Pixy utiliza el motor de **Inngest** para procesar la activación de módulos. Asegúrate de que los jobs de provisionamiento se ejecuten correctamente tras el cambio de app.

> [!TIP]
> Puedes pre-configurar insights específicos del vertical añadiéndolos como widgets en el array `stats` del componente de Dashboard correspondiente.
