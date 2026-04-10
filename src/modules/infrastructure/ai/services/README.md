# Pixy AI - WhatsApp Business API Technical Assistant

## Overview

Pixy AI is a **Task-Oriented** technical assistant for WhatsApp Business API integration, fully compliant with Meta's WhatsApp AI Policy 2026.

**Key Differentiator**: Pixy is NOT a general-purpose AI. It exclusively handles 8 predefined technical intents related to WhatsApp Business API.

---

## 🎯 Compliance with Meta 2026 Policy

### Task-Oriented AI Classification

✅ **80-90% Commercial Intent Ratio** - Real-time tracking  
✅ **Educational Deflection** - Polite redirection of off-topic queries  
✅ **Zero Data Retention** - No conversation data used for LLM training  
✅ **Human Handoff System** - Automatic escalation when needed  
✅ **Privacy by Design** - PII sanitization before LLM calls  

**Status**: Ready for Meta App Review

---

## 📋 Supported Intents (Commercial Only)

### 1. Technical Diagnostics
Troubleshoot errors, delivery failures, webhook issues  
**Examples**: "Error 132018", "Webhook no responde", "Mensaje fallido"

### 2. Template Governance
HSM approval status, categorization, optimization  
**Examples**: "Plantilla rechazada", "Categorizar como Utility"

### 3. Account Health
Quality rating, tier limits, messaging capacity  
**Examples**: "Quality rating bajo", "Cómo escalar tier"

### 4. API Versioning
Deprecations, migrations, v24.0 features  
**Examples**: "Cuándo deprecan v18", "Novedades v24.0"

### 5. Advanced Features
Flows, buttons, catalogs, Calling API (See full documentation)

**Keywords for all 8 intents**: See [`ai-intent-validator.ts`](./ai-intent-validator.ts)

---

## 🚫 What Pixy AI Does NOT Do

Pixy AI will **deflect** (politely decline) these queries:

- ❌ General knowledge questions
- ❌ Creative writing tasks
- ❌ Personal advice
- ❌ Casual conversation
- ❌ Educational content (non-technical)

**Example Deflection**:
```
User: "¿Cuál es la capital de Francia?"
AI:   "Lo siento, mi función es asistirte exclusivamente con la 
       integración técnica de WhatsApp Business API en Pixy..."
```

---

## 🏗️ Architecture

```
User Message
     ↓
├─ Intent Validator (8 commercial intents)
│  ├─ Commercial? → Data Protection → LLM → Response
│  └─ Off-Topic? → Deflection → Redirect
│     └─ >2 deflections? → Human Handoff
```

### Core Modules

| Module | Purpose | File |
|--------|---------|------|
| **Intent Validator** | Classify message into 8 intents | `ai-intent-validator.ts` |
| **Deflection Handler** | Educational off-topic responses | `ai-deflection-handler.ts` |
| **Data Protection** | PII sanitization, zero retention | `ai-data-protection.ts` |
| **Handoff Manager** | Human escalation triggers | `ai-handoff-manager.ts` |
| **Compliance Metrics** | Real-time ratio monitoring | `ai-compliance-metrics.ts` |
| **Message Handler** | Orchestration layer | `ai-message-handler.ts` |

---

## 🔐 Data Protection (Privacy by Design)

### Zero Data Retention

**Meta 2026 Requirement**: NO "Business Solution Data" for LLM training.

**Pixy Implementation**:
```typescript
// OpenAI configuration
{
  training_opt_out: true,
  data_retention_days: 0,
  user_id: "pixy_user_[hashed]",
  metadata: {
    policy_version: "meta_2026",
    data_usage: "zero_retention"
  }
}
```

### PII Sanitization

Before sending to LLM, all messages are sanitized:
- Phone numbers → `[PHONE_REDACTED]`
- Emails → `[EMAIL_REDACTED]`
- URLs → `[URL_REDACTED]`
- Credit cards → `[CC_REDACTED]`

---

## 📊 Compliance Monitoring

### Real-Time Metrics

```typescript
import { metaComplianceMetrics } from './ai-compliance-metrics';

// Get current compliance status
const metrics = await metaComplianceMetrics.getMetrics();

console.log(`Commercial Ratio: ${metrics.intentRatio.commercial * 100}%`);
console.log(`Compliant: ${metrics.isCompliant ? 'YES' : 'NO'}`);
```

### Automated Alerts

System alerts if:
- Commercial ratio < 80%
- Off-topic ratio > 20%
- Data sanitization < 95%

---

## 🚀 Usage

### Basic Integration

```typescript
import { handleAIMessage } from './ai-message-handler';

const response = await handleAIMessage({
  message: "Mi plantilla fue rechazada con error 132018",
  conversationId: "conv_123",
  userId: "user_456"
});

if (response.shouldHandoff) {
  // Transfer to human agent
  await transferToAgent(conversationId);
} else {
  // Send AI response
  await sendWhatsAppMessage(response.message);
}
```

### Response Types

```typescript
type: 'ai_response'    // Commercial intent handled
type: 'deflection'     // Off-topic query deflected
type: 'handoff'        // Escalated to human
```

---

## 🧪 Testing

### Run Compliance Tests

```bash
npm run test:ai-compliance
```

### Test Scenarios

**Commercial Intent**:
```
Input: "¿Cuál es el estado de mi quality rating?"
Expected: AI Response (intent: account_health)
```

**Off-Topic Deflection**:
```
Input: "Escríbeme un poema"
Expected: Deflection Response
```

**Human Handoff**:
```
Input: "Quiero hablar con un agente"
Expected: Handoff Response
```

---

## 📄 Meta App Review Preparation

### Required Documents

1. ✅ [`AI_COMPLIANCE_AUDIT.md`](../../AI_COMPLIANCE_AUDIT.md) - Complete audit
2. ✅ Intent taxonomy documentation
3. ✅ Compliance metrics dashboard
4. ✅ Test conversation logs
5. ✅ Data protection policy

### Demo Scenarios for Meta

See [`AI_COMPLIANCE_AUDIT.md`](../../AI_COMPLIANCE_AUDIT.md) Section 8.

---

## 🔧 Configuration

### Environment Variables

```env
# LLM Provider (OpenAI or Google)
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...

# Compliance Settings
AI_COMMERCIAL_RATIO_MIN=0.80
AI_DEFLECTION_MAX_COUNT=2
AI_HANDOFF_LOW_CONFIDENCE=0.50
```

### Update Intent Patterns

To modify or add intent keywords, edit:
- [`ai-intent-validator.ts`](./ai-intent-validator.ts) - `INTENT_PATTERNS`

---

## 📈 Metrics Dashboard

### Get Compliance Report

```typescript
import { metaComplianceMetrics } from './ai-compliance-metrics';

const report = await metaComplianceMetrics.getComplianceReport();
console.log(report);
```

**Output**:
```
=== AI Compliance Report (Meta 2026) ===
Status: ✅ COMPLIANT

Intent Ratio:
  • Commercial: 85.3% (Target: 80-90%)
  • Off-Topic: 12.1% (Max: 20%)
  • Unknown: 2.6% (Min: <5%)

Top Intents:
  • technical_diagnostics: 28.5%
  • template_governance: 22.1%
  ...
```

---

## 🛠️ Development

### Add New Commercial Intent

1. Add to `PixyBusinessIntent` enum
2. Add keywords/phrases to `INTENT_PATTERNS`
3. Update deflection templates if needed
4. Update `AI_COMPLIANCE_AUDIT.md`
5. Run compliance tests

### Modify Deflection Responses

Edit [`ai-deflection-handler.ts`](./ai-deflection-handler.ts) - `DEFLECTION_TEMPLATES`

---

## ⚠️ Important Notes

### Critical Rules

1. **NEVER** remove intent validation
2. **NEVER** respond to general-purpose queries
3. **ALWAYS** sanitize data before LLM calls
4. **ALWAYS** track metrics in real-time
5. **NEVER** use conversation data for training

### Meta Policy Violations

These actions will cause **permanent rejection**:
- ❌ Responding to general knowledge
- ❌ Engaging in creative writing
- ❌ Skipping data sanitization
- ❌ Disabling deflection system
- ❌ Commercial ratio < 80%

---

## 📚 References

- [WhatsApp AI Policy 2026](https://www.whatsapp.com/legal/business-policy)
- [Meta AI Guidelines](https://developers.facebook.com/docs/whatsapp/ai-guidelines)
- [Task-Oriented AI Definition](https://developers.facebook.com/docs/whatsapp/ai-task-oriented)
- [Complete Compliance Audit](../../AI_COMPLIANCE_AUDIT.md)

---

## 📞 Support

**Issues**: File in GitHub Issues  
**Meta App Review**: Contact compliance officer  
**Technical Support**: support@pixy.com

---

**Version**: 1.0.0  
**Last Updated**: January 22, 2026  
**Compliance**: Meta WhatsApp AI Policy 2026  
**Status**: ✅ Production Ready
