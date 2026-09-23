# Arquitectura del Banner Global Multi-Slide (Global Dashboard Banner Engine)

Este documento detalla la especificación técnica, diseño visual, flujo de datos y mecanismos de resiliencia del motor de **Banners Globales Multi-Slide**, administrado desde SuperAdmin (`/platform/admin`) y desplegado en los dashboards modulares de la plataforma (`/dashboard`).

---

## 1. Visión General y Propósito

El motor de banners globales permite a los administradores de la plataforma comunicar lanzamientos, ofertas, tips operativos y anuncios críticos directamente en la cabecera de los dashboards según el tipo de espacio (`agency`, `saas`, `cleaning`, `ecommerce`, etc.).

### Objetivos Clave
1. **Multi-Slide Dinámico:** Supera el esquema anterior de diapositiva única permitiendo múltiples slides independientes con tiempos de rotación y contenido personalizado.
2. **Simetría y Altura Invariable:** Altura fija de `250px`, manteniendo simetría visual con los widgets adyacentes (como `GlassCard3D`).
3. **Ergonomía Visual & Glassmorphism:** Temas adaptativos (`auto`, `brand_primary`, `brand_secondary`, `dark`, `light`) con cálculo quirúrgico de contraste en textos y badges.
4. **Resiliencia Total:** Compatibilidad hacia atrás y tolerancia a fallos de caché de esquema en PostgREST/Supabase.

---

## 2. Esquema de Datos (`global_dashboard_banners`)

La persistencia se realiza en la tabla `global_dashboard_banners` de Supabase:

```sql
ALTER TABLE global_dashboard_banners
  ADD COLUMN IF NOT EXISTS slides JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
```

### Estructura de un Slide (`GlobalBannerSlide`)

Cada elemento dentro del array JSONB `slides` se ajusta a la siguiente interfaz TypeScript:

```typescript
export interface GlobalBannerSlide {
    id: string
    // Kicker (Badge superior)
    kicker?: string
    kickerColor?: TextColorRole // "brand_primary" | "brand_secondary" | "muted" | "emerald" | "amber" | "cyan" | "indigo" | "white" | "default"
    kicker_shimmer?: boolean // Efecto shimmer text tipo ChatGPT Thinking
    
    // Título y Subtítulo
    title: string
    titleColor?: TextColorRole
    showSubtitle?: boolean
    subtitle?: string
    subtitleColor?: TextColorRole
    
    // Frases Rotativas (SplitText)
    phrases: BannerPhrase[] // [{ text: string, durationSeconds: number }]
    phrasesColor?: TextColorRole
    
    // Call to Action (Botón)
    cta_text?: string
    cta_url?: string
    cta_open_new_tab?: boolean
    cta_variant?: "default" | "secondary" | "outline"
    cta_shimmer?: boolean // Efecto shimmer text en botón CTA
    cta_action?: "url" | "modal" // "url" redirige a enlace, "modal" abre Cover Spotlight
    modal_config?: BannerModalConfig // Configuración del Showcase Modal

    // Multimedia
    media_type?: "json_lottie" | "image"
    media_url?: string
    layout_pos?: "left" | "center" | "right"
    
    // Estilo Visual
    theme?: "auto" | "brand_primary" | "brand_secondary" | "dark" | "light"
    
    // Programación temporal individual
    starts_at?: string | null
    expires_at?: string | null
}
```

```typescript
export interface BannerModalFeature {
    icon?: string // Ícono de Lucide o Emoji nativo
    title: string
    description: string
}

export interface BannerModalConfig {
    badge?: string
    title: string
    subtitle?: string
    media_url?: string
    media_type?: "json_lottie" | "image"
    features?: BannerModalFeature[]
    primary_cta_text?: string
    primary_cta_url?: string
    primary_cta_shimmer?: boolean
    secondary_cta_text?: string
    secondary_cta_url?: string
}
```

---

## 3. Tokens Dinámicos de Personalización

Los textos (`kicker`, `title`, `subtitle` y `phrases`) admiten interpolación reactiva basada en la sesión activa del usuario:

| Token | Descripción | Fallback |
| :--- | :--- | :--- |
| `{user_name}` | Primer nombre o nombre completo del usuario autenticado | `"Usuario"` |
| `{org_name}` | Nombre de la organización o agencia del tenant (`agency_name`) | `"Tu Empresa"` |
| `{space_name}` | Nombre del espacio o suite activa | `"Pixy"` |

Implementación en [`interpolateTokens`](file:///g:/Pixy/agency-manager/src/modules/core/dashboard/components/global-dashboard-banner.tsx):
```typescript
export function interpolateTokens(text: string, context: { userName?: string; orgName?: string; spaceName?: string }): string {
    if (!text) return ""
    return text
        .replace(/\{user_name\}/gi, context.userName || "Usuario")
        .replace(/\{org_name\}/gi, context.orgName || "Tu Empresa")
        .replace(/\{space_name\}/gi, context.spaceName || "Pixy")
}
```

---

## 4. Arquitectura de Renderizado del Banner (`GlobalDashboardBanner`)

El componente de presentación se localiza en `src/modules/core/dashboard/components/global-dashboard-banner.tsx`.

### A. Posicionamiento Absoluto del Multimedia (Lottie / Imagen)
Para evitar que elementos multimedia alteren la altura del banner o desplace la tipografía:
* El contenedor multimedia se monta con **posicionamiento absoluto** (`absolute right-0 top-0 bottom-0 h-full`).
* Ancho responsivo: `w-[260px] sm:w-[320px] md:w-[380px]`.
* Lottie ocupa el alto completo (`h-full max-h-[250px] aspect-square flex items-center justify-end drop-shadow-2xl`).
* **Caché en Memoria:** Se utiliza `lottieCache = new Map<string, any>()` para almacenar las animaciones descargadas y garantizar transiciones instantáneas a 60 FPS sin peticiones de red repetitivas.

### B. Columna de Textos con Autolayout Vertical & Frame Abierto para Párrafos
* Montada dentro de `CardContent` con padding optimizado `p-5 sm:px-7 sm:pt-5.5 sm:pb-4 z-20` (reduciendo la holgura inferior excesiva para aproximar el CTA a los dots de paginación y maximizar el área vertical útil para títulos y frases).
* **Ancho Adaptativo:** Si el banner cuenta con animación multimedia, el ancho se restringe a `mr-auto max-w-[55%] sm:max-w-[58%] lg:max-w-[62%]` para evitar colisiones. Si no tiene multimedia (`!media_url`), se expande de forma óptima a `w-full max-w-3xl` para brindar mayor holgura horizontal.
* **Frame Central Abierto y Multilínea (Sin Cortes Artificiales):**
  * Se elimina la restricción fija anterior de `max-h-[44px]` y `line-clamp-2` que recortaba el texto a 2 líneas.
  * El bloque central utiliza `flex-1 min-h-0 my-auto py-1 relative w-full flex items-center overflow-hidden` y el contenedor de texto opera con `overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`.
  * **Soporte de Párrafos y Saltos de Línea Naturales:** Soporte nativo para saltos de línea (`\n`), doble salto para párrafos (`\n\n`) y saltos explícitos renderizados con etiquetas `<br />`. Los espacios se procesan como caracteres de ruptura de línea estándar, eliminando la conversión a `\u00A0` que causaba que las frases continuaran en una sola línea continua ("sigan de largo").

### C. Contraste Quirúrgico del Badge Kicker
Para evitar que el badge parezca "flotando o desalineado" debido a su padding interno en fondos claros:
* **Fondo Claro Nítido:** Se utiliza un fill claro sutil (`bg-white/92 dark:bg-white/12 border border-black/[0.08] dark:border-white/20 shadow-2xs`) que aporta definición cristalina sin oscurecer ni generar conflicto cromático con los colores de marca del texto.
* **Modo Oscuro Forzado (`dark`):**
  `bg-white/12 border border-white/20 shadow-xs`
* Estructura Flex: `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full w-fit mb-1.5`.

### D. Paginación Sutil y Limpia (Dots Centrados)
* Indicadores posicionados en `absolute bottom-3.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5`.
* Diapositiva activa: Micro-píldora dinámica `w-4 h-1.5 bg-[var(--primary,#F205E2)] shadow-xs rounded-full`.
* Diapositivas inactivas: Círculos discretos `w-1.5 h-1.5 bg-black/25 dark:bg-white/30`.

### E. Microinteracción Shimmer Text (Efecto IA estilo ChatGPT)
Inspirada en la onda de pensamiento de ChatGPT cuando genera respuestas, disponible de forma independiente tanto para el **Badge Kicker** como para el **Botón CTA**:
* **Aceleración por Hardware (`mask-image`):** Utiliza una máscara de gradiente de opacidad continua (`42%` ➔ `100%` ➔ `42%`) con `@keyframes text-shimmer-wave`, garantizando compatibilidad universal con cualquier color de texto (blanco, verde, cyan, magenta, etc.) sin interferir con `-webkit-text-fill-color`.
* **Aislamiento Inteligente de Emojis:** El componente `<ShimmerText>` detecta y preserva emojis iniciales (ej. `🚀`, `💡`, `🎁`, `⚠️`) para que no pierdan sus colores gráficos nativos mientras el texto adyacente vibra con el barrido luminoso.
* **Control Individual en SuperAdmin:** Cada slide dispone de switches independientes `kicker_shimmer` y `cta_shimmer` en el editor.

---

## 5. Gestor de Administración en SuperAdmin (`GlobalBannersManager`)

Ubicado en `src/app/(dashboard)/platform/admin/_components/global-banners-manager.tsx`.

### Características Principales:
1. **Layout Horizontal Full-Width:** Aprovecha el ancho de pantalla completo sin cajas comprimidas ni scrolls internos innecesarios.
2. **Selector de Diapositivas Multi-Tab:** Navegación entre slides con badges de estado, soporte para reordenar (izquierda/derecha), duplicar y eliminar.
3. **Edición Multilínea de Párrafos (`<Textarea>`):** En la Franja 2 (Frases Rotativas / Párrafos), los campos de texto se gestionan mediante `<Textarea>` en lugar de inputs de línea única, permitiendo estructurar párrafos con saltos de línea con la tecla `Enter`.
4. **Controles de Efecto Shimmer (IA):** Switches dedicados en la cabecera del Kicker Badge y en las opciones del Botón CTA para activar o desactivar el barrido luminoso en cada slide.
5. **Plantillas Rápidas (Presets):**
   * *🚀 Lanzamiento:* Configura anuncio de nuevas funciones con tema primario y Lottie corporativo.
   * *💡 Pro Tip:* Configura consejos prácticos de operaciones con tema secundario (Cyan) y tiempos de rotación ágiles.
   * *🏷️ Oferta Exclusiva:* Configura promociones de temporada con acento esmeralda.
   * *🔔 Aviso Operativo:* Configura alertas de mantenimiento o anuncios administrativos.
6. **Control de Vigencia y Expiración:**
   * Alternancia entre campaña *Permanente* o *Programada*.
   * Selector moderno de fechas con validaciones de fechas pasadas y cálculo de estado en tiempo real (*Activo*, *Programado*, *Expirado*, *Inactivo*).
7. **Simulador en Vivo & Vista Previa:** Previsualizador interactivo a pantalla completa al final del formulario que refleja en tiempo real el aspecto exacto que tendrá el banner en producción, con soporte interactivo para abrir y probar modales cover al hacer clic en el CTA.

---

## 6. Modal Cover Spotlight (`BannerSpotlightModal`) - Showcase de Módulos

Ubicado en `src/modules/core/dashboard/components/banner-spotlight-modal.tsx`.

El **Modal Cover Spotlight** es una ventana modal de nivel mundial inspirada en las *Product Release Sheets* de Linear y Apple Keynote:

### Capacidades y Principios de Diseño:
1. **Composición Asimétrica Estilo Banner (Hero Header Cover):**
   * **Multimedia en Posición Absoluta a la Derecha:** La animación Lottie (o imagen de producto) se posiciona de forma absoluta contra el borde derecho superior (`absolute right-0 top-0 bottom-0 h-full w-[170px] sm:w-[215px] flex items-center justify-end overflow-hidden pr-3`), replicando con fidelidad la composición visual del banner del dashboard.
   * **Columna de Textos a la Izquierda:** El kicker badge, el título principal y la descripción/subtítulo se agrupan en una columna alineada a la izquierda (`relative z-20 max-w-[62%] sm:max-w-[66%] space-y-1.5 text-left`) con gradiente hero dinámico de fondo y botón flotante de cierre en la esquina superior derecha (`top-3.5 right-3.5`).
2. **Jerarquía Tipográfica & Interpolación de Tokens:** Kicker badge con fill claro prémium, título principal con drop-shadow y subtítulo con clamp controlado, admitiendo tokens dinámicos en tiempo real (`{user_name}`, `{org_name}`, `{space_name}`).
3. **Power Feature Cards Estáticas y Nítidas (1 a 4 items):** Grid responsivo con tarjetas de características. Los íconos temáticos (Lucide o emojis libres) se presentan con contenedores limpios `shadow-2xs` sin animaciones disruptivas de zoom en hover (`group-hover:scale-105` eliminado), preservando sobriedad y máxima legibilidad visual.
4. **Footer Snug & Optimización de Espacio:**
   * Contenedor del modal configurado como `flex flex-col` con `p-0` y `max-h-[92vh]`, erradicando por completo el espacio vacío vertical residual de las estructuras de grid desreguladas.
   * Barra de pie de página compacta con `mt-auto` (`px-6 py-3 bg-slate-50/70 dark:bg-zinc-950/40 border-t border-border/50`) con distribución fluida: botón secundario de descarte / "Cerrar" a la izquierda y botón de conversión principal con efecto shimmer luminiscente de IA a la derecha.
5. **Integración Directa en el Editor:** Subpanel dedicado en SuperAdmin con selector visual de íconos, catálogo de animaciones Lottie y botón de prueba rápida en vivo.
6. **Cero Migraciones SQL:** Todos los datos se almacenan en el objeto JSONB `slides`, garantizando agilidad y estabilidad total.

---

## 7. Mecanismo de Resiliencia y Fallback de Esquema

En [`src/modules/core/admin/actions.ts`](file:///g:/Pixy/agency-manager/src/modules/core/admin/actions.ts):
* Si PostgREST reporta error de columna inexistente o schema cache sobre `slides`:
  1. El backend serializa `formData.slides` como un JSON string en el campo retrocompatible `description`.
  2. Ejecuta el upsert con el esquema base.
  3. Al recuperar los banners, `normalizeBannerSlides` inspecciona si `description` es una cadena JSON válida que inicia con `[` o `{`, reconstruyendo automáticamente la estructura `GlobalBannerSlide[]` sin pérdida de datos ni interrupción para los usuarios.
