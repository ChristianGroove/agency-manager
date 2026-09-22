# Pixy: canales Meta, aislamiento y coexistencia

Fecha de revisión: 21 de septiembre de 2026 (Colombia). Rama: codex/meta-channels-hardening. Base: 0043ab0b.

## Veredicto

La implementación original tenía una base útil (conexiones por organización, resolución por activo, roles administrativos, adaptadores y persistencia), pero no bastaba para ofrecer onboarding autónomo multitenant con garantías. Los defectos más graves estaban en la validación del webhook, el vínculo del OAuth con el usuario/tenant, la exposición de credenciales y el tratamiento incompleto de coexistencia.

Esta rama implementa una primera fase de endurecimiento y pruebas. No constituye una certificación de producción: quedan condiciones externas y deuda de arquitectura que se detallan abajo. No se aplicaron migraciones al entorno compartido, no se conectaron cuentas reales ni se enviaron mensajes reales. El trabajo se realizó en un worktree separado para no interferir con el módulo de tareas.

## Qué cambió

| Hallazgo original | Cambio en esta rama | Evidencia principal |
| --- | --- | --- |
| El POST principal aceptaba payloads sin verificar su firma. | HMAC SHA-256 sobre el cuerpo original antes de parsear; secreto obligatorio también en desarrollo. El GET ya no usa un token público por defecto ni registra su URL. | src/app/api/_guards/request-guards.ts; src/app/api/webhooks/messaging/route.ts |
| State OAuth era Base64 manipulable. | State firmado y con caducidad; usuario y organización vinculados a cookie HttpOnly y sesión de un solo uso en BD; comprobación de rol al emitir y consumir. | oauth-state.ts; oauth-session.ts; meta_oauth_sessions |
| Miembros podían recibir tokens en filas de conexiones. | Tabla de secretos accesible solo al servicio; referencia opaca en conexión; trigger de separación; cifrado para nuevas credenciales y herramienta de conversión de las antiguas. | connection-secrets.ts; migración 20260921210002 |
| Un activo podía quedar asignado a varios tenants. | Índice único para activos modernos y alias Instagram; errores por resolución ambigua; deduplicación entrante acotada al canal y tenant. | migración 20260921210001; channel-resolver.ts; inbox-service.ts |
| Onboarding elegía el primer número y marcaba conexión activa aunque fallara la suscripción. | Valida número dentro del WABA autorizado, obliga a resolver selección ambigua y activa después de suscripción/registro. | embedded-signup-handler.ts |
| Coexistencia solo estaba parcialmente declarada. | Captura evento específico, valida capacidades del teléfono, evita register en coexistencia, solicita sincronización con reserva persistente y conserva request IDs. | meta-embedded-signup.tsx; claim_meta_history_request |
| Historial y ecos podían activar automatizaciones o alterar la conversación actual. | Historial marcado, sin automatización ni reapertura; eco de app como salida humana; adjuntos históricos tardíos enriquecen el mensaje original. | meta-provider.ts; inbox-service.ts; webhook-handler.ts |
| Recepción síncrona frágil y estados ignorados. | Guarda webhook antes del ACK y despacha a Inngest; reintentos; reconciliación sent/delivered/read/failed y metadatos pricing; resuelve el evento que llega antes de guardar external_id. | src/inngest/meta-messaging.ts; webhook-events.ts; migración 20260921210003 |
| Envíos podían usar canal ajeno/inactivo o saltarse la ventana de atención. | Comprobación de organización, conexión y estado; ventana de 24 horas para mensajes libres; supresión de marketing; campañas pasan por el servicio común. Se quitaron fallbacks de token global de las rutas modificadas. | send-policy.ts; outbound-service.ts; messages.ts; marketing-runner.ts |
| Optimismo de envío usaba el identificador interno como external_id y guardaba sent prematuramente. | Separa id interno y externo, guarda sending antes del envío y verifica la actualización. | actions/messages.ts; services/persistence.ts |
| Errores de plantillas exponían datos del destinatario y parámetros. | Error público genérico y registro resumido. El adaptador ahora serializa plantillas sin convertirlas en texto libre. | send-template-action.ts; meta-adapter.ts |
| Alta de Messenger/Instagram confundía token de usuario y token de página. | Obtención del token de página y comprobación del vínculo Instagram; no declara éxito si falla la suscripción. Descubrimiento de páginas paginado. | graph-api.ts; meta-channel-actions.ts |

## Cobro de WhatsApp: qué modelar

No implementar una regla de “cobrar después de 1.000 mensajes”. Desde el 1 de julio de 2025, el modelo general cobra plantillas entregadas según categoría y mercado del destinatario. Los mensajes libres son gratuitos dentro de la ventana de atención de 24 horas; las plantillas utility también son gratuitas dentro de esa ventana. Existen excepciones como la ventana gratuita de entrada de 72 horas. Esa excepción de precio no extiende por sí sola el permiso para enviar texto libre.

La tabla vigente consultada tiene fecha efectiva julio de 2026 y hay cambios anunciados para octubre. No fijar importes en el código. Fuente: [precios oficiales de Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/).

Propuesta para Pixy: separar la tarifa SaaS de Pixy del cargo de Meta; elegir explícitamente quién paga la WABA; guardar categoría, país, moneda, fecha efectiva y clasificación de gratuidad; mostrar estimación como estimación. El campo pricing del webhook ayuda a clasificar, pero no equivale a un importe monetario facturado. Conciliar con pricing_analytics y la facturación del proveedor antes de liquidar saldos. Esta rama guarda evidencia de clasificación; no implementa un motor de facturación ni un monedero.

## Coexistencia y autoservicio: condiciones externas

La coexistencia necesita elegibilidad de la cuenta y configuración de Meta; no se habilita solo por tener whatsapp_business_management y whatsapp_business_messaging. El negocio debe completar el flujo correspondiente, conservar su app y autorizar la vinculación. La sincronización inicial tiene restricciones de tiempo y de repetición; por eso esta rama reserva el intento antes de hacer la llamada y no reintenta automáticamente una solicitud cuyo resultado sea incierto. Una reconexión no debe duplicar la carga histórica.

Revisar la configuración real de Embedded Signup, acceso avanzado de permisos, revisión de la app, modo Live, verificación empresarial, requisitos del proveedor y campos de webhook. El parámetro sessionInfoVersion no indica la versión del producto Embedded Signup. Confirmar la configuración v4 antes de la retirada anunciada de v2 el 15 de octubre de 2026. Fuente: [onboarding oficial de usuarios de WhatsApp Business App](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users/).

Criterio de aceptación real: un administrador de un tenant nuevo, sin ser desarrollador/tester de la app Meta, conecta su número Cloud; otro conecta un número elegible de la app; un tercero conecta Messenger/Instagram. Cada uno recibe y responde solo en sus canales. Revisar el comportamiento ante cancelación, revocación, número ya vinculado, pago pendiente, sincronización rechazada y token expirado. Las pruebas del repositorio no sustituyen esta aceptación con Meta.

## Deuda pendiente y solución propuesta

| Prioridad | Deuda / límite real | Solución y criterio de cierre |
| --- | --- | --- |
| P1, antes de producción | Adjuntos aún pasan por almacenamiento público heredado; descargar media durante el parseo retrasa lotes históricos. | Bucket privado, claves por tenant/canal, lectura autenticada o URL firmada corta; cola de descarga y reintentos por adjunto. Verificar acceso cruzado y expiración sin romper el visor. |
| P1, antes de producción | Envío no tiene outbox durable común: algunos caminos guardan después del HTTP y el inbox todavía usa ejecución posterior a la respuesta. Un timeout puede tener resultado incierto. | Outbox transaccional con ID de operación, estados queued/sending/accepted/unknown/failed, worker por canal y recuperación. Nunca reenviar automáticamente un HTTP ambiguo. |
| P1, antes de producción | La exclusividad SQL cubre claves modernas. Conexiones meta_business/meta_whatsapp heredadas y metadatos selected_assets requieren conciliación; hay vías manuales de alta ajenas al Embedded Signup. | Inventariar y normalizar activos a una tabla canónica (app_id, proveedor, asset_id, tenant_id); migrar padres OAuth y canales por separado; validar pertenencia con Graph también en alta manual y selector de activos. No habilitar terceros hasta resolver duplicados y vías heredadas. |
| P1 | Helpers heredados de salud, marketing y llamadas aún dependen de tokens globales y no todos están integrados con el servicio común. | Retirar helpers sin consumidores o exigir connection_id/org_id y credenciales del canal; prohibir nuevos usos mediante pruebas de arquitectura. El runner de campañas ya no usa el antiguo envío marketing global. |
| P1 | Supresión de marketing no constituye una prueba de consentimiento positivo. Campañas sin canal explícito solo pueden resolver automáticamente si existe uno único. | Registro de consentimiento con fuente, finalidad, fecha, revocación y evidencia; selector de canal por campaña; comprobar consentimiento al ejecutar cada envío. |
| P1 | Despliegue de código y migración privada no son compatibles con el binario antiguo que lee tokens del campo público. | Ventana controlada o despliegue de compatibilidad en dos pasos; backup y ensayo en staging. No revertir solamente el código después de migrar. |
| P2 | Sin límites distribuidos ni presupuesto por tenant; el límite local por WABA no representa tarifa ni throughput real. | Rate limiter compartido por teléfono/WABA/tenant; respetar errores y backoff de Meta, cola con cuotas y circuit breaker aislado por canal. |
| P2 | Inngest requiere configuración operativa; faltan barrido de eventos pendientes, DLQ visible, alerta y política de retención. | Monitor de edad de pendientes, reenvío controlado por event_id, panel de fallos, retención por tipo de dato y pruebas de caída/reinicio. Confirmar función registrada en /api/inngest antes del cambio del webhook. |
| P2 | El historial puede ser grande; el worker procesa el payload dentro de un único paso. Concurrencia y orden de contactos/progreso no están resueltos completamente. | Dividir por lotes y cursor; escritura por timestamp máximo; comprobar que un evento antiguo no revierta un contacto eliminado. Mantener evidencia de fragmentos y conciliación de totalidad. |
| P2 | La idempotencia de mensajes no vuelve transaccionales los efectos secundarios de automatización. | Outbox de eventos de dominio separado del ingreso del mensaje, clave por mensaje/efecto y reanudación por paso. Prueba de caída entre INSERT y automatización. |
| P2 | OAuth y Embedded Signup tienen flujo protegido, pero faltan pruebas de navegador del orden de eventos del SDK, pestañas concurrentes y cambio de organización. | Suite con SDK simulado y prueba manual Live; sesión por intento si se necesita soportar varias ventanas simultáneas. |
| P2 | Receipts sociales no se convierten en mensajes vacíos, pero su reconciliación completa y excepciones aprobadas de ventanas siguen pendientes. | Implementar semántica específica Messenger/Instagram, sin reutilizar excepciones WhatsApp; solo habilitar tags/capacidades aprobadas. |
| P2 | Versiones Graph mezcladas v21/v24 y fallbacks de identificadores de configuración heredados. | Configuración única validada al arrancar y matriz de endpoints/versiones probada contra sandbox Meta antes de elevar versiones. |
| P2 | La ventana de atención consulta hasta 100 mensajes y aplica filtrado conservador del historial. | Columna last_customer_message_at por canal/conversación actualizada atómicamente solo por eventos válidos; excluir historia y eco en BD, no por escaneo. |
| P2 | No hay conciliación monetaria, estimador por tarifa efectiva ni política comercial de recargos. | Ledger inmutable, rate cards versionadas, clasificación del webhook y conciliación con Meta; definir quién paga y qué ve cada tenant. |
| P3 | Funciones duplicadas, comentarios obsoletos y pruebas antiguas centradas en ocultar logs. | Consolidar repositorios/gateway y pruebas de contratos; eliminar código muerto después de trazar consumidores. Persisten advertencias React act en pruebas previas. |

## Arquitectura objetivo

Separar cuatro responsabilidades: autorización de la cuenta Meta; propiedad del activo; entrega de mensajes; medición/facturación. Una autorización puede conceder varios activos, pero cada canal operativo pertenece inequívocamente a un tenant. Los secretos viven aparte y solo los obtiene el servidor tras autorizar el canal.

Flujo entrante: firma -> inbox durable de webhooks -> resolución canónica del activo -> deduplicación -> mensaje/evento de control -> eventos de dominio. Flujo saliente: usuario/job autorizado -> canal y destinatario vinculados -> política y consentimiento -> outbox -> límite distribuido -> Graph -> estado aceptado -> receipt -> conciliación de coste.

Orden recomendado de siguientes fases: (1) cerrar los P1, (2) aislamiento operativo y recuperación, (3) UX de autoservicio y aceptación Live, (4) ledger/estimador y optimización. Mantener despliegues separados; no mezclar un nuevo motor de cobro con la migración de credenciales.

## Despliegue y reversión

1. Inventariar proveedores/activos duplicados, filas heredadas y conversaciones sin connection_id. Resolver pertenencia explícitamente; la migración debe fallar ante duplicados, nunca elegir un tenant por orden.
2. Confirmar ENCRYPTION_KEY existente y compatible, META_APP_SECRET, META_OAUTH_STATE_SECRET (o fallback explícito al app secret), META_WEBHOOK_VERIFY_TOKEN, IDs de app/configuración y credenciales Inngest. No rotar la clave de cifrado sin recifrar.
3. Ensayar contra una copia de staging con el esquema completo. El fixture SQL incluido valida invariantes, no todas las migraciones históricas del producto.
4. Crear backup restringido; desplegar coordinadamente código y migraciones 20260921210001, 20260921210002 y 20260921210003. Los servicios antiguos no pueden seguir leyendo tokens de la columna pública.
5. Ejecutar scripts/meta-encrypt-legacy-credentials.mjs en modo lectura. Con el entorno de BD correcto, usar --apply para convertir secretos heredados y repetir la verificación hasta legacy=0. El script no se ejecutó contra datos reales durante esta tarea.
6. Confirmar worker Inngest registrado y receptivo; ejecutar aceptación Cloud/coexistencia/social; monitorizar errores, retrasos y revocaciones antes de abrir autoservicio general.
7. Ante fallo: detener nuevas conexiones/envíos, conservar eventos pendientes y revisar el punto de fallo. Restaurar código y BD de manera coordinada desde backup probado; no publicar de nuevo tokens para hacer compatible el rollback.

## Validación reproducible

- Tipos: node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false.
- Vitest usa vitest.meta.config.ts con configLoader runner y --no-cache para no escribir en node_modules compartido.
- SQL: en un Postgres desechable con roles Supabase, cargar tests/meta/schema-fixture.sql, las tres migraciones en orden y tests/meta/security-assertions.sql con ON_ERROR_STOP=1. Debe terminar en “Meta security assertions passed”. Nunca cargar el fixture en el entorno de desarrollo del producto.
- Se comprobaron referencias privadas, rechazo de lectura autenticada, unicidad entre organizaciones y alias, rechazo de texto plano, inserción atómica del secreto, reserva única del historial, no regresión de receipts, recepción anticipada del estado y borrado de secretos al eliminar una conexión.

Resultados: TypeScript sin errores. Regresión ampliada: 78 archivos / 285 casos; 283 pasaron inicialmente y las dos expectativas antiguas de marketing fueron corregidas. La repetición del archivo marketing/actions.test.ts pasó sus 3 casos, con lo que todos los casos de esa selección quedaron validados entre ambas ejecuciones. Prueba SQL final desde cero: Meta security assertions passed. El script de cifrado pasó node --check. No se ejecutó contra datos reales.

No se hizo un build de producción ni prueba Live de Meta. Permanecen advertencias React act de pruebas previas; no se alteraron los módulos ajenos para eliminarlas.
