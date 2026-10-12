# Diagnóstico técnico de ayuda y regresión de conversaciones

Fecha: 2026-10-12. Implementación en `pixyrobotpet`. La revisión documental de la biblioteca continúa a cargo de Gemini.

## Activación y datos

`PIXY_HELP_DIAGNOSTICS_ENABLED=true` habilita un registro JSON `[PixyHelp]` en el servidor por solicitud completada. El valor debe ser exactamente `true`; por defecto está apagado. No se requiere migración ni existe un panel de métricas en esta entrega.

El registro incluye identificador aleatorio de solicitud, UUID de tenant cuando existe, modo legacy/V2, resultado técnico, etapa del fallo, revisión del corpus, cantidad de guías autorizadas, IDs finales de guías, origen y cantidad del historial, uso de selección asistida, intentos de llamadas al motor, aviso de almacenamiento, tiempo total y tiempos medidos por etapa. No incluye usuario, thread, ruta actual, preguntas, respuestas, cuerpos del historial, catálogo, prompts, claves ni errores del proveedor. Solo se guardan metadatos en los logs existentes, no en una tabla nueva.

Los tiempos incluyen sesión, carga de historial existente, persistencia de mensajes, autorización, recuperación, selección y generación cuando se ejecutan. No son una medición de renderizado del navegador. `model_calls` cuenta solicitudes al motor, no reintentos internos del proveedor ni tokens; no estima coste. La creación inicial del hilo y controles auxiliares forman parte del total, no tienen un tiempo separado.

Resultados: `answered`, `no_context`, `blocked` o `failed`. Una respuesta marcada `answered` únicamente indica que el flujo devolvió una respuesta; no certifica exactitud, suficiencia o relevancia. Si un proveedor devuelve un fallo, la etapa permite distinguir selección de generación sin copiar sus detalles. Un fallo del destino de logging no debe interrumpir el chat.

En el helper local aislado se puede usar:

```text
node tmp/start-pet-isolated.cjs --help-v2-pilot --help-diagnostics
```

El helper continúa validando la base local y el puerto 3005. El interruptor del diagnóstico es independiente del de ayuda V2 y del de la mascota. Para apagarlo, retirar el flag o establecer la variable en `false` y reiniciar. Restringir el acceso a los logs: el UUID de tenant es un identificador operativo. No se añaden pies ni datos de diagnóstico a las respuestas del chat.

## Pruebas

31 pruebas pasaron en 6 archivos de acciones/biblioteca, con base y motor simulados. Las nuevas pruebas cubren primera consulta y persistencia, seguimiento con mensajes completos del servidor, descarte del historial contradictorio del navegador cuando existe hilo, cambio de tema, selección de guías autorizadas frente a IDs prohibidos/inventados, aclaración sin generación cuando no hay contexto, ausencia de llamadas al modelo cuando ninguna guía está autorizada, rechazo de solicitudes malformadas sin almacenar su contenido, hilo ausente/ajeno, fallo de carga sin fallback al navegador, error de generación sin persistir detalles, modo legacy, privacidad del registro, emisión única y fallo del destino de logging.

Estas pruebas no ejecutan modelos ni modifican la base local o remota. Las condiciones de propiedad/RLS se cubren además mediante las pruebas de historial locales ya existentes; los mocks de acciones no sustituyen esas reglas. No se automatiza el navegador: el usuario conserva las pruebas visuales y de respuesta real.

## Límites y coordinación

No se incluyen streaming, resumen automático, métricas agregadas, Redis, límites distribuidos, cancelación del proveedor ni reintentos automáticos. El límite por organización sigue en memoria. Son tareas posteriores y no garantías de esta entrega.

La instrumentación modifica `actions/ask-help-assistant.ts`, que puede ser evidencia de artículos. Los nuevos manifiestos de Gemini deben usar su hash actual; el pipeline rechazará hashes anteriores. La publicación vigente sigue siendo el snapshot revisado en su momento, sin incorporar borradores automáticamente.
