# Etapa 8: campañas WhatsApp con un recorrido simple

Continuación: [etapa 9, reordenamiento y filtros avanzados](implementation-stage-9.md). Resuelve los controles de orden y fechas/asignación que este reporte dejaba pendientes.

10 de octubre de 2026. Rama `codex/marketing-campaign-hardening`; continuación de la auditoría aprobada en `58cb936f`. Implementación local: no despliegue, push, cambios de secretos, conexiones reales ni activación de campañas.

## Resultado

El módulo mantiene el motor existente y simplifica su uso habitual. Se crea un borrador con nombre y se abre ese mismo borrador: **Destinatarios → Mensaje → Programación → Revisión**. Resultados e historial están dentro de la campaña. Guardar cada parte es explícito y no inscribe ni envía mensajes.

- Una entrada **Nueva campaña**, sin elegir entre creación rápida y constructor. Se retiró `CreateBroadcastSheet`; sus acciones backend existentes no se eliminaron.
- Canal visible al principio, elegibles/exclusiones verificables y filtros conservados. Los segmentos reutilizables son opcionales y se consultan por páginas; pueden copiarse al borrador o guardarse expresamente para reutilizar sus filtros.
- Un mensaje habitual, con plantilla aprobada del emisor guardado, variables y vista previa de un contacto ficticio. La vista previa no modifica las variables ni construye mensajes reales.
- Seguimiento opcional como lista lineal, con mensajes y esperas en minutos, horas o días. Las secuencias antiguas se conservan; solo la principal se ejecuta y las otras quedan en un apartado avanzado.
- Fecha de inicio, zona y ventana diaria visibles. El intervalo está en avanzado, sin nombres que prometan evitar restricciones. Las configuraciones anteriores sin ventana siguen sin ventana; un cambio de zona no redondea la fecha UTC guardada a minutos.
- Cambios pendientes por sección: guardar destinatarios no borra la programación sin guardar. La revisión final queda bloqueada hasta guardar emisor, destinatarios y programación. El ticket, snapshot, confirmación, permisos y bloqueo por ejecución deshabilitada existentes se conservan.
- Campañas activas, pausadas, completadas y archivadas muestran su estado real; el diseño queda en modo lectura. Pausa y revisión de reanudación usan las acciones existentes. Los borradores pueden eliminarse; las campañas ejecutadas se archivan conservando historial.

## Alcance Meta Ads y datos mostrados

Se retiraron Historial/Métricas vacíos del dashboard, los textos Ads de ese apartado y la pestaña demo `MarketingTab` del panel interno `MetaControlSheet`. Sus indicadores de gasto/ROI/compras/cuotas eran constantes. El módulo `/crm/meta-ads`, sus servicios, credenciales e integraciones no se modificaron.

La lista usa una tabla compacta con búsqueda, estado, emisor, programación y resultados reales. El progreso mide destinatarios que terminaron o fallaron/cancelaron su secuencia; no simula una tasa de entrega. Aceptado por Meta, entregado y leído tienen conteos separados. Un mensaje leído se incluye en entregados. Se retiraron `engagement_score` y `total_enrolled` de la presentación.

Resultados conserva historial/exportación y muestra cola, envío, fallos, estados ambiguos, salud/restricciones del canal y actividad del motor. La revisión de una restricción sigue vinculada a su marca temporal; no reenvía resultados ambiguos. La ayuda describe WhatsApp, consentimiento y revisión, sin prometer Email/SMS ni cientos de mensajes en segundos.

## Lecturas y aislamiento

Migración nueva: `supabase/migrations/20261010040000_marketing_workspace.sql`.

- Campañas y segmentos: páginas de 20 con cursor `(created_at, id)` y búsqueda literal, sin cargar todas las campañas ni una consulta de métricas por card. Los resúmenes de la página se calculan en una RPC. Se añaden índices de organización/fecha/ID para ambos listados.
- La sesión autenticada deriva el tenant en servidor. Las RPC verifican membresía activa y permiso; las campañas también exigen autorización del canal. No devuelven credenciales. No se permite al cliente imponer otro tenant.
- La audiencia de la campaña se lee directamente; el editor no descarga todos los segmentos. Guardar filtros bloquea el borrador en una transacción y crea/reutiliza una audiencia propia. Si la audiencia original es un segmento compartido, se copia y se conserva el original y sus otras campañas.
- La actualización periódica se limita a la página activa o los resultados visibles cada 20 segundos. No refresca todas las campañas del tenant ni reinicia el formulario. Las respuestas anteriores de una campaña/consulta se descartan.

La migración fue aplicada solo en Docker local. Para desplegar esta etapa se requiere aplicar esta migración después de las de Marketing anteriores y desplegar su frontend/backend juntos. No habilita envíos ni migra inscripciones existentes.

## Verificación

- Marketing: **188 pruebas correctas en 23 archivos**. Incluye lectura/guardado por permisos y tenant, creación expresa, conservación de filtros avanzados y programación pendiente, campañas pausadas en lectura, estados reales, UTC exacto, esperas heredadas y vista previa ficticia sin mutaciones.
- SQL real en Docker: `marketing-workspace.sql`, `marketing-security.sql` y `marketing-reviewed-operations.sql` correctos, con fixtures sintéticos y `ROLLBACK`. La suite nueva verifica paginación determinista sin repetición, permiso de canal/membresía/tenant, copia del segmento compartido, protección de campañas no borrador y distinción entre aceptación y recibos de lectura/entrega. No se encolaron ni despacharon mensajes.
- TypeScript sin incremental: correcto.
- Regresión de Inbox, canales, servicios Meta, automatizaciones, multimedia privada, rutas de Marketing y gestión de leads: **213 pruebas correctas en 66 archivos**. La primera ejecución pasó 212 de 213; el caso restante de desconexión agotó 5 segundos durante otras verificaciones. Pasó aislado y después en la suite completa, con un límite de 15 segundos exclusivo del comando de verificación; no se modificó código ni prueba. Se utilizó una clave ficticia exclusiva del proceso de tests, sin cambiar secretos del entorno.
- Build local de producción: correcto. Advertencia de FlowsCrypto por una clave local no disponible en un módulo que no se modificó.
- La herramienta de navegador no pudo iniciar por fallo de su proceso de control. Las pruebas de interfaz son automatizadas con componentes reales y servicios simulados; **no se presenta esta etapa como validación visual en navegador ni Meta Live**.
- El build nuevo se inició en `http://localhost:3001/crm/marketing` para revisión manual. La comprobación HTTP local respondió 200; eso confirma disponibilidad, no una sesión autenticada ni el recorrido visual.

## Límites y siguientes pasos

Se mantuvieron emisor, outbox, recepción de webhooks, reconciliación de estados, conversión de audio, visualización de multimedia, asignación y ejecución de automatizaciones. Los cambios compartidos están limitados a retirar la pestaña demo del panel interno y dos textos de traducción propios de Marketing. El nuevo campo `canManage` en autorización no altera la evaluación de permisos existente.

Antes de activar: revisión visual local y una campaña real pequeña con consentimiento, programador, entregas/lecturas y baja. Las pruebas locales no certifican entregabilidad, ausencia de bloqueos Meta ni capacidad a miles de tenants.

Deuda conservada y priorizada:

1. Reordenar pasos exige una operación transaccional específica: la protección existente prohíbe cambiar libremente `order_index`. Esta etapa permite añadir, editar y eliminar; no debilitó esa protección para introducir Subir/Bajar.
2. Traducir las cadenas nuevas en el catálogo completo de idiomas. La interfaz nueva está en español; no se presenta como cobertura internacional completa.
   Los filtros heredados de asignación/fechas se conservan y se muestran, pero esta etapa no añade selectores para editarlos; los controles nuevos editan estado, etiquetas, origen, puntaje y presencia de email. Completar esos selectores requiere un recorrido accesible de búsqueda de usuarios/fechas, sin exponer identificadores técnicos al usuario.
3. Medir planes/latencia y capacidad del worker con volumen representativo antes de añadir concurrencia limitada, resúmenes materializados o preparación por lotes. Los nuevos índices/páginas reducen lecturas de interfaz, sin constituir un SLA de alta escala.
4. Importaciones grandes con job, archivo privado, progreso y cancelación; esta versión conserva el límite declarado de 100 filas/1 MB por revisión.
5. Retención de revisiones sin actividad y conservación de historial ante eliminación de contactos, según las etapas 6 y 7.

No se implementaron presupuestos, cobros ni alertas. No se habilitó `MARKETING_EXECUTION_ENABLED`.
