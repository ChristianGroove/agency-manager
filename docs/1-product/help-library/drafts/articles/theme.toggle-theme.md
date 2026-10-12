---
schema_version: 1
id: theme.toggle-theme
title: Cambiar entre tema claro y tema oscuro
module: theme
status: draft
audience: tenant-user
source_revision: 0e5706d2f235ee40698ded73cc14e161e908e292
verified_on: 2026-10-12
verification: source-only
routes:
  - /dashboard
keywords:
  - tema
  - oscuro
  - claro
  - apariencia
  - noche
  - sol
  - luna
requirements: []
evidence:
  - path: src/components/layout/sidebar-theme-toggle.tsx
    symbol: SidebarThemeToggle
    claim: Botón circular con icono de Sol y Luna ubicado en el borde del sidebar que conmuta instantáneamente entre modo claro y oscuro usando next-themes.
  - path: src/components/layout/sidebar-floating-actions.tsx
    symbol: SidebarFloatingActions
    claim: Renderiza SidebarThemeToggle dentro del conjunto de acciones fijas del menú lateral.
  - path: docs/2-architecture/modules/pixy-robot-pet-phase-two.md
    symbol: "Pixy pet: primera integración operativa y prueba IA local"
    claim: Ratifica que el cambio de tema vive en el toggle de sol/luna del borde del sidebar y no requiere guardar ni buscar en Configuración > Preferencias.
---

# Cambiar entre tema claro y tema oscuro

## Propósito
Permitir a los usuarios alternar cómodamente entre la apariencia visual clara (diseñada para entornos iluminados) y la apariencia oscura (diseñada para reducir la fatiga visual en ambientes con poca luz).

## Requisitos y permisos
- Disponible para cualquier usuario autenticado en la plataforma.
- No exige roles administrativos ni permisos especiales de organización.
- No requiere guardar cambios en la base de datos: la preferencia se almacena en el navegador del usuario.

## Ubicación en pantalla
- **Ubicación exacta:** En el borde exterior derecho inferior de la barra de navegación lateral (sidebar flotante).
- **Aspecto visual:** Es un botón circular compacto (32x32 píxeles) con borde sutil.
  - En **modo claro**, muestra el icono de una **Luna**.
  - En **modo oscuro**, muestra el icono de un **Sol**.

## Pasos para cambiar de tema
1. Dirige el cursor al menú lateral izquierdo de Pixy.
2. Localiza la sección de acciones flotantes en la parte inferior derecha del contenedor del menú (junto a los accesos de Perfil y Notificaciones).
3. Haz clic sobre el botón circular de **Luna** (para activar el modo oscuro) o sobre el botón de **Sol** (para regresar al modo claro).
4. El cambio se aplica de inmediato en toda la interfaz sin necesidad de recargar la página ni pulsar ningún botón de confirmación.

## Resultado esperado
Los fondos, tarjetas con efecto vidrio (glassmorphism), paneles y textos adaptan su contraste y paleta de colores de forma instantánea y fluida. La elección permanece activa en futuras visitas desde el mismo navegador.

## Problemas habituales y causas comprobadas
- **Al abrir la aplicación en otra computadora o ventana de incógnito, el tema no se conserva:**
  *Causa comprobada:* La preferencia se gestiona mediante almacenamiento local en el navegador del cliente (`localStorage` a través de `next-themes`) y no se guarda en el registro de usuario en el servidor.
- **Buscar la opción en "Configuración > Preferencias":**
  *Causa comprobada:* El cambio de tema no reside en el panel de configuración de la organización ni en menús desplegables; se encuentra accesible en todo momento desde el botón fijo del borde del menú lateral.
- **La interfaz parece no cambiar tras hacer clic:**
  *Causa comprobada:* Si el navegador tiene extensiones de forzado de modo oscuro (como Dark Reader), estas pueden anular las clases dinámicas de Tailwind aplicadas por la aplicación.

## Limitaciones conocidas
- La sincronización automática con el esquema de color del sistema operativo no se selecciona desde este control; el botón alterna exclusivamente de manera binaria entre `light` y `dark`.

## Temas relacionados
- [Navegación y vista general del panel principal](dashboard.overview.md)
- [Personalizar el ADN de marca del negocio](branding.manage-adn.md)

## Notas de verificación
- Archivo fuente del botón: `src/components/layout/sidebar-theme-toggle.tsx`
- Contenedor de acciones: `src/components/layout/sidebar-floating-actions.tsx` (línea 80).
- Historial de verificación y corrección de alucinaciones previas: `docs/2-architecture/modules/pixy-robot-pet-phase-two.md` (líneas 21-23).
