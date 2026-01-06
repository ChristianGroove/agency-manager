---
description: Multi-tenant data isolation architecture
---

# Multi-Tenant Security - ARQUITECTURA DEFINITIVA

> ⚠️ **CRÍTICO**: Estas reglas son de seguridad. NO modificar sin auditoría completa.

## 1. Obtener Organization ID

**SIEMPRE usar `getCurrentOrganizationId()`** de `@/modules/core/organizations/actions`

```typescript
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

const orgId = await getCurrentOrganizationId()
```

### Qué hace internamente:
1. Lee cookie `pixy_org_id`
2. Valida con `supabaseAdmin` que el usuario actual es MIEMBRO de esa org
3. Si no es miembro, retorna la primera org válida del usuario

---

## 2. Platform Admin Invisible

Los `super_admin` de plataforma NO deben aparecer en tenant views.

**Implementado en `getOrganizationMembers()`:**
```typescript
// Filtra usuarios con platform_role = 'super_admin'
const platformAdminIds = new Set(
    profiles?.filter(p => p.platform_role === 'super_admin').map(p => p.id)
)
return members.filter(m => !platformAdminIds.has(m.user_id))
```

---

## 3. Queries Seguras

Todas las queries a datos de tenant DEBEN filtrar por `organization_id`:

```typescript
// ✅ CORRECTO
const { data } = await supabaseAdmin
    .from('clients')
    .select('*')
    .eq('organization_id', orgId)

// ❌ INCORRECTO - Expone datos de todos los tenants
const { data } = await supabaseAdmin
    .from('clients')
    .select('*')
```

---

## 4. RLS como Segunda Barrera

RLS está habilitado pero el código también debe filtrar explícitamente.
- `supabase` (cliente normal) → RLS aplica
- `supabaseAdmin` → RLS bypassed, DEBE filtrar manualmente

---

## Archivos Críticos

- `src/modules/core/organizations/actions.ts` - `getCurrentOrganizationId()`
- `src/modules/core/settings/actions/team-actions.ts` - `getOrganizationMembers()`
- `src/lib/supabase-admin.ts` - Cliente admin (bypassa RLS)
