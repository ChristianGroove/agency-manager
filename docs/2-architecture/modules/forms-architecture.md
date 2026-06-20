# Arquitectura del Módulo de Formularios (Forms / Briefings)

Este documento detalla la estructura y capacidades del generador de formularios dinámicos, previamente conocido como módulo de "Briefings".

## 1. Visión General
El módulo de Formularios es un motor dinámico que permite a las agencias u organizaciones construir encuestas, formularios de onboarding o "Briefings" con estructuras JSON flexibles. Estos formularios pueden ser enviados a los clientes mediante tokens únicos y las respuestas se almacenan para desencadenar procesos operativos.

## 2. Modelo de Datos Central
Dado su origen histórico en el proyecto, las tablas en la base de datos conservan la nomenclatura `briefing`.

### Tablas Principales
1. **`briefing_templates`**: Almacena la estructura del formulario (plantilla).
   - `structure` (JSONB): Define los campos (tipo de input, validación, placeholders, si es requerido).
2. **`briefings` (Form Submissions)**: Instancia de un formulario enviado a un cliente (`client_id`).
   - `status`: `pending`, `in_progress`, `completed`.
   - `token`: Hash único para acceso público sin autenticación.
3. **`briefing_responses`**: Almacena las respuestas atómicas.
   - `briefing_id`, `field_id`, `value` (JSONB/Text).

## 3. Patrones de Diseño Implementados

### A. Generalización de Tipos (`actions.ts`)
A nivel de código (TypeScript), el sistema expone una API agnóstica para interactuar con los formularios:
```typescript
export type FormTemplate = FullBriefingTemplate
export type FormSubmission = Briefing
export type FormField = BriefingField
```
Esto permite a la interfaz de usuario funcionar como un generador de formularios de propósito general (`Dynamic Forms`), ocultando el legado de la palabra "Briefing" en el código base.

### B. Wizard y Accesos Públicos
- **`getSubmissionByToken`**: Función RPC (`get_briefing_by_token`) que permite a un usuario no autenticado cargar la plantilla y sus respuestas previas a través de un enlace seguro.
- **Autoguardado Automático**: Al cambiar cualquier campo (`saveSubmissionResponse`), el estado del formulario cambia silenciosamente de `draft` a `in_progress`.

## 4. Dependencias y Relacionamiento
- **Portal de Cliente (`portal`)**: Los clientes autenticados ven estos formularios como tareas pendientes en su portal.
- **Notificaciones (`notifications` / `client_events`)**: Al enviar un formulario (`submitForm`), el sistema dispara:
  1. Notificación In-App para el staff responsable.
  2. Evento de auditoría en la línea de tiempo del cliente (`client_events`).
  3. Correo electrónico de confirmación mediante **Resend**.

## 5. Casos de Uso Comunes
- Formulario de Onboarding de nuevos leads.
- Recolección de requisitos (Briefing) para servicios específicos del Catálogo.
- Recolección de firmas o adjuntos de archivos (los `values` almacenan nombres de archivo en el bucket).
