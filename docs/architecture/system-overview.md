# Resumen de Arquitectura del Sistema (System Overview)

Este documento proporciona la visión general definitiva de la arquitectura técnica de **Agency Manager**, integrando los hallazgos de los mapas de dominios, base de datos, lógica y UI.

---

## 1. Visión General de la Arquitectura

**Agency Manager** es un **Monolito Modular** construido sobre la base de **Next.js** y **Supabase**, diseñado para ser escalable horizontalmente mediante la separación de funciones en módulos independientes alojados en `src/modules/`.

### Pilares del Diseño
- **Inquilino Primero (Multi-tenant)**: Aislamiento estricto de datos en la base de datos (RLS) y en el contexto de la aplicación.
- **División Core vs Features**: El sistema base (Core) es agnóstico al nicho de mercado, mientras que las funcionalidades especializadas (Features) se conectan como plugins.
- **Procesamiento Basado en Eventos**: Las tareas pesadas o de larga duración se delegan a colas de trabajo (Inngest) para mantener una UI fluida.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Función |
|---|---|---|
| **Frontend** | React (Next.js 14+) | Renderizado híbrido, App Router, Mutaciones (Server Actions). |
| **Backend (BaaS)**| Supabase (PostgreSQL) | Persistencia, Autenticación, Auditoría, Realtime. |
| **Lógica** | TypeScript | Servicios tipados con patrón Action-Service-Repository. |
| **Background** | Inngest | Orquestación de flujos de trabajo asíncronos y webhooks. |
| **Styling** | Vanilla CSS / Tailwind | Sistema de diseño modular y temas multivertical. |
| **IA** | OpenAI / Anthropic | Motores de inferencia para bots y análisis. |

---

## 3. Resumen de Dominios Funcionales

1. **CRM & Sales**: Eje central del ciclo de vida del cliente.
2. **Omni-Messaging**: Hub de comunicación unificada.
3. **Billing & SaaS**: Motor de monetización y suscripciones.
4. **Automation Engine**: Cerebro de orquestación de procesos.
5. **Smart AI**: Capa de inteligencia aplicada a datos y chats.
6. **Domain Verticals**: Plugins especializados (Resto, Attendance, Hosting).

---

## 4. Consideraciones de Escalabilidad

- **Base de Datos**: El uso extensivo de RLS impone una carga en PostgreSQL que requiere monitoreo constante. La consolidación de la tabla `leads` es el próximo punto de optimización necesario.
- **Edge Computing**: La mayoría de la lógica de negocio se ejecuta en el servidor (Node.js) pero está preparada para desplegarse en entornos Edge si se requiere menor latencia global.
- **Event-Driven**: La arquitectura permite escalar el procesamiento de mensajes masivos e integraciones complejas sin impactar la experiencia del usuario final gracias a la cola de Inngest.

---

## 5. Hitos Recientes de la Plataforma

- **Junio 2025**: Lanzamiento inicial con arquitectura monolítica (MVP).
- **Marzo 2026**: Consolidación de CRM (Entidad unificada de Leads).
- **Abril 2026**: Saneamiento de Interfaz. Fragmentación de "God Components" (`ChatArea`, `ClientManagementSheet`) en arquitectura de 3 capas (Hooks + Action Managers + Atomic UI). Reducción del 80% en líneas de código por archivo orquestador.

---

## 6. Conclusión de la Auditoría Arquitectónica

El sistema posee una arquitectura **Madura y Coherente**. La transición de un modelo centrado en `clients` a una entidad unificada de `leads` (CRM Consolidation) es el paso técnico más importante realizado recientemente para preparar el producto para una escala masiva de multi-tenancy. La organización en `src/modules` es la clave para que Agency Manager pueda seguir creciendo como una plataforma multivertical sin colapsar bajo su propia complejidad.
