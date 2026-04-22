# Arquitectura del Sistema de Asistencia (v2.0) - Optimización y Escalabilidad

Este documento detalla la re-arquitectura del sistema de asistencia realizada en Abril 2026, enfocada en la flexibilidad operativa, la experiencia de usuario móvil y la optimización de costos de infraestructura.

## 1. Arquitectura Lógica

### Validaciones Zero-Trust
Toda la lógica de marcas se ha movido al servidor (`actions.ts`). El cliente no envía marcas de tiempo ni estados calculados.
- **Validación de Cooldown**: Se implementó un bloqueo de **15 minutos** de cortesía entre marcas para evitar registros duplicados accidentales.
- **Flexibilidad Horaria**: Se eliminó la restricción de 2 horas de break. Los empleados sin horario personalizado ahora operan en "Modo Flexible", permitiendo marcas libres basadas solo en la geocerca.
- **Soporte Global**: El sistema ahora reconoce y valida los 7 días de la semana, incluyendo configuraciones específicas para sábados y domingos.

### Motor de Nómina Asíncrono
Para reducir la latencia del portal y el tiempo de cómputo en Vercel:
- El registro (`registerAttendanceMark`) devuelve éxito inmediatamente después de guardar el log.
- El cálculo de horas (`processDailyShift`) se dispara en segundo plano, desacoplado de la respuesta al usuario.

---

## 2. Optimización de Infraestructura

### Gestión de Almacenamiento (Supabase Storage)
Para mitigar el crecimiento exponencial de costos por almacenamiento de fotos probatorias:
- **Política de Retención (TTL)**: Se implementó un Job de limpieza (`cleanupAttendancePhotos`) que se ejecuta cada domingo vía Cron. Elimina todas las fotos con más de **32 días** de antigüedad.
- **Cache-Control**: Todas las fotos se suben con una cabecera de caché de 1 año (`max-age=31536000`), reduciendo drásticamente el consumo de transferencia de datos (Egress) en el panel administrativo.

### Analíticas de Vercel
- Se recomienda la exclusión de la ruta `/attendance/portal` de Vercel Analytics para evitar el consumo innecesario de cuotas de eventos en tráfico interno de utilidad.

---

## 3. Estándares de UI/UX

### Portal del Colaborador (Zero-Scroll)
Rediseño enfocado en la usabilidad móvil sin desplazamiento:
- **Layout**: Uso de `h-[100dvh]` para ocupar exactamente el visor.
- **Header Preciso**: Logo a 24px del borde superior, nombre a 32px del logo.
- **Reloj**: Integrado en el footer debajo de los textos legales para una visualización tradicional y limpia.
- **Proporción de Cámara**: Se mantiene 3:4 para máxima visibilidad de identidad, compensada por un encabezado ultra-compacto.

### Administración (Staff Management)
- **Replicación Inteligente**: Función "Aplicar a todos" que permite clonar un día de horario a toda la semana.
- **Modal Optimizado**: Uso de scroll interno para evitar que los botones de acción (Guardar/Cancelar) desaparezcan al expandir formularios largos.

---

## 4. Referencias Técnicas
- **Acciones**: `src/modules/features/attendance/actions.ts`
- **Mantenimiento**: `src/app/api/cron/lifecycle/route.ts`
- **Portal**: `src/modules/features/attendance/components/staff-portal-view.tsx`
- **Admin**: `src/modules/features/attendance/components/admin/staff-management.tsx`
