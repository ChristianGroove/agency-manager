# Arquitectura de Campañas masivas

Actualizada el 15 de octubre de 2026 para la revisión local de `master`, base `372884cb`. Integra el cierre de interfaz posterior a los dos commits locales de creación/edición.

El [cierre de implementación](../../marketing/README.md) es la referencia de alcance, validación, migraciones y operación. Los reportes por etapa conservan el historial de decisiones.

## Producto y canales

El módulo `broadcasts` administra campañas y seguimientos. Esta versión ejecuta **plantillas WhatsApp y esperas** sobre conexiones activas `whatsapp_cloud` y `meta_whatsapp` del tenant. También ejecuta email mediante el SMTP verificado del tenant, con asunto, texto y bajas propias. SMS sigue siendo una integración futura. Meta Ads pertenece a su módulo independiente.

La interfaz usa listado paginado y un modal con Preparación y Actividad. El recorrido principal es nombre/emisor → mensaje → destinatarios → guardar o iniciar/programar. Envío reúne horario y cadencia en una sección compacta; Actividad muestra progreso, incidencias e historial, con diagnóstico desplegable. Segmentos y filtros adicionales permanecen opcionales. No existe una confirmación visual adicional de inicio; el servidor conserva su revisión transaccional.

## Componentes y estado del editor

- `CampaignWorkspaceSheet` coordina el modal, cambios pendientes, cierre/descarte y actualización del listado tras una mutación.
- `CampaignBuilder` concentra el formulario y el guardado previo a iniciar/programar/reanudar. El primer mensaje se prepara en memoria; abrir/cancelar no crea borradores. Un guardado parcial conserva el ID y permite reintentar sin duplicar la campaña.
- `CampaignDialog` y `CampaignDiscardDialog` aportan presentación y controles accesibles; importación y autorización conservan revisiones explícitas con menos texto.
- `marketing-workspace.ts`, `marketing-actions.ts` y `marketing-preflight-actions.ts` aplican permisos y contratos de persistencia/revisión. Un borrador antiguo sin audiencia no se considera modificado solo por abrirlo.
- `marketing-client-api.tsx` centraliza las operaciones del cliente y permite un adaptador aislado de ejemplos. Las acciones no implementadas por ese adaptador fallan sin recurrir a acciones reales.
- `/crm/marketing/examples` presenta catorce casos con los mismos componentes y estado en memoria; solo existe en desarrollo y devuelve `notFound()` en producción. No inserta fixtures en la base.

## Datos y autorización

- `marketing_campaigns`, secuencias y pasos: diseño, configuración y snapshot de ejecución; el diseño activado se protege frente a cambios.
- `marketing_enrollments`: inscripción de un contacto, paso actual, siguiente ejecución, estado y claim/lease.
- Listas y miembros: selección reutilizable con vínculos compuestos por organización. No duplican identidades del CRM por campaña.
- Consentimiento/revocaciones y tickets de revisión: actor, tenant, operación y conjunto revisado. Importación y autorización externa son acciones diferentes.
- Outbox Meta: operación estable por inscripción y paso, resultados aceptados/inciertos/fallidos y conciliación mediante la infraestructura existente.
- Reservas de frecuencia: ritmo compartido por número físico y espera opcional por tenant/destinatario entre campañas.

RLS, permisos de aplicación y funciones privadas verifican el alcance de organización. Activación e importación usan confirmaciones transaccionales/idempotentes; no se confía en un identificador de organización enviado por el navegador para otorgar acceso.

## Email mediante SMTP

La [etapa 14](../../marketing/implementation-stage-14.md) describe el canal email, sus cuatro migraciones y sus requisitos operativos. Usa `execution_version=3`, un outbox privado por inscripción/paso y permisos independientes de WhatsApp. El worker comparte claims entre canales, pero el despacho SMTP permanece separado de Meta y del correo transaccional. Aceptación del servidor no equivale a entrega ni lectura; respuestas de email no ingresan a Inbox.

## Ejecución

1. La acción explícita de inicio guarda los cambios y solicita una revisión vigente que valida conexión, plantilla, parámetros, audiencia, consentimiento y exclusiones. Confirma con un ticket de diez minutos ligado al actor, organización, operación, diseño y audiencia; vuelve a comprobarlo y fija el snapshot. Se bloquea el doble clic y una respuesta incierta exige actualizar el estado antes de otro intento.
2. `scripts/marketing-worker.mjs` invoca la ruta protegida `/api/marketing/run`; el flag `MARKETING_EXECUTION_ENABLED` controla la ejecución. El cron de mantenimiento de canales no sustituye este programador.
3. `marketing-runner.ts` adquiere trabajos con claims/leases y `SKIP LOCKED`, comprueba estado y procesa la secuencia. Pausa/reanudación conserva las inscripciones.
4. El despacho reutiliza `outboundService` y el outbox Meta existentes. Antes de enviar se comprueban baja, salud, plantilla, horario, ritmo del número y controles de campaña. No se utiliza `MarketingAPIManager` como motor operativo de esta versión.
5. Las operaciones aceptadas avanzan según su contrato; la entrega se concilia con los estados existentes. Resultados inciertos no se reenvían ciegamente y quedan visibles para revisión.
6. Una respuesta real del destinatario bloquea los siguientes pasos. Historial importado, ecos salientes y mensajes de otro emisor no cuentan como respuesta de esa inscripción.

La detección de respuesta ocurre al procesar/recuperar el siguiente paso y antes de reservar un envío. No es un trigger nuevo sobre recepción. No puede retirar una llamada Graph ya iniciada ni detectar un webhook que todavía no llegó.

## CRM y canales existentes

Los contactos importados nuevos se almacenan en `leads` como `prospect`/`marketing_contact`; usar esa tabla no implica que sean oportunidades comerciales. La transición explícita a una etapa comercial activa los convierte en `lead`. Entrega, lectura y respuesta no hacen esa conversión por sí solas. Las consultas de analítica de leads filtran el tipo comercial.

Los guards añadidos al envío común se limitan a claves de operación de campaña. No se reemplazan parsers entrantes, adapters, formatos de audio/multimedia ni la conciliación general de Inbox. Los detalles y cambios concretos de CRM se documentan en las etapas 11–13; no se afirma ausencia absoluta de impacto sin prueba de producción.

## Métricas, límites y operación

Actividad distingue procesamiento de destinatarios, aceptación WhatsApp/SMTP, entregas/lecturas WhatsApp, fallos e incertidumbre. La tasa de entrega solo usa aceptaciones WhatsApp como denominador; sin ellas no hay tasa disponible. Historial y exportación usan permisos por tenant; aceptar una solicitud del proveedor no equivale a entregar al destinatario. Refrescar resultados actualiza también el historial sin perder filtros.

El worker adquiere hasta 25 trabajos por ciclo y reserva presupuesto para finalización. La capacidad comercial depende de scheduler, latencia, volumen y número de emisores; no se ha acreditado throughput real de gran escala. La importación simple está acotada a 1.000 filas/5 MB; archivos mayores requieren trabajo asíncrono futuro.

La [verificación del 15 de octubre](../../marketing/integrated-verification-2026-10-15.md) registra 295 pruebas, ocho suites SQL con rollback, concurrencia aislada sin leases duplicados, revisión visual autenticada y build completo. El endpoint local autentica con ejecución deshabilitada. Crear/guardar/reabrir con un emisor real y recibir mensajes permanece pendiente del piloto aplazado por el usuario.

La aplicación remota de dieciséis migraciones y la configuración de Coolify están documentadas como antecedentes del 13 de octubre en el [índice vigente](../../marketing/README.md); esta revisión no volvió a validar ni modificar el destino remoto. El ledger local no contiene esas versiones, aunque los contratos existen y pasan las suites: no reaplicar a ciegas. El [estado y manual del módulo](../../marketing/module-state-2026-10-15.md) detalla puesta en marcha y evolución pendiente. Los controles de cadencia/salud no garantizan evitar restricciones de proveedores ni reemplazan sus requisitos.
