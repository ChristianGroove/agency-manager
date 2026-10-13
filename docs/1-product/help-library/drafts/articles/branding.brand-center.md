---
schema_version: 1
id: branding.brand-center
title: Gestionar identidad y portal en el Centro de Marca (Brand Center)
module: branding
status: draft
audience: tenant-admin
source_revision: 047fa7ee0cadc0f49d9ce08220f633885b0801a7
verified_on: 2026-10-12
verification: source-only
routes:
  - /platform/settings
keywords:
  - centro de marca
  - brand center
  - identidad
  - configuración
  - modal
  - mascota
  - operaciones
requirements:
  - Rol de Administrador o Dueño en la organización activa
evidence:
  - path: src/modules/core/branding/components/brand-center.tsx
    symbol: BrandCenter
    claim: Panel deslizable con pestañas de Identidad, Portal, Documentos y Dominios, integrado con usePetOperation para retroalimentación visual de la mascota.
  - path: src/modules/core/branding/components/brand-center-sheet.tsx
    symbol: BrandCenterSheet
    claim: Despliega el Centro de Marca en formato hoja lateral desde los ajustes generales de la empresa.
  - path: src/modules/core/pet/use-pet-operation.ts
    symbol: usePetOperation
    claim: Coordina estados efímeros de trabajo (15s), éxito (2.5s) y error (8s) en la mascota robot durante el ciclo de guardado.
---

# Gestionar identidad y portal en el Centro de Marca (Brand Center)

## Propósito
Permitir a los administradores ajustar rápidamente la identidad corporativa, logotipos y documentos de la organización desde un panel deslizable accesible dentro de la configuración general, con retroalimentación visual inmediata.

## Requisitos y permisos
- Rol de **Administrador** (`admin`) o **Dueño** (`owner`) en la organización activa.
- Para personalizar el portal o remover la marca Pixy, la organización debe contar con las capacidades correspondientes en su nivel de suscripción.

## Ubicación en pantalla
- **Acceso:** Navega a **Plataforma** (Configuración) → opción **Configuración** (`/platform/settings`).
- En la sección de datos generales de la empresa, haz clic en el botón de acción **Centro de Marca** para abrir el panel lateral interactivo.

## Funcionalidades del Centro de Marca
El panel lateral reúne las opciones clave de personalización:
1. **Identidad:** Carga de logotipo oficial, isotipo para favicon y selección de la paleta cromática (colores primario y secundario en formato HEX).
2. **Portal:** Personalización de la experiencia pública para clientes, incluyendo fondo de inicio de sesión e imagen de cabecera. Si tu plan actual no incluye marca blanca total, se mostrará un botón para solicitar la ampliación del plan.
3. **Documentos:** Configuración de membretes, tamaño de logotipo y marcas de agua en cotizaciones y facturas generadas por el sistema.
4. **Dominios:** Gestión y verificación de dominios personalizados con registro CNAME.

## Interacción con la mascota robot durante el guardado
El Centro de Marca está integrado con el sistema de respuesta reactiva de la mascota robot Pixy:
- Al presionar **Guardar**, si la mascota está visible en tu pantalla y tiene activadas las reacciones a operaciones, cambiará inmediatamente a su estado de **Trabajando** (`working`), indicando que la solicitud está en proceso.
- Si el servidor guarda los cambios con éxito, la mascota expresará **Éxito** (`happy`) durante 2,5 segundos al tiempo que se muestra la notificación verde de confirmación.
- Si ocurre una excepción o interrupción de red, la mascota reflejará **Error** (`error`) durante 8 segundos.
- Si la mascota no está activada en tu tenant, el guardado transcurre de forma normal e imperceptible mediante avisos de sistema estándar.

## Pasos para modificar y guardar
1. Abre el panel lateral del **Centro de Marca** desde la configuración general.
2. Modifica el parámetro deseado (por ejemplo, actualiza el código del color primario o carga un nuevo isotipo).
3. Haz clic en el botón **Guardar**.
4. Espera la confirmación de éxito. El sistema emitirá automáticamente una señal de actualización para sincronizar la barra lateral y los elementos visuales abiertos.

## Resultado esperado
Los valores se guardan en el registro de la organización (`organization_settings`) y se sincronizan instantáneamente con el portal y los componentes del panel.

## Problemas habituales y causas comprobadas
- **El botón de guardar queda deshabilitado:**
  *Causa comprobada:* Ocurre si ya hay una petición de guardado en curso para evitar escrituras concurrentes o duplicadas en la base de datos.
- **La mascota no reacciona al guardar:**
  *Causa comprobada:* La mascota se encuentra hibernando, el superadministrador desactivó el interruptor *"Reaccionar a avisos críticos y operaciones"*, o el chat de ayuda está abierto (el chat tiene prioridad sobre las operaciones).

## Limitaciones conocidas
- La edición en el Centro de Marca no altera las credenciales maestras de la plataforma; solo afecta el ámbito del tenant activo.

## Temas relacionados
- [Personalizar el ADN de marca y la identidad del negocio](branding.manage-adn.md)
- [Estados visuales, hibernación e interacción con la mascota](pet.pet-interaction.md)

## Notas de verificación
- Componente principal: `src/modules/core/branding/components/brand-center.tsx`
- Envoltorio modal: `src/modules/core/branding/components/brand-center-sheet.tsx`
- Coordinación de señales con la mascota: `src/modules/core/pet/use-pet-operation.ts`
- Documentación de arquitectura: `docs/2-architecture/modules/pixy-robot-pet-phase-two.md`
