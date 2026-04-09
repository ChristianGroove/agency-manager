# Messaging Module: Inbox Architecture & Optimization

Este módulo gestiona la mensajería omnicanal de la plataforma. Ha sido optimizado para ofrecer una experiencia de usuario instantánea ("Zero-Flicker") mediante persistencia estructural y centralización de identidad.

## 🏛️ Estrategia de Persistencia Estructural (Zero-Flicker)

Para eliminar la latencia al cambiar entre pestañas del Inbox, implementamos una arquitectura de **Slots Persistentes**:

1.  **Visibilidad por CSS**: En `SidebarTabs.tsx`, el cambio entre "Conversaciones" y "Contactos" no utiliza renderizado condicional destructivo (unmount). En su lugar, ambos componentes permanecen montados en el DOM y se alternan usando la clase `hidden`.
    *   **Resultado**: Las listas mantienen su estado interno, posición de scroll y suscripciones de Supabase Realtime de forma indefinida durante la sesión.
2.  **Inyección de Identidad (Identity Injection)**: El `InboxLayout.tsx` actúa como la fuente de verdad (Source of Truth) para la identidad del usuario y la organización.
    *   Obtiene `organizationId` y `userPermissions` una sola vez al cargar.
    *   Inyecta estos datos como props hacia abajo: `InboxLayout` -> `SidebarTabs` -> `SidebarLists`.
    *   **Beneficio**: Evita el parpadeo de "Loading..." que ocurría anteriormente cuando cada componente hijo intentaba validar su propia identidad de forma independiente.

## 📡 Sincronización Realtime

La sincronización se basa en el `realtimeManager` (singleton), asegurando que:
*   Las suscripciones no se dupliquen al re-renderizar.
*   Los mensajes nuevos se inyecten instantáneamente tanto en la lista (`SidebarConversationList`) como en el área de chat activa (`ChatArea`).
*   Eventos globales de "vanish" o "delete" se propaguen a través de `CustomEvents` nativos para mantener la coherencia sin recargas.

## 🛠️ Reglas de Oro para Mantenimiento

1.  **No usar Renderizado Condicional Destructivo**: Al añadir nuevas pestañas al sidebar, asegúrate de usar `display: none` (`hidden`) para mantener la persistencia.
2.  **Propagar Identidad**: Si creas un nuevo componente en el Inbox que necesite permisos, pídelos por props desde el Layout; no vuelvas a llamar a `getCurrentUserPermissions` o hooks de auth pesados innecesariamente.
3.  **Realtime via Manager**: Nunca crees suscripciones directas de Supabase en componentes de React; usa siempre el `realtimeManager` para evitar fugas de memoria y bloqueos de WebSocket.

---
*Documentación actualizada tras la Optimización de Persistencia de Marzo 2026.*
