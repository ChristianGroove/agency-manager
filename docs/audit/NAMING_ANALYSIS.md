# Auditoría de Nomenclatura TOTAL (Pixy)

Este documento analiza la consistencia semántica y sintáctica de todos los identificadores del proyecto, desde carpetas hasta scripts de soporte.

## 1. Archivos de Raíz
Existe una mezcla de mayúsculas (Screaming Snake Case) y minúsculas en los archivos Markdown de la raíz.
- **Ejemplo inconsistente:** `AI_COMPLIANCE_AUDIT.md` vs `next.config.ts`.
- **Análisis:** Los archivos de documentación en raíz usan un estilo de "Grito" (ALL CAPS) que choca con la elegancia técnica del resto del proyecto. Se recomienda `ai-compliance-audit.md`.

## 2. Scripts de Soporte (/scripts)
Es la zona de mayor inconsistencia.
- **Mezcla de idiomas:** `update_org_vertical.js` (Inglés) vs `verify_http_endpoint.ts` vs (posibles futuros scripts en español detectados en otros módulos).
- **Mezcla de separadores:** `cleanup-workspace.ts` (kebab) vs `test_insert.js` (snake_case).
- **Extensiones:** Coexistencia de `.ts` y `.js` sin un plan claro de migración a TypeScript exclusivo para herramientas de soporte.

## 3. Base de Datos (/supabase/_manual_scripts)
- Se detectan scripts con nombres descriptivos pero inconsistentes: `perf/create_indexes.sql` vs `test_rpc.js`.

## 4. Módulos Internos (/src/modules)
- **Feature Layer:** Casi 100% consistente en kebab-case y prefijos (ej. `crm-actions.ts`).
- **Core Layer:** Persisten los nombres genéricos (`actions.ts`, `service.ts`) que causan confusión en el desarrollo diario al no ser auto-descriptivos.

## 5. Nomenclatura de Carpetas Técnicas
- **`.agent`**: Uso de prefijo punto para carpetas ocultas/herramientas, correcto.
- **`bible`**: Nombre poco profesional y ambiguo. Se sugiere `references` o `static-docs`.

---
### Conclusiones de Nomenclatura
El proyecto tiene una "Cara Limpia" en `src/modules/features`, pero una "Caja de Herramientas Desordenada" en `scripts/` y `core/`. El uso de `snake_case` en scripts y `kebab-case` en código crea una fricción innecesaria. Se recomienda unificar todo el repositorio bajo **kebab-case**.
