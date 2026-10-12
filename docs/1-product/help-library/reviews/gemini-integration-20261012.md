# Integración técnica de la entrega de Gemini — 2026-10-12

La revisión de fuentes y procedimientos pertenece a Gemini, según su handoff. Codex comprobó el contrato editorial, hashes de borradores y evidencias, claves de permisos y módulos, publicación, recuperación y aislamiento de acceso. No se repitió la auditoría de procedimientos ni se realizaron pruebas de navegador.

## Corpus local

- Snapshot original preservado en `gemini-source-reviewed-20261012.json`, con Gemini como revisor.
- 20 artículos publicados, frente a 6 en el piloto anterior; no se retiró ninguno de esos seis.
- Revisión del corpus: `f79a1c4bca0f45975c5d9f38592af331439dfcc1e62f8b7ea2d19730e5ed12ec`.
- 65 preguntas con referencias estructuralmente válidas.
- Publicación aceptada por el pipeline: hashes actuales coinciden; permisos canónicos y rutas pasan sus contratos. Las claves de módulos declaradas aparecen en los registros de módulos/guards.
- No hay migración, cambio de base remota ni ampliación de tenants del piloto. La activación continúa limitada al tenant Pixy de la base local.

## Verificación técnica

- Pipeline de publicación: 7 aserciones con fixtures sintéticos correctas.
- Recuperación, sesión, runtime y selección: 17 pruebas correctas en 4 archivos.
- Recuperación offline: 53/56 preguntas de respuesta recuperan al menos uno de los artículos esperados; ninguna pendiente por ausencia de artículo publicado. Otras 9 preguntas requieren comprobar aclaración/abstención en acciones o respuestas del modelo.
- El evaluador ahora usa una vertical compatible con el artículo esperado para cada fixture, conservando el filtro de vertical del runtime. Antes sometía también restaurante a un tenant sintético de agencia, generando cinco fallos artificiales. Usa permisos amplios para medir relevancia; estas cifras no certifican autorización real, exactitud de la IA, latencia ni calidad de respuesta.

## Incidencias para Gemini

1. **Q29 — Automatización de bienvenida a prospectos.** La recuperación léxica no encuentra `automation.create-workflows` y selecciona otros temas. Revisar que esta tarea esté efectivamente implementada, que los pasos y disparadores tengan evidencia, y mejorar el vocabulario de búsqueda del artículo si corresponde. Si no existe, corregir la expectativa del caso; no inventar soporte para forzar el resultado.
2. **Q49 — Consultar los roles del sistema.** La pregunta usa audiencia `tenant-user`, pero `iam.manage-roles` está restringido a administradores/permisos de gestión. Decidir según las fuentes si corresponde un caso de acceso restringido, otra audiencia o una guía pública separada de conceptos. No quitar controles para que pase la evaluación.
3. **Q60 — Reportes de rendimiento y conversión del CRM.** Los artículos esperados (`crm.manage-pipeline`, `dashboard.overview`) no se recuperan. Verificar si esos artículos realmente cubren la tarea, si falta una guía específica o si la capacidad es parcial; actualizar preguntas/expectativas y evidencias en consecuencia.
4. **`gaps.md` — Ayuda legacy frente a V2.** La tabla inicial presenta historial de cuatro mensajes recortados como estado general, aunque el piloto V2 utiliza roles y presupuesto de historial. Separar explícitamente las limitaciones legacy de las vigentes del piloto; no afirmar que la biblioteca compilada sigue sin contexto por depender de las tablas vectoriales antiguas.

Gemini debe modificar solo `drafts/`, actualizar hashes de los archivos que revise y entregar un nuevo snapshot completo. Codex mantendrá la validación y publicación técnica.

## Revisión manual del piloto

Recargar localhost:3005 y abrir una conversación nueva. Probar con un usuario que tenga acceso al módulo y, cuando corresponda, permiso para administrarlo:

- ¿Qué diferencia hay entre una respuesta rápida y una plantilla de WhatsApp?
- ¿Cómo envío un mensaje si ya pasaron 24 horas?
- ¿Cómo configuro el horario y el mensaje fuera de horario del canal?
- ¿Cómo dejo una nota que no reciba el cliente?
- ¿Cómo asigno una conversación a un compañero?
- ¿Cómo exporto mis contactos y qué permiso necesito?

En otra sesión o tenant con menos permisos, comprobar que no se ofrezcan procedimientos administrativos restringidos. Las guías de restaurante deben aparecer únicamente en una vertical compatible. Comprobar que las respuestas usan formato limpio sin pie de guías consultadas. Las pruebas de vinculación o envío real a Meta requieren un entorno y canal apropiados; no forman parte de esta integración técnica.
