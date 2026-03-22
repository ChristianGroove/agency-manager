---
description: How to configure and connect Meta Webhooks for Instagram, WhatsApp, and Messenger.
---
# Meta Channel & Webhooks Configuration

When creating new integrations with the Meta API or debugging webhook deliveries in the Agency Manager CRM, strictly adhere to the following rules:

## 1. Subscribing Instagram Webhooks
Meta explicitly requires that Instagram Webhook subscriptions (even for Instagram Direct Messages) must be registered under the **Facebook Page ID**, NOT the Instagram Business Account ID.
- **DO NOT** attempt to make a POST to `/{instagram_id}/subscribed_apps`. This will silently fail (`webhook_status: failed`) and Meta will not deliver messages.
- **DO** extract the `page_id` from the connected `MetaAsset` or the `MetaGraphAPI.getConnectedAssets()` endpoint and pass it to the subscription endpoint `POST /{page_id}/subscribed_apps` along with the long-lived Page Access Token.

## 2. Webhook Endpoint Best Practices
The CRM's unified webhook handler (`/api/webhooks/messaging/route.ts`) auto-detects the channel from the Meta `object` payload. However:
- Meta often classifies Instagram webhook payloads as `object: "page"` if the subscription was established via the Page's Apps.
- To prevent Instagram Direct Messages from being erroneously flagged as Messenger messages by the `ChannelResolver`, **always append the channel query string in the official Meta Dashboard**.

### Recommended Meta App Webhook URLs:
- **Instagram**: `https://[your-domain]/api/webhooks/messaging?channel=instagram`
- **Messenger**: `https://[your-domain]/api/webhooks/messaging?channel=messenger`
- **WhatsApp**: `https://[your-domain]/api/webhooks/messaging?channel=whatsapp`

Using `?channel=instagram` forces the handler parser to securely bind the payload mapping to the `instagram_dme` internal provider rather than falling back to `messenger`.

## 3. Empty CRM Inbox Drops
If messages from Meta are hitting the server correctly (returning 200 OK) but are not being saved to the `conversations` database table, verify the following:
- Ensure the channel has an active state in the `integration_connections` table.
- A user must have successfully completed the UI Setup (Sheet) inside the CRM to link the CRM Channel with the Meta Asset. Manually editing webhooks inside Meta for Developers does **not** create the internal CRM routes. In this case, simply prompt the user to delete and recreate the connection from the UI to trigger the proper database insertions and `status: "active"`.
