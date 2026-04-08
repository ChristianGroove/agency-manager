# Arquitectura de Dashboard Spaces ("Pixy Spaces")

Este documento detalla la implementación técnica, el flujo de datos y los estándares de marca aplicados al componente 3D de "Spaces" en los dashboards de Agency Manager.

---

## 1. Visión General
El componente **"Pixy Spaces"** es un elemento visual 3D premium diseñado para estandarizar la identidad corporativa de Pixy a lo largo de todos los dashboards de la plataforma (Agencia, SaaS, Cleaning, etc.). Su objetivo es servir como un centro de acceso rápido a los ecosistemas de soporte y redes sociales de la marca.

## 2. Estructura de Componentes

### A. [[GlassCard3D.tsx]](file:///d:/Pixy/agency-manager/src/components/ui/glass-card-3d.tsx)
Es el componente núcleo (Atomic UI). Maneja la lógica de renderizado 3D, animaciones y efectos de cristal (glassmorphism).
- **Props Clave**:
  - `title`: Título superior (por defecto obtenido de i18n).
  - `companyName`: Nombre de la empresa del inquilino (inyectado dinámicamente).
  - `socialFacebook`, `socialInstagram`, `socialWhatsapp`: Enlaces de redes sociales.
- **Internacionalización**: Utiliza el hook `useTranslation` para el título, el pie de página ("Powered by Pixy") y la descripción.

### B. [[SocialGlassWidget.tsx]](file:///d:/Pixy/agency-manager/src/modules/core/dashboard/widgets/smart-cards/social-glass-widget.tsx)
Actúa como un wrapper de conveniencia para integrar la tarjeta en el sistema de widgets del dashboard.
- **Función**: Mapea las propiedades del objeto `social` definido en los dashboards a las props de `GlassCard3D`.

---

## 3. Flujo de Datos Dinámicos

El componente integra el nombre de la empresa del tenant de forma dinámica:

1. **DB**: Se extrae `agency_name` de la tabla `organization_settings`.
2. **Action**: `getDashboardPayload()` recupera la configuración de marca (`settings`).
3. **Dashboard Component**: (Ej: `AgencyDashboard`) recibe `settings` y construye el objeto `social`:
   ```typescript
   social: {
       companyName: settings?.agency_name,
       // ...enlaces estandarizados
   }
   ```
4. **Interpolación**: En `GlassCard3D`, la descripción se construye mediante:
   - `t('dashboard.spaces.description', { companyName })`
   - Clave i18n: `"Ecosistema modular de gestión empresarial {companyName}"`

---

## 4. Estándares de Redes Sociales
Actualmente, los enlaces están estandarizados para apuntar a los canales oficiales del ecosistema Pixy:

- **Facebook**: `https://www.facebook.com/pixyspaces`
- **Instagram**: `https://www.instagram.com/pixyspaces/`
- **WhatsApp**: Enlace directo a la línea de soporte `+57 350 407 6800` (Icono: `MessageCircle`).

---

## 5. Localización (i18n)
El contexto del componente depende de las siguientes llaves en `es.ts` / `en.ts`:

- `dashboard.spaces.title`: Título de la tarjeta.
- `dashboard.spaces.description`: Texto central con soporte para `{companyName}`.
- `dashboard.spaces.powered_by`: Firma de marca en el footer.
- `settings.general.agency_name`: Etiqueta del campo en ADN del Negocio (ahora "Nombre de la Empresa").

---

## 6. Guía de Mantenimiento

> [!TIP]
> **¿Cómo cambiar los enlaces sociales en el futuro?**
> Para una edición rápida, se pueden modificar los valores por defecto en los props de `GlassCard3D.tsx`. Para cambios específicos por dashboard, editar el objeto `social` en los componentes respectivos (ej: `cleaning-dashboard.tsx`).

> [!IMPORTANT]
> **Al crear un nuevo Dashboard:**
> Asegúrese de no pasar un `title` fijo si desea que se use "Pixy Spaces" por defecto. Pase siempre `companyName: settings?.agency_name` para mantener la personalización del tenant en la descripción.
