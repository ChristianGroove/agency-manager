# Etapa 10 — Campañas masivas y espacio de trabajo flotante

Fecha: 10 de octubre de 2026. Cambios locales en `codex/marketing-campaign-hardening`.

## Alcance del producto

El módulo vuelve a llamarse **Campañas masivas**. WhatsApp identifica el canal de la campaña actual, no el alcance futuro del módulo. Correo y SMS se muestran como pendientes de integración, sin controles que simulen disponibilidad.

Estado comprobado en el repositorio:

- `marketing-preflight-actions.ts` ofrece emisores activos `whatsapp_cloud` y `meta_whatsapp`.
- `marketing-actions.ts` valida campañas rápidas con `z.literal('whatsapp')` y pasos de tipo `whatsapp` o `delay`. La firma antigua que menciona correo/SMS no representa un envío implementado.
- `marketing-runner.ts` rechaza mensajes que no sean plantillas WhatsApp validadas. No hay procesamiento de campañas de correo/SMS en este motor.
- La integración futura requiere proveedores, configuración por canal, consentimiento/bajas apropiados, estados de entrega y validaciones específicas. Cambiar títulos o habilitar un selector no completa esa integración.

## Interfaz

Se toman como referencia los componentes existentes de Tasks y de su portal: `Dialog`, panel flotante con bordes redondeados, cabecera compacta fija, fondo `bg-card`, secciones `bg-muted/20`, controles e iconos pequeños y acciones persistentes. No se modifican Tasks ni sus portales.

- El listado abre la campaña en un modal flotante de hasta 92 % de la altura disponible, con cabecera y pie fijos y un único cuerpo desplazable. Los enlaces directos existentes siguen funcionando y abren el mismo espacio de trabajo sobre el listado.
- Dos vistas: **Preparación** y **Actividad**. Preparación reúne canal, filtros de destinatarios, mensaje y seguimiento, inicio/ventana horaria y ritmo. Segmentos, filtros adicionales y herramientas de autorización quedan desplegables.
- **Guardar configuración** reúne los guardados ya existentes. El contenido sigue guardándose explícitamente en su editor. Activar o reanudar requiere la revisión final original.
- Cerrar con cambios pendientes solicita confirmación; cerrar durante un guardado no se permite. Cambiar de vista conserva el formulario. Refrescar el listado al cerrar conserva filtros y paginación.
- Actividad muestra cuatro cifras: destinatarios, mensajes entregados, leídos y fallidos; además, progreso de procesamiento y pendientes. No confunde destinatarios con mensajes ni procesamiento con entrega.
- Los envíos ambiguos y las restricciones Meta permanecen visibles. Diagnóstico y desglose del motor quedan desplegables. El historial y su exportación se cargan solo al abrirlos.

## Ritmo visible

Tres tarjetas recuperan el selector visual: Conservador (`stealth`, base 180 s), Equilibrado (`growth`, base 30 s), Rápido (`turbo`, base 5 s). Se conservan los valores del motor y la variación opcional.

El control anterior no se había eliminado del procesamiento: estaba dentro de programación avanzada. Los colores indican cadencia; no certifican seguridad ni garantizan evitar restricciones de Meta. Los intervalos siguen compartidos entre campañas del mismo número.

## Integridad y límites

No se modifican proveedores, webhooks, credenciales, outbox, planificación del motor, automatizaciones, asignación de leads, Inbox ni multimedia. No hay migración nueva ni cambios en datos de producción.

El guardado agrupado utiliza las operaciones autorizadas existentes; no es una transacción nueva. Si falla una operación posterior, los campos ya guardados conservan su estado y los pendientes siguen marcados como cambios sin guardar. La revisión final permanece bloqueada mientras exista configuración pendiente. La prueba correspondiente verifica este caso.

No se habilita `MARKETING_EXECUTION_ENABLED`, no se activa ninguna campaña ni se hacen envíos reales.

## Verificación

- Suite Marketing: 205 pruebas en 23 archivos, incluida preservación de filtros y timestamps, protección de campañas pausadas, reordenamiento con el orden completo, guardado agrupado parcial, cadencia, cierre durante guardado y apertura mediante modal.
- TypeScript: `npx tsc --noEmit --incremental false`, correcto.
- `npm run build`: correcto. Se conserva el aviso previo de configuración local de FlowsCrypto; no se modifica ese módulo.
- Regresión: 213 pruebas en 66 archivos para mensajería, Meta, canales, automatizaciones, multimedia, endpoints de Marketing y leads, correctas. Los proveedores externos están simulados en estas pruebas; no equivalen a una nueva prueba Meta Live.
- Evidencia local de build y regresión: `tmp/marketing-stage10-build.log` y `tmp/marketing-stage10-regression.log` (ignorados por Git).
- La herramienta del navegador falla al inicializar por `helper_unknown_error`. No se declara una validación visual ni una prueba autenticada en navegador. El build local en el puerto 3001 permite la revisión visual por el usuario.

Estos cambios permanecen locales; no constituyen activación ni despliegue a producción.
