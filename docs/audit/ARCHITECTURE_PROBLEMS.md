# Diagnóstico de Problemas Arquitectónicos (Verdad Absoluta)

Este reporte identifica las deficiencias estructurales detectadas en la totalidad del proyecto Pixy, abarcando desde la raíz hasta los módulos más profundos.

## 1. Fugas de Responsabilidad (Responsibility Leaks)

### Lógica de Negocio en Scripts de Soporte (/scripts)
Se han detectado scripts como `verify-permissions.ts` y `update_org_vertical.js` que contienen reglas de negocio críticas "hardcodeadas". 
- **Riesgo:** Si las reglas cambian en el código fuente de `src/`, el script de soporte seguirá usando reglas antiguas, generando inconsistencias en la base de datos que son difíciles de detectar.

### Lógica de Negocio en SQL (Supabase Triggers/RPCs)
Aunque es común en Supabase, el uso excesivo de lógica compleja en `migrations/` fragmenta la fuente de verdad.
- **Problema:** La lógica de "Carga de Agente" (`fn_get_next_agent_atomic`) reside en SQL, mientras que la lógica de "Estado de Agente" reside en `src/modules/core/messaging`. Esto dificulta las pruebas unitarias.

## 2. Acoplamiento Vertical Prohibido
- **`core/organizations` -> `revenue`**: El núcleo que gestiona la existencia de una empresa depende de un módulo de facturación de reventa. Esto impide migrar o limpiar la gestión de organizaciones sin arrastrar la lógica financiera.
- **`src` -> `infrastructure`**: Algunos archivos de configuración o utilidades podrían estar asumiendo rutas internas de infraestructura, dificultando el cambio de proveedor de nube.

## 3. Dispersión de la Capa de Datos
Existen tres formas de acceder/modificar datos compitiendo entre sí:
1. **Server Actions (`actions.ts`)**: Acceso directo vía Supabase Server Client.
2. **Services (`xxx-service.ts`)**: Capa intermedia (recomendada pero no universal).
3. **Manual Scripts (`_manual_scripts/`)**: Manipulación directa que bypasses las validaciones de la aplicación.

## 4. Desorden en el Directorio Raíz
El exceso de archivos `.md` en la raíz (11+ archivos de especificación) y archivos de configuración sin agrupar genera una "carga cognitiva" alta para el desarrollador.
- **Sugerencia:** Agrupar documentación de producto en `docs/product` y mantener en raíz solo lo esencial (`README`, `package.json`).

## 5. El Problema del "Directorio Bible"
El directorio `bible` carece de una definición de propósito claro dentro de la estructura estandarizada de un proyecto Next.js, lo cual puede interpretarse como "basura organizacional" o conocimiento no indexado.

---
### Evaluación de Riesgo Estructural
El sistema presenta una **Arquitectura de Capas Permeables**. La lógica fluye entre el código, los scripts y la base de datos sin un contrato estricto, lo que eventualmente llevará a "Silent Data Corruption" si no se centraliza la lógica de negocio en una capa de servicios pura.
