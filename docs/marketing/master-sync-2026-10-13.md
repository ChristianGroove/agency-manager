# Segunda sincronización de Marketing con master

13 de octubre de 2026. Rama `codex/marketing-campaign-hardening`.

## Integración

Se combinó `master` en `c5918870` con Marketing en `4d32bfbb`, conservando ambos historiales. La referencia local de `master` y `origin/master` coincidían al iniciar. La combinación automática terminó sin conflictos.

Los cambios recibidos incorporan el robot opcional de Pixy, historial y biblioteca de ayuda, ayuda de Tasks para dashboard y portal, cuotas y aislamiento por tenant, ajustes del proveedor de IA y controles de permisos para mutaciones de Tasks. No modifican el código de campañas, canales Meta, mensajería o Cartera.

Se realizaron dos ajustes de integración:

- Se eliminó un alias `server-only` duplicado en `vitest.config.ts`, resultado de que ambas ramas añadieron la misma configuración.
- La prueba efímera de rollback del batch de ayuda ahora reconoce archivos LF y CRLF y exige comprobar que inyectó el error antes de COMMIT. En Windows, el patrón anterior podía no modificar el fixture y fallaba la prueba de rollback tardío. No se modificó el SQL del batch ni las migraciones recibidas.

## Aislamiento

El trabajo se limita a `G:/Pixy/agency-manager/tmp/marketing-closeout`. Se conserva el checkout principal `NUEVO-MODULO-CARTERA`, sus archivos pendientes y sus procesos. No se instalaron dependencias ni cambiaron variables en ese checkout.

Las pruebas PostgreSQL usan PGlite en un directorio temporal ignorado propio, con un resolvedor temporal para los scripts ESM. No se ejecutaron migraciones, reparaciones o seeds contra Docker ni producción. No hubo envíos reales, push de Git ni despliegue.

## Esquema y publicación

Master añade las migraciones `help_tenant_prerequisites`, `platform_robot_pet`, `help_chat_history`, `tasks_portal_help`, `dashboard_help_quota` y `help_function_privileges`.

El [cierre de base de datos de ayuda del 13 de octubre](../3-development/operations/pixy-help-production-db-closeout-20261013.md) informa que estas migraciones y `atomic_tenant_provisioning` ya fueron aplicadas al proyecto de producción confirmado en aquel trabajo. Esta sincronización no vuelve a verificarlas ni las ejecuta. Consultar el historial del destino antes de aplicar cualquier pendiente; **no repetir el batch histórico sobre ese destino**. Las migraciones y requisitos pendientes de Marketing permanecen descritos en la [etapa 14](implementation-stage-14.md).

## Validación

- Quince pruebas de tenants aprobadas en PGlite.
- Prerrequisitos de ayuda verificados en una base efímera: incorporación de columnas sin sobrescribir estados existentes al repetir.
- Batch histórico probado solo sobre fixtures: creación, privilegios e historial autenticado; rechazo de repetición, tabla preexistente y colisión de versión; rollback completo ante un error tardío, con datos previos preservados.
- 733 casos Vitest comprobados en 107 archivos: Marketing, SMTP/notificaciones, tenants/autenticación, robot/ayuda, permisos de Tasks, motor IA, canales e Inbox. La ejecución conjunta aprobó 732; la prueba de desconexión excedió el límite de 5 segundos mientras corría el build y pasó en una repetición aislada (1,7 segundos), sin cambios de implementación ni del límite.
- Build `next build --webpack` completo, incluida la revisión de TypeScript, aprobado con configuración local y `MARKETING_EXECUTION_ENABLED=false`. Se conservan los avisos previos de múltiples lockfiles, clave local de FlowsCrypto ausente y generación estática deshabilitada en una ruta Edge.
- Sin conflictos pendientes. La comprobación de espacios del código y de los documentos nuevos pasó. Se preservaron los saltos Markdown deliberados y el contenido de los artículos recibidos, sin alterar sus huellas editoriales.

La revisión visual autenticada y el envío SMTP real controlado continúan pendientes; este merge no habilita campañas ni acredita funcionamiento de proveedores en producción.
