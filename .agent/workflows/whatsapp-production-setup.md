---
description: WhatsApp Production Deployment & Webhook Handover
---

# WhatsApp Production Deployment Guide

This guide details the exact steps to transition the WhatsApp Official API integration from development (ngrok) to the production environment (`app.pixy.com.co`).

## 1. Meta App Dashboard Configuration

When the production server is live, update the following in the **Meta App Dashboard > WhatsApp > Configuration**:

### Webhook Settings
- **Callback URL**: `https://app.pixy.com.co/api/webhooks/messaging?channel=whatsapp`
- **Verify Token**: `pixy_webhook_2026` (Must match `META_WEBHOOK_VERIFY_TOKEN` in `.env`)

### Required Field Subscriptions
Click on **Manage** in the Webhooks section and ensure these fields are subscribed:
1.  **messages**: Essential for receiving incoming messages.
2.  **smb_message_echoes**: Required for "Coexistence Mode" (mirroring messages sent from the mobile app to the Pixy Inbox).

## 2. Environment Variables (Production)

Ensure the following variables are set in your production hosting platform (e.g., Vercel, AWS):

| Variable | Value / Description |
| :--- | :--- |
| `META_APP_ID` | `25468410932828305` |
| `META_APP_SECRET` | (See `.env.local`) |
| `META_WEBHOOK_VERIFY_TOKEN` | `pixy_webhook_2026` |
| `META_PERMANENT_ACCESS_TOKEN` | (System User token with `whatsapp_business_messaging`) |
| `NEXT_PUBLIC_APP_URL` | `https://app.pixy.com.co` |

## 3. Coexistence Mode Notes
- The number `+57 324 8329449` (ID: `917233028147729`) is registered for the Official Cloud API.
- Do **not** log out of the mobile app unless you need to re-register.
- If messages stop arriving at the mobile app, verify the registration status via the internal `MetaProvider` logs.

## 4. Verification
Once deployed, send a test message to the number. Confirm it appears in both:
1. The **WhatsApp Business Mobile App** (Real-time).
2. The **Pixy Dashboard Inbox** (via `smb_message_echoes`).
