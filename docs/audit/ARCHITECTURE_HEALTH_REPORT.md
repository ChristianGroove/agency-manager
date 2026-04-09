# Reporte de Salud Arquitectónica Total: Pixy

Este documento proporciona la evaluación final del estado de salud de todo el repositorio Pixy, considerando código, base de datos, infraestructura y herramientas de soporte.

## 1. Puntuación de Salud del Ecosistema (Score Card)

| Criterio | Puntuación (1-10) | Diagnóstico de "Verdad Absoluta" |
|----------|-------------------|-----------------------------------|
| **Estructura de Carpeta Raíz** | **6 / 10** | Saturación de archivos de documentación y scripts sin una jerarquía clara. |
| **Modularidad (Layers)** | **5 / 10** | El `core` está sobrecargado con lógica de producto. Fugas de responsabilidad hacia SQL y Scripts externos. |
| **Nomenclatura (DX)** | **7 / 10** | Muy buena en `features`, pero deficiente en `core` y `scripts/`. Inconsistencia de lenguajes e idiomas. |
| **Gestión de Datos** | **6 / 10** | La lógica está fragmentada entre `actions.ts`, Triggers de Supabase y scripts manuales. Falta de una fuente de verdad única. |
| **Mantenibilidad (Onboarding)** | **5 / 10** | Complejidad alta. Un nuevo desarrollador enfrenta un núcleo de 34 módulos altamente acoplados. |

### Puntuación General del Ecosistema: **5.8 / 10**

*Nota: La puntuación ha bajado respecto al reporte previo (6.6) al incluirse en el análisis los scripts de soporte desordenados y la lógica fragmentada en SQL.*

## 2. Los 3 Riesgos de Mayor Impacto

1.  **Deuda Técnica en el Núcleo (Core Debt)**: El hecho de que piezas de producto como `messaging` vivan en el `core` impide la evolución independiente de la plataforma. Cualquier cambio en el chat puede romper el sistema de organizaciones.
2.  **Scripts de Mantenimiento "Huérfanos"**: La existencia de scripts en `/scripts` que duplican lógica del backend sin validación compartida garantiza la corrupción de datos en operaciones manuales futuras.
3.  **Monolitismo de Base de Datos**: La dependencia de triggers de base de datos "invisibles" para el código de TypeScript crea un sistema frágil donde el flujo de datos es impredecible.

## 3. Hoja de Ruta de Refactorización Recomendada

### Fase A: Limpieza de Superficie (Inmediato)
- Unificar todos los nombres de archivos a `kebab-case`.
- Agrupar la documentación de raíz en `docs/product` y `docs/audit`.
- Eliminar o archivar scripts en `/scripts` que tengan más de 6 meses sin uso.

### Fase B: Centralización de Lógica (Corto Plazo)
- Extraer `revenue` y `payments` de core y moverlos a un módulo funcional de `billing`.
- Implementar una capa de servicios (`xxx-service.ts`) para todas las operaciones de datos, evitando que los Scripts de soporte toquen la base de datos directamente de forma cruda.

### Fase C: Modularización de Motores (Largo Plazo)
- Elevar `messaging` y `automation` a la raíz de `src/modules`.
- Refactorizar el módulo `organizations` para que sea puramente estructural, eliminando dependencias de branding y revenue.

---
### Conclusión del Diagnóstico TOTAL
Pixy es una plataforma potente pero que ha "crecido hacia adentro". La base estructural es sólida (Next.js/Supabase), pero la organización lógica está sufriendo de una implosión hacia el módulo `core`. La migración exitosa ya iniciada en `features/crm` y `features/locations` muestra el camino a seguir: **Extraer, Desacoplar y Estandarizar**.
