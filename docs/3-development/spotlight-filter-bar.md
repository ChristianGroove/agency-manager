# SpotlightFilterBar (Combobox Search + Filtros)

Componente UI compacto y de alto rendimiento inspirado en el diseño de **Apple macOS Spotlight**.
Reemplaza la experiencia tradicional y abultada del combobox con badges expandidos, optimizando el espacio horizontal al unificar la búsqueda de texto, la selección de filtros y la retroalimentación dinámica en una sola barra fluida.

---

## 1. Principios de Diseño y UX

1. **Estado en Reposo Ultra-Compacto**:
   - En reposo, el componente ocupa solo el espacio de un input de búsqueda con bordes redondeados (`rounded-full`, altura 40px).
   - No satura el interior del input con badges estáticos ni etiquetas fijas que reduzcan el espacio para escribir.
2. **Placeholder Dinámico con Animación Fluida**:
   - Muestra el estado activo en reposo (ej: `Activas › Bloqueadas 3 · Buscar...`).
   - Al pasar el cursor por encima de cualquier burbuja de filtro, el placeholder cambia en tiempo real mediante `AnimatePresence` (`mode="popLayout"`) mostrando el nombre del filtro y su conteo de ítems antes de hacer clic.
3. **Bandeja de Filtros Flotante (Burbujas)**:
   - Se despliega suavemente a la derecha al hacer hover o al enfocar el input (`inputFocused && !searchTerm`).
   - Si el usuario comienza a escribir (`searchTerm.length > 0`), la bandeja se retrae automáticamente para otorgar todo el ancho al texto de búsqueda.
4. **Morfismo Continuo de Subfiltros (In-Place Capsule)**:
   - Los filtros que tienen sub-opciones (ej. *"Activas"* que contiene *"Bloqueadas"*, *"En curso"*, *"Por hacer"*, etc.) **no** abren menús desplegables externos ni popovers desacoplados.
   - El propio botón circular se extiende verticalmente hacia abajo (o hacia arriba según el espacio disponible en pantalla), conservando su anillo de color activo (ej. rojo para bloqueadas) en una cápsula continua y limpia.
   - Los iconos dentro de la cápsula extendida son limpios, sin fondos grises de botón anidado.
5. **Tooltips Modernos (Radix UI)**:
   - Todas las burbujas cuentan con tooltips modernos (`@/components/ui/tooltip`) que muestran **exclusivamente el nombre del filtro** (sin números de ítems) para evitar el cruce de miradas en pantallas ultra anchas.
   - Los filtros principales muestran el tooltip hacia arriba (`side="top"`).
   - Los subfiltros verticales muestran su tooltip hacia la derecha (`side="right"`).
   - La bandeja comparte un `TooltipProvider` (`delayDuration={150}`), garantizando transiciones instantáneas al mover el cursor entre burbujas.
6. **Temporizador de Cortesía (2 Segundos)**:
   - Al retirar el cursor (`mouseLeave`) o hacer clic en "Quitar filtro", la bandeja espera **2 segundos (2000 ms)** antes de retraerse, evitando cierres accidentales.
   - Si el usuario reingresa con el cursor durante ese lapso, el temporizador se cancela y la barra permanece abierta.
   - La tecla `Esc` colapsa el componente al instante sin esperar los 2 segundos.
7. **Botón Intuitivo para Limpiar Filtro**:
   - Ubicado estratégicamente en la ranura derecha del search (donde normalmente habita el icono `ListFilter`).
   - Al haber un filtro activo, el icono pasivo se transforma en un botón interactivo `X` con feedback visual sutil en hover (`hover:text-red-500 hover:bg-red-50`), permitiendo resetear al filtro por defecto (*"Todas"*) en un solo clic.

---

## 2. API y Tipos TypeScript

```typescript
import { SpotlightFilterBar, SpotlightFilterOption, SpotlightFilterSubOption } from "@/modules/core/ui/components/spotlight-filter-bar"
```

### `SpotlightFilterOption`
```typescript
export interface SpotlightFilterOption {
    /** Identificador único del filtro (ej: "all", "active", "completed") */
    id: string
    /** Nombre visible en el placeholder y tooltip (ej: "Todas", "Activas") */
    label: string
    /** Conteo numérico de registros asociados al filtro */
    count?: number
    /** Color semántico para anillo y dot activo:
     * 'gray' | 'red' | 'amber' | 'emerald' | 'slate' | 'blue' |
     * 'purple' | 'pink' | 'indigo' | 'orange' | 'cyan' | 'sky'
     */
    color?: string
    /** Icono Lucide o SVG component */
    icon?: React.ComponentType<{ className?: string }>
    /** Lista de subfiltros (activa el morfismo vertical) */
    subOptions?: SpotlightFilterSubOption[]
}
```

### `SpotlightFilterSubOption`
```typescript
export interface SpotlightFilterSubOption {
    id: string
    label: string
    count?: number
    color?: string
    icon?: React.ComponentType<{ className?: string }>
}
```

### `SpotlightFilterBarProps`
| Prop | Tipo | Por Defecto | Descripción |
| :--- | :--- | :--- | :--- |
| `searchTerm` | `string` | **Requerido** | Valor del texto de búsqueda actual. |
| `onSearchChange` | `(value: string) => void` | **Requerido** | Callback al cambiar el texto de búsqueda. |
| `searchPlaceholder` | `string` | `"Buscar..."` | Placeholder mostrado cuando no hay filtro ni hover. |
| `filters` | `SpotlightFilterOption[]` | **Requerido** | Array de opciones y subopciones de filtrado. |
| `activeFilter` | `string` | Primer id o `"all"` | ID del filtro o subfiltro actualmente activo. |
| `onFilterChange` | `(filterId: string) => void` | `undefined` | Callback emitido al seleccionar un filtro. Al deseleccionar, devuelve el filtro por defecto (`"all"`). |
| `className` | `string` | `undefined` | Clases CSS adicionales para el contenedor principal. |

---

## 3. Ejemplo de Integración

```tsx
"use client"

import { useState } from "react"
import { SpotlightFilterBar, SpotlightFilterOption } from "@/modules/core/ui/components/spotlight-filter-bar"
import { Layers, CheckCircle2, Clock, AlertCircle, CircleDashed } from "lucide-react"

export function MyModuleToolbar() {
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")

    const filters: SpotlightFilterOption[] = [
        {
            id: "all",
            label: "Todas",
            count: 45,
            icon: Layers,
            color: "gray",
        },
        {
            id: "active",
            label: "Activas",
            count: 30,
            icon: CircleDashed,
            color: "blue",
            subOptions: [
                { id: "in_progress", label: "En progreso", count: 18, color: "blue", icon: Clock },
                { id: "blocked", label: "Bloqueadas", count: 4, color: "red", icon: AlertCircle },
            ],
        },
        {
            id: "completed",
            label: "Completadas",
            count: 15,
            icon: CheckCircle2,
            color: "emerald",
        },
    ]

    return (
        <div className="flex items-center gap-3">
            <SpotlightFilterBar
                searchTerm={search}
                onSearchChange={setSearch}
                searchPlaceholder="Buscar registros..."
                filters={filters}
                activeFilter={statusFilter}
                onFilterChange={setStatusFilter}
            />
        </div>
    )
}
```

---

## 4. Mejores Prácticas para Otros Módulos

1. **Definir un mapa de iconos centralizado (`*-filter-icons.ts`)**:
   - Mantener los iconos fuera del JSX del componente padre para que múltiples vistas o portales compartan la misma semántica visual (ej: `TASK_FILTER_ICONS`).
2. **Convención de Colores**:
   - `gray` / `slate`: Estados neutros (*Todas*, *Borrador*).
   - `blue` / `sky`: En progreso, activas, en revisión.
   - `red`: Bloqueadas, vencidas, canceladas, urgentes.
   - `amber` / `orange`: Pendientes, esperando feedback, advertencias.
   - `emerald`: Completadas, aprobadas, pagadas.
3. **Resolución de Subfiltros**:
   - Al pasar un subfiltro como `activeFilter` (ej: `"blocked"`), el componente detecta automáticamente que pertenece al padre `"active"` e ilumina la burbuja padre con el color e icono del subfiltro activo.
   - El placeholder reflejará automáticamente la jerarquía: `"Activas › Bloqueadas [conteo] · Buscar registros..."`.
