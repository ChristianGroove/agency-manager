# Arquitectura del Módulo de Sedes (Locations)

Este documento detalla la estructura, funcionamiento y reglas de diseño del módulo de Sedes (`locations`).

## 1. Visión General
El módulo de Sedes es responsable de la gestión de los espacios físicos u operativos de una organización. Permite administrar múltiples sucursales, definir sus horarios comerciales, establecer geocercas para el control de asistencia y vincular personal a ubicaciones específicas.

## 2. Modelo de Datos
La fuente de verdad principal es la tabla `organization_locations`.

### Tabla: `organization_locations`
| Campo | Tipo | Propósito |
|-------|------|-----------|
| `id` | UUID | Identificador único de la sede. |
| `organization_id` | UUID | Aislamiento Multi-Tenant (RLS). |
| `name` | Text | Nombre de la sede. |
| `timezone` | Text | Zona horaria local (ej: `America/Bogota`). Crítico para el cálculo de horarios. |
| `latitude` / `longitude` | Numeric | Coordenadas geoespaciales para la validación de geocercas. |
| `geofence_radius_meters`| Integer | Radio en metros permitido para marcar asistencia desde la app móvil. |
| `business_hours` | JSONB | Objeto estructurado que define apertura, cierre y días de descanso por día de la semana. |
| `manager_id` | UUID | Referencia al usuario encargado de la sede. |

## 3. Patrones de Diseño Implementados

### A. Server Actions (`actions.ts`)
Toda la interacción con Supabase se realiza a través de acciones de servidor centralizadas, garantizando seguridad y revalidación automática:
- Funciones CRUD clásicas (`createLocation`, `updateLocation`, `deleteLocation`, `getLocations`).
- **Integración con Asistencia:** La acción `getStaffTrackers()` cruza datos con la tabla `attendance_logs` para obtener la última posición conocida del personal en tiempo real.

### B. Pure Utilities (`utils.ts`)
El módulo hace uso extensivo de funciones puras, libres de dependencias de React o librerías pesadas como `moment.js`.
- **`isLocationOpenNow`**: Evalúa en tiempo real si una sede está abierta, utilizando nativamente `Intl.DateTimeFormat` para calcular la hora exacta en la zona horaria (`timezone`) de la sede, independientemente de la hora del dispositivo del usuario. Soporta turnos nocturnos cruzados de medianoche.

## 4. Dependencias y Relacionamiento
- **Control de Asistencia (`attendance`)**: El módulo de asistencia depende estrictamente de las coordenadas y el `geofence_radius_meters` de la sede para validar si un "check-in" es válido.
- **Órdenes de Trabajo (`work-orders`)**: Las órdenes pueden asignarse a ubicaciones específicas.

## 5. Reglas de Mantenimiento
1. **JSONB `business_hours`**: No modificar el formato del JSON de horarios sin actualizar las interfaces y la utilidad `isLocationOpenNow`. El formato esperado para cada día es `{ "open": "HH:mm", "close": "HH:mm", "is_closed": boolean }`.
2. **Timezones**: Siempre persistir una zona horaria válida (tz database) para evitar bugs de cálculos horarios distribuidos.
