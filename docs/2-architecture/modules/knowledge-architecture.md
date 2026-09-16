# Arquitectura del Módulo de Bases de Conocimiento (Knowledge)

Este documento detalla la estructura y capacidades del módulo de Bases de Conocimiento (`knowledge`).

## 1. Visión General
El módulo de Bases de Conocimiento permite a las organizaciones almacenar preguntas frecuentes (FAQs), guías y documentación interna. Más allá de un simple CRUD, este módulo es el núcleo del sistema de Generación Aumentada por Recuperación (RAG), permitiendo que los agentes de IA de la plataforma respondan a los clientes basándose en la información propietaria de cada Tenant.

## 2. Modelo de Datos Central
La tabla principal es `knowledge_base`.

### Tabla: `knowledge_base`
| Campo | Tipo | Propósito |
|-------|------|-----------|
| `id` | UUID | Identificador único de la entrada. |
| `organization_id` | UUID | Aislamiento por Tenant para asegurar que la IA no filtre datos. |
| `question` | Text | Pregunta o título del conocimiento. |
| `answer` | Text | Respuesta detallada o contenido del documento. |
| `category` | Text | Categorización semántica (ej: "Soporte", "Ventas"). |
| `source` | Text | Origen del dato (`manual`, `ai_extracted`, `file`). |
| `embedding` | Vector/Text | Representación vectorial del texto para búsquedas de similitud (RAG). |

## 3. Patrones de Diseño Implementados

### Generación Automática de Embeddings (`knowledge-actions.ts`)
Toda mutación en la base de conocimiento pasa por el orquestador `upsertKnowledgeEntry()`. 
1. Antes de guardar en base de datos, el texto concatenado (`question` + `answer`) se envía al `EmbeddingService` (ubicado en `infrastructure/ai-engine/embedding`).
2. El servicio de embeddings utiliza modelos de IA (ej: OpenAI `text-embedding-ada-002` u homólogos) para generar el vector dimensional.
3. El payload resultante (datos estructurados + vector) se inserta/actualiza en la base de datos de forma atómica.

## 4. Dependencias y Relacionamiento
- **AI Engine (`ai-engine`)**: Estricta dependencia del servicio de embeddings para transformar texto a vectores matemáticos.
- **AI Agents / Bots**: Los flujos automatizados de respuesta utilizan la función de búsqueda por similitud contra esta tabla para generar respuestas dinámicas (RAG) a los leads o clientes en WhatsApp/Instagram.

## 5. Casos de Uso del Source (`source`)
El campo `source` permite trazar el linaje de la información:
- `manual`: Agregado directamente por un administrador en la UI.
- `file`: Extraído automáticamente de un PDF/TXT subido al sistema.
- `ai_extracted`: Conocimiento deducido por un agente de IA tras analizar conversaciones pasadas exitosas, promoviendo el aprendizaje continuo del Tenant.

## 6. Resiliencia RAG y Fallback de Búsqueda (`embedding.ts`)

Para garantizar que los agentes de IA y el inbox nunca se queden sin respuesta o generen errores 500:

1. **Búsqueda Vectorial Híbrida**: Al consultar la base de conocimiento para alimentar un prompt con RAG, se invoca `searchKnowledge()`.
2. **Fallback Automático a Búsqueda Textual (`fallbackTextSearch`)**: Si la función RPC `match_knowledge_v2` de PostgreSQL no está disponible, la extensión `pgvector` falla, o la clave para generar el embedding temporal no responde, el sistema ejecuta una búsqueda alternativa mediante `ILIKE` contra los campos `question` y `answer`.
3. **Auto-Vectorización en Aprobación de FAQs**: Cuando un administrador aprueba una FAQ sugerida por el extractor de conocimiento (`knowledge-extractor.ts`), el sistema calcula e indexa su embedding vectorial en ese mismo instante, asegurando que quede inmediatamente disponible para búsqueda semántica.

