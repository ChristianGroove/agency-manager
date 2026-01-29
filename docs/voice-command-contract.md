
# Voice Command Contract

This document defines the strict communication protocol between the Pixy App (Client) and the Pixy Voice Runtime (Server).

## Protocol
- **Transport**: HTTP POST
- **Endpoint**: `/command`
- **Content-Type**: `application/json`
- **Authorization**: Bearer JWT (Signed with `PIXY_APP_SECRET`)

## JWT Claims
The JWT token must contain:
- `sub`: `pixy-core` (Fixed subject)
- `iss`: `pixy-agency-manager` (Issuer)
- `aud`: `pixy-voice-runtime` (Audience)
- `exp`: Expiration (Max 60 seconds from issue)

## Command Structure (JSON Body)

The body MUST strictly follow this schema:

```json
{
  "tenant_id": "string (UUID)",
  "space_id": "string (slug or UUID)",
  "user_id": "string (UUID)",
  "intent": "string (enum)",
  "payload": {
    "key": "value"
  },
  "timestamp": "number (Epoch ms)"
}
```

### Supported Intents (`intent`)

| Intent | Payload | Description |
| :--- | :--- | :--- |
| `ping` | `{}` | Connection test (No-op) |
| `voice_session_start` | `{ "session_id": "..." }` | Notify runtime of a new voice session |
| `process_text` | `{ "text": "...", "mode": "text|voice" }` | Send text for processing (Simulated) |

## Response Codes

- `202 Accepted`: Command valid and queued/processed.
- `400 Bad Request`: Schema validation failed.
- `401 Unauthorized`: Invalid JWT signature or expired token.
- `403 Forbidden`: Tenant/Space disabled or Intent not allowed.
- `500 Internal Server Error`: Runtime failure.

## Security Rules
1.  **No Business Logic**: The Gateway parses and routes, it does not execute DB writes.
2.  **Short-Lived Tokens**: Commands expire in 60s to prevent replay attacks.
3.  **Strict Typing**: Unknown fields in JSON are rejected.
