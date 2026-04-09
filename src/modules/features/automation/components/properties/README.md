# Documentación Técnica: Sistema de Propiedades Modulares de Automatización

Este sistema permite la configuración dinámica de nodos en el motor de automatización mediante una arquitectura desacoplada, atómica y altamente escalable.

## Principios de Diseño
1. **Dispatcher Pattern**: Un componente central (`PropertyDispatcher.tsx`) selecciona el componente de UI adecuado basado en el `node.type`.
2. **Propiedades Estandarizadas**: Todos los componentes de propiedades comparten la interfaz `BasePropertyProps`.
3. **Consistencia Visual**: El uso del componente `BasePropertyLayout.tsx` garantiza que todos los paneles de configuración tengan la misma jerarquía visual y micro-interacciones.

## Estructura de Componentes
- `PropertyDispatcher.tsx`: El enrutador que mapea tipos de nodos a componentes de UI.
- `BasePropertyLayout.tsx`: El contenedor estandarizado con título, descripción y estilo unificado.
- `types.ts`: Define las interfaces de datos fundamentales para la sincronización entre la UI y el motor de automatización.

## Cómo añadir un nuevo tipo de nodo
1. Define el tipo de nodo en el motor de ejecución si aún no existe.
2. Crea un nuevo componente de propiedades (ej. `InventoryProperties.tsx`) que acepte `BasePropertyProps`.
3. Registra el nuevo componente en el `switch` de `PropertyDispatcher.tsx`.
4. El nodo aparecerá automáticamente en el `PropertiesSheet` cuando sea seleccionado en el editor.

## Gestión de Estado
La comunicación entre los componentes modulares y el Shell central (`PropertiesSheet.tsx`) se realiza a través de la función `onChange`, que actualiza el `formData` local de forma reactiva, permitiendo validaciones en tiempo real.
