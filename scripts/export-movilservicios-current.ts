import { createClient } from "@supabase/supabase-js"
import { loadEnvConfig } from "@next/env"
import fs from "fs"
import path from "path"

loadEnvConfig(process.cwd())

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(url, key)

async function exportFullMovilservicios() {
  const orgId = "91aa45c4-a7c4-4af6-96df-5f0fb1a35af7"

  // 1. Org
  const { data: org } = await supabase.from("organizations").select("*").eq("id", orgId).single()

  // 2. Staff
  const { data: staff } = await supabase.from("organization_staff").select("*").eq("organization_id", orgId)

  // 3. Workspaces
  const { data: workspaces } = await supabase.from("task_workspaces").select("*").eq("organization_id", orgId)

  // 4. Workspace Members
  const { data: members } = await supabase.from("task_workspace_members").select("*").eq("organization_id", orgId)

  // 5. Projects
  const { data: projects } = await supabase.from("task_projects").select("*").eq("organization_id", orgId)

  // 6. Tasks
  const { data: tasks } = await supabase.from("task_items").select("*").eq("organization_id", orgId)

  const dump = {
    exportedAt: new Date().toISOString(),
    organization: org,
    staff: staff || [],
    workspaces: workspaces || [],
    workspace_members: members || [],
    projects: projects || [],
    tasks: tasks || []
  }

  const outDir = path.join(process.cwd(), "scripts", "data")
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  const outFile = path.join(outDir, "movilservicios-snapshot.json")
  fs.writeFileSync(outFile, JSON.stringify(dump, null, 2), "utf-8")

  console.log(`✅ Snapshot exported successfully to: ${outFile}`)
  console.log(`📊 Summary:`)
  console.log(`  - Staff: ${dump.staff.length}`)
  console.log(`  - Workspaces: ${dump.workspaces.length}`)
  console.log(`  - Workspace Members: ${dump.workspace_members.length}`)
  console.log(`  - Projects: ${dump.projects.length}`)
  console.log(`  - Tasks: ${dump.tasks.length}`)
}

exportFullMovilservicios()
