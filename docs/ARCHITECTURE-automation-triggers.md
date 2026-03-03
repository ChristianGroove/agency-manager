# Arquitectura: Sistema de Automatización de Triggers

> **Última actualización:** 2026-03-03  
> **Estado:** Producción estable  
> **Archivos principales:**  
> - `src/modules/core/automation/automation-trigger.service.ts`  
> - `src/modules/core/messaging/inbox-service.ts`  
> - `src/modules/core/messaging/webhook-handler.ts`  

---

## Pipeline de Mensajes Entrantes

```
WhatsApp Message (Meta Cloud API)
    │
    ▼
/api/webhooks/messaging/route.ts   ← POST handler
    │
    ▼
WebhookManager.handleParsed()      ← Registra MetaProvider, parsea webhook
    │
    ▼
MetaProvider.parseWebhook()        ← Normaliza payload a IncomingMessage[]
    │
    ▼
WebhookManager.processMessage()   ← Filtra calls, procesa mensajes
    │
    ▼
InboxService.handleIncomingMessage()  ← PUNTO CENTRAL
    │
    ├─► upsertConversation()       ← Encuentra/crea conversación + INSERTA MENSAJE
    │       │
    │       ▼
    │   (mensaje ya está en DB)
    │
    ├─► Check duplicados           ← Encuentra el mensaje recién insertado (RUTA NORMAL)
    │       │
    │       ▼
    │   evaluateInput()            ← Evalúa triggers de automatización
    │
    ▼
AutomationTriggerService.evaluateInput()
    │
    ├─► Busca workflows activos para la org de la conversación
    ├─► Evalúa cada workflow según su trigger_type
    └─► Si match → crea workflow_execution + ejecuta WorkflowEngine
```

---

## Tipos de Trigger y su Lógica

### `first_contact` (Solo Primer Contacto / Lead Nuevo)

**Lógica actual (post-refactor 2026-03-03):**

```
¿Existe ejecución previa de este workflow para este lead?
    │
    NO ──► DISPARAR ✅ (primer contacto real)
    │
    SÍ ──► ¿La conversación fue resuelta después de la última ejecución?
              │
              SÍ ──► DISPARAR ✅ (reset por resolve)
              │
              NO ──► ¿El bot nunca ha respondido en esta conversación? (last_auto_reply_at = null)
                       │
                       SÍ ──► DISPARAR ✅ (conversación eliminada y recreada)
                       │
                       NO ──► BLOQUEAR ❌ (ya se ejecutó, no resuelta)
```

**Implementación:** `automation-trigger.service.ts` líneas 146-180

**Cómo se verifica historial:**
```sql
SELECT started_at FROM workflow_executions
WHERE workflow_id = '<wf_id>'
  AND context @> '{"lead": {"id": "<lead_id>"}}'
ORDER BY started_at DESC LIMIT 1
```

### `message_received` y `webhook`
Usan `isSessionExpired` (cooldown 12h, o resolvedAt > lastAutoReply, o bot nunca respondió).

### `keyword`
Compara `actualText` con `config.keywords[]` (case-insensitive, includes).

### `business_hours` / `outside_hours`
Verifica hora actual vs `config.start_hour`/`end_hour` y `config.days[]`.

### `media_received`
Detecta si el contenido es imagen/video/audio/document.

---

## Campos Clave en la Conversación

| Campo | Ubicación | Uso |
|---|---|---|
| `last_auto_reply_at` | `conversations` (columna) | Timestamp de la última respuesta del bot. Se actualiza en `actions.ts` línea 516 |
| `resolved_at` | `conversations.metadata` (JSONB) | Timestamp de resolución manual. Se setea en `conversation-actions.ts` y `conversation-management-actions.ts` |
| `organization_id` | `conversations` (columna) | Determina qué workflows se evalúan |
| `lead_id` | `conversations` (columna) | Identifica el lead. Usado en `.contains()` para historial de ejecuciones |

---

## Aislamiento Multi-Tenant

El pipeline garantiza aislamiento en cada paso:

1. **Webhook → Conversación:** `InboxService` resuelve la conversación por `lead_id` + `channel` + `connection_id`, que ya están vinculados a una org
2. **Conversación → Workflows:** `evaluateInput` filtra `WHERE organization_id = conv.organization_id`
3. **UI → Workflows:** Páginas en `/crm/automations` y `/automations` filtran por `getCurrentOrganizationId()`
4. **Ejecuciones:** Heredan el org del workflow

---

## Notas de Diseño Importantes

### ⚠️ Patrón de "Doble Inserción" en inbox-service.ts

`upsertConversation()` inserta el mensaje internamente (líneas ~428). Luego `handleIncomingMessage()` hace un check de duplicados que **siempre** encuentra el mensaje y ejecuta `evaluateInput` desde esa rama.

**La rama de "duplicados" (líneas 37-55) ES la ruta normal.** NO es para retries de webhook.  
**La inserción en líneas 66-77 es código que solo corre si `externalId` está ausente.**

### ⚠️ Lock In-Memory (processingLocks)

El `Set<string>` en `automation-trigger.service.ts` es best-effort. En Vercel Serverless, cada invocación puede usar una instancia diferente. La deduplicación real está en `workflow_executions` vía check de `messageId`.

---

## Historial de Cambios

| Fecha | Commit | Cambio |
|---|---|---|
| 2026-03-03 | `2077d4b` | `first_contact` cambiado de cooldown 12h a verificación de historial en `workflow_executions` |
| 2026-03-03 | `9ce3a64` | Restaurado `evaluateInput` en ruta normal, `lead_id` en SELECT, `organization_id` en páginas de automaciones, manejo de conversaciones eliminadas |
