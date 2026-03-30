---
description: Intelligent Conversation Distribution System (Bulk Assignment)
---

# Intelligent Conversation Distribution System

This document outlines the architecture and operational guidelines for the **Intelligent Distribution** feature in the Agency Manager CRM. This system allows for granular, channel-aware round-robin assignment of unassigned conversations.

## 🚀 Core Features

- **Granular Stats**: Aggregates unassigned conversations by `connection_id` (Channel).
- **Targeted Distribution**: Allows assigning all unassigned chats or filtering by specific channels.
- **Agent Presence Aware**: Only distributes to agents who are `online` and have `inbox_access` to the specific channel.
- **One-Key Shortcut**: Invoked via `Ctrl + Alt + A` within the Inbox module.

## 🏗️ Technical Architecture

### 1. Backend Logic (`assignment-actions.ts`)

Two primary server actions handle the core logic:

- **`getUnassignedDistributionStats`**: 
    - Queries `conversations` where `assigned_agent_id` is null and `status` is `'open'`.
    - Maps `provider_key` to "Friendly names" (e.g., `whatsapp_cloud` -> `WhatsApp`).
    - Returns counts grouped by connection.
- **`distributeUnassignedConversations(connectionIds?: string[])`**:
    - Extends the core Round Robin logic.
    - If `connectionIds` are provided, it filters the unassigned list before triggering the assignment loop.
    - **Transaction Safety**: Performs batch updates using `supabaseAdmin` to ensure atomic assignments.

### 2. Frontend Component (`BulkDistributionModal.tsx`)

A premium UI built with `@/components/ui` (shadcn):
- **Dynamic Fetching**: Loads stats only when the modal opens to minimize system load.
- **Visual Feedback**: Uses `sonner` toasts for real-time progress and success confirmation.
- **i18n Support**: Fully localized using `sidebar.distribution` keys in `es.ts` and `en.ts`.

## 🛡️ Security & Performance Rules

> [!IMPORTANT]
> **Data Isolation**: All queries MUST include `.eq('organization_id', orgId)` to prevent cross-tenant data leaks.

> [!CAUTION]
> **Realtime Integrity**: NEVER modify the `realtimeManager` or messaging subscription logic when updating the distribution system. This module is purely for **assignment**, and messaging relies on a separate event bridge.

## 🛠️ Maintenance & Troubleshooting

- **Icon Mapping**: If a new provider is added (e.g., Telegram), update `getChannelIcon` in `BulkDistributionModal.tsx` and the `getFriendlyType` helper in `assignment-actions.ts`.
- **Shortcut Registry**: The `Ctrl + Alt + A` logic is registered in `SidebarConversationList.tsx` within the `useInboxShortcuts` hook.

## 📋 System Requirements
- **Table**: `conversations`, `integration_connections`, `agent_availability`.
- **Permissions**: Requires the calling user to have administrative or owner roles to trigger bulk operations.
