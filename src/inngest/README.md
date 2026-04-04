# Inngest Workers: Asynchronous Event Processing

Este directorio contiene la lógica de procesamiento asíncrono para **Agency Manager**. Utilizamos **Inngest** para garantizar que los procesos I/O intensivos no bloqueen el servidor de Next.js y para proporcionar resiliencia automática ante fallos.

## 1. Funcionamiento

El flujo de procesamiento sigue el patrón de **Offloading**:
1.  Un **Webhook** (ej. WhatsApp/Stripe) recibe una petición.
2.  El Webhook responde `200 OK` inmediatamente tras despachar un evento a Inngest.
3.  Inngest orquesta la ejecución del **Worker** (Función) correspondiente en segundo plano.

## 2. Workers Disponibles

- **`messaging.ts`:** Procesa mensajes entrantes de WhatsApp y Evolution API. Maneja la lógica de Inbox, CRM e integraciones de IA.
- **`stripe.ts`:** Gestiona pagos, suscripciones y eventos de retención (Churn). Actualiza el estado de las cuentas conectadas.
- **`billing.ts`:** Automatiza el seguimiento de uso y la generación de facturas mensuales.
- **`automation.ts`:** Motor de flujos de trabajo (Workflows) con soporte para retardos y branching.

## 3. Desarrollo Local

Para ver y probar las funciones en modo desarrollo, asegúrate de tener el servidor de Next.js corriendo y ejecuta:

```bash
npx inngest-cli@latest dev
```

Esto abrirá el panel de Inngest en `http://localhost:8288`, donde podrás simular eventos y ver el historial de ejecuciones.

---

## 4. Mejores Prácticas

1.  **Idempotencia:** Asegúrate de que tus funciones puedan ejecutarse varias veces sin causar efectos secundarios duplicados (Inngest puede reintentar en caso de fallo).
2.  **Step Running:** Divide tareas largas en `step.run()` para que Inngest pueda persistir el estado entre ejecuciones y manejar reintentos de forma granular.
3.  **Timeouts:** Evita realizar peticiones síncronas que duren más de unos segundos dentro de un `step.run()`.

---
> [!IMPORTANT]
> El despacho de eventos se centraliza en `src/lib/inngest/client.ts`. Siempre define el esquema del evento en ese archivo antes de crear una nueva función.
