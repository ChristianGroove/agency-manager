# Arquitectura del Módulo de Órdenes de Trabajo (Work Orders)

Este documento detalla la estructura, funcionamiento y responsabilidades del módulo de Órdenes de Trabajo (`work-orders`).

## 1. Visión General
El módulo de Órdenes de Trabajo orquesta la parte operativa y de prestación de servicios de la plataforma. Permite la asignación de tareas a miembros del equipo (Staff), control de tiempos (start/end), métricas de rendimiento y la liquidación automática de nóminas o comisiones (Payroll).

## 2. Modelo de Datos Central
La tabla núcleo es `work_orders`.

### Tabla: `work_orders`
| Campo | Tipo | Propósito |
|-------|------|-----------|
| `id` | UUID | Identificador único de la orden. |
| `client_id` | UUID | Referencia al cliente (`leads`) que solicitó el servicio. |
| `service_id` | UUID | Servicio del catálogo (`catalog`) que se prestará. |
| `assigned_staff_id`| UUID | Referencia al usuario/agente (`staff`) que realizará el trabajo. |
| `status` | Text | Estado operativo (ej: `pending`, `in_progress`, `completed`). |
| `priority` | Text | Prioridad de la tarea (`normal`, `high`, `urgent`). |
| `start_time` / `end_time` | Timestamp | Registro del tiempo de ejecución de la orden para cálculo de SLA y pagos. |
| `location_type` / `address`| Text | Contexto físico (ej: `at_client_address`). |
| `price_quoted` | Numeric | Precio base cotizado al cliente, utilizado para calcular márgenes. |

## 3. Patrones de Diseño Implementados

### Múltiples Controladores (Server Actions)
Dado que el flujo de trabajo involucra muchos sub-dominios operativos, las operaciones de servidor (`Server Actions`) están desacopladas en archivos especializados dentro de `actions/`:

- **`work-order-actions.ts`**: CRUD básico y cambio de estados (transiciones del pipeline operativo).
- **`operation-actions.ts`**: Lógica de negocio más compleja durante la ejecución (marcar llegada, subir evidencias).
- **`payroll-actions.ts` & `payroll-summary-actions.ts`**: El motor de nómina. Calcula liquidaciones o pagos basados en las horas trabajadas (`end_time` - `start_time`) o en esquemas de comisiones fijos por servicio completado.
- **`staff-actions.ts`**: Gestión de disponibilidad, habilidades y asignación del personal técnico.
- **`metrics-actions.ts`**: Consultas agregadas (RPCs) para dashboards operativos y cálculo de tiempos de resolución (SLA).

## 4. Dependencias y Relacionamiento
- **Catálogo (`catalog`)**: Cada orden de trabajo se instancia a partir de un servicio definido previamente en el catálogo.
- **CRM (`leads`)**: La orden siempre está atada a un Master Contact (`client_id`).
- **Sedes (`locations`)**: Para órdenes internas o en sucursales físicas.

## 5. Reglas de Negocio
1. **Flujo Inmutable de Payroll**: Una vez una orden cambia a estado `completed`, se bloquea la modificación de `start_time` y `end_time`, ya que estos campos se usan como semilla inmutable para liquidar el pago al operario en `payroll-actions`.
2. **Asignación Basada en Skills**: Al utilizar `staff-actions`, el sistema filtra operarios disponibles en función del vertical (`vertical` en `work_orders`) o los requisitos técnicos del servicio.
