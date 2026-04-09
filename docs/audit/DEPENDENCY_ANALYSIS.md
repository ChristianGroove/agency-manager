# Análisis de Dependencias Reales y Acoplamiento (Pixy)

Este reporte detalla las conexiones técnicas entre todos los componentes del sistema, incluyendo capas que no pertenecen al código fuente.

## 1. El Grafo de Dependencia de la Plataforma
El flujo de datos real del sistema no es lineal, sino que tiene un punto de gravedad central en la base de datos y el módulo core:

`Infraestructura (Vercel/Docker)` -> `Código (App Router)` -> `Lógica (Modules)` -> `Persistencia (Supabase SQL/RLS)`.

## 2. Acoplamiento de Scripts y Mantenimiento
- **Scripts -> DB**: El 100% de los scripts en `/scripts` dependen de la estructura de la base de datos definida en `supabase/migrations/`. 
- **Problema Detectado:** No existe una capa de tipado compartido potente entre los scripts JS/TS de soporte y las definiciones de Drizzle o Types en `src/`. Esto significa que un cambio en una columna puede romper los scripts de mantenimiento silenciosamente.

## 3. Matriz de Acoplamiento de Módulos (Core Impact)

| Módulo A | Módulo B | Tipo de Conexión | Nivel de Riesgo |
|----------|----------|------------------|-----------------|
| `organizations` | `revenue` | Importación directa en `actions.ts`. | **ALTO** (Violación de dominio) |
| `messaging` | `ai-engine` | Llamada dinámica a servicio de IA. | **BAJO** (Dependencia funcional) |
| `automation` | `organizations` | Validación de ID de organización. | **BAJO** (Estructural) |
| `saas` | `usage` | Consulta de límites de módulos. | **BAJO** (Arquitectónico) |
| `core/tools` | `branding` | Generación de contratos con logos. | **MEDIO** (Debería ser un feature) |

## 4. Dependencias Ocultas (The SQL Factor)
- **Supabase Triggers**: Existen dependencias donde el código en `src/` asume que al insertar una fila en la tabla A, la tabla B se actualizará automáticamente por un disparador de base de datos.
- **Riesgo:** Estas dependencias no son visibles en las importaciones de TypeScript, creando "Magia Negra" arquitectónica que dificulta el rastreo de errores en el flujo de datos.

## 5. Dependencias de Terceros Críticas
El proyecto depende críticamente de:
1. **Supabase SDK**: Acoplamiento total en la capa de datos.
2. **Inngest**: Dependencia total para la lógica asíncrona y automatización.
3. **Meta Graph API**: El 90% del módulo de `messaging` está diseñado específicamente para los contratos de Meta.

---
### Recomendaciones para el Desacoplamiento TOTAL:
1.  **Shared Types SDK**: Crear un paquete o carpeta interna que comparta tipos entre `src/` y `scripts/` para evitar que los scripts de soporte mueran tras una migración.
2.  **Abstracción de Revenue**: El módulo `organizations` no debería conocer a `revenue`. Debería emitir un evento "OrganizationCreated" y que `revenue` se suscriba de forma independiente.
3.  **Documentación de Triggers**: Documentar explícitamente en el código de `src` cuándo una acción depende de un disparador de base de datos oculto.
