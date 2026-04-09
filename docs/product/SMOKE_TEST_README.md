# Smoke Test Suite - Phase 1

Este directorio contiene el smoke test para validar la infraestructura de Fase 1 antes de proceder a Fase 2.

## Tests Incluidos

### 1. **BullMQ Worker - Message Burst Processing**
- Inicializa worker con 3 workers concurrentes
- Envía ráfaga de 10 mensajes
- Valida que al menos 50% sean procesados en 5 segundos
- Verifica métricas de cola (waiting, active, completed, failed)

### 2. **WABA Subscription - subscribed_apps Endpoint**
- Prueba suscripción de WABA a webhooks
- Valida estructura de respuesta
- Verifica estado de suscripción
- Soporta modo mock si no hay credenciales

### 3. **Error Handler - Code 132018**
- Simula error HSM parameter (132018)
- Valida que el error NO se reintente (estrategia correcta)
- Verifica logging y estructura de respuesta
- Extrae mensaje user-friendly

## Ejecución

### Pre-requisitos

**Opción 1: Test Completo (con Redis)**
```powershell
# Instalar Redis/Memurai
choco install memurai-developer

# O usar Docker
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Iniciar servicio
net start Memurai
```

**Opción 2: Test Sin Redis (solo errores)**
Los tests de WABA y Error Handler funcionan sin Redis.

### Ejecutar Tests

```powershell
# Ejecutar smoke tests
npm run smoke-test
```

### Con Credenciales Reales (Opcional)

Para probar la suscripción WABA con API real de Meta:

1. Editar `.env.test`:
```env
TEST_WABA_ID=your_waba_id
TEST_ACCESS_TOKEN=your_permanent_token
```

2. Ejecutar:
```powershell
npm run smoke-test
```

## Salida Esperada

```
════════════════════════════════════════════════════════════
         SMOKE TEST SUITE - Phase 1 Infrastructure
════════════════════════════════════════════════════════════

ℹ Starting smoke tests for Phase 1 implementation...

============================================================
Test 1: BullMQ Worker - Message Burst Processing
============================================================

🔧 Initializing BullMQ worker with 3 concurrent workers...
✓ Worker initialized successfully
📤 Enqueueing 10 test messages...
✓ 10 messages enqueued in 45ms
⏳ Waiting for queue processing (5 seconds)...
📊 Queue Metrics:
   - Waiting: 0
   - Active: 2
   - Completed: 8
   - Failed: 0
✓ Test PASSED: 8/10 messages processed

============================================================
Test 2: WABA Subscription - subscribed_apps Endpoint
============================================================

⚠ Skipping live API test - No credentials provided
ℹ To run live test, set TEST_WABA_ID and TEST_ACCESS_TOKEN
🧪 Running mock subscription test...
✓ Test PASSED: WABA subscription structure validated

============================================================
Test 3: Error Handler - HSM Parameter Error (132018)
============================================================

🧪 Simulating Meta API error 132018 (HSM parameter error)...
📝 Error details:
   - Code: 132018
   - Subcode: 2494055
   - Message: Invalid HSM parameter: template name mismatch
   - Trace ID: AaBbCcDdEeFfGg123456789
🔧 Processing error through error handler...
📊 Error handling result:
   - Should Retry: false
   - Delay: N/A
   - Action: N/A
✓ Test PASSED: Error 132018 correctly marked as NO RETRY

============================================================
Test Summary
============================================================

✓ 1. BullMQ Message Burst - Processed 8/10 messages
✓ 2. WABA Subscription (Mock) - Function structure validated
✓ 3. Error Handler (132018) - Correctly identified as non-retryable

────────────────────────────────────────────────────────────
✓ ALL TESTS PASSED (3/3) - 100.0%

🎉 Phase 1 infrastructure is ready for production!
```

## Estructura de Tests

```typescript
interface TestResult {
  test: string;       // Nombre del test
  passed: boolean;    // ¿Pasó?
  details?: string;   // Detalles adicionales
}
```

## Interpretación de Resultados

### ✅ All Passed (3/3)
- Infraestructura lista para Fase 2
- Puede proceder con deployment

### ⚠ Some Failed
- Revisar logs de error
- Verificar configuración de Redis
- Validar credenciales de Meta (si se usan)
- Corregir issues antes de Fase 2

## Troubleshooting

### Error: "Cannot connect to Redis"
```powershell
# Verificar que Redis está corriendo
redis-cli ping
# Debe retornar: PONG

# O iniciar Memurai
net start Memurai
```

### Error: "Worker failed to initialize"
- Verificar REDIS_HOST y REDIS_PORT en .env.local
- Confirmar que puerto 6379 está disponible
- Revisar logs de Redis

### Test WABA falla
- Verificar TEST_WABA_ID y TEST_ACCESS_TOKEN
- Confirmar que token tiene permiso `whatsapp_business_management`
- Si es mock test, es esperado (estructura validada)

## Next Steps

Una vez que todos los tests pasen:

1. ✅ Infraestructura validada
2. ✅ Ready para deployment
3. ✅ Proceder a **Fase 2**

## Limpieza

Después de ejecutar tests:

```powershell
# Opcional: Limpiar Redis
redis-cli FLUSHDB

# O detener servicio
net stop Memurai
```
