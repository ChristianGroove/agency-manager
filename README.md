# Agency Manager SaaS Platform

Plataforma de gestión de agencias (CRM, Mensajería y Automatización) diseñada para el escalado empresarial. Construida con **Next.js**, **Supabase** y **Inngest**.

---

## 🚀 Arquitectura Modular

El proyecto utiliza una arquitectura separada por responsabilidades para maximizar la velocidad de desarrollo y minimizar el riesgo técnico:

- **`/src/modules/core`**: Motores básicos (Auth, Billing, SaaS Engine, Multitenancy).
- **`/src/modules/features`**: Módulos verticales de industria (Resto, Attendance, Hosting, etc.).
- **`/src/inngest`**: Procesamiento asíncrono y workers de segundo plano.

Consulta la [Guía de Arquitectura](src/modules/ARCHITECTURE.md) para más detalles.

---

## 🏗️ Stack Tecnológico

- **Frontend:** Next.js (App Router), Tailwind CSS, Radix UI.
- **Backend:** Supabase (Auth, DB, Realtime, Functions).
- **Colas y Workers:** [Inngest](src/inngest/README.md) para tareas asíncronas y escalabilidad.
- **Mensajería:** Evolution API (WhatsApp/Meta).

---

## 🛠️ Primeros Pasos (Desarrollo)

1.  **Instalación:**
    ```bash
    npm install
    ```

2.  **Variables de Entorno:**
    Copia `.env.example` a `.env.local` y configura tus credenciales de Supabase.

3.  **Servidor de Desarrollo:**
    ```bash
    npm run dev
    ```

4.  **Dashboard de Inngest (Local):**
    Imprescindible para ver el flujo de webhooks y tareas asíncronas:
    ```bash
    npx inngest-cli@latest dev
    ```

---

## 📁 Estructura del Proyecto

```text
src/
├── app/            # Next.js App Router (Páginas y API Routes)
├── components/     # Componentes UI globales (Shadcn)
├── lib/            # Utilidades y Clientes (Supabase, Inngest, Auth)
├── modules/        # Dominios de Negocio (Core & Features)
└── types/          # Definiciones de TypeScript compartidas
```

---

El acceso está protegido mediante **RLS (Row Level Security)** en Supabase y un sistema de roles jerárquico (`Platform` > `Reseller` > `Operator` > `Owner` > `Agent`).

---

## 🛡️ Resiliencia y Estabilidad

Pixy está blindado contra fallos en servicios externos:
- **Circuit Breakers:** Implementación modular que protege contra latencias en APIs de Meta, OpenAI y Evolution API.
- **Enterprise Grade RLS:** Aislamiento multi-tenant total verificado en 150+ tablas.
- **Financial Integrity:** Suite de Smoke Tests automatizados que garantizan la precisión centesimal en el cálculo de comisiones y liquidaciones.
