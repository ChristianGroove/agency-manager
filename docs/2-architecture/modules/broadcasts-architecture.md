# Arquitectura de Campañas masivas

Actualizada el 10 de octubre de 2026 para `codex/marketing-campaign-hardening`, implementación `8f82db13`.

El [cierre de implementación](../../marketing/README.md) es la referencia de alcance, validación, migraciones y operación. Los reportes por etapa conservan el historial de decisiones.

## Producto y canales

El módulo `broadcasts` administra campañas y seguimientos. Esta versión ejecuta **plantillas WhatsApp y esperas** sobre conexiones activas `whatsapp_cloud` y `meta_whatsapp` del tenant. Correo y SMS son integraciones futuras; sus tipos históricos o servicios presentes en otros módulos no acreditan campañas operativas en este motor. Meta Ads pertenece a su módulo independiente.

La interfaz usa listado paginado y un espacio flotante con Preparación y Actividad. El recorrido principal es canal → mensaje → destinatarios → revisión y envío. Segmentos, filtros adicionales y programación permanecen opcionales.

## Datos y autorización

- `marketing_campaigns`, secuencias y pasos: diseño, configuración y snapshot de ejecución; el diseño activado se protege frente a cambios.
- `marketing_enrollments`: inscripción de un contacto, paso actual, siguiente ejecución, estado y claim/lease.
- Listas y miembros: selección reutilizable con vínculos compuestos por organización. No duplican identidades del CRM por campaña.
- Consentimiento/revocaciones y tickets de revisión: actor, tenant, operación y conjunto revisado. Importación y autorización externa son acciones diferentes.
- Outbox Meta: operación estable por inscripción y paso, resultados aceptados/inciertos/fallidos y conciliación mediante la infraestructura existente.
- Reservas de frecuencia: ritmo compartido por número físico y espera opcional por tenant/destinatario entre campañas.

RLS, permisos de aplicación y funciones privadas verifican el alcance de organización. Activación e importación usan confirmaciones transaccionales/idempotentes; no se confía en un identificador de organización enviado por el navegador para otorgar acceso.

## Ejecución

1. La revisión previa valida conexión, plantilla, parámetros, audiencia, consentimiento y exclusiones. La confirmación vuelve a comprobar la revisión y fija el snapshot.
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

Actividad muestra destinatarios, entregados, leídos y fallidos, con progreso y pendientes separados. Historial y exportación usan permisos por tenant; aceptar una solicitud del proveedor no equivale a entregar al destinatario.

El worker adquiere hasta 25 trabajos por ciclo y reserva presupuesto para finalización. La capacidad comercial depende de scheduler, latencia, volumen y número de emisores; no se ha acreditado throughput real de gran escala. La importación simple está acotada a 1.000 filas/5 MB; archivos mayores requieren trabajo asíncrono futuro.

Las pruebas automatizadas y build están registradas en la [etapa 13](../../marketing/implementation-stage-13.md). Migraciones aplicadas solo en Docker; ejecución masiva de producción no habilitada. Revisión visual autenticada y campaña real pequeña pendientes. Los controles de cadencia/salud no garantizan evitar restricciones de proveedores ni reemplazan sus requisitos.
