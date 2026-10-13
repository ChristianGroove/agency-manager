# Cierre incremental de biblioteca después de seguridad

Fecha: 2026-10-12. Checkout `tmp/pet-release`, rama `codex/pixyrobotpet-release`. Fuentes runtime revisadas contra `4063682d`; base editorial anterior `tasks-master-release-reviewed-20261012.json`. Integración local únicamente, sin merge/push a master ni cambios en producción.

## Procedencia y contrato

- Gemini entregó exclusivamente 11 archivos de borradores: seis artículos, inventario, preguntas, gaps, handoff y manifiesto completo. Su [handoff](../drafts/handoff.md) registra la comparación incremental de 14 guías con evidencia compartida y los controles añadidos. No cambió runtime, paquetes ni migraciones.
- Propuesta original conservada sin modificación en [tasks-post-security-gemini-20261012.json](tasks-post-security-gemini-20261012.json). Los 48 hashes de borrador y todas las evidencias coincidían con el checkout bajo `utf8-lf`; 17 artículos tienen borrador o evidencia distintos de la base.
- Codex preservó los 48 IDs y verificó igualdad de filtros de módulos, permisos, verticales, perfiles, capacidades y enlaces. No amplió acceso para lograr resultados de recuperación.
- Corrección táctica de seis cuerpos: lenguaje público sin nuevos nombres de helpers, claves de permisos o detalles de PostgreSQL; cuota consumida antes de persistir, cortesía local circunscrita a V2, ventana de un minuto sin llamarla móvil, distinción entre autorización explícita de lote y liderazgo asignado. Una selección inicial inaccesible se rechaza antes de borrar; un fallo posterior entre lotes puede dejar cambios parciales. Calendar y tarea deben comprobarse por separado ante fallos.
- Los 17 borradores revalidados apuntan a la revisión de fuentes actual. Metadatos y notas internas conservan información técnica. Revisión aceptada completa: [tasks-post-security-reviewed-20261012.json](tasks-post-security-reviewed-20261012.json); autoría editorial de Gemini, correcciones acotadas de integración de Codex. No se atribuye navegación manual a ningún agente.
- `published.json` se generó exclusivamente con `help:publish` sobre la revisión aceptada. Revisión del corpus: `cbcc2331e83a2c7ee16417a8f5ecca8ca6e688456c005e1484d0dc54017187a7`, 26 artículos dashboard y 22 portal Tasks.

## Verificación actual

- `help:validate` y publicación: 65 preguntas válidas, 48 artículos, evidencia/hash/enlaces comprobados. Pipeline sintético correcto: rechaza modificaciones no revisadas y preserva corpus ante fallos; portabilidad LF/CRLF explícita y separación de superficies.
- Recuperación offline: dashboard 56/56, Tasks dashboard 35/35 más cinco controles de filtro de gestión, portal 46/46 técnicos y un caso de política local. Los casos de aclaración/abstención siguen separados. No certifica texto generado, coste, latencia ni permisos reales por esos porcentajes.
- Regresión actual: 453 pruebas correctas en 37 archivos, robot/CAA/Tasks y motor (gobernanza/proveedor simulado). Avisos React `act` preexistentes; ninguna prueba visual ni llamadas pagadas al modelo. La regresión anterior de 455/38 incluyó además logging; no se volvió a ejecutar ni se suma a este total.
- Build estándar `npm run build` completo con exit 0, incluida comprobación TypeScript. No hubo cambios en código de autorización ni SQL en esta entrega, por lo que no se repitieron las pruebas de base ni se aplicó otra migración.
- Servidor anterior de 3005 identificado por ruta exacta y reiniciado con este build; login público comprobado por HTTP HEAD con respuesta 200. No se inspeccionó el chat mediante navegador automatizado.
- La compilación y las pruebas requirieron ejecución fuera del sandbox por restricciones de resolución de rutas de Windows. No se usaron mocks de fuentes, caché de otro checkout ni dependencias del root para el build.

## Aceptación y salida

Localhost usa el helper versionado `scripts/start-help-local.mjs` en puerto 3005, dashboard Pixy/Movilservicios y portal Movilservicios. El usuario comprueba navegador/respuestas reales. Probar cuota compartida, historial privado, PIN/perfiles, límites de gestión, tema/branding e hibernación con tareas desechables; no borrar tareas reales como comprobación.

Pendiente antes de producción: aceptar el candidato local, confirmar destino y respaldo, revisar historial SQL real (incluidos los dos commits de onboarding de master local aún ausentes del remoto), definir flags/tenants de producción y autorizar integración/publicación. Otros gaps de Tasks y CRM, retención física periódica y limpieza del código flotante antiguo siguen fuera de este cierre. Ver [preparación de publicación](../../../3-development/operations/pixy-help-production-readiness.md).
