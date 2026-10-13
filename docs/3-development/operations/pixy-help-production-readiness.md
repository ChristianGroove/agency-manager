# Preparación de publicación de la ayuda Pixy

Inspección: 2026-10-12. Candidato inspeccionado: `pixyrobotpet` en `751aa83b`. Este documento registra pendientes; no autoriza ni acredita merge, push, despliegue o cambios en la base remota.

Actualización de separación: existe el candidato `codex/pixyrobotpet-release` en `tmp/pet-release`, basado en master local `fadd9ed7` y con los 30 commits de ayuda trasladados. El diff contra master excluye Cartera y no tiene colisiones de versiones SQL. Dependencias instaladas con `npm ci` en un directorio propio; 207 pruebas en 27 archivos correctas, corpus de 48 artículos idéntico tras publicación portable y build estándar completo con exit 0. Ver [verificación acotada y snapshot vigente](../../1-product/help-library/reviews/tasks-master-release-reverification-20261012.md). El detalle inicial de la mezcla siguiente corresponde a la rama del piloto preservada.

Actualización posterior: cuota compartida y cinco guards de mutación implementados y probados SOLO local. Regresión final: 455 pruebas/38 archivos y prueba de 20 sesiones PostgreSQL con 10 permitidas/10 limitadas. El usuario eligió localhost para aceptación. La intervención cambia evidencias de 14 guías: mantener el corpus publicado y esperar [revisión incremental de Gemini](gemini-help-post-security-review-brief.md) antes de aprobar una nueva publicación. Ver [reporte táctico local](pixy-help-local-hardening-20261012.md).

## Estado y alcance de Git

- Referencia remota `master`, comprobada con `git ls-remote`: `b0f3cf9e48edb83894822ea9c3bbcfb3ffc35840`.
- `master` local: `fadd9ed7`, con dos commits de onboarding todavía ausentes del remoto. Tiene su propio worktree; no cambiarlo ni descartarlo para preparar esta entrega.
- `pixyrobotpet` contiene 35 commits sobre el remoto: cinco de Cartera y 30 posteriores de robot/ayuda. El corte de la funcionalidad de ayuda es `4d94f323..751aa83b`; comienza en `4f7e5494`.
- Una fusión completa también entregaría Cartera, sus datos de prueba/documentación y migraciones. Preparar un candidato separado desde la base de master aprobada, trasladando únicamente los 30 commits de ayuda. Comprobar el diff resultante y repetir la validación sobre ese candidato.
- Entre los cambios de ayuda y los dos commits locales de master se solapan `package.json` y `package-lock.json`; preservar ambas entregas. La comprobación de rutas no demuestra que un cherry-pick vaya a completarse sin conflictos.

## Puertas de publicación pendientes

| Puerta | Evidencia y trabajo necesario |
|---|---|
| Alcance exclusivo de ayuda | Resuelto localmente en `codex/pixyrobotpet-release`; el candidato conserva onboarding de master y excluye los cinco commits de Cartera. Merge/publicación pendientes. |
| Migraciones sin colisiones | Resuelto dentro del candidato, sin renombrar migraciones ni alterar el historial de la base local. Aún se debe comprobar el historial real y compatibilidad de producción antes de aplicar. La rama del piloto conserva las colisiones históricas con Cartera. |
| Dependencias y build portables | Resuelto: `npm ci` en directorio propio, manifiesto/lock coherentes, 207 pruebas correctas, publicación idéntica con hashes LF explícitos y build estándar completo correcto. Falta aceptación manual del candidato en el entorno de revisión. |
| Base y entorno de destino | Confirmar aplicación, repositorio/rama de despliegue, base Supabase y estado de migraciones. La documentación existente refiere producción en Coolify; no se ha inspeccionado su configuración actual. No inferir despliegue por la presencia de `vercel.json`. |
| Control de consumo del dashboard | Resuelto en candidato/local: PostgreSQL 10 consultas/minuto por organización, RPC autenticado, sin acceso directo a contadores, con prueba real de concurrencia y rechazo si no puede comprobarse. Aplicar migración de cuota en el destino antes del código, también si V2 se deja apagado. |
| Seguridad de Tasks antes de ampliar el portal | Corregidas prioridad, reasignación, borrado unitario/masivo del portal y borrado masivo del dashboard. Probados roles/PIN/tenant/módulo y ámbito por proyecto/espacio. Otros gaps/acciones del módulo no quedan certificados por esta corrección. Pendientes aceptación manual y revalidación de guías. |
| Aceptación del candidato desplegado | Pruebas manuales del usuario con usuarios/tenants distintos, PIN, revocación, historial privado, tema, branding, hibernación y apagado. Verificar respuestas reales, errores del proveedor, coste y latencia; los hits offline no miden estos aspectos. |

Comprobación táctica acotada de los gaps de Tasks: `portalUpdateTaskPriority` y `portalAssignTask` validan token activo/organización y escriben con `supabaseAdmin`, sin comprobar rol ni desbloqueo PIN dentro de esas funciones. `deleteTasks` resuelve organización y borra con `supabaseAdmin`, sin comprobar `operations.tasks.manage`. No se ejecutaron mutaciones para demostrar explotación. Ver los informes de Gemini en `dashboard-preparation/tasks/gaps.md` y `portal-preparation/tasks/gaps.md`.

## Base de datos y configuración

Las cuatro migraciones funcionales nuevas contra master local, aplicadas únicamente en local, son:

1. `20261011000001_platform_robot_pet.sql`: columna de configuración visual; robot deshabilitado por defecto.
2. `20261011000003_help_chat_history.sql`: historial autenticado, RLS por usuario/organización y límite de 200 mensajes por conversación.
3. `20261012000004_tasks_portal_help.sql`: historial separado por colaborador, RPCs restringidos a `service_role`, cuotas e idempotencia.
4. `20261012000005_dashboard_help_quota.sql`: cuota compartida del dashboard, RPC exclusivo de sesiones autenticadas; ausencia/fallo bloquea llamadas a IA también en legacy.

Las migraciones de historial/cuotas crean tablas/funciones/políticas sin `IF NOT EXISTS`: ejecutar mediante un historial de migraciones controlado, una sola vez, tras comprobar compatibilidad y respaldo del destino. Validar RLS y privilegios después de aplicar. No usar un comando que aplique indistintamente todas las migraciones de esta rama, ni scripts de seed/activación local. Además, master local contiene dos commits de onboarding aún ausentes del remoto, con `20261011000000_atomic_tenant_provisioning.sql`: verificar también su estado en producción y el alcance aprobado de esa base; no asumir que ya está desplegada por estar en master local.

| Control de servidor | Publicación inicial recomendada |
|---|---|
| `PIXY_HELP_V2_ENABLED` + `PIXY_HELP_V2_TENANTS` | Activar solo para UUIDs verificados en producción, después de las migraciones y validación. No copiar UUIDs locales por suposición ni usar `*` para el primer piloto. |
| `PIXY_HELP_TASKS_PORTAL_ENABLED` + `PIXY_HELP_TASKS_PORTAL_TENANTS` | Mantener apagado hasta aceptar revisión del portal; luego permitir tenants explícitos. No admite wildcard. |
| `PIXY_HELP_DIAGNOSTICS_ENABLED` | Diagnóstico de metadatos del servidor; complementar con medición de coste, latencia y errores del motor existente. |
| `platform_settings.pet_config` | Configurar en super admin, seleccionar la organización Pixy real y habilitar audiencia deseada. Valores locales no son una migración de configuración de producción. |

Confirmar disponibilidad del proveedor, presupuesto y modo de IA de cada tenant sin imprimir claves. Mantener diagnóstico libre de preguntas, respuestas, tokens y PIN.

## Secuencia propuesta

1. Preparar el candidato exclusivo de ayuda sobre la base acordada de master y resolver versiones de migraciones y cuotas del dashboard.
2. Instalar dependencias limpiamente y validar corpus, filtros, historial, robot, motor y SQL. Repetir build sobre ese candidato, sin depender del helper local ignorado.
3. Comprobar destino y respaldo; aplicar solo las migraciones aprobadas, con robot y flags inicialmente apagados.
4. Desplegar el candidato en un entorno de revisión con configuración representativa. El usuario realiza las pruebas en navegador.
5. Tras aceptar esa revisión, integrar/publicar y activar primero los tenants explícitos del dashboard. Activar el portal por separado después de resolver sus controles pendientes y aceptar su matriz manual.
6. Observar consumo, tiempos, rechazos y errores antes de ampliar audiencia.

Una publicación inicial del dashboard con el portal apagado permite separar las dos aceptaciones. Los hallazgos preexistentes de Tasks permanecen como trabajo de seguridad pendiente; apagar su bot no corrige el módulo.

## Reversión y pendientes posteriores

- Apagar el robot en super admin mantiene un acceso simple de ayuda. Apagar V2 vuelve al camino legacy; evaluar si ese fallback satisface la incidencia antes de usarlo como reversión.
- Apagar los flags del portal retira su ayuda. Los cambios de variables de servidor requieren recarga o despliegue conforme al hosting; no prometer un toggle instantáneo desde super admin.
- Conservar el commit/artefacto previo de aplicación para revertir código. Las migraciones son aditivas: conservar tablas y datos; no borrar historiales ni revertir SQL destructivamente como primer recurso.
- Trabajo posterior: purga periódica física del historial expirado del portal, política de retención del dashboard, mejoras de cobertura y eliminación revisada de los desarrollos flotantes antiguos. La purga actual del portal es diferida y ocurre con nuevas reservas del mismo colaborador.

Validaciones locales ya registradas: corpus de 48 artículos, evaluación offline dashboard 56/56, Tasks dashboard 35/35 y portal 46/46 casos técnicos recuperables; 128 pruebas CAA en el último cierre, pruebas previas de robot/motor/SQL y build de producción local correcto. Consultar `reviews/tasks-combined-integration-20261012.md`. Estos resultados pertenecen a la rama local, no al futuro candidato integrado ni a producción.
