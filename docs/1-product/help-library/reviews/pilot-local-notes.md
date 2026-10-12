# Primer piloto local de la biblioteca

Fecha: 2026-10-12. Rama: `pixyrobotpet`. Entorno: Supabase local 55321/55322 y Pixy 3005.

## Revisión editorial independiente

Gemini entregó 18 artículos y 60 preguntas y corrigió el primer informe editorial. Se seleccionaron únicamente `theme.toggle-theme`, `pet.pet-interaction` y `help.chat-and-history`: son procedimientos generales sin restricciones administrativas ni módulos opcionales. Sus requisitos condicionales, como mascota/hibernación habilitadas, permanecen explícitos en el contenido.

Se contrastaron acciones del sidebar, disparador y proveedor de mascota, pausas del renderer, temporizador, formulario del chat y acciones de historial con las implementaciones y pruebas existentes. Ajustes finales de Codex: eliminar nombres internos innecesarios en los pasos del tema; distinguir Canvas 2D de aceleración gráfica; condicionar el temporizador a hibernación habilitada; preservar seguimiento durante reposo contextual; describir con precisión fallos de creación vs verificación/guardado de un hilo; confirmar que administradores no ven historiales ajenos mediante esta función; evitar promesas de rendimiento óptimo por el límite de 200 mensajes. Se añadieron las fuentes del renderer y proveedor a las evidencias de mascota.

`pilot-local.json` contiene la aprobación de este subconjunto y hashes de artículos y fuentes. La revisión verifica código y evidencia; no certifica navegador, disponibilidad remota ni calidad de respuestas reales. Los demás artículos permanecen pendientes de revisión.

## Recuperación offline

`scripts/evaluate-help-retrieval.mjs` evalúa la biblioteca publicada contra el banco de Gemini sin credenciales, llamadas a modelos ni navegador. El criterio medido es presencia de una guía esperada entre los resultados recuperados.

- Primera evaluación: 11 de 14 casos cubiertos recuperaban una guía esperada. Fallaban una pregunta sobre hibernación, otra sobre privacidad y otra sobre navegación por preguntas.
- Corrección general del recuperador: permitir dos conceptos coincidentes, con al menos uno presente en título/palabras clave, aunque la pregunta incluya verbos y calificadores que no estén en la guía. La ubicación de pantalla sigue sin convertir una pregunta sin evidencia en un resultado.
- Resultado posterior: 14 de 14 casos cubiertos. 37 preguntas de respuesta siguen pendientes de cobertura y 9 requieren comprobar comportamiento de clarificación/abstención en acción o modelo. No se atribuye este resultado a las 60 preguntas completas.
- Pruebas adicionales comprueban preguntas largas y rechazo de un tema ajeno con un único término familiar. Los filtros de audiencia, módulos, permisos y vertical se mantienen antes del ranking.

La medición no demuestra exactitud de las respuestas del modelo, latencia, costo ni recuperación semántica general. El reporte detallado está en `pilot-retrieval-report.json`.

Pasaron 91 pruebas en 14 archivos de regresión (biblioteca, activación por tenant, permisos, historial, mascota, gobernanza y roles del proveedor), ESLint de la biblioteca y `git diff --check`.

## Activación y reversión

El helper local ignorado `G:\Pixy\agency-manager\tmp\start-pet-isolated.cjs --help-v2-pilot` comprueba primero que la URL de Supabase es 127.0.0.1:55321 y activa la tarea solo para UUID `db9d1288-80ab-48df-b130-a0739881c6f2`. No modifica `.env.local` ni configuración remota. El código desplegado continúa apagado salvo variables de activación explícitas.

Para revertir localmente, reiniciar únicamente el proceso de Pixy 3005 con el helper sin el argumento del piloto (si no existen variables de activación externas). No detener Docker ni el servidor de Cartera. La biblioteca permanece versionada aunque el piloto se apague.

El corte de energía ocurrió antes de la primera publicación. Se restauró el build existente y se confirmó `/login` con HTTP 200, tablas de historial presentes y tenant local activo. Posteriormente se publicó el subconjunto revisado. No se aplicaron migraciones nuevas ni se reseteó la base.

## Verificación manual pendiente

El usuario conserva las pruebas en navegador. Recargar localhost:3005 y abrir una conversación nueva. Probar:

1. ¿Cómo cambio el tema oscuro?
2. Moví el ratón por el dashboard pero el robot sigue durmiendo. ¿Por qué?
3. ¿Puede el administrador leer mis conversaciones privadas de ayuda?
4. ¿Cómo salto a una pregunta anterior del chat?
5. Una pregunta sobre un módulo sin guías publicadas: debe reconocer la falta de evidencia.

La respuesta debe fundamentarse en las guías y presentar sus títulos al final. Verificar continuidad, cierre/reapertura del historial y estados de mascota. No se realizaron pruebas automatizadas de navegador ni generación masiva de respuestas con las 60 preguntas.
