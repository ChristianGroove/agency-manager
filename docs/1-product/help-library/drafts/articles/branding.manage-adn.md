---
schema_version: 1
id: branding.manage-adn
title: Personalizar el ADN de marca y la identidad del negocio
module: branding
status: draft
audience: tenant-admin
source_revision: 0e5706d2f235ee40698ded73cc14e161e908e292
verified_on: 2026-10-12
verification: source-only
routes:
  - /platform/adn
keywords:
  - adn
  - marca
  - identidad
  - logotipo
  - colores
  - tipografía
  - portal
  - documentos
requirements:
  - Rol de Administrador o Dueño en la organización activa
evidence:
  - path: src/app/(dashboard)/platform/adn/page.tsx
    symbol: IdentityPage
    claim: Exige rol admin en la organización y carga configuraciones de branding con capacidades del plan actual.
  - path: src/modules/core/branding/components/identity-dashboard.tsx
    symbol: IdentityDashboard
    claim: Panel con pestañas de Esencia, Contacto, Portal, Documentos, Dominios y Operación junto a panel de vista previa en tiempo real.
  - path: src/modules/core/branding/actions.ts
    symbol: updateOrganizationBranding
    claim: Persiste los cambios en organization_settings, revalida rutas de layout y emite actualización de caché en cliente.
  - path: src/modules/core/branding/components/operations-tab.tsx
    symbol: OperationsTab
    claim: Contiene configuración regional, moneda y zona horaria de la operación.
---

# Personalizar el ADN de marca y la identidad del negocio

## Propósito
Permitir a los administradores definir y unificar la identidad corporativa de su empresa en Pixy: logotipos, colores principales, datos de contacto comercial, membretes de documentos PDF y apariencia visual del portal para clientes.

## Requisitos y permisos
- Contar con rol de **Administrador** (`admin`) o **Dueño** (`owner`) en la organización activa.
- Los usuarios con rol de miembro (`member`) o colaboradores no tienen acceso a esta sección y serán redirigidos.
- Para subir imágenes (logotipos o fondos), el archivo debe ser formato de imagen válido (PNG, JPG, SVG, WebP) y tener un peso máximo de **5 MB**.

## Ubicación en pantalla
- **Ruta web:** `/platform/adn`
- **Menú lateral:** Sección **Plataforma** (Configuración) → opción con icono de escaneo facial y etiqueta **ADN del Negocio**.

## Pestañas de configuración
El panel se organiza en seis pestañas temáticas:

### 1. Esencia
- **Nombre comercial:** Nombre oficial del negocio que figurará en encabezados, facturas y correos.
- **Logotipos:** Subida independiente de logotipo para fondo claro y fondo oscuro.
- **Isotipo / Favicon:** Ícono cuadrado compacto visible en la pestaña del navegador y accesos directos.
- **Paleta de colores:** Color primario (utilizado en botones de acción y destaques) y color secundario. En caso de que la mascota robot esté disponible para todos los tenants, adoptará estos tonos automáticamente.
- **Tipografía de marca:** Fuente tipográfica preferida para la experiencia del cliente.

### 2. Contacto
- Datos institucionales: sitio web oficial, correo de atención, teléfono principal, dirección y canales de contacto.

### 3. Portal
- Configuración visual del portal público B2C para clientes (comensales, compradores o usuarios externos).
- Logotipo específico del portal, imagen de fondo de inicio de sesión y color de fondo de login.
- *Nota de plan:* Si la organización no cuenta con un plan que incluya personalización de portal (Tier Pro o Whitelabel), esta pestaña muestra un aviso de bloqueo indicando las ventajas de actualizar de plan.

### 4. Documentos
- Personalización de cotizaciones, cuentas de cobro y facturas en formato PDF.
- Permite definir el texto legal del pie de página, tamaño del logotipo (pequeño, mediano, grande) y conmutar la marca de agua.

### 5. Dominios
- Asignación de dominio web personalizado para operar la plataforma bajo una dirección propia. Requiere soporte de dominio en el plan contratado.

### 6. Operación
- Configuración regional de la operación, como país, moneda base y zona horaria. No debe confundirse con los datos de contacto.

## Pasos para actualizar la identidad
1. Navega a **ADN del Negocio** en el menú lateral.
2. Selecciona la pestaña que deseas modificar (por ejemplo, **Esencia** para cambiar colores o logos).
3. Para cambiar una imagen, haz clic en el área de carga correspondiente, selecciona el archivo desde tu equipo y espera a que la miniatura se actualice.
4. Para ajustar los colores, utiliza el selector visual de color o ingresa directamente el código HEX (ejemplo: `#3594F1`).
5. Observa el panel derecho de **Vista previa**: podrás ver en tiempo real cómo lucen los cambios tanto en la maqueta de inicio de sesión como en la del panel de control.
6. Una vez conforme, haz clic en el botón superior **Guardar Identidad** (icono de disquete).

## Resultado esperado
Aparecerá una notificación de confirmación: *"ADN Actualizado: La identidad de tu negocio se ha guardado correctamente."*. Los nuevos logotipos y colores se propagarán a la barra lateral, documentos PDF emitidos y portales públicos.

## Problemas habituales y causas comprobadas
- **Error al subir imagen ("El archivo no debe superar 5MB"):**
  *Causa comprobada:* El archivo seleccionado supera el límite técnico permitido de 5 megabytes. Debes comprimir la imagen antes de subirla.
- **Los cambios de color no se reflejan en el menú lateral de inmediato:**
  *Causa comprobada:* Aunque el guardado emite el evento `branding-updated` para limpiar la memoria caché del navegador, en conexiones lentas puede requerirse una recarga de página (`F5`) para rehidratar el layout del servidor.
- **La pestaña "Portal" aparece bloqueada con un candado:**
  *Causa comprobada:* La función de personalización de portal (`custom_colors` o `remove_pixy_branding`) requiere un plan con características avanzadas de marca blanca. Contacta a administración o utiliza el botón de actualización directa.

## Limitaciones conocidas
- La eliminación física de imágenes reemplazadas en el almacenamiento de Supabase se procesa mediante llamadas administrativas; si se utiliza una URL externa manual no se podrá gestionar su borrado automático.

## Temas relacionados
- [Gestionar identidad en el Centro de Marca (Brand Center)](branding.brand-center.md)
- [Cambiar entre tema claro y tema oscuro](theme.toggle-theme.md)

## Notas de verificación
- Página principal: `src/app/(dashboard)/platform/adn/page.tsx`
- Componente de pestañas: `src/modules/core/branding/components/identity-dashboard.tsx`
- Acciones de persistencia: `src/modules/core/branding/actions.ts` (función `updateOrganizationBranding`).
