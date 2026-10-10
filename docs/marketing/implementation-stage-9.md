# Etapa 9: orden de seguimiento y filtros legibles

10 de octubre de 2026. Continuación local de `dd4d5b06` en `codex/marketing-campaign-hardening`. No despliegue, push, cambios de credenciales/webhooks ni envíos reales.

## Qué queda resuelto

- Cada paso del seguimiento puede **Subir/Bajar**. Se guarda solo el orden, sin reconstruir pasos, plantillas ni inscripciones. El movimiento es explícito; cargar la pantalla no modifica nada. Los extremos y las campañas que no son borradores quedan bloqueados.
- La operación verifica sesión, tenant, permiso de edición, canal y secuencia del borrador. Compara el orden esperado con el actual y exige todos los pasos una sola vez; admite hasta 500. Un cambio concurrente a otro orden exige recargar. Repetir el mismo destino tras perder una respuesta es seguro.
- La protección que impedía modificar libremente `order_index` sigue funcionando. La RPC crea capacidades privadas con los destinos exactos de cada paso y el ID de transacción, aplica el cambio y las elimina antes de retornar. Ninguna sesión cliente ni `service_role` puede escribir/leer esa tabla. Un error revierte la transacción; no hay un indicador de sesión falsificable que desbloquee el trigger.
- El borrador se bloquea antes de modificar pasos. Si una edición concurrente ya tiene un paso bloqueado, la operación falla sin esperar ese paso, evitando un ciclo de bloqueos padre/hijo. El orden de lectura desempata por ID para que la comparación sea determinista incluso con datos heredados.
- Una revisión de activación anterior deja de ser válida al cambiar el orden; se conserva la comprobación del fingerprint existente. Las campañas pausadas o con versión de ejecución congelada no pueden reordenarse, aunque algún registro antiguo declare estado borrador.
- Los filtros avanzados permiten editar fechas de creación y última actividad y elegir responsable por nombre. La búsqueda de responsables consulta páginas de 20, dentro del tenant, y se carga al abrir el apartado. No muestra UUID, correos, tokens ni usuarios de otros tenants.
- Un responsable guardado que ya no está activo sigue siendo legible y conserva su filtro. No se selecciona otro ni se elimina implícitamente; el usuario puede quitarlo expresamente. Respuestas tardías de una selección anterior se descartan.
- Las fechas se muestran en hora local del navegador. Editar una no redondea ni sustituye otras fechas UTC almacenadas. Fechas iniciales posteriores a finales o puntaje mínimo mayor al máximo generan un error y no se guardan por las acciones de Marketing.

No se añadieron nuevas pantallas, un canvas, otro motor de campañas, presupuestos, cobros ni alertas.

## Base de datos y compatibilidad

Migración: `supabase/migrations/20261010050000_marketing_editor_controls.sql`, después de `20261010040000_marketing_workspace.sql` y sus dependencias anteriores. Aplicada solo en Docker local. Añade la tabla privada de capacidades, la RPC de orden y la lectura limitada de responsables; amplía el trigger de orden sin retirar el de integridad ni sus reglas de congelamiento. No migra o reinscribe destinatarios.

No se modificaron emisor, outbox, webhooks, reconciliación de estados, audio/multimedia, asignación CRM ni automatizaciones. La elección de responsable es un **filtro de destinatarios**; no reasigna contactos. La validación de rangos afecta la preparación/guardado de filtros, no el procesamiento de ejecuciones congeladas.

## Verificación

- **199 pruebas de Marketing correctas en 23 archivos**. Incluye controles de movimiento, orden completo enviado al servidor, validación de payloads/tenant, filtros de fechas que conservan precisión, selección expresa por nombre y rechazo de respuestas tardías.
- **213 pruebas de regresión correctas en 66 archivos**: mensajería, servicios Meta, canales, automatizaciones, multimedia privada, rutas de Marketing y leads. Clave de cifrado ficticia exclusiva del proceso de tests y timeout de 15 segundos; sin modificar el entorno de la aplicación.
- TypeScript sin incremental: correcto.
- Cuatro suites SQL locales correctas: editor, workspace, seguridad y operaciones revisadas. Todas usan fixtures sintéticos y `ROLLBACK`. La nueva comprueba movimiento e idempotencia, contenido intacto, orden desactualizado/duplicado, tenant/canal/denegación explícita, imposibilidad de modificar el orden por UPDATE directo o por un indicador de sesión, tabla privada inaccesible, capacidad eliminada, revisión antigua inválida y campañas pausadas/congeladas protegidas. Comprueba responsables paginados, inactivos y extranjeros. No se crearon inscripciones ni operaciones de salida.
- Build local de producción: correcto; conserva la advertencia local de FlowsCrypto de un módulo no modificado. Localhost se actualizó con este build en el puerto 3001 para revisión manual.
- Revisión con la guía React: carga del selector bajo demanda, consultas limitadas, rechazo de respuestas tardías y controles etiquetados/deshabilitados por estado. La herramienta de navegador volvió a fallar al iniciar; no se afirma revisión visual ni Meta Live.

## Antes de activar y deuda restante

Con esta etapa se resuelven el reordenamiento y los selectores de filtros que se dejaron pendientes en la etapa 8. Siguen pendientes:

1. Revisión visual local del recorrido y una campaña real pequeña con consentimiento, programador, recibos y baja. No habilitar masivos por haber pasado únicamente las pruebas simuladas/locales.
2. Traducciones completas de las cadenas nuevas.
3. Medición de capacidad/latencia con volumen representativo; jobs de importación grande y eventual preparación por lotes/concurrencia según mediciones.
4. Retención periódica de revisiones sin actividad y conservación del historial ante eliminación de contactos, documentadas en las etapas 6 y 7.

La ejecución masiva permanece deshabilitada. Esta etapa no certifica ausencia de bloqueos Meta ni un SLA comercial de alta escala.
