# Segunda entrega de Gemini: revisión de integración pendiente

Fecha: 2026-10-12. La revisión editorial contra código continúa a cargo de Gemini. Codex no ha publicado este lote ni actualizado el corpus activo.

## Comprobaciones completadas

- `help:validate`: 20 artículos y 65 preguntas estructuralmente válidos.
- Comparación SHA-256: los 20 borradores y todas las evidencias declaradas en el manifiesto coinciden con sus archivos actuales, incluidos los cambios tácticos recientes.
- Q29 incluye términos de bienvenida y evidencia del disparador; Q49 ahora usa audiencia `tenant-admin`; Q60 apunta al artículo de pipeline actualizado. Estas observaciones no certifican procedimientos.
- La entrega permanece dentro de `drafts/`; el corpus publicado del piloto no se ha reemplazado.

## Incidencia de filtros: reportes y pipeline

La nueva guía `crm.manage-pipeline` incorpora `/crm/reports`, pero el manifiesto solo exige `core_crm` y `crm.leads.view`. El registro del menú de `src/modules/core/saas/module-config.ts` vincula `/crm/reports` a `parentModule: module_crm_reports`, con `allowedRoles: ['owner']`.

Esto demuestra una diferencia de disponibilidad del control del menú, no por sí solo la política de ejecución del backend. Gemini debe verificar ambas antes de aprobar la guía. La inclusión de procedimientos con disponibilidades distintas bajo un único filtro puede ofrecer instrucciones de reportes a quien solo tiene pipeline.

Entrega solicitada:

1. Separar reportes en una guía dedicada, conservando la guía de pipeline para sus usuarios actuales; comprobar sus filtros propios de módulo, audiencia y permisos mediante evidencia real.
2. Distinguir visibilidad del menú, posibilidad de consultar la guía y autorización efectiva de páginas/acciones. No afirmar un guard backend basándose solo en `allowedRoles` del menú. Si hay contradicción, registrarla en `gaps.md`.
3. Ajustar Q60 al ID dedicado y actualizar inventario, evidencias, handoff y snapshot completo. No añadir `module_crm_reports` como requisito global a la guía de pipeline, porque excluiría procedimientos de pipeline a usuarios sin reportes.
4. No ampliar filtros, quitar permisos ni modificar código para que la pregunta pase.

## Incidencia de evaluación

El handoff afirma 65/65 hits y 100% en todas las preguntas. El banco actual tiene 56 casos `answer`, 4 `clarify` y 5 `abstain`. La recuperación léxica se evalúa contra los casos de respuesta; los otros nueve requieren validación de comportamiento, no un hit de artículo.

Corregir la afirmación y registrar método/comando y denominadores reales. El resultado de una simulación propia no debe presentarse como prueba ejecutada del pipeline de Codex, ni como certificación de la IA. Una vez integrado el candidato, Codex ejecutará el evaluador oficial con verticales compatibles y las regresiones técnicas.

## Cierre

Gemini escribe solo en `drafts/`, ejecuta `help:validate`, identifica su autoría y recalcula los hashes tras revisar fuentes. No publica ni hace commits. Codex validará y activará el snapshot cuando estas incidencias estén resueltas. El piloto actual continúa disponible en localhost:3005, con las correcciones de tono y diagnóstico ya instaladas.
