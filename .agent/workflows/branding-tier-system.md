---
description: Multi-tenant branding tier system architecture
---

# Branding Tier System - ARQUITECTURA DEFINITIVA

> ⚠️ **IMPORTANTE**: Este sistema ya está implementado y funcionando. NO crear nuevas variables, módulos ni lógica paralela. Siempre usar esta arquitectura.

## Sistema de Tiers (NO módulos)

El branding usa **`branding_tiers`** table, NO el sistema de módulos (`system_modules`).

### Tablas Clave
```
organizations.branding_tier_id -> branding_tiers.id
branding_tiers.features (JSONB) -> permisos granulares
```

### Los 3 Tiers
| Tier | ID | Precio | custom_logo | custom_colors | custom_domain |
|------|----|--------|-------------|---------------|---------------|
| Basic | `basic` | $0 | ❌ | ❌ | ❌ |
| Custom | `custom` | $29 | ✅ | ✅ | ❌ |
| White Label | `whitelabel` | $99 | ✅ | ✅ | ✅ |

---

## Cómo Obtener Permisos

### En Server Components/Actions:
```typescript
import { getCurrentBrandingTier } from "@/modules/core/branding/tier-actions"

const tierData = await getCurrentBrandingTier()
const features = tierData?.tier?.features || {}

// Verificar permisos:
const canCustomizeLogo = features.custom_logo === true
const canCustomizeColors = features.custom_colors === true
const canCustomizeDomain = features.custom_domain === true
```

### En `getEffectiveBranding()`:
Ya implementado en `src/modules/core/branding/actions.ts`. Usa tier features automáticamente.

---

## Componentes Actualizados

1. **`brand-center.tsx`** - Recibe `tierFeatures` prop
2. **`brand-center-sheet.tsx`** - Pasa `tierFeatures`
3. **`settings-form.tsx`** - Recibe y pasa `tierFeatures`
4. **`branding/page.tsx`** - Llama `getCurrentBrandingTier()`
5. **`settings/page.tsx`** - Llama `getCurrentBrandingTier()`

---

## ❌ NUNCA HACER

1. NO usar `module_whitelabel` - está deprecado para branding
2. NO crear nuevos módulos para branding
3. NO verificar `activeModules.includes("module_whitelabel")`
4. NO cambiar la lógica de `getEffectiveBranding()` sin revisar esto

## ✅ SIEMPRE HACER

1. Usar `getCurrentBrandingTier()` para obtener permisos
2. Verificar features específicos: `custom_logo`, `custom_colors`, `custom_domain`
3. Pasar `tierFeatures` a componentes que muestran opciones de branding
4. Administrar tiers desde `/platform/admin/branding/tiers`

---

## Archivos Críticos

- `src/modules/core/branding/tier-actions.ts` - Actions de tiers
- `src/modules/core/branding/actions.ts` - `getEffectiveBranding()`
- `supabase/migrations/20250102000000_branding_tiers.sql` - Schema de tiers
