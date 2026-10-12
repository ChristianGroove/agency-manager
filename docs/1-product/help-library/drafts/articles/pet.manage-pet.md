---
schema_version: 1
id: pet.manage-pet
title: Configurar y administrar la mascota robot Pixy
module: pet
status: draft
audience: platform-admin
source_revision: 0e5706d2f235ee40698ded73cc14e161e908e292
verified_on: 2026-10-12
verification: source-only
routes:
  - /platform/admin
keywords:
  - mascota
  - robot
  - pet
  - pixy
  - configuración
  - animación
  - hibernación
  - super admin
requirements:
  - Rol de Superadministrador de la plataforma (isSuperAdmin)
evidence:
  - path: src/modules/core/pet/pet-settings-manager.tsx
    symbol: PetSettingsManager
    claim: Panel interactivo con previsualización, ajuste de forma, colores, tamaños, tipo de animación, velocidad, switches de antena/sombra/cursor/alertas, e hibernación.
  - path: src/modules/core/pet/config-actions.ts
    symbol: savePetSettings
    claim: Valida autorización de superadministrador y actualiza pet_config en platform_settings (id=1) mediante el cliente de servicio.
  - path: src/modules/core/pet/schema.ts
    symbol: petSettingsSchema
    claim: Esquema estricto con validación de rangos, tiempos de hibernación (1-30 min) y tipos de animación (off, contextual, continuous).
---

# Configurar y administrar la mascota robot Pixy

## Propósito
Permitir a los superadministradores de la plataforma gestionar de forma centralizada la activación, apariencia visual, rendimiento y políticas de animación de la mascota robot Pixy en el dashboard.

## Requisitos y permisos
- Acceso exclusivo para usuarios con privilegio de **Superadministrador de Plataforma** (`isSuperAdmin`).
- Los administradores de organizaciones individuales (tenant admins) o usuarios regulares no pueden visualizar ni modificar esta configuración.
- La base de datos debe tener aplicada la columna `pet_config` en la tabla `platform_settings` (migración `20261011000001_platform_robot_pet.sql`).

## Ubicación en pantalla
- **Ruta web:** `/platform/admin`
- **Sección:** SaaS Engine → Marca Global → Tarjeta **Mascota Pixy**.

## Parámetros disponibles
1. **Activar mascota:** Conmutador principal que enciende o apaga la mascota a nivel global.
2. **Organización Pixy:** Selector para identificar la organización interna titular de Pixy (sugerida automáticamente por slug `pixy-agency`).
3. **Disponibilidad:**
   - *Piloto: solo Pixy:* La mascota solo se visualiza dentro de la organización matriz de Pixy.
   - *Todos los tenants:* Despliegue general para todas las empresas de la plataforma (en las cuales el robot adaptará sus colores a los del ADN de marca del tenant).
4. **Forma de la cabeza:** Opciones geométricas: `Rectángulo`, `Cuadrado`, `Círculo` o `Hexágono`.
5. **Colores personalizados de Pixy:**
   - *Carcasa Pixy:* Color del cuerpo principal.
   - *Detalles Pixy:* Tonalidad de molduras y remates.
   - *LEDs:* Color de los ojos y expresiones en la pantalla del robot.
6. **Dimensiones:**
   - *Tamaño escritorio:* Selector entre 48, 56, 64 u 80 píxeles (predeterminado: 64 px).
   - *Tamaño móvil:* Selector entre 48, 56, 64 u 80 píxeles (predeterminado: 48 px).
7. **Modo de animación:**
   - *Apagada:* Pose estática en reposo sin movimiento.
   - *Contextual:* Evita una animación continua en reposo. Las reacciones breves se estabilizan a los 2,5 segundos y los estados de procesamiento tienen una ventana de hasta 15 segundos. El seguimiento depende del ajuste de interactividad y de las condiciones del dispositivo.
   - *Continua:* Movimiento fluido constante. Requiere mayor consumo de CPU.
8. **Velocidad:** Valor decimal entre 0.25x y 2.0x (predeterminado: 1.0x).
9. **Comportamientos opcionales:**
   - *Antena:* Mostrar u ocultar la antena superior.
   - *Sombra:* Efecto de sombra proyectada en la base.
   - *Seguir el cursor en toda la página:* Listener pasivo que orienta la mirada del robot hacia la posición del ratón en dispositivos con puntero fino.
   - *Reaccionar a avisos críticos y operaciones:* Permite a la mascota expresar estados de trabajo (`working`), éxito (`happy`) o error (`error`) ante operaciones clave (como guardar el ADN de marca).
10. **Política de hibernación:**
    - *Hibernar sin interacción:* Conmutador que activa el modo de descanso tras inactividad.
    - *Tiempo activo (minutos):* Rango de 1 a 30 minutos (predeterminado: 5 minutos). Al vencer el plazo sin pasar el cursor sobre el robot, entra en estado `sleeping` y pausa el dibujo en canvas.

## Pasos para guardar la configuración
1. Accede a `/platform/admin` con tu cuenta de superadministrador.
2. Desplázate hasta la tarjeta **Mascota Pixy**.
3. Ajusta los parámetros visuales deseados observando la **Vista previa** en tiempo real.
4. Para comprobar diferentes expresiones antes de guardar, utiliza el desplegable **Estado de prueba** (por ejemplo: Pensando, Éxito, Error, Descansando).
5. Haz clic en el botón **Guardar mascota**.
6. Recarga las pestañas abiertas del dashboard para que el nuevo estado se refleje en los clientes conectados.

## Resultado esperado
Un aviso flotante de confirmación indicará *"Configuración de mascota actualizada."*. Al navegar al dashboard de la organización autorizada, la mascota se renderizará con los tamaños, paleta y animaciones definidas.

## Problemas habituales y causas comprobadas
- **Aparece un aviso amarillo indicando que la configuración no está habilitada:**
  *Causa comprobada:* Falta ejecutar la migración SQL `platform_robot_pet` en la base de datos para crear la columna `pet_config` en `platform_settings`. La mascota permanecerá apagada hasta su aplicación.
- **Los cambios guardados no se ven de inmediato en otros navegadores:**
  *Causa comprobada:* La plataforma no implementa suscripciones Realtime ni polling continuo para la configuración de la mascota a fin de proteger los recursos del servidor. Los usuarios deben recargar su sesión para recibir los nuevos valores.
- **La mascota no aparece en un tenant secundario:**
  *Causa comprobada:* La disponibilidad está configurada en *"Piloto: solo Pixy"*. Para que otras organizaciones la vean, debe cambiarse a *"Todos los tenants"*.

## Limitaciones conocidas
- El seguimiento del puntero se desactiva automáticamente en pantallas táctiles o si el usuario tiene habilitada la preferencia del sistema operativo de reducción de movimiento (`prefers-reduced-motion`).
- El estado seleccionado en el campo "Estado de prueba" es meramente interactivo para la previsualización y no se persiste en base de datos.

## Temas relacionados
- [Estados visuales, hibernación y activación de la mascota](pet.pet-interaction.md)
- [Consultar al asistente de ayuda e historial](help.chat-and-history.md)

## Notas de verificación
- Componente de administración: `src/modules/core/pet/pet-settings-manager.tsx`
- Acciones de servidor y seguridad: `src/modules/core/pet/config-actions.ts`
- Validación de esquema Zod: `src/modules/core/pet/schema.ts`
