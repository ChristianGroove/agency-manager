# 🚩 MISSION BRIEFING: Estabilización Post-Optimización (Phase 4.1)

**PARA EL PRÓXIMO AGENTE / SESIÓN:**

## 1. Situación Actual (CRAL - Critical Rollout Alert Level)
Se ha completado una remodelación masiva de la arquitectura de base de datos (Phase 4.1). 
- **Squash Exitoso**: ~200 migraciones antiguas consolidadas en `20260409000000_baseline.sql`.
- **Optimización de Performance**: RPCs críticos refactorizados con Window Functions e índices GIN creados.
- **ENTORNO LOCAL**: Sincronizado y verificado (Docker).
- **PRODUCCIÓN**: **Pendiente de sincronizar**. No se ha realizado `migration repair` todavía.

## 2. Directivas de Cero-Interferencia (MANDATORIO)
> [!CAUTION]
> **NO GENERAR NUEVAS MIGRACIONES SQL**. 
> Cualquier cambio adicional en el esquema (`supabase/migrations/`) antes de que el Baseline sea aceptado en producción complicará exponencialmente el despliegue. Proceder con cautela máxima.

## 3. Seguridad y Rollback
- Existe un respaldo **FULL (Schema + Data)** verificado en: `C:\Users\Usuario\Documents\BACKUP PIXY`.
- Consultar `supabase/backups/production/BACKUP_REPORT.md` para detalles de integridad.
- **PROHIBIDO** realizar `supabase db push` o cambios en producción sin previa validación del historial acumulado.

## 4. Documentación de Referencia Obligatoria
Antes de tomar cualquier decisión, lea:
1. [ROADMAP_SCALABILITY.md](file:///D:/Pixy/agency-manager/docs/ROADMAP_SCALABILITY.md): Estado de Phase 4 y deuda de Phase 5.
2. [database-map.md](file:///D:/Pixy/agency-manager/docs/architecture/database-map.md): Sección 6 sobre vulnerabilidades conocidas de seguridad que NO DEBEN tocarse todavía.
3. [HANDOVER_STATUS.md](file:///D:/Pixy/agency-manager/docs/audit/HANDOVER_STATUS.md): Esta misma nota.

## 5. Estabilización de UI (Completado 2026-04-10)
Se han corregido fallos críticos de UX/UI en la Bandeja de Entrada (Inbox) para asegurar la fidelidad visual:
- **Input de Chat**: Eliminación absoluta del "stroke" (borde de enfoque) mediante estilos en línea para neutralizar reglas globales persistentes.
- **Modo Oscuro**: Corrección de contraste en el input; se eliminó el cambio de fondo que causaba invisibilidad de los caracteres.
- **Simplificación**: Placeholder del chat simplificado a "Escribe un mensaje..." eliminando instrucciones de atajos para una UI más limpia.

**EL OBJETIVO ACTUAL ES ESTABILIDAD Y PREPARACIÓN PARA DEPLOY, NO EXPANSIÓN DE FUNCIONALIDAD.**
