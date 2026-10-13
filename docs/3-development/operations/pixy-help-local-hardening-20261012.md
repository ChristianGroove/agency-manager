# Cuota y controles de Tasks: revisión local

Fecha: 2026-10-12. Rama `codex/pixyrobotpet-release`. Base de intervención: `cf6ddb1e`. El usuario eligió localhost para aceptación; no se ha publicado master ni cambiado producción.

## Resultado táctico

- Dashboard: la cuota de 10 consultas/minuto por organización se reserva en PostgreSQL mediante el cliente autenticado. No acepta usuario/contador/límite enviados por el navegador, no permite leer o editar la tabla directamente y bloquea si no puede comprobarse. Ventana y contador sobreviven reinicios y se comparten entre procesos. Casos inválidos/hilos inaccesibles se rechazan antes de reservar; cortesía y legacy también consumen cuota. Una reserva consumida no se devuelve si falla posteriormente la persistencia o la respuesta.
- `deleteTasks` del dashboard verifica gestión en el tenant destinatario, membresía activa y rol perteneciente a ese tenant, respetando owner/wildcard y super admin. No usa el permiso de un tenant activo distinto. Organizaciones inactivas/módulo no habilitado se rechazan.
- Portal: prioridad, reasignación, borrado unitario y borrado masivo verifican token activo, PIN cuando está configurado, tenant activo, módulo Tasks y autorización de gestión. Los roles estructurados prevalecen sobre etiquetas libres. Liderazgo por asignación solo alcanza proyectos/espacios propios, también cuando el espacio se hereda del proyecto.
- Reasignación exige responsable activo del mismo tenant. Escrituras repiten filtros de ámbito; una selección mixta inaccesible falla antes del borrado. Borrado en lote conserva flag true/false/null: true autoriza lote, false lo deniega incluso a PM y null usa liderazgo. Ese flag no concede reasignación ni borrado unitario.
- IDs se validan y deduplican, con máximo de 1000 por selección y consultas/borrado de 100 por batch. Los rechazos no disparan cancelaciones de reuniones. Error inesperado de acceso/módulos no se devuelve con detalles internos.

No se modificaron las demás acciones de Tasks: no presentar esta intervención como auditoría total del módulo o cobertura de PIN/roles en cada operación. La verificación y la mutación siguen siendo solicitudes separadas; el lote y Google Calendar no forman una transacción distribuida. Los filtros repetidos reducen el riesgo de movimiento de registros, pero no garantizan ausencia de todas las carreras de revocación/cancelación.

## Evidencia

- Cuatro archivos focales: 63 pruebas correctas antes del último caso de error inesperado; regresión final completa robot/CAA/Tasks/motor/logging: 455 pruebas en 38 archivos, con servicios simulados. Algunas pruebas React preexistentes emiten avisos `act`; no se contabilizan como aceptación visual.
- TypeScript global y ESLint de helpers/tests/scripts nuevos: correctos. Build estándar final completo con exit 0. Candidato reiniciado en 3005 después de verificar que el proceso anterior era el de Pixy; login HTTP 200 y RPC de cuota con credencial anónima rechazado HTTP 401. No se enviaron preguntas al modelo ni se automatizó el navegador.
- Migración `20261012000005_dashboard_help_quota.sql` aplicada en transacción y registrada SOLO en `supabase_db_agency-manager`, puerto publicado 55322, API 55321. Sin resets, seeds reales o cambios de tenant/colaboradores del usuario.
- SQL con rollback: 10 permitidas y siguiente limitada, acceso cruzado denegado, privilegios RPC/tabla, ventana vencida, membresía bloqueada y tenant suspendido comprobados.
- Concurrencia real: 20 sesiones PostgreSQL simultáneas dieron 10 permitidas y 10 limitadas, contador final 10. La organización fixture creada para compartir estado se eliminó por ID y slug exactos; su contador desapareció por cascade.
- Corpus publicado conservado: 48 artículos, revisión `b4d8246f80785623dda03822d5bb7a9ad045c149b685ff413095d1ddb2b2fcea`. Validación estructural pasa. Los hashes de evidencia de 14 artículos quedan desactualizados por los dos archivos de acciones cambiados; NO se recalculan ni se vuelve a publicar simulando revisión editorial.

## Operación del candidato

Desde `G:\Pixy\agency-manager\tmp\pet-release`: `node scripts/start-help-local.mjs`. Requiere `.env.local` ignorado, Supabase loopback verificado y build existente. Activa dashboard V2 solo en Pixy/Movilservicios y portal solo Movilservicios, con diagnóstico de metadatos. No imprime valores de entorno. El servidor del piloto anterior en 3005 se reemplaza únicamente después de verificar su proceso; Cartera/3000 permanece fuera de alcance.

Pruebas del usuario:

1. Recargar dashboard de Movilservicios y preguntar por Tasks/reuniones; cerrar/abrir chat y comprobar historial y presentación.
2. En una conversación de prueba, enviar 11 consultas breves en menos de un minuto. La onceava debe mostrar el límite; después de un minuto debe recuperarse. La cuota es del equipo, así que otros usuarios/pestañas comparten ese contador.
3. Portal con PIN: bloquear y volver a desbloquear antes de intervenir. Colaborador normal no puede gestionar prioridad/reasignación/borrado; PM autorizado sí, dentro de sus permisos. Un líder asignado a un proyecto no puede gestionar tareas de otro.
4. Verificar reasignación a colaborador activo y selección masiva propia. Usar tareas desechables para probar borrado; no borrar tareas reales como smoke test. La eliminación puede cancelar eventos vinculados.

No se hicieron pruebas en navegador por el agente ni llamadas a IA para certificar estas verificaciones. No se promete comprobación de latencia/coste real por pasar mocks.

## Biblioteca y salida

Gemini debe realizar la [revisión incremental](gemini-help-post-security-review-brief.md) en ESTE worktree, sobre el snapshot portable vigente. Incluye los 14 artículos afectados, documentación de cuota/gestión y el hallazgo del navegador descrito a la izquierda en la guía de historial. Codex integrará después la entrega con hashes verificados, pruebas de recuperación y build. Hasta entonces, el runtime local conserva el corpus previo y la publicación nueva falla ante fuentes modificadas.

Aceptación manual, revisión incremental y comprobación del destino/migraciones/configuración de producción permanecen pendientes. El apagado de V2 vuelve a legacy pero mantiene la nueva cuota compartida: migrar antes del código. Conservar el artefacto anterior para reversión de código, sin borrar contadores o historiales como primera medida.
