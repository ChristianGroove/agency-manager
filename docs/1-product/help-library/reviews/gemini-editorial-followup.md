# Corrección editorial antes del piloto

Revisión: 2026-10-12. `help:validate` pasa para 18 artículos y 60 preguntas. Esto comprueba estructura y referencias, no exactitud semántica. Se revisó una muestra del primer lote; los otros módulos todavía no tienen aprobación editorial.

## Encargo acotado para Gemini

Conserva el mismo checkout/rama y las restricciones del encargo original. Edita solamente `docs/1-product/help-library/drafts/`. No añadas nuevos módulos en esta pasada. Corrige los puntos siguientes y busca el mismo patrón en los otros artículos y las 60 preguntas. No cambies código, dependencias, configuración, bases de datos ni Git.

1. **`pet.pet-interaction.md`: seguimiento del cursor.** `src/modules/core/pet/robot-head-view.tsx`, `RobotHeadView`, define `tracking = settings.interactive && state === 'idle' && finePointer`. El reposo contextual no impide el seguimiento cuando `tracking` está activo. Pausan la animación la hibernación, movimiento reducido, pestaña no visible, fuera del viewport y animación apagada. Explica el control de seguimiento y esos límites; no atribuyas el fallo al reposo contextual como regla general.
2. **`theme.toggle-theme.md`: diagnóstico no demostrado.** La interferencia de Dark Reader u otras extensiones no está comprobada por las fuentes citadas ni por una prueba realizada. Elimina esa causa o identifícala claramente como posibilidad general no verificada, nunca como causa del caso del usuario. Revisa también afirmaciones sobre fatiga visual y garantías de aplicación a toda la interfaz: describir la apariencia no requiere promesas médicas o absolutas.
3. **`dashboard.overview.md`: capacidad y permiso.** `billing.management` es una capacidad del registro de organizaciones, no un permiso IAM granular. Distingue módulos habilitados, capacidades y permisos. No garantices que todas las métricas respetan permisos específicos sin aportar la evidencia de cada consulta; no se observó una filtración, pero la afirmación general no está verificada por la mera existencia del dashboard.
4. **`help.chat-and-history.md`: versión del contexto.** La ayuda legacy usa cuatro mensajes; la nueva tarea v2 usa hasta doce mensajes completos bajo presupuesto de 10.000 caracteres, y está detrás del piloto. Aclara la diferencia o evita fijar un único límite en la guía general. No presentes v2 como ya activo. El historial se ordena por creación del hilo, no por la última actividad.
5. **Privacidad, disponibilidad y fallos.** Distingue comportamiento nominal de condiciones: si falla el guardado del historial aparece un aviso y puede haber mensajes que no persistan. Tener archivos no garantiza habilitación del módulo ni funcionamiento en navegador. No certifiques disponibilidad remota con comprobaciones hechas solo en local.
6. **`questions.json`: expectativas del usuario.** Corrige los puntos esperados y las afirmaciones prohibidas que dependan de los artículos anteriores. Evita exigir que una respuesta al usuario mencione SDKs, hooks o nombres de librerías. Conserva preguntas de abstención/clarificación, permisos, funciones retiradas y seguimientos. El conjunto aún no fue evaluado contra respuestas reales del modelo.

Mantén los artículos en `draft` y `verification: source-only`. Referencia los archivos actuales de la rama, actualiza `source_revision` cuando corresponda y explica en `handoff.md` qué cambió y qué sigue requiriendo pruebas manuales. Ejecuta `npm run help:validate` y deja el resultado registrado. No publiques ni generes aprobaciones.

## Trabajo que conserva Codex

Revisión independiente de las correcciones y filtros reales de publicación; evaluación del recuperador; aprobación de un subconjunto del piloto; build y activación únicamente local; comparación de respuestas; correcciones de integración. La verificación de navegador sigue con el usuario. Contenido de módulos restantes se amplía después de validar el formato y la calidad del piloto.
