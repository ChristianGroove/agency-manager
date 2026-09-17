import { createClient } from "@supabase/supabase-js"
import { loadEnvConfig } from "@next/env"
import fs from "fs"
import path from "path"

loadEnvConfig(process.cwd())

// Helper to read CLI args like --url ... or --key ...
function getCliArg(name: string): string | undefined {
  const args = process.argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    if (args[i] === `--${name}` && args[i + 1] && !args[i + 1].startsWith("--")) {
      return args[i + 1]
    }
    if (args[i].startsWith(`--${name}=`)) {
      return args[i].substring(`--${name}=`.length).replace(/^["']|["']$/g, "")
    }
  }
  return undefined
}

// Check if optional .env.production exists
const prodEnvPath = path.join(process.cwd(), ".env.production")
if (fs.existsSync(prodEnvPath)) {
  const lines = fs.readFileSync(prodEnvPath, "utf-8").split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=")
      const k = trimmed.substring(0, idx).trim()
      const v = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, "")
      process.env[k] = v
    }
  }
}

const cliUrl = getCliArg("url")
const cliKey = getCliArg("key")
const isExplicitLocal = process.argv.includes("--local") || process.argv.includes("--allow-local")

const targetUrl =
  cliUrl ||
  process.env.PROD_SUPABASE_URL ||
  (isExplicitLocal ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined)

const targetKey =
  cliKey ||
  process.env.PROD_SUPABASE_SERVICE_ROLE_KEY ||
  (isExplicitLocal ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined)

if (!targetUrl || !targetKey) {
  console.log("\n================================================================")
  console.error("🛑 ATENCIÓN: No se indicaron las credenciales de PRODUCCIÓN.")
  console.log("================================================================")
  console.error("Por seguridad, para no sobreescribir tu base de datos local por error,")
  console.error("debes indicar la URL y SERVICE_ROLE_KEY de tu Supabase de Producción.\n")
  console.log("Puedes ejecutarlo de cualquiera de estas formas:\n")
  console.log("👉 OPCIÓN 1 (Recomendada - Argumentos directos en una sola línea):")
  console.log('   npx tsx scripts/seed-movilservicios-production.ts --url "https://tu-proyecto.supabase.co" --key "tu-service-role-key"\n')
  console.log("👉 OPCIÓN 2 (Crear archivo temporal .env.production):")
  console.log("   Crea un archivo .env.production en la raíz con:")
  console.log("   PROD_SUPABASE_URL=https://tu-proyecto.supabase.co")
  console.log("   PROD_SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key")
  console.log("   Y luego corre simplemente: npx tsx scripts/seed-movilservicios-production.ts\n")
  console.log("👉 OPCIÓN 3 (Si explícitamente deseas sembrar en tu entorno local):")
  console.log("   npx tsx scripts/seed-movilservicios-production.ts --local\n")
  process.exit(1)
}

const supabase = createClient(targetUrl, targetKey)

const SNAPSHOT_PATH = path.join(process.cwd(), "scripts", "data", "movilservicios-snapshot.json")

interface SnapshotData {
  exportedAt: string
  organization: any
  staff: any[]
  workspaces: any[]
  workspace_members: any[]
  projects: any[]
  tasks: any[]
}

async function runSeed() {
  console.log("================================================================")
  console.log("🌱 SEMBRADOR IDEMPOTENTE DE MOVILSERVICIOS (LOCAL -> PRODUCCIÓN)")
  console.log("================================================================")
  console.log(`📡 URL Destino: ${targetUrl}`)

  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error(`❌ Archivo de snapshot no encontrado en: ${SNAPSHOT_PATH}`)
    console.error("   Ejecuta primero: npx tsx scripts/export-movilservicios-current.ts")
    process.exit(1)
  }

  const raw = fs.readFileSync(SNAPSHOT_PATH, "utf-8")
  const snapshot: SnapshotData = JSON.parse(raw)
  console.log(`📦 Snapshot cargado (Exportado el: ${snapshot.exportedAt})`)
  console.log(`   - Colaboradores: ${snapshot.staff.length}`)
  console.log(`   - Espacios: ${snapshot.workspaces.length}`)
  console.log(`   - Membresías: ${snapshot.workspace_members.length}`)
  console.log(`   - Proyectos: ${snapshot.projects.length}`)
  console.log(`   - Tareas: ${snapshot.tasks.length}`)

  // -------------------------------------------------------------
  // 1. RESOLVER ORGANIZACIÓN DESTINO
  // -------------------------------------------------------------
  console.log("\n🏢 1. Verificando Organización Movilservicios en destino...")
  const { data: orgs, error: orgErr } = await supabase
    .from("organizations")
    .select("id, name, slug")

  if (orgErr) {
    console.error("❌ Error al consultar organizaciones:", orgErr)
    process.exit(1)
  }

  let targetOrg = orgs?.find(
    (o) =>
      o.slug?.toLowerCase() === "movilservicios" ||
      o.id === snapshot.organization.id ||
      o.name?.toLowerCase().includes("movilservicios")
  )

  let targetOrgId: string

  if (targetOrg) {
    targetOrgId = targetOrg.id
    console.log(`   ✅ Organización encontrada en destino: "${targetOrg.name}" (ID: ${targetOrgId})`)
  } else {
    console.log("   ⚠️ Movilservicios no existe en destino. Creando organización...")
    const { data: newOrg, error: createOrgErr } = await supabase
      .from("organizations")
      .insert({
        id: snapshot.organization.id,
        name: snapshot.organization.name || "Movilservicios",
        slug: snapshot.organization.slug || "movilservicios",
        plan: snapshot.organization.plan || "agency",
        status: snapshot.organization.status || "active",
        created_at: new Date().toISOString()
      })
      .select("id, name, slug")
      .single()

    if (createOrgErr || !newOrg) {
      console.error("❌ Error al crear organización:", createOrgErr)
      process.exit(1)
    }
    targetOrgId = newOrg.id
    console.log(`   ✅ Organización creada: "${newOrg.name}" (ID: ${targetOrgId})`)
  }

  // -------------------------------------------------------------
  // 2. SEMBRAR COLABORADORES (organization_staff)
  // -------------------------------------------------------------
  console.log("\n👥 2. Sincronizando Colaboradores...")
  const staffLocalToTargetId = new Map<string, string>()
  const staffTokens = new Map<string, { name: string; token: string; role: string }>()

  for (const s of snapshot.staff) {
    // Buscar si ya existe por email u organization_id
    const { data: existingStaff } = await supabase
      .from("organization_staff")
      .select("id, email, access_token")
      .eq("organization_id", targetOrgId)
      .eq("email", s.email)
      .maybeSingle()

    const staffPayload = {
      organization_id: targetOrgId,
      first_name: s.first_name,
      last_name: s.last_name,
      email: s.email,
      role: s.role,
      phone: s.phone || null,
      is_active: s.is_active ?? true,
      access_token: existingStaff?.access_token || s.access_token,
      photo_url: s.photo_url || null,
      has_global_workspace_access: s.has_global_workspace_access ?? false,
      updated_at: new Date().toISOString()
    }

    let resolvedStaffId: string

    if (existingStaff) {
      const { data: updated, error: updErr } = await supabase
        .from("organization_staff")
        .update(staffPayload)
        .eq("id", existingStaff.id)
        .select("id")
        .single()

      if (updErr || !updated) {
        console.error(`   ❌ Error al actualizar ${s.first_name}:`, updErr?.message)
        continue
      }
      resolvedStaffId = updated.id
      console.log(`   🔄 Actualizado: [${s.role}] ${s.first_name} ${s.last_name} (${s.email})`)
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("organization_staff")
        .insert({
          id: s.id, // Intentar mantener mismo UUID si está disponible
          ...staffPayload,
          created_at: s.created_at || new Date().toISOString()
        })
        .select("id")
        .single()

      if (insErr) {
        // Fallback si el ID local ya existe en otra tabla: insertar sin ID fijo
        const { data: insertedFallback, error: insFallbackErr } = await supabase
          .from("organization_staff")
          .insert({
            ...staffPayload,
            created_at: s.created_at || new Date().toISOString()
          })
          .select("id")
          .single()

        if (insFallbackErr || !insertedFallback) {
          console.error(`   ❌ Error al insertar ${s.first_name}:`, insFallbackErr?.message)
          continue
        }
        resolvedStaffId = insertedFallback.id
      } else {
        resolvedStaffId = inserted!.id
      }
      console.log(`   ➕ Creado: [${s.role}] ${s.first_name} ${s.last_name} (${s.email})`)
    }

    staffLocalToTargetId.set(s.id, resolvedStaffId)
    staffTokens.set(s.email, {
      name: `${s.first_name} ${s.last_name}`,
      token: staffPayload.access_token,
      role: s.role
    })
  }

  // -------------------------------------------------------------
  // 3. SEMBRAR ESPACIOS DE TRABAJO (task_workspaces)
  // -------------------------------------------------------------
  console.log("\n📁 3. Sincronizando Espacios de Trabajo...")
  const workspaceLocalToTargetId = new Map<string, string>()

  for (const w of snapshot.workspaces) {
    const targetLeadStaffId = w.lead_staff_id ? staffLocalToTargetId.get(w.lead_staff_id) || null : null

    const { data: existingWorkspace } = await supabase
      .from("task_workspaces")
      .select("id")
      .eq("organization_id", targetOrgId)
      .eq("name", w.name)
      .maybeSingle()

    const workspacePayload = {
      organization_id: targetOrgId,
      name: w.name,
      slug: w.slug,
      key_prefix: w.key_prefix,
      description: w.description || null,
      color: w.color || "#0284c7",
      icon: w.icon || "Globe",
      lead_staff_id: targetLeadStaffId,
      settings: w.settings || {},
      updated_at: new Date().toISOString()
    }

    let resolvedWorkspaceId: string

    if (existingWorkspace) {
      const { data: updated, error: updErr } = await supabase
        .from("task_workspaces")
        .update(workspacePayload)
        .eq("id", existingWorkspace.id)
        .select("id")
        .single()

      if (updErr || !updated) {
        console.error(`   ❌ Error al actualizar espacio "${w.name}":`, updErr?.message)
        continue
      }
      resolvedWorkspaceId = updated.id
      console.log(`   🔄 Actualizado espacio: "${w.name}" (${w.key_prefix})`)
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("task_workspaces")
        .insert({
          id: w.id,
          ...workspacePayload,
          created_at: w.created_at || new Date().toISOString()
        })
        .select("id")
        .single()

      if (insErr) {
        const { data: fallback, error: fbErr } = await supabase
          .from("task_workspaces")
          .insert({
            ...workspacePayload,
            created_at: w.created_at || new Date().toISOString()
          })
          .select("id")
          .single()

        if (fbErr || !fallback) {
          console.error(`   ❌ Error al crear espacio "${w.name}":`, fbErr?.message)
          continue
        }
        resolvedWorkspaceId = fallback.id
      } else {
        resolvedWorkspaceId = inserted!.id
      }
      console.log(`   ➕ Creado espacio: "${w.name}" (${w.key_prefix})`)
    }

    workspaceLocalToTargetId.set(w.id, resolvedWorkspaceId)
  }

  // -------------------------------------------------------------
  // 4. SEMBRAR MEMBRESÍAS DE ESPACIO (task_workspace_members)
  // -------------------------------------------------------------
  console.log("\n🔗 4. Sincronizando Membresías de Espacio (RBAC Granular)...")
  for (const m of snapshot.workspace_members) {
    const targetWsId = workspaceLocalToTargetId.get(m.workspace_id)
    const targetStId = staffLocalToTargetId.get(m.staff_id)

    if (!targetWsId || !targetStId) {
      continue
    }

    const { data: existingMember } = await supabase
      .from("task_workspace_members")
      .select("id")
      .eq("organization_id", targetOrgId)
      .eq("workspace_id", targetWsId)
      .eq("staff_id", targetStId)
      .maybeSingle()

    if (!existingMember) {
      await supabase.from("task_workspace_members").insert({
        organization_id: targetOrgId,
        workspace_id: targetWsId,
        staff_id: targetStId,
        role: m.role || "member",
        created_at: new Date().toISOString()
      })
      console.log(`   ➕ Asignada membresía: Staff (${targetStId.slice(0, 8)}) -> Espacio (${targetWsId.slice(0, 8)})`)
    }
  }

  // -------------------------------------------------------------
  // 5. SEMBRAR PROYECTOS (task_projects)
  // -------------------------------------------------------------
  console.log("\n🚀 5. Sincronizando Proyectos / Sprints...")
  const projectLocalToTargetId = new Map<string, string>()

  for (const p of snapshot.projects) {
    const targetWsId = p.workspace_id ? workspaceLocalToTargetId.get(p.workspace_id) || null : null
    const targetLeadStaffId = p.lead_staff_id ? staffLocalToTargetId.get(p.lead_staff_id) || null : null

    const { data: existingProj } = await supabase
      .from("task_projects")
      .select("id")
      .eq("organization_id", targetOrgId)
      .eq("name", p.name)
      .maybeSingle()

    const projPayload = {
      organization_id: targetOrgId,
      workspace_id: targetWsId,
      name: p.name,
      slug: p.slug || null,
      color: p.color || "#0284c7",
      icon: p.icon || "Folder",
      description: p.description || null,
      status: p.status || "active",
      lead_staff_id: targetLeadStaffId,
      start_date: p.start_date || null,
      target_date: p.target_date || null,
      settings: p.settings || {},
      updated_at: new Date().toISOString()
    }

    let resolvedProjId: string

    if (existingProj) {
      const { data: updated, error: updErr } = await supabase
        .from("task_projects")
        .update(projPayload)
        .eq("id", existingProj.id)
        .select("id")
        .single()

      if (updErr || !updated) {
        console.error(`   ❌ Error al actualizar proyecto "${p.name}":`, updErr?.message)
        continue
      }
      resolvedProjId = updated.id
      console.log(`   🔄 Actualizado proyecto: "${p.name}"`)
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("task_projects")
        .insert({
          id: p.id,
          ...projPayload,
          created_at: p.created_at || new Date().toISOString()
        })
        .select("id")
        .single()

      if (insErr) {
        const { data: fallback, error: fbErr } = await supabase
          .from("task_projects")
          .insert({
            ...projPayload,
            created_at: p.created_at || new Date().toISOString()
          })
          .select("id")
          .single()

        if (fbErr || !fallback) {
          console.error(`   ❌ Error al crear proyecto "${p.name}":`, fbErr?.message)
          continue
        }
        resolvedProjId = fallback.id
      } else {
        resolvedProjId = inserted!.id
      }
      console.log(`   ➕ Creado proyecto: "${p.name}"`)
    }

    projectLocalToTargetId.set(p.id, resolvedProjId)
  }

  // -------------------------------------------------------------
  // 6. SEMBRAR TAREAS / TICKETS (task_items)
  // -------------------------------------------------------------
  console.log("\n📋 6. Sincronizando Tareas / Tickets (Batch Upsert)...")
  let createdTasksCount = 0
  let updatedTasksCount = 0

  // Procesamos en bloques para máxima eficiencia y estabilidad de red
  const BATCH_SIZE = 50
  for (let i = 0; i < snapshot.tasks.length; i += BATCH_SIZE) {
    const chunk = snapshot.tasks.slice(i, i + BATCH_SIZE)

    for (const t of chunk) {
      const targetProjId = projectLocalToTargetId.get(t.project_id)
      if (!targetProjId) {
        console.warn(`   ⚠️ Proyecto no resuelto para ticket ${t.ticket_code}, omitiendo.`)
        continue
      }

      const targetAssignedStaffId = t.assigned_staff_id ? staffLocalToTargetId.get(t.assigned_staff_id) || null : null
      const targetQaStaffId = t.qa_staff_id ? staffLocalToTargetId.get(t.qa_staff_id) || null : null
      const targetCreatedByStaffId = t.created_by_staff_id ? staffLocalToTargetId.get(t.created_by_staff_id) || null : null

      const taskPayload = {
        organization_id: targetOrgId,
        project_id: targetProjId,
        ticket_code: t.ticket_code,
        title: t.title,
        description: t.description || null,
        status: t.status || "todo",
        priority: t.priority || "medium",
        type: t.type || "task",
        progress_percentage: t.progress_percentage ?? 0,
        assigned_staff_id: targetAssignedStaffId,
        qa_staff_id: targetQaStaffId,
        created_by_staff_id: targetCreatedByStaffId,
        due_date: t.due_date || null,
        estimated_hours: Number(t.estimated_hours || 0),
        actual_hours: Number(t.actual_hours || 0),
        checklist: t.checklist || [],
        tags: Array.isArray(t.tags) ? t.tags : [],
        attachments: t.attachments || [],
        order_index: t.order_index ?? 0,
        updated_at: new Date().toISOString()
      }

      // Comprobar existencia por ID exacto primero, luego por ticket_code
      let targetTaskId: string | null = null

      const { data: existingById } = await supabase
        .from("task_items")
        .select("id")
        .eq("id", t.id)
        .maybeSingle()

      if (existingById) {
        targetTaskId = existingById.id
      } else {
        const { data: existingByCode } = await supabase
          .from("task_items")
          .select("id")
          .eq("organization_id", targetOrgId)
          .eq("ticket_code", t.ticket_code)
          .limit(1)

        if (existingByCode && existingByCode.length > 0) {
          targetTaskId = existingByCode[0].id
        }
      }

      if (targetTaskId) {
        const { error: updTaskErr } = await supabase
          .from("task_items")
          .update(taskPayload)
          .eq("id", targetTaskId)

        if (updTaskErr) {
          console.error(`   ❌ Error al actualizar ticket ${t.ticket_code}:`, updTaskErr.message)
        } else {
          updatedTasksCount++
        }
      } else {
        const { error: insTaskErr } = await supabase
          .from("task_items")
          .insert({
            id: t.id,
            ...taskPayload,
            created_at: t.created_at || new Date().toISOString()
          })

        if (insTaskErr) {
          const { error: fbTaskErr } = await supabase
            .from("task_items")
            .insert({
              ...taskPayload,
              created_at: t.created_at || new Date().toISOString()
            })

          if (fbTaskErr) {
            console.error(`   ❌ Error al insertar ticket ${t.ticket_code}:`, fbTaskErr.message)
          } else {
            createdTasksCount++
          }
        } else {
          createdTasksCount++
        }
      }
    }
    console.log(`   ⏳ Procesados ${Math.min(i + BATCH_SIZE, snapshot.tasks.length)} / ${snapshot.tasks.length} tickets...`)
  }

  // -------------------------------------------------------------
  // 7. REPORTE FINAL Y ENLACES DE PORTALES
  // -------------------------------------------------------------
  console.log("\n================================================================")
  console.log("🎉 SIEMBRA COMPLETADA CON ÉXITO Y CERO CONFLICTOS")
  console.log("================================================================")
  console.log(`🏢 Organización: Movilservicios (${targetOrgId})`)
  console.log(`👥 Colaboradores procesados: ${staffLocalToTargetId.size}`)
  console.log(`📁 Espacios procesados: ${workspaceLocalToTargetId.size}`)
  console.log(`🚀 Proyectos procesados: ${projectLocalToTargetId.size}`)
  console.log(`📋 Tareas: ${createdTasksCount} creadas, ${updatedTasksCount} actualizadas`)
  console.log("\n🔑 ENLACES DIRECTOS A LOS PORTALES (CON TOKEN):")
  staffTokens.forEach((info, email) => {
    console.log(`  - [${info.role.toUpperCase()}] ${info.name} (${email}):`)
    console.log(`    /portal/tasks/${info.token}`)
  })
  console.log("================================================================")
}

runSeed().catch((err) => {
  console.error("❌ Error no controlado durante la siembra:", err)
  process.exit(1)
})
