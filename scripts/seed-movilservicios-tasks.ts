import { createClient } from "@supabase/supabase-js"
import { loadEnvConfig } from "@next/env"
import fs from "fs"
import path from "path"
import crypto from "crypto"

const projectDir = process.cwd()
loadEnvConfig(projectDir)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !key) {
  console.error("❌ Missing Supabase credentials in environment")
  process.exit(1)
}

const supabase = createClient(url, key)

const DATASET_PATH = path.join(
  "C:",
  "Users",
  "Christian Groove",
  ".gemini",
  "antigravity",
  "brain",
  "fa1536b7-8b3e-4ec0-bf23-046ce703ebfa",
  "scratch",
  "clean_jira_tickets.json"
)

interface JiraTicket {
  ticket_code: string
  title: string
  assignee: string
  project_name: string
  status: "todo" | "in_progress" | "in_review" | "blocked" | "done"
  priority: "low" | "medium" | "high" | "urgent"
  tags: string[]
  observation: string
  status_raw: string
  priority_raw: string
  page: number
}

async function main() {
  console.log("🚀 Starting Movilservicios Tasks & Jira Seeder...")

  if (!fs.existsSync(DATASET_PATH)) {
    console.error(`❌ Dataset file not found at: ${DATASET_PATH}`)
    process.exit(1)
  }

  const rawData = fs.readFileSync(DATASET_PATH, "utf-8")
  const tickets: JiraTicket[] = JSON.parse(rawData)
  console.log(`📋 Loaded ${tickets.length} tickets from dataset.`)

  // 1. Find Movilservicios Organization
  const { data: orgs, error: orgErr } = await supabase
    .from("organizations")
    .select("id, name, slug")

  if (orgErr || !orgs || orgs.length === 0) {
    console.error("❌ Error fetching organizations:", orgErr)
    process.exit(1)
  }

  let targetOrg = orgs.find(
    (o) =>
      o.id === "db9d1288-80ab-48df-b130-a0739881c6f2" ||
      o.slug?.toLowerCase().includes("movilservicios") ||
      o.name?.toLowerCase().includes("movilservicios")
  )

  if (!targetOrg) {
    console.warn("⚠️ Movilservicios org not found by exact match, using first available org:", orgs[0].name)
    targetOrg = orgs[0]
  }

  const orgId = targetOrg.id
  console.log(`🏢 Target Organization: ${targetOrg.name} (${orgId})`)

  // 2. Upsert Staff (Natalia PM + 7 Developers)
  const staffMembers = [
    {
      first_name: "Natalia",
      last_name: "Gómez",
      role: "pm",
      email: "natalia.pm@movilservicios.com",
      phone: "+57 300 111 0001",
      is_active: true,
    },
    {
      first_name: "Luis",
      last_name: "Tech Lead",
      role: "lead",
      email: "luis.dev@movilservicios.com",
      phone: "+57 300 111 0002",
      is_active: true,
    },
    {
      first_name: "Jefferson",
      last_name: "Desarrollador",
      role: "developer",
      email: "jefferson.dev@movilservicios.com",
      phone: "+57 300 111 0003",
      is_active: true,
    },
    {
      first_name: "Juanita",
      last_name: "Desarrolladora",
      role: "developer",
      email: "juanita.dev@movilservicios.com",
      phone: "+57 300 111 0004",
      is_active: true,
    },
    {
      first_name: "Juan",
      last_name: "Desarrollador",
      role: "developer",
      email: "juan.dev@movilservicios.com",
      phone: "+57 300 111 0005",
      is_active: true,
    },
    {
      first_name: "Dana",
      last_name: "Desarrolladora",
      role: "developer",
      email: "dana.dev@movilservicios.com",
      phone: "+57 300 111 0006",
      is_active: true,
    },
    {
      first_name: "Yasmin",
      last_name: "Desarrolladora",
      role: "developer",
      email: "yasmin.dev@movilservicios.com",
      phone: "+57 300 111 0007",
      is_active: true,
    },
    {
      first_name: "Paola",
      last_name: "Desarrolladora",
      role: "developer",
      email: "paola.dev@movilservicios.com",
      phone: "+57 300 111 0008",
      is_active: true,
    },
  ]

  const staffMap = new Map<string, string>() // name -> staff_id

  for (const s of staffMembers) {
    const { data: existingStaff } = await supabase
      .from("organization_staff")
      .select("id, first_name")
      .eq("organization_id", orgId)
      .eq("first_name", s.first_name)
      .maybeSingle()

    if (existingStaff) {
      staffMap.set(s.first_name, existingStaff.id)
      console.log(`  ✓ Found existing staff: ${s.first_name} (${existingStaff.id})`)
    } else {
      const accessToken = crypto.randomUUID()
      const { data: newStaff, error: sErr } = await supabase
        .from("organization_staff")
        .insert({
          organization_id: orgId,
          first_name: s.first_name,
          last_name: s.last_name,
          role: s.role,
          email: s.email,
          phone: s.phone,
          is_active: s.is_active,
          access_token: accessToken,
        })
        .select("id, first_name")
        .single()

      if (sErr || !newStaff) {
        console.error(`❌ Error creating staff ${s.first_name}:`, sErr)
      } else {
        staffMap.set(s.first_name, newStaff.id)
        console.log(`  + Created staff: ${s.first_name} (${newStaff.id})`)
      }
    }
  }

  const nataliaId = staffMap.get("Natalia") || null

  // 3. Upsert Parent Workspace "Plataforma Web (WEB)"
  const { data: existingWorkspace } = await supabase
    .from("task_workspaces")
    .select("id, name")
    .eq("organization_id", orgId)
    .eq("key_prefix", "WEB")
    .maybeSingle()

  let workspaceId = existingWorkspace?.id

  if (!workspaceId) {
    const { data: newWs, error: wsErr } = await supabase
      .from("task_workspaces")
      .insert({
        organization_id: orgId,
        name: "Plataforma Web & Servicios",
        slug: "plataforma-web",
        key_prefix: "WEB",
        description: "Espacio central de desarrollo de la plataforma web transaccional, APIs REST y mantenimiento.",
        color: "#0284c7",
        icon: "Globe",
        lead_staff_id: nataliaId,
      })
      .select("id")
      .single()

    if (wsErr || !newWs) {
      console.error("❌ Error creating workspace:", wsErr)
      process.exit(1)
    }
    workspaceId = newWs.id
    console.log(`  + Created Workspace "Plataforma Web & Servicios [WEB]" (${workspaceId})`)
  } else {
    console.log(`  ✓ Found existing Workspace: (${workspaceId})`)
  }

  // 4. Upsert the 4 Child Projects
  const projectDefs = [
    {
      name: "API REST & Integraciones Proveedores",
      slug: "api-rest-integraciones-proveedores",
      color: "#0284c7",
      icon: "Plug",
      description: "Integración de pasarelas, APIs de recargas, corresponsales y servicios externos.",
    },
    {
      name: "Core Transaccional, Bolsas & Comisiones",
      slug: "core-transaccional-bolsas-comisiones",
      color: "#10b981",
      icon: "CircleDollarSign",
      description: "Lógica de negocio contable, balance de saldos, liquidación de ganancias y dispersión.",
    },
    {
      name: "Front-End, UX & Tickets de Venta",
      slug: "frontend-ux-tickets-venta",
      color: "#6366f1",
      icon: "Layout",
      description: "Experiencia de usuario, diseño responsive, comprobantes de cobro y marcas blancas.",
    },
    {
      name: "Mantenimiento, PHP 8 & Base de Datos",
      slug: "mantenimiento-php8-base-datos",
      color: "#f97316",
      icon: "Database",
      description: "Migración de arquitectura PHP 7 a 8, optimización de consultas BBDD y crons.",
    },
  ]

  const projectMap = new Map<string, string>() // name -> project_id

  for (const p of projectDefs) {
    const { data: existingProj } = await supabase
      .from("task_projects")
      .select("id")
      .eq("organization_id", orgId)
      .eq("name", p.name)
      .maybeSingle()

    if (existingProj) {
      // Ensure workspace_id is linked
      await supabase
        .from("task_projects")
        .update({ workspace_id: workspaceId, lead_staff_id: nataliaId })
        .eq("id", existingProj.id)

      projectMap.set(p.name, existingProj.id)
      console.log(`  ✓ Project ready: ${p.name} (${existingProj.id})`)
    } else {
      const { data: newProj, error: pErr } = await supabase
        .from("task_projects")
        .insert({
          organization_id: orgId,
          workspace_id: workspaceId,
          name: p.name,
          slug: `${p.slug}-${Math.floor(1000 + Math.random() * 9000)}`,
          description: p.description,
          color: p.color,
          icon: p.icon,
          lead_staff_id: nataliaId,
          status: "active",
        })
        .select("id")
        .single()

      if (pErr || !newProj) {
        console.error(`❌ Error creating project ${p.name}:`, pErr)
      } else {
        projectMap.set(p.name, newProj.id)
        console.log(`  + Created Project: ${p.name} (${newProj.id})`)
      }
    }
  }

  // 5. Clean existing tasks for these projects in Movilservicios
  const allProjectIds = Array.from(projectMap.values())
  console.log("🧹 Clearing old tasks in target projects...")
  const { data: oldTasks } = await supabase
    .from("task_items")
    .select("id")
    .eq("organization_id", orgId)
    .in("project_id", allProjectIds)

  if (oldTasks && oldTasks.length > 0) {
    const oldIds = oldTasks.map((t) => t.id)
    await supabase.from("task_comments").delete().in("task_id", oldIds)
    await supabase.from("task_items").delete().in("id", oldIds)
    console.log(`  ✓ Removed ${oldIds.length} existing tasks and comments.`)
  }

  // 6. Insert all 212 tickets
  console.log(`📦 Inserting ${tickets.length} tickets...`)
  let insertedCount = 0
  let commentsCount = 0

  for (let idx = 0; idx < tickets.length; idx++) {
    const t = tickets[idx]
    const projId = projectMap.get(t.project_name) || allProjectIds[0]
    const assignedDevId = staffMap.get(t.assignee) || null

    let description = ""
    if (t.observation) {
      description = `> **Observación de Seguimiento:**\n> ${t.observation}\n\n*Ticket extraído de seguimiento Jira Plataforma Web.*`
    } else {
      description = `*Ticket de la Plataforma Web asignado a ${t.assignee}.*`
    }

    // Determine initial progress
    let progress = 0
    if (t.status === "done") progress = 100
    else if (t.status === "in_review") progress = 85
    else if (t.status === "in_progress") progress = 45
    else if (t.status === "blocked") progress = 20

    const { data: newTask, error: tErr } = await supabase
      .from("task_items")
      .insert({
        organization_id: orgId,
        project_id: projId,
        ticket_code: t.ticket_code,
        title: t.title,
        description: description,
        status: t.status,
        priority: t.priority,
        type: t.title.toLowerCase().includes("error") ? "bug" : "task",
        progress_percentage: progress,
        assigned_staff_id: assignedDevId,
        qa_staff_id: nataliaId,
        tags: t.tags || [],
        order_index: idx + 1,
      })
      .select("id")
      .single()

    if (tErr || !newTask) {
      console.error(`❌ Error inserting ticket ${t.ticket_code}:`, tErr?.message)
      continue
    }

    insertedCount++

    // Insert observation as initial comment if exists
    if (t.observation) {
      await supabase.from("task_comments").insert({
        task_id: newTask.id,
        content: `**Observación de QA / Gestión:**\n${t.observation}`,
        author_name: "Natalia (PM / QA Lead)",
        author_type: "owner",
      })
      commentsCount++
    }
  }

  console.log("\n========================================================")
  console.log("🎉 SEED COMPLETED SUCCESSFULLY!")
  console.log(`🏢 Workspace: Plataforma Web & Servicios [WEB]`)
  console.log(`📁 Projects: 4 linked child projects`)
  console.log(`👥 Staff: Natalia (PM / QA Lead, 0 tickets) + 7 developers`)
  console.log(`✅ Total Tickets Inserted: ${insertedCount} / ${tickets.length}`)
  console.log(`💬 Observaciones posted as Comments: ${commentsCount}`)
  console.log("========================================================")
}

main().catch((err) => {
  console.error("Fatal error running seeder:", err)
  process.exit(1)
})
