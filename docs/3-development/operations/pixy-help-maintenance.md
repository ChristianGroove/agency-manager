# Bot de ayuda Pixy: guía de mantenimiento

Actualización de preflight: usar `reviews/tasks-schema-preflight-reviewed-20261012.json` como snapshot vigente (48 artículos y filtros preservados). Añadida migración `20261012000006_help_function_privileges`, aplicada solo local. El espacio de una tarea se resuelve por su proyecto, no por una columna en `task_items`. Secuencia y diferencias conocidas de la base local en [el runbook de publicación](pixy-help-release-runbook.md); los snapshots mencionados abajo registran etapas anteriores.

Estado vigente: 2026-10-12. Candidato de entrega: `codex/pixyrobotpet-release`, basado en master local `fadd9ed7`, sin los commits de Cartera. El piloto de 3005 ejecuta ahora ESTE candidato, con cuota compartida y guards de Tasks. `pixyrobotpet` se conserva como rama anterior; su helper histórico no arranca el código actual. Punto de entrada para cualquier agente que intervenga el robot, el chat o su biblioteca. Los documentos de fases anteriores son registros históricos; sus cifras y pendientes no describen necesariamente el runtime actual.

## Estado y límites

- Dashboard: robot integrado con branding, hibernación, estados de ayuda y algunas operaciones/alertas; chat con Markdown seguro, historial privado, selector de conversaciones y navegador de preguntas a la derecha.
- Biblioteca V2: 48 guías publicadas, 26 dashboard (6 Tasks) y 22 portal Tasks. Recuperación offline: dashboard anterior 56/56; Tasks dashboard 35/35; portal 46/46 técnicos y 1 política local. Aclaración/abstención se mantienen separadas: 4/5 anterior, 10/10 Tasks dashboard y 12/11 portal. No equivale a exactitud de respuestas reales. Ver [cierre combinado](../../1-product/help-library/reviews/tasks-combined-integration-20261012.md).
- Pilotos locales independientes: dashboard V2 en Pixy y Movilservicios; portal Tasks en Movilservicios, con robot/chat e historial privado. El helper actual `scripts/start-help-local.mjs` configura estos pilotos explícitamente. Las guías del portal no se comparten con el dashboard, que ahora tiene seis guías propias de Tasks, incluidas reuniones. Ver [integración vigente](../../2-architecture/modules/pixy-help-tasks-portal-integration.md). El [plan](../../2-architecture/modules/pixy-help-tasks-portal-plan.md) y la [base inicial](../../2-architecture/modules/pixy-help-tasks-portal-foundation.md) son antecedentes.
- No hay consultas a datos vivos de negocio, acciones ejecutables, streaming, embeddings para esta biblioteca ni resumen automático. Tasks portal y dashboard tienen cuotas compartidas en PostgreSQL; dashboard mantiene 10 consultas/minuto por organización y bloquea si no puede comprobarlas. El bot explica procedimientos; no opera el sistema. Ver [cuota y guards locales](pixy-help-local-hardening-20261012.md).
- Conversación: saludos, agradecimientos, confirmaciones y cierres completos reciben respuestas locales, sin modelo. La cortesía incluida en una consulta técnica no intercepta la consulta. En Tasks, una recomendación genérica usa el último tema del usuario en el historial del servidor, omitiendo cortesías y otras recomendaciones; filtra guías por acceso actual. Sin tema, pregunta qué función interesa. Sin guía verificada, no inventa consejos ni pide un estado/error arbitrario.

## Separación de responsabilidades

Lenguaje público de acceso: los cuerpos destinados al usuario deben decir «autorización para eliminar tareas en grupo», «acceso a costos», etc., sin códigos IAM, `can_*`, claves `module_*` ni capacidades internas. Las claves técnicas se conservan en metadatos de revisión/filtros y notas internas; no se eliminan ni se traducen para autorizar. `library/public-language.ts` traduce los identificadores conocidos al preparar el prompt, responder/persistir y cargar/mostrar mensajes anteriores. Conserva condiciones y negaciones; no declara permisos concedidos. El renderer protege respuestas antiguas sin reescribir la base. Es una barrera de presentación con patrones acotados, no una auditoría de autorización ni un detector universal de secretos. Mantener pruebas cuando se añadan nuevas familias de identificadores.

| Recurso | Responsable y regla |
|---|---|
| `docs/1-product/help-library/drafts/` | Gemini: lectura y contraste de fuentes, artículos, inventario, preguntas, gaps, handoff y propuesta de revisión. No modifica runtime ni publica. |
| `docs/1-product/help-library/reviews/` | Integración: conserva snapshots revisados, incidencias y resultados reales. Nunca atribuir a Codex la revisión editorial realizada por Gemini. |
| `src/modules/features/caa/library/published.json` | Artefacto compilado por el pipeline; no editar a mano ni incorporar borradores automáticamente. |
| Sesión, filtros, motor, UI y pruebas | Codex/agente táctico: verifica contratos, acceso y comportamiento técnico sin repetir la auditoría editorial completa. |
| Navegador y respuestas reales | Usuario: verificación manual. No automatizar el navegador en esta tarea. |

## Mapa de intervención

Rutas relativas al checkout:

| Cambio | Archivos principales |
|---|---|
| Entrada, persistencia y política | `src/modules/features/caa/actions/ask-help-assistant.ts`, `actions/help-history.ts`, `library/response-policy.ts` |
| Corpus y contrato | `library/schema.ts`, `library/runtime.ts`, `library/published.json` |
| Acceso y búsqueda | `library/session.ts`, `library/retrieval.ts`, `library/selection.ts` |
| Prompt, modelo, presupuesto | `src/modules/infrastructure/ai-engine/tasks/registry.ts` (`help-assistant-v2`, `help-select-guides-v1`, legacy `help-assistant`) |
| Diagnóstico | `src/modules/features/caa/library/diagnostics.ts` |
| Chat, formato, historial, barras | `src/modules/features/caa/components/ai-chat-panel.tsx`, `help-message-content.tsx`, `help-history-menu.tsx`, `help-turn-navigator.tsx` |
| Robot y branding | `src/modules/core/pet/config.ts`, `config-actions.ts`, `pet-provider.tsx`, `pet-visual.tsx`, `pet-help-trigger.tsx`, `use-pet-hibernation.ts` |
| Validación/publicación/evaluación | `scripts/help-library.mjs`, `scripts/evaluate-help-retrieval.mjs`, `scripts/tests/help-library-pipeline.mjs` |

`library/` y `actions/` abreviados en las filas del corpus pertenecen a `src/modules/features/caa/`. Los bots de Inbox y otras tareas del motor no se modifican como consecuencia automática de cambios en la ayuda.

## Flujo de una consulta

1. Validar consulta (3–500 caracteres), ruta, historial y UUID de hilo. Resolver usuario autenticado y organización en servidor.
2. Si existe hilo, verificar propietario y tenant y cargar sus mensajes del servidor. No sustituirlos por historial del navegador si la carga falla. El historial del navegador solo sirve como fallback sin hilo persistido.
3. Reservar cuota compartida de 10 solicitudes/minuto por organización mediante el cliente autenticado. Rechazar antes de escribir mensajes o llamar al modelo si está agotada, el acceso no es válido o la comprobación falla. Después persistir la pregunta y aplicar políticas de conversación.
4. V2: resolver membresía, permisos IAM, módulos y vertical. Filtrar guías antes de recuperar contexto. La ruta del navegador no otorga permisos.
5. Buscar léxicamente. Máximo 5 artículos / 16.000 caracteres, sin cortar procedimientos. Solo cuando no se recupera ninguno y existen guías autorizadas, solicitar selección asistida sobre hasta 40 entradas del catálogo; validar hasta 3 IDs y descartar IDs inventados/no autorizados.
6. Generar con guías autorizadas, contexto limitado de sesión y hasta 12 mensajes / 10.000 caracteres con roles. Las dos tareas V2 desactivan caché compartida y el KB legacy. Sin guías relevantes, aclarar sin inventar; solicitudes directas de chistes tienen respuesta breve local sin llamada al modelo.
7. Normalizar el caso acotado de incertidumbre que repite ausencia de documentación, persistir la respuesta y devolverla sin fuentes ni diagnóstico visible. Nunca convertir falta de evidencia en ausencia de capacidad.
8. Diagnóstico opcional: un registro de metadatos por solicitud, sin cuerpos de mensajes, claves, tokens, IDs de usuario/hilo ni errores del proveedor. Un fallo de logging no interrumpe el chat.

La clasificación de conversación es limitada, no un clasificador semántico universal. El control de salida es estrecho: no editar fragmentos arbitrarios de respuestas ni ocultar negaciones verificadas. La cuota del dashboard se comparte entre usuarios, pestañas e instancias; no es un presupuesto monetario ni una cuota diaria.

## Mantenimiento de artículos y publicación

1. Gemini revisa funciones y condiciones reales, redacta por tarea y superficie, conserva `status: draft` y `verification: source-only`, y añade evidencia con archivo/símbolo/afirmación. Las notas internas van en `Notas de verificación`.
2. Mapea filtros reales: audiencia, módulos, permisos canónicos y vertical. Separar tareas si sus condiciones de acceso difieren; por ejemplo, pipeline y reportes CRM. La presencia de un botón o un filtro del menú no demuestra autorización en backend.
3. Actualiza preguntas, inventario, gaps y handoff. Preparar `drafts/publication-review.json`: snapshot COMPLETO de la biblioteca deseada, con identidad de Gemini y SHA-256 UTF-8 de borradores y todas las evidencias. No fabricar revisión recalculando hashes de fuentes que nadie revisó.
   En la entrega desde master, el snapshot vigente es `reviews/tasks-master-release-reviewed-20261012.json`, con `hash_encoding: utf8-lf`. Solo normaliza CRLF a LF; los snapshots históricos conservan su contrato de bytes exactos. Ver [verificación del traslado](../../1-product/help-library/reviews/tasks-master-release-reverification-20261012.md).
4. Integración verifica diferencias/omisiones, contratos, permisos y hashes. Si cambió una fuente durante trabajo concurrente, devolver la incidencia al revisor. Un cambio de saltos de línea también cambia los hashes: no saltarse el control ni inventar equivalencias.
5. Conservar la propuesta aceptada bajo un nombre nuevo en `reviews/`; no sobrescribir snapshots históricos. Ejecutar:

```text
npm run help:validate
npm run help:publish -- docs/1-product/help-library/reviews/<snapshot>.json
node node_modules/tsx/dist/cli.mjs scripts/evaluate-help-retrieval.mjs
node scripts/tests/help-library-pipeline.mjs
node node_modules/vitest/vitest.mjs run src/modules/features/caa/actions/ask-help-assistant.test.ts src/modules/features/caa/library src/modules/features/caa/components --reporter=dot
```

6. Revisar fallos del evaluador: usa perfiles sintéticos permisivos y vertical compatible para medir recuperación; no mide permisos efectivos, texto de respuesta, coste ni latencia. No modificar expectativas solo para obtener aciertos. Los casos `clarify`/`abstain` se evalúan aparte.
7. Compilar y reiniciar el piloto; el corpus se importa durante el build. Validación editorial, publicación, build y activación son pasos distintos. El usuario comprueba el flujo en navegador. Registrar resultado, limitaciones y commit local.

El publicador valida antes de reemplazar el corpus y preserva el anterior si falla. Rechaza IDs duplicados, fuentes modificadas, rutas no comprobadas, evidencia circular/externa, HTML/enlaces sin control y permisos desconocidos. El contrato/ejemplo detallado está en [reviews/README](../../1-product/help-library/reviews/README.md).

## Interruptores y operación local

| Control | Efecto |
|---|---|
| `PIXY_HELP_V2_ENABLED=true` + `PIXY_HELP_V2_TENANTS=<UUIDs>` | V2 solo en tenants listados. Por defecto apagado; `*` amplía explícitamente a todos y no se usa en este piloto. |
| `PIXY_HELP_DIAGNOSTICS_ENABLED=true` | Metadatos `[PixyHelp]` en logs del servidor. Independiente del robot/V2. No es un panel de métricas ni una estimación de tokens/coste. |
| `PIXY_HELP_TASKS_PORTAL_ENABLED=true` + `PIXY_HELP_TASKS_PORTAL_TENANTS=<UUIDs>` | Activa integración del portal para tenants explícitos. Piloto local en Movilservicios; independiente del dashboard. `*` no habilita. Cada operación verifica acceso actual. |
| `platform_settings.pet_config` | Apariencia, audiencia y activación de mascota; independiente de ayuda V2. Gestionado en super admin. |

Entorno actual del candidato:

- Checkout de trabajo: `G:\Pixy\agency-manager\tmp\pet-release`, rama `codex/pixyrobotpet-release`. Root en otra rama de Cartera: no cambiarlo ni incluir sus cambios. `tmp/pet-workspace` conserva el piloto anterior.
- Aplicación: `http://127.0.0.1:3005`; Supabase local: API `55321`, DB `55322`. No usar otro stack ni credenciales/remoto por inferencia. No imprimir `.env`.
- Dependencias propias instaladas con `npm ci`, sin enlaces a `node_modules` del root. No alterar las dependencias compartidas del piloto anterior ni del root.
- Build desde este checkout: `npm run build`.
- Arranque desde este checkout: `node scripts/start-help-local.mjs`. Helper versionado, comprueba Supabase loopback y build existente. Sus UUIDs son del piloto local: no copiarlos a producción sin verificación.
- Antes de reiniciar el candidato actual, comprobar que el propietario de 3005 corresponde exactamente a `...\tmp\pet-release\node_modules\next\dist\bin\next start ... --port 3005`. No detener procesos genéricos Node ni Cartera/3000.
- Migraciones funcionales ejecutadas solo local: `20261011000001_platform_robot_pet.sql`, `20261011000003_help_chat_history.sql`, `20261012000004_tasks_portal_help.sql`, `20261012000005_dashboard_help_quota.sql` y `20261012000006_help_function_privileges.sql`. La inspección posterior detectó que la del portal no está registrada, aunque sus objetos y pruebas SQL están presentes; conciliar historial sin volver a crear tablas. El runbook registra esta diferencia y la colisión local de onboarding/Cartera.

Revisión incremental de Gemini integrada: su snapshot `reviews/tasks-post-security-reviewed-20261012.json` se conserva como antecedente. El vigente es `reviews/tasks-schema-preflight-reviewed-20261012.json`, tras contrastar el diff acotado del helper por Codex; conserva 48 IDs y filtros. Propuesta original, correcciones iniciales y límites en [el cierre post-seguridad](../../1-product/help-library/reviews/tasks-post-security-integration-20261012.md). Nunca refrescar hashes sin revisión: ante cambios futuros, comparar las funciones afectadas y preparar otro snapshot completo.

Apagar V2 restaura el camino legacy, no elimina historial ni configuración del robot. Para revertir contenido, recuperar un `published.json` anterior de Git, compilar y reiniciar; no publicar un manifiesto histórico sobre fuentes actuales distintas. No ejecutar resets globales. Una reversión o despliegue remoto requiere alcance explícito.

## Robot y experiencia

- Global Pixy usa colores configurados; otros tenants usan primario/secundario de branding cuando corresponde. La configuración permite apagado con acceso simple de ayuda como fallback.
- Hibernación configurable: 5 minutos por defecto sin hover/focus/touch sobre el robot; se despierta con esa interacción. El movimiento global del cursor no reinicia el plazo. Respetar movimiento reducido, visibilidad y puntero.
- Un robot grande junto al input del chat; sin header ornamental, miniavatares por mensaje ni tooltip del robot. Barras centradas a la derecha, ola por fotograma con ancho real/extremos redondeados y máximo 23,4 px.
- Markdown seguro: sin HTML, imágenes ni enlaces ejecutables. Las respuestas nuevas no tienen pie de guías; el renderer oculta el pie legacy sin reescribir la base. Evitar frases repetidas sobre documentación.
- Cambios de prompt: modificar solo las tareas de ayuda, mantener anclaje a fuentes y permisos, invalidar versión de caché legacy si corresponde. No cambiar modelos/tier de todo el motor para corregir una respuesta de ayuda.

## Cierre y siguiente intervención

Actualización Tasks: corpus de 48 artículos con superficies aisladas. `reviews/tasks-combined-reviewed-20261012.json` es histórico del piloto; `reviews/tasks-master-release-reviewed-20261012.json` registra el traslado inicial sin Cartera. La base vigente para próximas entregas es `reviews/tasks-schema-preflight-reviewed-20261012.json`. El usuario verifica respuestas reales; los hallazgos restantes de autorización del módulo permanecen como trabajo independiente. Preparar un snapshot nuevo completo, sin ejecutar importadores históricos ni perder filtros o artículos del otro ámbito.

El [cierre inicial del dashboard](../../1-product/help-library/reviews/dashboard-closeout-20261012.md) y el [plan Tasks](../../2-architecture/modules/pixy-help-tasks-portal-plan.md) son antecedentes históricos. Dashboard y portal ya tienen biblioteca e integración en el piloto local. Para preparar una entrega a master, consultar [pendientes de producción](pixy-help-production-readiness.md); el piloto no acredita despliegue remoto ni corrige los gaps del módulo Tasks.
