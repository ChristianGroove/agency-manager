# Publicación del robot y ayuda Pixy

Preparación: 2026-10-12. Candidato: `codex/pixyrobotpet-release`, checkout `G:\Pixy\agency-manager\tmp\pet-release`; base master local `fadd9ed7`. El usuario confirmó que producción es **pixy CRM Backend** en Coolify, `https://app.pixy.com.co`, con despliegue automático al actualizar master. No se ha actualizado master, hecho push, aplicado SQL remoto ni inspeccionado la configuración real del contenedor.

## Puertas antes de publicar

1. Aceptar el candidato actualizado en localhost:3005. El usuario hace navegador y respuestas reales; los resultados offline no sustituyen esta aceptación.
2. Ejecutar [consulta de esquema](../../../scripts/migrations/check-pixy-help-release.sql) en el SQL Editor del proyecto Supabase que usa ese backend. Es `BEGIN READ ONLY` con `ROLLBACK`, consulta catálogos y versiones, sin preguntas, mensajes, tokens ni filas de negocio. Confirmar la identidad del proyecto desde Coolify; el enlace CLI histórico «Pixy control» del root no prueba que sea el destino actual.
3. Comparar versiones **y nombres**, además de objetos/privilegios presentes. Registrar respaldo/restauración disponible y el commit/artefacto de aplicación anterior. Una versión registrada no demuestra que se aplicó este archivo.
4. Preparar configuración con robot y V2/portal inicialmente apagados. Aplicar las migraciones pendientes aprobadas y comprobar otra vez el esquema **antes** de actualizar master: la nueva cuota también afecta legacy. Una migración ausente puede dejar la ayuda indisponible aunque V2 esté apagado.
5. Confirmar que la entrega incluye los dos commits de onboarding de master local aún ausentes del remoto y su migración. Resolver cualquier colisión real de versión en el destino; no borrar ni sobrescribir registros existentes para hacer coincidir el listado.

Si falta información del destino, mantener el candidato local. El acceso a producción no se deduce de `.env.local`, del backup antiguo ni de otro worktree.

## Migraciones de esta entrega y su base

| Versión / nombre | Dependencia y comprobación |
|---|---|
| `20261011000000_atomic_tenant_provisioning` | Base de onboarding de master local. Requiere su baseline; comprobar tabla `tenant_provisioning_requests` y función `provision_tenant_atomic`, además del historial. |
| `20261011000001_platform_robot_pet` | Columna JSONB `platform_settings.pet_config`; deshabilitado por defecto para instalaciones nuevas. |
| `20261011000003_help_chat_history` | Dos tablas dashboard con RLS, políticas de usuario/organización y trigger de límite de mensajes. |
| `20261012000004_tasks_portal_help` | Cinco tablas separadas del portal con RLS, sin acceso anon/authenticated; RPCs begin/finish solo service_role. |
| `20261012000005_dashboard_help_quota` | Depende del historial y su predicado de acceso. Contador sin acceso anon/authenticated, service_role solo lectura; RPC quota solo authenticated. |
| `20261012000006_help_function_privileges` | Depende del historial. Predicado `can_access_help_tenant` solo authenticated; función de trigger sin EXECUTE directo para anon/authenticated/service_role. |

Aplicar una sola vez mediante el mecanismo controlado del destino, en orden de dependencia, revisando también las migraciones previas necesarias para onboarding/Tasks. No ejecutar todas las migraciones pendientes de todas las ramas, seeds locales, resets ni scripts antiguos de voz/Meta como procedimiento de esta entrega.

Lectura del informe: todos los `baseline_columns.present` deben ser true. Todas las tablas de ayuda deben existir y tener RLS. Dashboard permite SELECT/INSERT autenticado con exactamente las políticas revisadas, sin UPDATE/DELETE; portal y contador de quota no permiten lectura/escritura autenticada ni anónima. Comparar las definiciones de las cuatro políticas dashboard con la migración, no solo su cantidad. Revisar los EXECUTE según la tabla anterior. El SQL termina correctamente aun cuando muestra false: **exit 0 acredita ejecución de la consulta, no aprobación del entorno**. Esta consulta no certifica todos los tipos, constraints, índices, funciones de onboarding ni la semántica completa de las RPCs; requiere contraste con las migraciones y pruebas del destino.

## Configuración y despliegue

- En Coolify: `PIXY_HELP_V2_ENABLED=false`, `PIXY_HELP_TASKS_PORTAL_ENABLED=false`, listas de tenants sin wildcard; mantener inicialmente `PIXY_HELP_DIAGNOSTICS_ENABLED=false` o activarlo solo para diagnóstico de metadatos. No imprimir valores de claves del proveedor ni copiar UUIDs del helper local por suposición.
- Confirmar PIN/session signing, proveedor, presupuesto y estado de IA del tenant con sus mecanismos existentes. No crear ni reactivar tenants como parte del despliegue.
- Revisar diff final y SHA remota antes de integrar. Referencia de master comprobada en este cierre: `b0f3cf9e48edb83894822ea9c3bbcfb3ffc35840`. Si cambia, incorporar/revisar la nueva base y verificar de nuevo lo afectado. No trasladar la rama antigua `pixyrobotpet`: contiene Cartera.
- Después de aceptar SQL, respaldo y alcance, integrar el candidato en master preservando su checkout y cambios ajenos. Publicar master es la acción que dispara Coolify; requiere autorización explícita para ese despliegue concreto. No se ejecuta un push preliminar a master como ensayo.
- Esperar build/deploy correcto y comprobar login, acceso simple a ayuda y errores de servidor. Activar dashboard V2 solo en tenants de producción verificados; configurar mascota en super admin. Portal se activa por separado tras aceptar PIN/perfiles/ámbito. Cambios de variables pueden requerir redeploy en Coolify.

## Aceptación y reversión

Comprobar manualmente: historial privado al cerrar/recargar y cambiar de usuario/tenant, Tasks y reuniones en dashboard, portal limitado a Tasks, saludo/cierre natural, cuenta con PIN bloqueado/desbloqueado, roles y gestión de tareas desechables, cuota compartida, marca/tema, hibernación y apagado con acceso simple. Observar errores, coste y latencia reales antes de ampliar tenants.

Para una incidencia visual, apagar mascota. Para una incidencia V2, evaluar fallback legacy; la cuota compartida permanece activa. Para una incidencia del portal, apagar su flag. Conservar artefacto/commit anterior para revertir aplicación si corresponde; no borrar historiales, contadores ni tablas como primera reversión. Apagar el bot no revierte ni corrige la autorización del módulo Tasks.

## Evidencia local y diferencias conocidas

- Corrección táctica `ee0caedd`: `task_items` no tiene `workspace_id`; el helper ahora resuelve el espacio por `task_projects.workspace_id` y repite filtro por proyectos autorizados en escrituras. No se añadió una columna artificial. Pruebas detectan consultas/filtros sobre esa columna inexistente; liderazgo sin proyecto autorizado se deniega.
- 77 pruebas focales correctas (Tasks y acciones de ayuda). Migración de privilegios aplicada y registrada únicamente en Supabase local 55322. SQL de historial, portal y quota pasa con fixtures revertidos; el trigger sigue funcionando con sesiones autenticadas.
- Build estándar actualizado completo con exit 0, incluida comprobación TypeScript; 15 pruebas de onboarding correctas en PGlite efímero, sin ejecutar onboarding contra la base local compartida. Localhost reiniciado desde este checkout. No se automatizó navegador ni se llamó al proveedor de IA.
- Local tiene `20261011000000` registrado como **cartera_module_core**, no onboarding: faltan sus objetos. Se preservó sin alteración porque esa base es compartida con Cartera. Portal está operativo y probado pero `20261012000004` no aparece registrado; no reaplicar el archivo que crearía tablas existentes. Conciliar por contraste real de esquema y procedencia como intervención separada. Estas diferencias no describen producción ni permiten afirmar aceptación completa de onboarding local.
- Corpus vigente: 48 artículos, revisión `8bf83e3f9b3431b635e0856f59e3e5baafc5ff5e866005120e0dbeab16897fae`. Recuperación 56/56 dashboard, 35/35 Tasks dashboard, 46/46 técnicos portal y una cortesía local; filtros preservados. Cuatro vínculos de evidencia actualizados por Codex tras revisar su propio diff acotado, manteniendo autoría editorial de Gemini y snapshots anteriores. Base para próximas revisiones: `reviews/tasks-schema-preflight-reviewed-20261012.json`.

Quedan fuera: auditoría de otras mutaciones de Tasks/CRM, purga física periódica, retención dashboard y limpieza de desarrollos flotantes antiguos. Ver [mantenimiento](pixy-help-maintenance.md) y [antecedentes de preparación](pixy-help-production-readiness.md).
