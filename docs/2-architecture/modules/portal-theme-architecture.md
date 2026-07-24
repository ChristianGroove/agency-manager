# Arquitectura de Personalización de Portal, Horarios y ADN de Marca

Este documento detalla la arquitectura técnica, modelo de datos y flujo de trabajo implementado para la personalización de portales B2C, gestión de horarios de atención (con doble jornada), sincronización con ADN de Marca y banners promocionales.

---

## 1. Visión General
El módulo de **Personalización de Portal** permite a cada organización (restaurantes y negocios de hospitalidad) configurar la identidad visual de su portal público B2C, controlar la disponibilidad de pedidos en tiempo real según su horario de operación y mostrar información relevante (banners promocionales, redes sociales, horarios semanales detallados y contexto de mesa para consumo presencial).

---

## 2. Modelo de Datos y Estructura

### Configuración del Tema (`PortalThemeConfig`)

```typescript
export interface BusinessScheduleDay {
    enabled: boolean;
    shifts: Array<{
        open: string;  // Formato "HH:mm" (ej: "11:30")
        close: string; // Formato "HH:mm" (ej: "15:00")
    }>;
}

export interface BusinessSchedule {
    block_orders_manually?: boolean; // Bloqueo de emergencia de pedidos
    timezone?: string;
    days: Record<number, BusinessScheduleDay>; // 1=Lun, 2=Mar, ..., 6=Sáb, 0=Dom, 7=Festivos
}

export interface PortalThemeConfig {
    theme_id: 'modern_glass' | 'gourmet_elegance' | 'cyber_glass_3d';
    color_mode: 'dark' | 'light' | 'auto';
    primary_color?: string;
    secondary_color?: string;
    background_style: 'solid' | 'gradient' | 'mesh' | 'mesh_3d';
    category_nav_style?: 'pills' | 'underline_tabs' | 'glass_cards' | 'floating_dock';
    dock_style?: 'floating_glass' | 'capsule_pill' | 'full_width_dock';
    tenant_name?: string;
    header_footer?: {
        show_header?: boolean;
        show_footer?: boolean;
    };
    social_links?: {
        instagram?: string;
        facebook?: string;
        whatsapp?: string;
    };
    schedule?: BusinessSchedule;
    promo_banner?: {
        enabled?: boolean;
        image_url?: string;
        target_url?: string;
        alt_text?: string;
        position?: 'top' | 'bottom';
    };
}
```

### Persistencia en Base de Datos (`organization_settings`)
- **`portal_theme_config` (JSONB)**: Almacena la configuración estructurada completa del tema.
- **`portal_modules->theme_config` (JSONB Fallback)**: Mantiene compatibilidad universal instantánea en entornos con esquemas heterogéneos.
- **`portal_primary_color` (VARCHAR)**: Color primario del negocio sincronizado activamente con el ADN de Marca de la organización.
- **`agency_name` (VARCHAR)**: Nombre comercial registrado en la esencia de marca del negocio.

---

## 3. Principales Funcionalidades e Implementación

### A. Gradiente Vertical y Branding Unificado (`PortalHeader.tsx` & `PortalFooter.tsx`)
- **Header**: Utiliza un degradado desvaneciente de arriba hacia abajo (`linear-gradient(to bottom, ${activePrimaryColor}40 0%, ${activePrimaryColor}00 100%)`) con contenedor `shrink-0` para prevenir aplastamiento por flexbox al activar banners.
- **Footer**: Reemplaza marcas genéricas por el nombre comercial exacto configurado en el ADN de Marca (`agency_name` / `tenant_name`), incluyendo enlace modal `"Ver Horarios"`.

### B. Motor de Horarios con Doble Jornada y Bloqueo de Pedidos (`theme-actions.ts` & `ScheduleModal.tsx`)
- **Doble Jornada por Día**: Soporta 1 o 2 turnos de atención por día (ej: Almuerzo 11:30-15:00 y Cena 18:30-22:30), configurables de Lunes a Domingo más el bloque especial de **Festivos** (Día ID `7`).
- **Estado Dinámico**: Evaluador de estado en tiempo real que calcula si el establecimiento está `ABIERTO`, `CERRADO` o en `PRÓXIMA APERTURA`, bloqueando la posibilidad de añadir productos al carrito o enviar pedidos cuando está fuera de servicio o con bloqueo manual activo.
- **Modal de Horarios Semanales (`ScheduleModal.tsx`)**: Interfaz modal responsive (`max-h-[90vh]`) que despliega la agenda completa de los 8 bloques de días con la estética del tema activo.

### C. Sincronización del Color de Marca sin Sobrescritura Involuntaria (`branding/actions.ts`)
- **Protección de Colores**: `savePortalThemeConfig` evita que valores por defecto genéricos (`#4F46E5` / `#F205E2`) sobreescriban el color real del negocio en `organization_settings.portal_primary_color`.
- **Desbloqueo de Colores Personalizados**: `getEffectiveBranding()` resuelve directamente el color primario del tenant (`portal_primary_color`) y revalida las rutas principales (`revalidatePath("/", "layout")`).

### D. Optimización de Rendimiento Servidor (0ms Lag / Carga Instantánea)
- **Pre-fetching Paralelo**: `src/app/(dashboard)/menu/page.tsx` pre-obtiene `getPortalThemeConfig()` en paralelo con los ítems y categorías mediante `Promise.all`.
- **Hidratación en Fotograma 1**: `PortalThemeCustomizer` recibe `initialThemeConfig`, eliminando parpadeos visuales, spinners o consultas secundarias en el cliente.

### E. Banners Promocionales y Contexto Presencial (QR Mesa)
- **Transparencia PNG**: `PortalPromoBanner` usa `bg-transparent`, respetando el canal alfa transparente de las imágenes PNG subidas.
- **Banner de Mesa (`b2c-restaurant-layout.tsx`)**: Notificación traslúcida (`${effectivePrimaryColor}15`) para clientes escaneando QR de mesa con texto de alto contraste (`📍 Estás ordenando en Mesa #T1`).

---

## 4. Archivos Clave del Sistema

| Archivo | Responsabilidad |
| :--- | :--- |
| `src/modules/features/menu/actions/theme-actions.ts` | Acciones del servidor para guardar y obtener la configuración del tema y horarios. |
| `src/modules/features/portal/theme/components/PortalThemeCustomizer.tsx` | Editor interactivo de personalización y previsualizador dinámico (`PreviewPhone`). |
| `src/modules/features/portal/theme/components/ScheduleModal.tsx` | Modal de visualización completa de horarios semanales y doble jornada. |
| `src/modules/features/portal/components/b2c-restaurant-template/b2c-restaurant-layout.tsx` | Layout público B2C del portal de restaurante con lógica de pedidos e hidratación. |
| `src/modules/core/branding/actions.ts` | Motor central de ADN de Marca y resolución de identidad corporativa. |
