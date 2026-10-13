# Etapa 14: campañas de email con SMTP del tenant

11 de octubre de 2026. Rama `codex/marketing-campaign-hardening`. Implementación local; no publicación ni envíos reales.

Actualización del 13 de octubre: las migraciones se aplicaron posteriormente al proyecto de producción confirmado, con autorización explícita y sin activar envíos. Ver el [cierre de base](production-db-closeout-2026-10-13.md). La evidencia local y las pruebas pendientes de esta etapa siguen conservadas debajo como antecedentes.

## Producto

Campañas masivas permite escoger WhatsApp o el SMTP verificado de la organización en el mismo espacio flotante. WhatsApp conserva sus plantillas Meta; email utiliza asunto y mensaje de texto con vista previa y variables `{{nombre}}`, `{{empresa}}` y `{{email}}`. El contenido se convierte en HTML escapado, sin permitir scripts, archivos locales o recursos obtenidos por Nodemailer desde URLs.

Una campaña tiene un canal. Cambiar el tipo de canal de un borrador con mensajes exige confirmar su eliminación; el cambio y la eliminación son atómicos. Cambiar solo el emisor conserva el diseño para revisarlo. No se pueden modificar canal, destinatarios o contenido después de activar.

Email importa CSV `email,nombre`, sin teléfono obligatorio, hasta 1.000 filas y 5 MB. Conserva la identidad y propiedades de contactos existentes. Los nuevos quedan como `prospect` / `marketing_contact`, fuera del pipeline. Importación, aceptación del servidor o respuesta no crean oportunidades automáticamente.

El permiso comercial de email es independiente del de WhatsApp. Puede declararse para una lista o registrarse individualmente con referencia y fecha. Se conservan eventos privados de autorización y revocación. Las bajas no se revierten por importación o declaraciones posteriores.

Actividad muestra destinatarios, correos aceptados, pendientes y fallidos, con historial y exportación compartidos. **SMTP confirma aceptación del servidor; no acredita entrega en bandeja, lectura ni apertura.** Las respuestas llegan al buzón del remitente; esta implementación no añade recepción de correo al Inbox.

## Arquitectura y recuperación

- Diseño y audiencias compartidos; `marketing_campaigns.channel` conserva `whatsapp` como valor predeterminado. Email añade `smtp_config_id` y usa `execution_version=3`; WhatsApp conserva versión 2.
- Outbox privado de email separado del outbox Meta y de `email_logs`. Un registro único por inscripción/paso, destinatario congelado, identificador de mensaje estable y comprobación de organización/claim antes del despacho.
- El worker existente procesa ambos canales mediante claims con `SKIP LOCKED`, leases de dos minutos y un máximo total de 25. Mantiene la capacidad anterior de WhatsApp cuando no hay email pendiente y reparte el lote cuando hay ambos canales.
- Pausa/reanudación mantiene inscripciones; confirmaciones caducan en diez minutos y comparan contenido, emisor y destinatarios. Se comprueba disponibilidad y configuración SMTP nuevamente al reservar.
- Ritmo compartido por organización/emisor: 180, 30 o 5 segundos, con variación opcional que nunca reduce el mínimo. Espera entre campañas por organización/email y ventanas horarias. Estos ritmos no sustituyen cuotas, reputación o condiciones del proveedor.
- Aceptación previamente persistida avanza sin volver a contactar SMTP. Un fallo ambiguo después de enviar queda `unknown` y **no se reintenta automáticamente**. Una reserva abandonada vence como incierta; mantiene la campaña abierta para revisión. Una respuesta SMTP de rechazo definitivo se registra como fallida. No hay reenvío automático de fallos 4xx en esta versión.
- Para resolver un resultado incierto, comprobar el registro del proveedor y del destinatario antes de registrar su resolución con herramientas administrativas. No existe conciliación automática por eventos del proveedor ni un botón de reenvío de resultados inciertos.

## Baja y aislamiento

Cada correo incluye enlace de baja y encabezados `List-Unsubscribe` / `List-Unsubscribe-Post`. El token aleatorio se vincula a organización/email en el outbox privado; la ruta pública resuelve su hash y no acepta identificadores de empresa o direcciones proporcionados por el solicitante.

GET muestra confirmación sin cambiar datos para evitar bajas por escáneres de enlaces. POST registra la baja, incluida la solicitud de un clic del proveedor. La revocación se vuelve a comprobar bajo el bloqueo del destinatario antes de reservar otro envío. No puede retirar un correo ya sometido al servidor.

Las tablas de permisos, eventos, ritmo y outbox no permiten lecturas directas a `anon` ni `authenticated`. Las acciones obtienen organización/actor de la sesión; las funciones privadas de activación y envío solo son ejecutables por `service_role`. Las lecturas públicas verifican permisos del módulo y organización.

## SMTP y puesta en producción

Se reutiliza la conexión de Motor de correos; no se crea una cuenta de proveedor nueva ni se usa silenciosamente el Resend de Pixy como sustituto. Cada empresa contrata/configura su proveedor. Campañas requiere SMTP verificado en puerto 465 o 587, TLS con validación de certificado y un destino público. Se valida DNS y se fija la dirección aprobada para evitar una segunda resolución; destinos internos y mixtos público/privado se rechazan.

El SMTP transaccional existente de facturas/cotizaciones conserva su transporte. Se corrigió el guardado: un nuevo host, usuario, puerto o remitente no puede conservar `is_verified=true` sin introducir la contraseña y verificarlo. Se exige membresía activa y se ocultan mensajes de error del proveedor que podrían contener secretos. Motor de correos obtiene ahora la organización activa, en lugar de la primera membresía.

Requisitos antes de habilitar email:

1. Aplicar, en este orden y con respaldo, `20261011120000_marketing_email_campaigns.sql`, `20261011123000_marketing_email_lists.sql`, `20261011130000_marketing_email_integration.sql`, `20261011133000_marketing_email_permission.sql`. La primera añade un índice por organización/email normalizado a contactos existentes: en una base grande, preparar su creación concurrente fuera de la transacción antes de la ventana de migración, adaptando el DDL para reutilizarlo.
2. Configurar `NEXT_PUBLIC_APP_URL` con la URL pública HTTPS correcta para bajas y mantener el programador existente de `/api/marketing/run`, autenticado con `CRON_SECRET`.
3. En producción se exige `SMTP_ENC_KEY` de 32 caracteres. **No cambiar esta clave a ciegas:** las contraseñas SMTP guardadas dependen de ella. Si se usó el valor heredado por defecto, planificar su migración o la revinculación de todas las cuentas SMTP antes del cambio, para preservar los correos transaccionales. Esta etapa no cambia claves ni recifra credenciales existentes.
4. Verificar remitente, SPF/DKIM/DMARC y cuotas con el proveedor. Proveedores de buzón personal pueden limitar masivos o rechazar autenticación por contraseña; usar sus credenciales SMTP admitidas o un servicio adecuado. Pixy no configura DNS ni adquiere capacidad de entrega.
5. Revisar la interfaz autenticada y realizar un envío controlado a un destinatario propio, comprobando aceptación, recepción y baja. Mantener `MARKETING_EXECUTION_ENABLED=false` hasta esa validación. No hay evidencia de envío real en esta etapa.

## Evidencia local

- Migraciones aplicadas a `supabase_db_agency-manager`, sin tocar producción.
- 271 pruebas de Marketing, rutas y SMTP aprobadas en 29 archivos. Incluyen el editor de email, rechazo de inyección de encabezados, escape de HTML, bloqueo de SMTP interno, TLS, procesamiento sin duplicados, resultado incierto y baja por POST.
- Ocho suites SQL con fixtures sintéticos y rollback: seguridad, operaciones revisadas, workspace, controles de edición, listas, listas simples, seguimiento/frecuencia y email. Email verifica importación sin consentimiento implícito, aislamiento entre organizaciones, personalización, activación idempotente, reserva, recuperación, baja, métricas/historial y ACL privadas.
- Build `next build --webpack` completo y TypeScript correctos. 242 pruebas adicionales de regresión en 60 archivos, incluyendo seis SMTP ya contadas en el recorrido de Marketing. Preview en `localhost:3002` con ejecución deshabilitada. La sesión anterior caducó: revisión visual autenticada y prueba con SMTP real pendientes.

## Capacidades que siguen pendientes

SMS permanece deshabilitado. Recepción de respuestas de email en Inbox, webhooks de entrega/rebotes/quejas, métricas de apertura y facturación del proveedor requieren integraciones adicionales; no se representan como disponibles. Las herramientas administrativas de resolución de resultados SMTP inciertos no están integradas en la interfaz.

El formato de correo de esta etapa prioriza asunto, texto, personalización y baja. No incorpora un constructor visual de newsletters, adjuntos masivos o un catálogo de plantillas HTML; son ampliaciones independientes de esta integración.
