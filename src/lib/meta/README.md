# Meta WhatsApp Business Cloud API - Phase 1 Implementation

## Overview

This directory contains the Phase 1 implementation of the Pixy WhatsApp Business Cloud API integration, upgraded to **Graph API v24.0** with production-ready infrastructure.

## Key Features

### ✅ Implemented

1. **OpenAPI-Based SDK Generation**
   - Automatic TypeScript type generation from Meta's official OpenAPI spec
   - Run `npm run openapi:generate` to sync with latest API changes

2. **Graph API v24.0**
   - All endpoints upgraded to v24.0
   - Prepared for 2026 Meta compliance requirements

3. **Advanced Error Handling**
   - Specific handlers for error code 132018 (HSM parameter errors)
   - Cursor expiration recovery (Error 131059)
   - Exponential backoff for rate limits
   - Circuit breaker pattern

4. **High-Throughput Message Queue**
   - BullMQ + Redis implementation
   - Target: 1,000 messages per second (mps)
   - Automatic retries and job persistence

5. **Rate Limiting**
   - Token bucket algorithm
   - Per-WABA rate tracking
   - Prevents API throttling

6. **Telemetry & Monitoring**
   - Real-time performance metrics
   - Success rate tracking
   - Latency percentiles (P50, P95, P99)
   - Error distribution analysis

7. **WABA Subscription Manager**
   - Prevents "Shadow Delivery" failures
   - Automatic POST to `/{WABA_ID}/subscribed_apps`
   - Webhook subscription verification

## Architecture

```
src/lib/meta/
├── graph-api.ts              # Core API client (v24.0)
├── generated/                # Auto-generated types from OpenAPI
│   └── schema.d.ts          
├── meta-error-handler.ts    # Centralized error handling
├── rate-limiter.ts          # Token bucket rate limiter
├── meta-telemetry.ts        # Performance monitoring
├── message-queue.ts         # BullMQ high-throughput queue
├── redis-config.ts          # Redis configuration
└── waba-subscription-manager.ts  # Webhook subscription automation
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

New dependencies added:
- `bullmq`: Message queue system
- `ioredis`: Redis client
- `openapi-fetch`: Type-safe API client
- `openapi-typescript`: TypeScript type generator

### 2. Configure Redis

Add to `.env.local`:

```env
# Redis Configuration (Required for production)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password  # Optional for local dev
REDIS_DB=0

# Or use connection URL
REDIS_URL=redis://localhost:6379
```

#### Local Development (Windows)

Install Redis using Memurai (Redis-compatible):

```powershell
# Using Chocolatey
choco install memurai-developer

# Start Memurai service
net start Memurai
```

Or use Docker:

```powershell
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

### 3. Generate TypeScript Types

```bash
npm run openapi:generate
```

This downloads Meta's latest OpenAPI specification and generates type-safe interfaces.

### 4. Environment Variables

Add to `.env.local`:

```env
# Meta App Configuration
NEXT_PUBLIC_META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret

# Webhook Configuration
META_WEBHOOK_VERIFY_TOKEN=your_verify_token

# Public URL for webhooks
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Usage

### Initialize Message Queue

```typescript
import { metaMessageQueue } from '@/lib/meta/message-queue';

// Initialize worker (do this once on server startup)
await metaMessageQueue.initializeWorker(10); // 10 concurrent workers
```

### Send Message via Queue

```typescript
import { metaMessageQueue } from '@/lib/meta/message-queue';

const jobId = await metaMessageQueue.enqueueMessage({
  wabaId: 'your_waba_id',
  phoneNumberId: 'your_phone_number_id',
  accessToken: 'your_access_token',
  to: '1234567890',
  message: {
    type: 'text',
    content: {
      text: 'Hello from Pixy!'
    }
  }
});
```

### Subscribe WABA to Webhooks

```typescript
import { wabaSubscriptionManager } from '@/lib/meta/waba-subscription-manager';

const result = await wabaSubscriptionManager.subscribeWABA(
  'your_waba_id',
  'your_access_token'
);

if (result.success) {
  console.log('✅ WABA subscribed successfully');
} else {
  console.error('❌ Subscription failed:', result.error);
}
```

### Monitor System Health

```typescript
import { metaTelemetry } from '@/lib/meta/meta-telemetry';

// Get health status
const health = metaTelemetry.getHealthStatus();

if (!health.healthy) {
  console.warn('⚠️  System issues detected:', health.issues);
}

// Get detailed report
console.log(metaTelemetry.getReport());
```

### Check Rate Limiter

```typescript
import { metaRateLimiter } from '@/lib/meta/rate-limiter';

const metrics = metaRateLimiter.getMetrics('your_waba_id');
console.log(`Available tokens: ${metrics.availableTokens}/${metrics.maxTokens}`);
console.log(`Utilization: ${metrics.utilizationPercent.toFixed(2)}%`);
```

## Error Handling

The system automatically handles Meta API errors:

| Error Code | Description | Strategy |
|------------|-------------|----------|
| 4 | Rate Limit | Exponential backoff |
| 100 | Invalid Parameter | No retry (log + alert) |
| 132018 | HSM Parameter Error | No retry (alert) |
| 131059 | Cursor Expired | Restart pagination |
| 190 | Token Error | Refresh token |

Example:

```typescript
import { metaErrorHandler } from '@/lib/meta/meta-error-handler';

try {
  // API call
} catch (error) {
  const handling = await metaErrorHandler.handleError(
    error,
    'my_operation',
    'operation_id_123'
  );
  
  if (handling.shouldRetry) {
    if (handling.delayMs) {
      await sleep(handling.delayMs);
    }
    // Retry logic
  }
}
```

## Testing

### Test Queue System

```bash
npm run test -- src/lib/meta/message-queue.test.ts
```

### Test Rate Limiter

```typescript
import { metaRateLimiter } from '@/lib/meta/rate-limiter';

// Try to consume tokens
const allowed = await metaRateLimiter.tryConsume('test_waba', 1);
console.log(allowed ? '✅ Allowed' : '❌ Rate limited');
```

### Validate Redis Connection

```typescript
import { validateRedisConnection } from '@/lib/meta/redis-config';

const isConnected = await validateRedisConnection();
console.log(isConnected ? '✅ Redis connected' : '❌ Redis disconnected');
```

## Production Deployment

### Pre-deployment Checklist

- [ ] Redis server configured and accessible
- [ ] Environment variables set in production
- [ ] OpenAPI types generated
- [ ] Worker process initialized on server startup
- [ ] Webhook URL configured in Meta App Dashboard
- [ ] WABA subscriptions automated post-connection
- [ ] Monitoring/alerting configured

### Recommended Configuration

**Production Redis**:
- Use managed Redis service (AWS ElastiCache, Redis Cloud, etc.)
- Enable persistence (AOF + RDB)
- Configure cluster mode for high availability
- Set appropriate memory limits

**Worker Configuration**:
```typescript
// For 1,000 mps throughput
await metaMessageQueue.initializeWorker(20); // 20 concurrent workers
```

**Monitoring**:
- Set up alerts for low success rate (< 95%)
- Alert on high latency (> 2 seconds)
- Alert on rate limit hits
- Monitor queue depth

## Meta 2026 Compliance

### AI Policy (January 2026)

✅ **Task-Oriented AI Only**
- No general-purpose AI assistants
- Must declare AI capabilities in WABA config
- Require explicit user consent

Implementation:
```typescript
const wabaConfig = {
  ai_capabilities: {
    type: 'task_oriented',
    use_cases: ['customer_support', 'lead_qualification'],
    disclosure: 'Este chat usa IA para respuestas automatizadas'
  }
};
```

### App Review Requirements

For production approval, ensure:
1. Business verification completed
2. Data privacy policy URL public
3. Use case documentation provided
4. Test users configured
5. Webhook handling demonstrated
6. Opt-in/opt-out mechanism implemented

## Troubleshooting

### Queue Not Processing Messages

```bash
# Check Redis connection
redis-cli ping
# Should return: PONG

# Check queue metrics
# In your app:
const metrics = await metaMessageQueue.getMetrics();
console.log(metrics);
```

### Shadow Delivery Failures

If webhooks work in test but not production:

```typescript
// Re-subscribe WABA
const result = await wabaSubscriptionManager.subscribeWABA(wabaId, token);

// Verify subscription
const isSubscribed = await wabaSubscriptionManager.verifySubscription(wabaId, token);
```

### High Latency

Check telemetry report:
```typescript
console.log(metaTelemetry.getReport());
```

Common causes:
- Network latency to Meta servers
- Redis connection issues
- High queue depth
- Rate limiting

## Next Phases

### Phase 2: Advanced Features
- [ ] WhatsApp Calling API integration
- [ ] WhatsApp Flows implementation
- [ ] Catalog integration
- [ ] Payment processing

### Phase 3: Optimization
- [ ] Horizontal scaling support
- [ ] Advanced caching strategies
- [ ] CDN for media delivery
- [ ] Multi-region deployment

## Support

For issues or questions:
1. Check telemetry reports
2. Review error logs
3. Verify Redis connection
4. Check Meta API status page
5. Review Meta for Developers documentation

## References

- [Meta Graph API v24.0 Documentation](https://developers.facebook.com/docs/graph-api/changelog/version24.0)
- [WhatsApp Business Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Meta App Review Process](https://developers.facebook.com/docs/app-review)
