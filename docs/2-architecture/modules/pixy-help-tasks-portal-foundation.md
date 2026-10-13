# Base técnica del portal Tasks — primera entrega

Documento histórico de la primera entrega. El estado actual, piloto local, historial y cuotas están en [integración de Tasks](pixy-help-tasks-portal-integration.md).

Fecha: 2026-10-12. Implementada en `pixyrobotpet`. El robot/chat todavía NO está montado ni activado en el portal. No hay endpoint de generación, migración de historial ni cuotas compartidas en esta entrega.

## Entregado

- Contrato `surface`: `dashboard` o `portal.tasks`. Artículos antiguos y acceso sin superficie explícita se consideran dashboard. `canReadArticle` compara superficie antes de permisos/módulos/relevancia; un administrador del dashboard tampoco recibe guías de portal desde el acceso del dashboard.
- Audiencia nueva `portal-collaborator`, exclusiva de `portal.tasks`; módulo editorial `tasks`; rutas únicamente con patrón `/portal/tasks/[token]`. Publicación exige `module_tasks`, perfiles explícitos `collaborator|qa|lead|support`, sin permisos IAM del dashboard ni enlace concreto con token. El perfil es un filtro OR de lectura de guía, no permiso para ejecutar acciones.
- Publicador valida el patrón contra `(public)` y conserva los campos revisados. Los artículos preparatorios de Gemini siguen fuera del publicador: hace falta integrar su matriz, adaptar el contenido al contrato y revisar filtros antes de moverlos a `drafts/`.
- Resolver server-only `library/tasks-portal-session.ts`: comprueba flag, formato de token (16–200 caracteres alfanuméricos/guion/underscore), colaborador activo, tenant derivado del registro, PIN/cookie cuando existe, tenant activo, gobernanza IA, módulo Tasks y contexto de perfil verificado. Devuelve `null` ante fallos; no acepta tenant/rol/scope del navegador.
- El resolver devuelve una identidad interna tenant/staff y un acceso acotado a `module_tasks`, sin permisos administrativos. No devuelve token, PIN, nombres, emails, comentarios, tareas ni branding. La ruta de contexto es el patrón, sin secreto. Si no puede comprobar la vertical, usa `unknown` y no concede guías restringidas a verticales.
- Contexto de perfiles compartido en `tasks/services/portal-role-context.ts`, usado también por el portal existente. Mantiene sus reglas de UI: rol visible o liderazgo de workspace/proyecto, QA, variante de soporte y override de borrado masivo. Las dos consultas de liderazgo siguen acotadas por tenant/staff; el bot requiere resultados verificados. No se reescribieron políticas de mutación de Tasks.
- Interceptor de Supabase omite query strings y detalles reflejados de errores en consultas que contienen `access_token` o `pin_code`, incluidos fallos de red/consultas lentas. Conserva fallo original para el código llamante; no cambia datos ni permisos.

## Activación independiente, apagada

Variables nuevas (no se establecen en el helper local ni en `.env`):

```text
PIXY_HELP_TASKS_PORTAL_ENABLED=true
PIXY_HELP_TASKS_PORTAL_TENANTS=<UUIDs explícitos>
```

Ambas son necesarias; `*` no habilita este piloto. Son independientes de ayuda V2 del dashboard y del robot global. Activar estas variables solo permite resolver una sesión de ayuda: NO monta un chat ni invoca modelos por sí mismo. Mantener apagado hasta biblioteca, endpoint, controles de uso y pruebas de aislamiento completos.

## Verificación y límites

81 pruebas en 14 archivos pasaron: ayuda del dashboard, aislamiento por superficie, perfiles, metadatos inválidos, acceso token/PIN, targeting explícito, staff/tenant inactivo, gobernanza, módulo, errores, perfiles compartidos y privacidad de logs. El pipeline sintético prueba dashboard y portal: rechaza perfiles ausentes y rutas con token concreto, y preserva el corpus previo ante fallos. No hubo llamadas a modelos ni cambios de base. `help:validate` mantiene válidos los 21 artículos actuales; recuperación offline 56/56 y compilación de producción correctas.

Los perfiles no equivalen a capacidades por tarea. La matriz de Gemini puede requerir filtros adicionales (asignación/QA de tarea, pertenencia a proyecto/workspace, capacidades particulares); se deben implementar sin deducirlas del nombre de un rol. El acceso autenticado del portal no autoriza leer datos privados de otros registros. El nuevo resolver no es una autorización general para las acciones existentes de Tasks.

## Siguiente paso

Integrar la matriz y biblioteca editorial, definir capacidades adicionales y variantes según evidencia, añadir endpoint/orquestación de alcance, cuotas compartidas, UI y un contrato de historial independiente con su migración/pruebas. Solo después activar piloto local de portal. El dashboard continúa con el corpus de 21 artículos y sus controles anteriores.
