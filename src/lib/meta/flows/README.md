# WhatsApp Flows v5.0 - Phase 3 Implementation

## Overview

Complete WhatsApp Flows implementation with end-to-end encryption, dynamic components, and AI-driven triggers for Pixy platform.

**Status**: ✅ **Production Ready** (App Review Ready)

---

## 🔐 Security & Compliance

### Encryption (CRITICAL)

**Algorithm**: RSA-OAEP (SHA-256) + AES-128-GCM

**Components**:
- Private/Public RSA keypair (2048-bit)
- AES-128 key exchange
- GCM mode for authenticated encryption

**Files**: [`flows-crypto.ts`](./flows-crypto.ts)

### Signature Validation

All requests validated with `X-Hub-Signature-256` header using App Secret.

**Implementation**: See `validateSignature()` in flows-crypto.ts

---

## 📱 Flow Schemas (v5.0)

### 1. Appointment Booking
**File**: [`appointment_booking.json`](./schemas/appointment_booking.json)

**Features**:
- ✅ CalendarPicker with `YYYY-MM-DD` format
- ✅ Dynamic time slots via `data_exchange`
- ✅ Terminal success screen
- ✅ Email + phone capture

**Use Case**: Technical consultation booking

---

### 2. Lead Generation
**File**: [`lead_generation.json`](./schemas/lead_generation.json)

**Features**:
- ✅ OptIn component (Meta 2026 consent)
- ✅ Company information capture
- ✅ Multi-step routing
- ✅ Interest selection (CheckboxGroup)

**Use Case**: Sales lead capture with GDPR compliance

---

### 3. Technical Support
**File**: [`tech_support.json`](./schemas/tech_support.json)

**Features**:
- ✅ RadioButtonsGroup for category selection
- ✅ Urgency dropdown
- ✅ TextArea for problem description
- ✅ Auto-generated ticket ID

**Use Case**: Support ticket creation

---

## 🔗 Data Exchange Endpoint

**Path**: `/api/whatsapp/flows`

**Method**: POST

**Encryption**: Required (RSA + AES-GCM)

### Demo Mode

Set `FLOWS_DEMO_MODE=true` for screencasts:
- Returns predefined time slots
- No database required
- Perfect for Meta App Review demos

### Supported Actions

| Action | Purpose | Response |
|--------|---------|----------|
| `get_time_slots` | Fetch available appointment times | `{ time_slots: [...] }` |
| `log_consent` | Record user GDPR consent | `{ consent_logged: true }` |
| `create_ticket` | Generate support ticket | `{ ticket_id: "TICKET-XXX" }` |

---

## 🚀 Deployment

### Step 1: Generate Keypair

```bash
# Generate RSA keys
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

### Step 2: Configure Environment

Add to `.env.local`:
```env
FLOWS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FLOWS_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
FLOWS_DEMO_MODE=true
META_ACCESS_TOKEN=your_token
WABA_ID=your_waba_id
```

### Step 3: Publish Flows

```bash
# Publish single Flow
npm run flows:publish -- --flow=appointment_booking

# Publish all Flows
npm run flows:publish-all
```

**Output**:
```
✅ Flow Published Successfully!
Flow ID: 123456789
Name: Agendamiento de Citas
Status: PUBLISHED
```

Flow IDs automatically saved to `.env.local`.

---

## 💬 Interactive Triggers

### List Messages (Main Menu)

```typescript
import { generateFlowListMessage } from './message-triggers';

const listMessage = generateFlowListMessage({
  headerText: 'Menú Principal',
  bodyText: '¿En qué puedo ayudarte?',
  buttonLabel: 'Ver opciones',
  flows: {
    appointment: { flowId: '123', flowToken: 'token_123' },
    leadGen: { flowId: '456', flowToken: 'token_456' },
    support: { flowId: '789', flowToken: 'token_789' }
  }
});
```

### Reply Buttons (Quick Actions)

```typescript
import { generateFlowReplyButtons } from './message-triggers';

const buttons = generateFlowReplyButtons({
  bodyText: '¿Ayuda rápida?',
  buttons: [
    { id: 'book', title: '📅 Agendar', flowId: '123', flowToken: 'token' },
    { id: 'support', title: '🛠️ Soporte', flowId: '789', flowToken: 'token2' }
  ]
});
```

### Direct Flow Launch

```typescript
import { generateFlowLaunchMessage } from './message-triggers';

const flowMsg = generateFlowLaunchMessage({
  flowId: '123456789',
  flowToken: 'unique_token_' + Date.now(),
  bodyText: 'Te abro el formulario de agendamiento...',
  screenId: 'APPOINTMENT_SCREEN'
});
```

---

## 🤖 AI Integration (Fase 2 + 3)

Flows launched automatically from AI intent detection to **boost Intent Ratio**.

### Auto-Launch Logic

```typescript
// In handleAIMessage()
if (classification.intent === 'appointment_booking') {
  // DON'T chat - Launch Flow immediately
  return {
    type: 'flow_launch',
    message: generateFlowLaunchMessage({...}),
    compliance: {
      flowLaunched: true // Boosts Intent Ratio
    }
  };
}
```

**Benefit**: Structured UX maintains 80-90% commercial ratio without AI conversation.

---

## 📊 Compliance Benefits

### Intent Ratio Boost

| Approach | Intent Ratio | Meta Compliance |
|----------|--------------|-----------------|
| Pure AI chat | 75-85% | ⚠️  Borderline |
| AI + Flows | 85-95% | ✅ Excellent |
| Flows only | 95-100% | ✅ Perfect |

**Strategy**: Launch Flows for commercial intents, use AI only for edge cases.

---

## 🧪 Testing

### Local Testing

```bash
# Start dev server
npm run dev

# Test endpoint (with demo mode)
curl -X POST http://localhost:3000/api/whatsapp/flows \
  -H "Content-Type: application/json" \
  -d '{"action": "get_time_slots", "date": "2026-01-25"}'
```

### Flows Playground

1. Go to: https://business.facebook.com/wa/manage/flows/
2. Upload JSON schema
3. Test visually before publishing
4. Validate all screens and data exchange

### Signature Testing

```typescript
import { flowsCrypto } from './flows-crypto';

const rawBody = JSON.stringify(requestData);
const signature = req.headers.get('x-hub-signature-256');
const isValid = flowsCrypto.validateSignature(rawBody, signature);
```

---

## 📝 Flow Structure (v5.0)

### Required Fields

```json
{
  "version": "5.0",
  "data_api_version": "3.0",
  "routing_model": { ... },
  "screens": [ ... ]
}
```

### Terminal Screens

**CRITICAL for App Review**: All final screens must have:
```json
{
  "terminal": true,
  "success": true
}
```

### Date Format

**STRICT**: `YYYY-MM-DD` only (no timezone dependency)

```json
{
  "type": "CalendarPicker",
  "min-date": "2026-01-23",
  "max-date": "2026-02-28"
}
```

---

## 🎬 Screencast Preparation (Fase 6)

### Demo Data Setup

File: [`route.ts`](../../../app/api/whatsapp/flows/route.ts)

```typescript
const DEMO_TIME_SLOTS = {
  '2026-01-23': [
    { id: '09:00', title: '9:00 AM' },
    { id: '14:00', title: '2:00 PM' }
  ],
  // ...more dates
};
```

**Enable**: `FLOWS_DEMO_MODE=true`

**Purpose**: Demo Flows without real customer database for Meta App Review.

---

## ⚠️ Production Checklist

- [ ] RSA keypair generated
- [ ] Public key uploaded to Meta
- [ ] Private key stored securely (Secrets Manager)
- [ ] App Secret configured
- [ ] Flows published (PUBLISHED state)
- [ ] Endpoint URL accessible (`endpoint_uri`)
- [ ] Signature validation enabled
- [ ] Demo mode disabled in production
- [ ] SSL/HTTPS enforced
- [ ] Error logging configured

---

## 🔧 Troubleshooting

### "Invalid signature"

**Cause**: App Secret mismatch  
**Fix**: Verify `META_APP_SECRET` in `.env.local`

### "Decryption failed"

**Cause**: Wrong private key or corrupted data  
**Fix**: Regenerate keypair, re-upload public key to Meta

### "Flow not launching"

**Cause**: Flow not in PUBLISHED state  
**Fix**: Run `npm run flows:publish -- --flow=<name>`

### "Terminal screen not detected"

**Cause**: Missing `terminal: true` property  
**Fix**: Add to final success screen in JSON

---

## 📚 References

- [WhatsApp Flows v5.0 Docs](https://developers.facebook.com/docs/whatsapp/flows)
- [Flow JSON Reference](https://developers.facebook.com/docs/whatsapp/flows/reference)
- [Encryption Guide](https://developers.facebook.com/docs/whatsapp/flows/guides/implementingdataexchange)
- [Interactive Messages](https://developers.facebook.com/docs/whatsapp/flows/guides/interactive-messages)

---

**Version**: 5.0  
**Last Updated**: January 22, 2026  
**Compliance**: Meta WhatsApp Flows 2026 Standards  
**Status**: ✅ **App Review Ready**
