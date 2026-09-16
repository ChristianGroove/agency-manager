# 🧠 Arquitectura de AI Engine, Gobernanza & Bóveda Maestra

Este documento detalla la arquitectura, modelo de datos, flujo de inferencia y gobernanza del motor de Inteligencia Artificial de Pixy.

---

## 1. Visión General del Motor de IA

El **AI Engine** (src/modules/infrastructure/ai-engine/) es el subsistema centralizado encargado de:
1. Orquestar peticiones de inferencia (generación de texto, streaming, llamadas a funciones/tools y extracción estructurada).
2. Generar representaciones vectoriales (*embeddings*) para bases de conocimiento y RAG.
3. Administrar credenciales cifradas (AES-256-CBC) por organización y a nivel global/sistema.
4. Gestionar rotación y failover automático ante límites de cuota (HTTP 429) o degradación de proveedores.
5. Hacer cumplir las políticas de gobernanza definidas por el Super Admin (Modo BYOK vs. Modo SaaS Gestionado vs. Suspensión).

---

## 2. Proveedores Soportados (egistry.ts)

El motor implementa una arquitectura basada en adaptadores (AIProviderAdapter) con registro desacoplado:

| Proveedor | Identificador | Modelos Principales | Casos de Uso |
| :--- | :--- | :--- | :--- |
| **OpenAI** | openai | gpt-4o, gpt-4o-mini, 	ext-embedding-ada-002, whisper-1 | Inferencia general, RAG, transcripción de audios. |
| **Anthropic** | nthropic | claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022 | Razonamiento complejo, análisis de contexto largo, Smart Replies. |
| **Google Gemini** | google | gemini-1.5-pro, gemini-1.5-flash | Inferencia de ultra-baja latencia y costos optimizados. |
| **Groq** | groq | llama-3.3-70b-versatile, mixtral-8x7b-32768 | Inferencia en tiempo real (LPU) para bots de respuesta inmediata. |

---

## 3. Modos de Gobernanza de IA por Organización

Cada organización en Pixy pertenece a uno de los tres modos de operación registrados en organizations.rate_limit_config:

`json
{
  "requests_per_minute": 500,
  "ai_requests_per_day": 100,
  "ai_mode": "byok",
  "ai_status": "active"
}
```

### A. Modo Claves Propias (`byok`) - **Por Defecto**
* **Naturaleza**: El tenant provee sus propias API keys de OpenAI, Anthropic, Gemini o Groq.
* **Costos para Pixy**: $0.00 USD. El consumo lo factura el proveedor directamente a la tarjeta del cliente.
* **Límite de Tokens de Plataforma**: **Ilimitado**. La plataforma no impone cuotas mensuales de tokens; el límite lo determina la cuenta del cliente ante su proveedor.
* **Experiencia en `/platform/integrations`**:
  * La tarjeta del Marketplace se titula **"Inteligencia Artificial"** y muestra el badge **"Claves Propias"**.
  * Microcopy conciso y minimalista: si tiene claves configuradas informa el número de claves conectadas con consumo directo al proveedor; si tiene 0 claves, avisa con una sola línea clara conectar cuentas de OpenAI o Anthropic.
  * El Centro de Comando AI (`AIEngineSheet`) permite añadir múltiples claves del mismo proveedor, probar conectividad y reordenarlas con Drag & Drop (`@dnd-kit`).

### B. Modo Incluido en tu Plan / SaaS Gestionado (`saas`)
* **Naturaleza**: La plataforma Pixy asume el costo de inferencia a través de su **Bóveda Maestra de Claves** (`MasterAIEngineSheet`).
* **Protección de Cuota**: **Estrictamente controlada**. Requiere un límite mensual de tokens (configurable en `usage_limits`, por defecto 100,000 tokens/mes). El motor bloquea la inferencia mediante `assertUsageAllowed` si se sobrepasa la cuota.
* **Experiencia en `/platform/integrations`**:
  * La tarjeta del Marketplace muestra el badge **"Incluido en tu Plan"** con botón a **"Panel de IA Gestionada"**.
  * `AIEngineSheet` muestra un widget de consumo mensual en tiempo real con barra de progreso porcentual y fecha de corte.
  * Muestra los modelos de alta velocidad provistos por Pixy (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Flash) sin exigir claves al usuario.
  * Incluye llamado a la acción para solicitar activar "Claves Propias" si requiere consumo ilimitado.

### C. Modo Pausado / Suspendido / Desactivado (`disabled` / `suspended`)
* **Naturaleza**: Activado manualmente por el Super Admin (Kill Switch) o automáticamente por suspensión del tenant.
* **Comportamiento en Backend**: El servicio `executeTask` lanza inmediatamente una excepción controlada: *"Los servicios de Inteligencia Artificial están desactivados para esta organización."*
* **Experiencia en `/platform/integrations`**:
  * La tarjeta del Marketplace muestra el badge **"Servicio Pausado"** en rojo con botón **"Ver Estado (Pausado)"**.
  * `AIEngineSheet` muestra una alerta destacada (`ShieldAlert`) explicando la pausa del servicio y ofreciendo un botón para contactar a soporte. Las credenciales se presentan en modo lectura atenuada sin posibilidad de edición.

---

## 4. Multi-Key por Proveedor & Failover Inteligente

Tanto a nivel de Tenant (en  i_credentials) como en la Bóveda Maestra del Super Admin (en  i_settings):
1. **Soporte Multi-Key**: Una organización puede registrar múltiples API keys para el mismo proveedor (ej. OpenAI Clave #1 Prod y OpenAI Clave #2 Backup).
2. **Priorización Drag & Drop**: El orden vertical en el sheet define la prioridad de ejecución (Prioridad #1, #2, #3...).
3. **Rotación Automática por Rate Limit (429)**:
   - Si la Clave #1 arroja un error 429 (insufficient_quota o ate_limit_exceeded), el bucle de ejecución de service.ts conmuta inmediatamente y de manera transparente a la Clave #2 del mismo proveedor.
   - Si se agotan las claves de ese proveedor, conmuta al proveedor fallback configurado o a las claves maestras de respaldo.

---

## 5. Centro de Mando Super Admin (/platform/admin)

La pestaña **Intelligence** se ubica en el menú principal del Super Admin (Pestaña 5, antes de Finanzas):
* **Estilo Visual Unificado**: Tipografía neutra idéntica al resto de las pestañas principales, sin emojis en el selector.
* **Cabecera**: Botón con badge dinámico que despliega la **Bóveda Maestra de Claves** (MasterAIEngineSheet).
* **Sub-tab 1: Telemetría & Insights**:
  * KPIs de tokens acumulados (últimos 7 días).
  * Desglose de consumo por motor SaaS (crm, inbox, oice, etc.).
  * Ranking de organizaciones con mayor consumo.
  * Costo proyectado en USD para la plataforma.
* **Sub-tab 2: Matriz de Gobernanza & Cuotas**:
  * Tabla interactiva con búsqueda por nombre/slug y filtro por modo.
  * Selector inmediato de modo (SaaS Gestionado | Claves Propias | Desactivado).
  * Modal para ajustar cuota mensual de tokens (-1 para ilimitado).
  * Columna de recuento de Claves Propias activas por organización.
  * Kill Switch individual por organización con actualización en tiempo real.

---

## 6. Resiliencia RAG en Base de Conocimiento (knowledge)

* **Búsqueda Vectorial Primaria**: Ejecución de la RPC match_knowledge_v2 con similitud coseno contra knowledge_base.embedding.
* **Fallback Automático de Texto (allbackTextSearch)**: Si la función vectorial falla, no hay OpenAI API Key configurada para embeddings o la extensión pgvector presenta latencia, el sistema realiza automáticamente una búsqueda por coincidencia textual insensible a mayúsculas (ILIKE) contra question y nswer.
* **Cero Errores 500**: La IA siempre obtiene contexto y nunca bloquea el flujo del usuario.
* **Auto-Vectorización**: Al aprobar o extraer nuevo conocimiento desde conversaciones del Inbox (knowledge-extractor.ts), el embedding vectorial se genera y persiste de forma inmediata.