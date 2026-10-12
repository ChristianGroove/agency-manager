# Cierre del tramo dashboard y preparación de portales

Fecha: 2026-10-12. Rama: `pixyrobotpet`, worktree aislado `tmp/pet-workspace`. Commit local de cierre: consultar historial Git de esta entrega; no se ha publicado ni desplegado remotamente.

## Resultado integrado

- Biblioteca de 21 artículos con revisión editorial de Gemini. Snapshot aceptado: `gemini-source-reviewed-final-20261012.json`. Corpus: `53af2a393ba3be9a251c17fa1961aa0fdfc1ca307f7059f5768b50b767fdb6b7`.
- Pipeline acepta borradores/evidencias con hashes actuales y filtros canónicos. Se conservan las guías anteriores; reportes CRM tiene guía propia con `module_crm_reports`, separada del pipeline `core_crm`.
- Q29 y Q49 corregidas por Gemini; Q60 enlaza la guía dedicada de reportes. Diferencias legacy/V2 y navegación/backend documentadas en gaps.
- Evaluador oficial offline: 56/56 casos de respuesta recuperan un ID esperado, sin casos pendientes por falta de artículo. Otros 4 casos `clarify` y 5 `abstain` no se cuentan como hits. No certifica calidad de respuesta del modelo ni autorización de ejecución del producto.
- Regresión táctica de acciones/biblioteca/componentes: 54 pruebas en 10 archivos correctas. Pipeline: 7 aserciones sintéticas correctas. Compilación de producción correcta y servidor local reiniciado en 3005 con el piloto Pixy y diagnóstico habilitados. Siete documentos de operación/preparación comprobados sin enlaces locales rotos; `git diff --check` correcto.
- Robot, branding, hibernación, chat/historial privado, Markdown, barras fluidas, tono y diagnóstico permanecen en el piloto del dashboard. Historial antiguo no se reescribe. Pruebas reales/visuales a cargo del usuario, que reportó funcionamiento general favorable.

## Riesgo técnico registrado, no corregido en este tramo

Gemini documentó en `drafts/gaps.md` la diferencia entre el menú de reportes CRM (módulo independiente y visibilidad owner) y la acción de analytics (verificación de organización sin el mismo guard de rol/módulo). La guía distingue visibilidad de autorización backend; publicar ayuda no corrige esa discrepancia. Antes de ampliar acceso/desplegar, revisar la acción/RPC y su política efectiva, mediante una intervención de seguridad separada con pruebas de regresión.

## Operación y pendientes

Piloto únicamente local en Pixy; no hay migración ni ampliación a todos los tenants por este cierre. Diagnóstico activo local sin cuerpos de mensajes. El límite sigue en memoria; no hay streaming, acciones ni acceso a datos actuales desde el asistente.

Puerta de entrada para futuros agentes: [mantenimiento](../../../3-development/operations/pixy-help-maintenance.md). Plan siguiente: [Tasks](../../../2-architecture/modules/pixy-help-tasks-portal-plan.md).

1. Entregar a Gemini el [encargo de biblioteca del portal Tasks](../../../3-development/operations/gemini-tasks-portal-help-brief.md).
2. Táctico: implementar superficie/capacidades y resolver de portal con controles token/PIN; decidir cuotas compartidas y contrato de historial.
3. Integrar biblioteca del portal tras revisión, activar piloto local por tenant y ejecutar matriz de aislamiento.
4. Usuario: comprobar portal y respuestas por perfil, PIN, móvil y preguntas fuera de Tasks.

Tasks está preparado a nivel de diseño y encargo; todavía no tiene robot de ayuda activo ni se han creado tablas/sesiones de ayuda del portal. No anunciarlo como implementado por la presencia de estos documentos.
