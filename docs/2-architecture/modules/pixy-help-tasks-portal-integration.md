# Ayuda de Tasks: integración y piloto local

Fecha: 2026-10-12. Rama: `pixyrobotpet`. Esta entrega sucede a la [base técnica](pixy-help-tasks-portal-foundation.md) y concreta el [plan](pixy-help-tasks-portal-plan.md). No se ha desplegado ni migrado la base remota. La validación visual y de respuestas reales corresponde al usuario.

## Estado y activación

Biblioteca compilada: 39 artículos, 21 del dashboard y 18 exclusivos de `portal.tasks`. Gemini realizó la revisión editorial `source-only`; Codex adaptó formato, acceso y transporte. Los originales permanecen en `docs/1-product/help-library/portal-preparation/tasks/`. Las copias publicables están en `drafts/articles/`; snapshot completo: `reviews/tasks-portal-reviewed-20261012.json`.

Piloto local: Movilservicios (`91aa45c4-a7c4-4af6-96df-5f0fb1a35af7`), activo, con Tasks y 13 colaboradores activos con portal. El piloto V2 del dashboard tiene targeting independiente a Pixy y Movilservicios. Movilservicios dashboard se añadió después de comprobar consultas en modo legacy; no se abren las guías del portal al dashboard. El helper local ignorado `tmp/start-pet-isolated.cjs`, ejecutado desde el checkout raíz, usa:

```text
node tmp/start-pet-isolated.cjs --help-v2-pilot --movilservicios-help-v2 --help-diagnostics --tasks-portal-pilot
```

Apagar solo el portal: reiniciar sin `--tasks-portal-pilot`. El helper fuerza entonces flag falso y lista vacía. Configuración portable de servidor:

```text
PIXY_HELP_TASKS_PORTAL_ENABLED=true
PIXY_HELP_TASKS_PORTAL_TENANTS=<UUIDs explícitos separados por coma>
```

Ambas condiciones son obligatorias. No se acepta `*`. Las variables son privadas del servidor. El piloto usa Supabase local `127.0.0.1:55321` y Next en `127.0.0.1:3005`; no altera módulos, colaboradores, PIN ni disponibilidad del tenant. Aún no hay un control de activación del portal en Super Admin; allí se reutiliza la configuración existente de apariencia del robot. Apagar la apariencia del pet deja un acceso sencillo de ayuda; apagar el flag elimina toda la integración del portal.

## Flujo y archivos

| Responsabilidad | Archivo bajo `src/modules/features/caa/`, salvo indicación |
|---|---|
| Gate ligero de la página | `library/activation.ts`; página pública Tasks |
| Token, PIN, tenant, módulos y capacidades actuales | `library/tasks-portal-session.ts` |
| Configuración, listado, lectura y consulta | `actions/tasks-portal-help.ts` |
| Historial con propiedad y filtros de guías | `library/portal-history.ts` |
| Transporte reutilizable del chat | `components/help-chat-transport.ts`, `ai-chat-panel.tsx` |
| Robot, modal y binding del token | `components/tasks-portal-help.tsx` |
| Alcance/capacidades antes de recuperar | `library/scope.ts`, `schema.ts`, `retrieval.ts` |
| Prompt separado, mismo motor/proveedor | `src/modules/infrastructure/ai-engine/tasks/registry.ts`: `help-tasks-portal-v1` |
| Persistencia y cuotas transaccionales | `supabase/migrations/20261012000004_tasks_portal_help.sql` |

La página monta el adaptador dinámicamente solo para el tenant habilitado; el portal bloqueado por PIN no lo monta. El bootstrap y cada acción validan acceso en servidor. Se comparte el contexto de roles con Tasks y se reutiliza `resolveCollaboratorCapabilities`, incluidos overrides explícitos. Los identificadores existentes de aplicación pueden ser de texto; no se exige UUID a `active_app_id`.

El cliente solo envía token, pregunta, UUID de solicitud y UUID opcional de conversación. No se acepta tenant, rol, scope, permisos, ruta ni historial aportados por el cliente. Token/PIN/cookie no entran en el prompt. El token actual y enlaces privados Tasks escritos en la pregunta se redactan antes de persistir. Esto no es un filtro universal de secretos introducidos voluntariamente por el usuario.

Antes de persistir, una RPC reserva la consulta y comprueba propiedad/cuotas/concurrencia. Se recupera historia del servidor, limitada a 12 mensajes/10.000 caracteres. Las guías se filtran por superficie, perfil, módulos y todas las capacidades exigidas. Recuperación: hasta 5 guías/16.000 caracteres; selección asistida solo ante recuperación vacía, sobre catálogo autorizado (hasta 40 entradas/3 IDs). La generación usa `help-tasks-portal-v1`, sin KB legacy ni caché compartida, con el proveedor y presupuesto existentes del motor.

El payload de sesión contiene únicamente superficie, perfiles, capacidades, variante y ruta patrón. No hay tareas, proyectos, nombres, correos, adjuntos ni comentarios reales. La ayuda describe procedimientos y no ejecuta acciones. Preguntas explícitas de otros módulos reciben orientación al dashboard; otras preguntas siguen sujetas al corpus y prompt de Tasks. El prompt no sustituye los filtros del servidor.

Se comprueba nuevamente la sesión y el acceso a las guías después del modelo y antes de guardar/devolver la respuesta. Fallos liberan la reserva sin persistir un error del proveedor como respuesta. Markdown, ola de navegación, selector de historia, branding del portal y hibernación reutilizan los componentes existentes. Solo se muestra un robot: flotante con chat cerrado, junto al input con chat abierto. Un fallo del renderizador permite usar el acceso sencillo.

Conversación (ajuste posterior al piloto): los turnos completos de saludo, agradecimiento, aceptación y despedida se reconocen antes de recuperar guías y se guardan como respuestas locales, con las mismas comprobaciones de sesión/cuota. No se interceptan preguntas técnicas que simplemente incluyen «gracias» o «hola». Una recomendación genérica recupera el último tema sustantivo del usuario en el historial del servidor, omitiendo cortesías y recomendaciones anteriores. El prompt recibe ese tema como dato; la generación continúa limitada a guías autorizadas. Si el tema previo era de otro módulo, conserva el límite Tasks. Sin tema pregunta cuál interesa; sin evidencia no inventa recomendaciones ni solicita un estado/error de pantalla por rutina. Esta política usa patrones acotados, no un clasificador semántico universal.

## Historial y control de consumo

- Propietario: organización + `organization_staff.id` estable + superficie `portal.tasks`. Nunca se usa un token como propietario ni se simula un usuario `auth.users`.
- Tablas independientes `help_portal_threads/messages/turns/tenant_limits/staff_limits`, con RLS, sin políticas de lectura del navegador y sin privilegios para `anon`/`authenticated`. Solo `service_role` y las acciones verificadas acceden.
- Lectura/listado/verificación de propiedad en servidor; máximo 200 mensajes por hilo, 50 hilos por colaborador, página de 20 hilos. La reserva necesita espacio para pregunta y respuesta.
- Ventana de actividad de 30 días. Los hilos caducados no se pueden leer, continuar ni recuperar por solicitud duplicada. Su borrado físico es oportunista al reservar una nueva consulta del mismo colaborador; no existe todavía un job de purga. No prometer eliminación física exactamente al día 30.
- Solicitud completa duplicada con el mismo UUID/pregunta devuelve respuesta persistida, sin consumir otra generación/cuota. Cambiar pregunta/hilo con ese UUID se rechaza. El cliente actual genera UUID por envío; no implementa reintentos automáticos.
- Cuotas compartidas en PostgreSQL: 10 consultas/minuto por colaborador, 30/minuto y 300/día UTC por tenant. Reservas admitidas consumen cuota incluso si falla el proveedor. La gobernanza adicional del motor sigue vigente.
- Una consulta activa por colaborador; lease de 5 minutos. La expiración recupera disponibilidad y rechaza respuestas tardías. No cancela por sí misma una llamada ya enviada al proveedor. Los contadores están protegidos por bloqueos transaccionales con orden tenant→staff.
- Cada respuesta conserva IDs de guías usados. Si cambian capacidades/perfiles, las respuestas vinculadas a guías ya inaccesibles se sustituyen al leer y no vuelven al contexto del modelo.

## Verificación y pendientes concretos

Pruebas de código: ayuda, historial, transporte del portal, acceso, filtros y robot; compilación de producción correcta. Pruebas SQL locales con `ROLLBACK`: privilegios/RLS, propiedad entre staff/tenants, concurrencia, idempotencia, cuotas, límite de historial, caducidad y lease. No se probaron concurrencias físicas entre dos conexiones ni respuestas reales del proveedor de forma automatizada.

Dashboard offline: 56/56 aciertos en casos cubiertos. Portal: 70 casos de Gemini, separados en 47 de respuesta, 12 de aclaración y 11 de abstención. Entre los 47: 35 aciertos léxicos, 8 fallos de recuperación, 3 bloqueados por filtros y 1 caso casual de política local. Un acierto no certifica veracidad de la respuesta; aclaraciones/abstenciones requieren prueba del modelo o manual. El evaluador devuelve error cuando hay fallos de recuperación, deliberadamente pendientes.

La guía `technical-capabilities` mezcla VCS, diseño, monitoreo y costos; requiere conservadoramente las cuatro capacidades. Gemini debe dividirla para mejorar cobertura sin abrir contenido de otra capacidad. El caso SUP marcado `all_collaborators` necesita revisar su audiencia, pues la guía de soporte está limitada a la variante de soporte. Los ocho misses están identificados en `reviews/tasks-portal-retrieval-report.json`; Gemini debe ajustar sinónimos/cobertura/verificación, sin manipular expectativas para producir una tasa perfecta.

Los gaps de autorización de acciones existentes documentados por Gemini permanecen fuera de esta integración. Los filtros de ayuda no los corrigen ni autorizan mutaciones. Antes de exposición amplia: revisar esos gaps, terminar cobertura, medir calidad/costo/latencia real, definir purga física y control de activación en Super Admin.

## Mantenimiento siguiente

Usar [guía de mantenimiento](../../3-development/operations/pixy-help-maintenance.md). No rerunear el importador histórico para refrescar hashes: se bloquea si existe su snapshot. Gemini entrega un snapshot nuevo y completo con los artículos deseados, hashes de borradores/evidencias realmente revisadas, perfiles y capacidades. Codex verifica los cambios de contrato/código; un cambio pequeño propio de transporte o activación se revalida como diff, sin atribuir una auditoría editorial nueva.

```text
npm run help:validate
npm run help:publish -- docs/1-product/help-library/reviews/<nuevo-snapshot>.json
node node_modules/tsx/dist/cli.mjs scripts/evaluate-help-retrieval.mjs
node node_modules/tsx/dist/cli.mjs scripts/evaluate-tasks-portal-help.mjs
node scripts/tests/help-library-pipeline.mjs
node node_modules/vitest/vitest.mjs run src/modules/features/caa src/modules/features/tasks/services/portal-role-context.test.ts src/modules/core/pet --no-file-parallelism
```

Recompilar y reiniciar después de cambiar el corpus. Aplicar migraciones únicamente a la base destino acordada; esta entrega solo se aplicó a la local. Las pruebas SQL están en `scripts/tests/tasks-portal-help-local.sql`.

Prueba manual: abrir un portal habitual de Movilservicios en localhost:3005, desbloquear con su PIN si aplica, abrir el robot y preguntar por comentarios, avance y horas. Cerrar/abrir y recargar para comprobar el historial. Pedir información de CRM/facturación para comprobar el alcance. Probar dos colaboradores para confirmar separación, y bloquear el portal para verificar que desaparece la ayuda. Revisar móvil, tema y colores. No compartir enlaces privados ni PIN en los reportes.
