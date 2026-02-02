# 🗺️ PIXY SCALABILITY ROADMAP: El Camino a la Perfección Blindada

Este documento detalla la estrategia por fases para transformar a Pixy en un producto técnicamente blindado y empresarialmente escalable, corrigiendo las inconsistencias detectadas sin interrumpir las operaciones actuales.

---

## Fase 1: Armonización y Soberanía (Inmediato)
*Enfoque: Eliminar duplicidades y dar control a los Resellers.*

### 1.1 Unificación de la "Biblia" (Single Source of Truth)
- **Acción**: Fusionar la sección de Revenue Sharing. Eliminar la redundancia entre la Sección 3 y la Sección 10.
- **Resultado**: Cero confusiones sobre comisiones para el equipo de desarrollo.

### 1.2 Implementación de Soberanía de Facturación
- **Acción**: Añadir un campo `config.allow_direct_billing` en la tabla `organizations` para Resellers.
- **Acción**: El botón de "Upgrade Directo" solo se muestra si el Reseller padre lo permite.
- **Resultado**: Se elimina el conflicto de precios entre Agencia y Pixy.

### 1.3 Definición Técnica de "Actividad"
- **Acción**: Implementar un trigger que registre `support_session` automáticamente cada vez que un Owner/Admin de un Reseller entre al dashboard de un Cliente Hijo.
- **Resultado**: Payouts automáticos y justos sin carga manual para el socio.

---

## Fase 2: Abstracción y Resiliencia (Corto Plazo)
*Enfoque: Dejar de ser una "App de Agencias" para ser una "Plataforma de Verticales".*

### 2.1 Sistema de Capacidades (Capabilities vs. Verticals)
- **Acción**: Eliminar los `if (vertical === 'agency')`.
- **Acción**: Crear un `CAPABILITIES_REGISTRY`. Las rutas y lógica se activan por flags (ej: `has_advanced_crm`, `has_white_label`, `has_automation`).
- **Resultado**: Pixy puede lanzar verticales de "Salud", "Real Estate" o "Legal" en días, no en meses.

### 2.2 Papelera de Reciclaje B2B (Safety Net)
- **Acción**: Reforzar el `soft-delete`. Todo elemento "borrado" va a una tabla de auditoría/papelera por 30 días.
- **Acción**: Función de `restore()` disponible para el Admin.
- **Resultado**: Blindaje total contra errores humanos o sabotajes internos.

### 2.3 Circuit Breakers para Integraciones
- **Acción**: Implementar un monitor de salud para integraciones (Meta, Wompi, SMTP). Si una API externa falla repetidamente, el sistema entra en "Modo Degradado" con aviso al usuario, en lugar de lanzar errores 500.
- **Resultado**: Estabilidad percibida del 99.9%.

---

## Fase 3: Inteligencia y Gobernanza (Medio Plazo)
*Enfoque: Autogestión y Blindaje Proactivo.*

### 3.1 Auditoría de RLS en Tiempo Real
- **Acción**: Implementar logs de acceso denegado por RLS en Supabase para detectar intentos de "data-leakage" o bugs de permisos proactivamente.
- **Resultado**: Seguridad de grado bancario.

### 3.2 Smoke Tests Automatizados de Facturación
- **Acción**: Crear un suite de pruebas que simule un pago de $10 USD y verifique que el balance del Reseller suba exactamente $2.50 USD (según su regla), ejecutándose cada vez que hay un despliegue.
- **Resultado**: Certeza económica absoluta.

---

## 🛠️ Próximos Pasos (Quick Win)
¿Deseas que empiece hoy mismo con la **Fase 1.1 (Unificación de la Biblia)** y **1.2 (Soberanía de Facturación)**? Son cambios de bajo riesgo pero de alto impacto en la salud del producto.
