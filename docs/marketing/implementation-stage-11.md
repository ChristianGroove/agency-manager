# Etapa 11: preparación simple, listas importadas y calificación comercial

## Comportamiento entregado

La preparación sigue **Canal → Mensaje → Destinatarios → Revisar y enviar** dentro del panel flotante existente. La programación, los filtros y las selecciones reutilizables son opcionales. Las selecciones personalizadas ya guardadas siguen identificadas y se conservan al abrir la campaña. El ritmo permanece visible con las tres cadencias existentes. Los detalles de contactos excluidos se consultan bajo demanda. La gestión de autorizaciones ya no ofrece una segunda revisión de campaña: la confirmación final sigue siendo el punto de activación.

El CSV crea una lista con nombre. Después de confirmar la importación, **Usar esta lista en la campaña** cambia explícitamente la selección del borrador; guardar y activar siguen siendo acciones independientes. También pueden buscarse y reutilizarse listas previas mediante páginas de 20 elementos y cursores. La cantidad de contactos de una lista y los destinatarios elegibles son conceptos distintos: consentimiento, bajas, formato y duplicados se validan sobre la selección.

Las listas comparten las identidades del CRM. Un contacto existente conserva nombre, tipo, etapa, datos comerciales y asignación. Un contacto nuevo importado queda con `contact_type='prospect'`, `status='marketing_contact'`, fuera del listado de leads comerciales. No se modifica retroactivamente ningún contacto importado antes de esta etapa.

Enviar, entregar, leer o recibir una respuesta no califica por sí solo al nuevo contacto. La respuesta sigue actualizando actividad y puntuación mediante el comportamiento existente de Inbox. La selección explícita de una etapa comercial activa desde Inbox lo convierte en `lead` en una sola escritura, con alcance de organización y comprobación del tipo/origen actual. Las reglas existentes del proceso siguen aplicándose. Una automatización configurada que solicite explícitamente esa transición usa el mismo comportamiento; no se analiza ni se inventa intención comercial a partir de cualquier respuesta.

Los contadores y consultas de analítica de leads se alinean con el listado comercial mediante `contact_type='lead'`. Esto afecta qué tipos se contabilizan: clientes, partners y prospects quedan fuera de esos indicadores de leads. Los registros, asignaciones, etapas y conversiones existentes no se reescriben.

## Integridad y aislamiento

- Importación de contactos, evidencia y pertenencia a la lista en una transacción. Reintentos del mismo ticket, selección y nombre devuelven la misma lista. Un cambio de selección/nombre o permisos se rechaza.
- Claves foráneas compuestas por organización impiden incluir un contacto de otro tenant. Las tablas privadas no tienen acceso directo para usuarios autenticados.
- La lectura paginada comprueba permisos y obtiene el tenant desde la sesión. Resolver una lista guardada fuera de la página actual no expone listas ajenas.
- `list_id` forma parte del contrato de filtros y de la consulta SQL compartida por conteo, revisión, fingerprint y activación. Una lista inexistente o ajena falla; nunca se sustituye silenciosamente por todo el CRM.
- La revisión final congela los destinatarios reales de la lista. Un cambio en sus miembros elegibles invalida la revisión; contactos ajenos a la lista no se agregan por el crecimiento del CRM.
- Los filtros avanzados reducen una lista elegida. Las bajas siguen comprobándose antes de activar y enviar.
- Se conservan motor, proveedores, outbox, webhooks, ritmos, estados de mensajes y procesamiento multimedia. No se habilitan envíos ni se activan campañas reales.

## Migración y límites

Migración nueva: `supabase/migrations/20261010060000_marketing_contact_lists.sql`, aplicada exclusivamente en Docker local. Debe aplicarse antes de desplegar esta etapa a producción. Añade las tablas e índices de listas y amplía las funciones de destinatarios/importación. No requiere migración de los contactos históricos.

El límite de CSV continúa en **100 filas / 1 MB**. La siguiente etapa debe incorporar importación de archivos grandes por lotes con progreso y recuperación. También quedan pendientes atribución fiable de respuestas/oportunidades a campaña, controles de saturación por destinatario y detención de seguimientos ante una respuesta. Correo/SMS continúan pendientes de integración; no se muestran como envíos operativos. No se promete ausencia de restricciones de Meta ni un ROI que no esté medido.

## Verificación

- Cinco suites SQL locales con fixtures sintéticos y `ROLLBACK`: seguridad, operaciones revisadas, workspace, controles del editor y listas. Incluyen aislamiento por tenant, conservación de leads existentes, no duplicación de identidades/listas, bajas, revisión invalidada por cambios y activación del conjunto exacto sin solicitudes a proveedores.
- 233 pruebas en 28 archivos para Marketing y servicios CRM afectados: orden/plegado de la preparación, persistencia de filtros, selección explícita de listas, importación revisada, límites de permisos y calificación comercial. Una respuesta común actualiza actividad sin promover el contacto.
- 304 pruebas de regresión en 86 archivos para CRM, Inbox, canales, automatizaciones, audio/multimedia, Meta y endpoints de Marketing. Proveedores externos simulados; no equivalen a pruebas Meta Live.
- TypeScript y build local verificados antes del commit. Los logs se conservan en `tmp/marketing-stage11-*` y `tmp/marketing-lists-sql.log`, ignorados por Git.
- La herramienta de navegador falla al inicializar. No se declara revisión visual ni una prueba autenticada completa en navegador. El preview de `localhost:3001` se actualiza para revisión del usuario.

Sin cambios en producción, despliegue, activación de campañas ni push remoto.
