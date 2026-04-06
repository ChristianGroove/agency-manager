# Análisis del Módulo "Core"

Este documento evalúa los 37 submódulos clasificados actualmente bajo `src/modules/core/` para determinar su pertinencia como infraestructura base o su potencial migración a dominios funcionales (Features).

---

## 1. Clasificación por Naturaleza

### Infraestructura Real (Base del SaaS)
Módulos esenciales para la existencia del sistema independientemente del negocio.
- **Identidad**: `auth`, `iam`, `organizations`, `profiles`.
- **SaaS Engine**: `saas`, `apps`, `branding`, `usage`, `preferences`.
- **Utilidades Globales**: `audit`, `backup`, `logging`, `storage`, `settings`, `layout`.

### Dominios del "Motor" Transversal
Funcionalidades que, aunque son complejas, se consideran base para cualquier instancia de Agency Manager.
- **Comunicación**: `messaging`, `broadcasts`, `channels`, `notifications`.
- **Automatización**: `automation`, `lifecycle`.
- **IA**: `ai`, `ai-engine`, `knowledge`.
- **Finanzas**: `payments`, `revenue`.

### Módulos Candidatos a Reubicación (Features)
Módulos que contienen lógica de negocio que podría considerarse una "Feature" conectable.
- **`clients`**: Actualmente vacío (migrado a `features/crm`). Debería eliminarse de `core`.
- **`locations`**: Gestión de sedes físicas. Podría ser un plugin vertical.
- **`marketing`**: Herramientas de captación. Más afín a una feature de ventas.
- **`trash`**: Lógica de papelera de reciclaje. Podría ser un `hook` global en lugar de un módulo completo.
- **`caa`**: (Consolidación de Agentes y Automatización). Lógica específica de optimización de agentes.

---

## 2. Hallazgos Críticos

1. **Inflación del Core**: 37 módulos en el nivel `core` crean una barrera de entrada alta para nuevos desarrolladores y aumentan el tiempo de compilación de pruebas globales.
2. **Duplicidad de Conceptos**: La existencia de `clients` (en core) y `crm` (en features) genera confusión. La migración hacia un modelo unificado en `features/crm` es el camino correcto para limpiar el `core`.
3.  **Saneamiento de "God Components"**: Se ha demostrado con éxito la fragmentación de archivos masivos en `messaging` y `crm` hacia una arquitectura de 3 capas. Este patrón debe ser el estándar para futuras intervenciones en otros módulos inflados.

---

## 3. Estrategia Recomendada de Reorganización

1. **Limpieza de Residuos**: Eliminar submódulos vacíos en `core`.
2. **Promoción a Features**: Mover `marketing`, `locations` y `ai-engine` (como lógica de negocio) a la capa de `features`.
3. **Consolidación de Infraestructura**: Agrupar utilidades pequeñas (`logging`, `audit`, `backup`) bajo un único módulo de `system` o `infra` para reducir el ruido en la raíz.
4. **Defensa del Core**: Establecer una política estricta de que el `core` solo puede crecer si la funcionalidad es requerida por **al menos 3 features diferentes** de forma simultánea.
