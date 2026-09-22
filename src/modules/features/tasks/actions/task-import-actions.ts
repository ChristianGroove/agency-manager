"use server";

import { supabaseAdmin } from "@/modules/core/database/supabase-admin";
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import {
  PixyUniversalBundle,
  ImportExecutionOptions,
  ImportExecutionResult,
} from "../import-types";
import { normalizeSlug } from "../utils/task-import-parser";

/**
 * Helper to get active organization ID
 */
async function resolveOrgId(providedOrgId?: string): Promise<string> {
  if (providedOrgId) return providedOrgId;
  const orgId = await getCurrentOrganizationId();
  if (!orgId) throw new Error("No se pudo determinar la organización activa.");
  return orgId;
}

/**
 * Execute Universal Import Transaction
 */
export async function executeUniversalImport(
  bundle: PixyUniversalBundle,
  options: ImportExecutionOptions,
  orgIdParam?: string
): Promise<ImportExecutionResult> {
  try {
    const orgId = await resolveOrgId(orgIdParam);

    const stats = {
      staffCreated: 0,
      workspacesCreated: 0,
      projectsCreated: 0,
      sprintsCreated: 0,
      tasksCreated: 0,
      checklistsCreated: 0,
      blockersResolved: 0,
    };

    // -------------------------------------------------------------
    // 1. Fetch Existing Entities to Build Resolution Maps
    // -------------------------------------------------------------
    const [staffRes, workspacesRes, projectsRes, sprintsRes, latestTaskRes] = await Promise.all([
      supabaseAdmin
        .from("organization_staff")
        .select("id, email, first_name, last_name")
        .eq("organization_id", orgId),
      supabaseAdmin
        .from("task_workspaces")
        .select("id, key_prefix, name, slug")
        .eq("organization_id", orgId),
      supabaseAdmin
        .from("task_projects")
        .select("id, name, slug, workspace_id")
        .eq("organization_id", orgId),
      supabaseAdmin
        .from("task_sprints")
        .select("id, name")
        .eq("organization_id", orgId),
      supabaseAdmin
        .from("task_items")
        .select("ticket_code")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    // Staff resolution map: email (lower) -> id
    const staffMap = new Map<string, string>();
    (staffRes.data || []).forEach((s) => {
      if (s.email) staffMap.set(s.email.toLowerCase().trim(), s.id);
    });

    // Workspaces resolution map: key_prefix (upper) -> id, slug -> id
    const workspaceMap = new Map<string, string>();
    (workspacesRes.data || []).forEach((w) => {
      if (w.key_prefix) workspaceMap.set(w.key_prefix.toUpperCase().trim(), w.id);
      if (w.slug) workspaceMap.set(w.slug.toLowerCase().trim(), w.id);
    });

    // Projects resolution map: slug -> id, name (lower) -> id
    const projectMap = new Map<string, string>();
    (projectsRes.data || []).forEach((p) => {
      if (p.slug) projectMap.set(p.slug.toLowerCase().trim(), p.id);
      if (p.name) projectMap.set(normalizeSlug(p.name), p.id);
    });

    // Sprints resolution map: name (lower) -> id
    const sprintMap = new Map<string, string>();
    (sprintsRes.data || []).forEach((s) => {
      if (s.name) sprintMap.set(s.name.toLowerCase().trim(), s.id);
    });

    // Calculate initial next ticket number
    let nextTicketNumber = 101;
    if (latestTaskRes.data && latestTaskRes.data.length > 0 && latestTaskRes.data[0].ticket_code) {
      const match = latestTaskRes.data[0].ticket_code.match(/(\d+)$/);
      if (match) {
        nextTicketNumber = parseInt(match[1], 10) + 1;
      }
    }

    // -------------------------------------------------------------
    // 2. Step 1: Create Missing Staff / Collaborators
    // -------------------------------------------------------------
    const allReferencedStaff = new Map<string, { firstName: string; lastName: string; role: string; taskRole: string; phone?: string | null; photoUrl?: string | null }>();

    // From declared bundle collaborators
    (bundle.collaborators || []).forEach((c) => {
      const email = c.email.toLowerCase().trim();
      if (!staffMap.has(email)) {
        allReferencedStaff.set(email, {
          firstName: c.first_name,
          lastName: c.last_name || "",
          role: c.role || "Colaborador",
          taskRole: c.task_role || "developer",
          phone: c.phone,
          photoUrl: c.photo_url,
        });
      }
    });

    // From tasks assignee & qa emails
    bundle.tasks.forEach((t) => {
      if (t.assignee_email) {
        const email = t.assignee_email.toLowerCase().trim();
        if (!staffMap.has(email) && !allReferencedStaff.has(email)) {
          allReferencedStaff.set(email, {
            firstName: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            lastName: "",
            role: "Colaborador",
            taskRole: "developer",
          });
        }
      }
      if (t.qa_email) {
        const email = t.qa_email.toLowerCase().trim();
        if (!staffMap.has(email) && !allReferencedStaff.has(email)) {
          allReferencedStaff.set(email, {
            firstName: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            lastName: "",
            role: "QA Revisor",
            taskRole: "qa_lead",
          });
        }
      }
    });

    if (options.autoCreateStaff && allReferencedStaff.size > 0) {
      for (const [email, info] of allReferencedStaff.entries()) {
        const { data: newStaff, error: staffErr } = await supabaseAdmin
          .from("organization_staff")
          .insert({
            organization_id: orgId,
            first_name: info.firstName,
            last_name: info.lastName,
            email: email,
            phone: info.phone || null,
            role: info.role || "Colaborador",
            photo_url: info.photoUrl || null,
            has_global_workspace_access: true,
            is_active: true,
          })
          .select("id")
          .single();

        if (!staffErr && newStaff) {
          staffMap.set(email, newStaff.id);
          stats.staffCreated += 1;
        }
      }
    }

    // -------------------------------------------------------------
    // 3. Step 2: Create Missing Workspaces
    // -------------------------------------------------------------
    if (options.autoCreateWorkspaces && bundle.workspaces && bundle.workspaces.length > 0) {
      for (const w of bundle.workspaces) {
        const key = w.key_prefix.toUpperCase().trim();
        if (!workspaceMap.has(key)) {
          const leadId = w.lead_email ? staffMap.get(w.lead_email.toLowerCase().trim()) : null;
          const { data: newWs, error: wsErr } = await supabaseAdmin
            .from("task_workspaces")
            .insert({
              organization_id: orgId,
              name: w.name,
              slug: w.slug || normalizeSlug(w.name),
              key_prefix: key,
              description: w.description || null,
              color: w.color || "#3b82f6",
              icon: w.icon || "Layers",
              lead_staff_id: leadId || null,
            })
            .select("id")
            .single();

          if (!wsErr && newWs) {
            workspaceMap.set(key, newWs.id);
            workspaceMap.set(normalizeSlug(w.name), newWs.id);
            stats.workspacesCreated += 1;
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 4. Step 3: Create Missing Projects
    // -------------------------------------------------------------
    // Collect all referenced projects in bundle & tasks
    const allReferencedProjects = new Map<string, { name: string; workspaceKey?: string | null; color?: string; description?: string }>();

    (bundle.projects || []).forEach((p) => {
      const slug = normalizeSlug(p.slug || p.name);
      if (!projectMap.has(slug)) {
        allReferencedProjects.set(slug, {
          name: p.name,
          workspaceKey: p.workspace_key,
          color: p.color || "#8ec045",
          description: p.description || undefined,
        });
      }
    });

    bundle.tasks.forEach((t) => {
      const name = t.project_name || t.project_slug || "Proyecto General";
      const slug = normalizeSlug(t.project_slug || name);
      if (!projectMap.has(slug) && !allReferencedProjects.has(slug)) {
        allReferencedProjects.set(slug, {
          name,
          workspaceKey: t.workspace_key,
          color: "#8ec045",
        });
      }
    });

    // Default workspace fallback
    const firstExistingWorkspaceId = Array.from(workspaceMap.values())[0] || null;
    const defaultWorkspaceId = options.defaultWorkspaceId || firstExistingWorkspaceId;

    if (options.autoCreateProjects && allReferencedProjects.size > 0) {
      for (const [slug, info] of allReferencedProjects.entries()) {
        const wsId = (info.workspaceKey && workspaceMap.get(info.workspaceKey.toUpperCase().trim())) || defaultWorkspaceId;
        const { data: newProj, error: projErr } = await supabaseAdmin
          .from("task_projects")
          .insert({
            organization_id: orgId,
            workspace_id: wsId,
            name: info.name,
            slug,
            description: info.description || null,
            color: info.color || "#8ec045",
            icon: "Folder",
            status: "active",
          })
          .select("id")
          .single();

        if (!projErr && newProj) {
          projectMap.set(slug, newProj.id);
          projectMap.set(normalizeSlug(info.name), newProj.id);
          stats.projectsCreated += 1;
        }
      }
    }

    // Default project fallback for tasks
    const firstExistingProjectId = Array.from(projectMap.values())[0] || null;
    let fallbackProjectId = options.defaultProjectId || firstExistingProjectId;

    // If still no project exists in the whole organization, create a fallback "Proyecto General"
    if (!fallbackProjectId) {
      const { data: generalProj } = await supabaseAdmin
        .from("task_projects")
        .insert({
          organization_id: orgId,
          workspace_id: defaultWorkspaceId,
          name: "Proyecto General",
          slug: "proyecto-general",
          color: "#8ec045",
          icon: "Layers",
          status: "active",
        })
        .select("id")
        .single();

      if (generalProj) {
        fallbackProjectId = generalProj.id;
        projectMap.set("proyecto-general", generalProj.id);
        stats.projectsCreated += 1;
      }
    }

    // -------------------------------------------------------------
    // 5. Step 4: Create Missing Sprints
    // -------------------------------------------------------------
    const allReferencedSprints = new Map<string, { name: string; goal?: string | null; start_date?: string; end_date?: string; duration_days?: number }>();

    (bundle.sprints || []).forEach((s) => {
      const nameKey = s.name.toLowerCase().trim();
      if (!sprintMap.has(nameKey)) {
        allReferencedSprints.set(nameKey, {
          name: s.name,
          goal: s.goal,
          start_date: s.start_date,
          end_date: s.end_date,
          duration_days: s.duration_days,
        });
      }
    });

    bundle.tasks.forEach((t) => {
      if (t.sprint_name) {
        const nameKey = t.sprint_name.toLowerCase().trim();
        if (!sprintMap.has(nameKey) && !allReferencedSprints.has(nameKey)) {
          const today = new Date();
          const in14Days = new Date();
          in14Days.setDate(today.getDate() + 14);
          allReferencedSprints.set(nameKey, {
            name: t.sprint_name,
            goal: `Sprint ${t.sprint_name}`,
            start_date: today.toISOString().split("T")[0],
            end_date: in14Days.toISOString().split("T")[0],
            duration_days: 14,
          });
        }
      }
    });

    if (options.autoCreateSprints && allReferencedSprints.size > 0) {
      for (const [nameKey, info] of allReferencedSprints.entries()) {
        const { data: newSprint, error: sprintErr } = await supabaseAdmin
          .from("task_sprints")
          .insert({
            organization_id: orgId,
            name: info.name,
            goal: info.goal || null,
            start_date: info.start_date || new Date().toISOString().split("T")[0],
            end_date: info.end_date || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
            duration_days: info.duration_days || 14,
            status: "active",
            auto_rollover: true,
          })
          .select("id")
          .single();

        if (!sprintErr && newSprint) {
          sprintMap.set(nameKey, newSprint.id);
          stats.sprintsCreated += 1;
        }
      }
    }

    // -------------------------------------------------------------
    // 6. Step 5: Insert Tasks (`task_items`)
    // -------------------------------------------------------------
    const refIdToTaskIdMap = new Map<string, string>();
    const createdTaskCodes: string[] = [];
    const pendingBlockers: Array<{ taskId: string; blockerRefId: string }> = [];

    // Chunks of 50 tasks for safe database batching
    const CHUNK_SIZE = 50;
    for (let i = 0; i < bundle.tasks.length; i += CHUNK_SIZE) {
      const chunk = bundle.tasks.slice(i, i + CHUNK_SIZE);
      const rowsToInsert = chunk.map((t, chunkIdx) => {
        const pSlug = normalizeSlug(t.project_slug || t.project_name || "");
        const targetProjectId = projectMap.get(pSlug) || fallbackProjectId;

        // Resolve workspace prefix
        let prefix = "TK";
        if (t.workspace_key) {
          prefix = t.workspace_key.toUpperCase().trim();
        }

        // Resolve ticket code: preserve Jira or external ticket code if provided (e.g. WEB-2465)
        let ticketCode = `${prefix}-${nextTicketNumber++}`;
        if (t.ticket_code && /^[A-Z0-9]+-\d+$/i.test(t.ticket_code.trim())) {
          ticketCode = t.ticket_code.trim().toUpperCase();
        } else if (t.import_ref_id && /^[A-Z0-9]+-\d+$/i.test(t.import_ref_id.trim())) {
          ticketCode = t.import_ref_id.trim().toUpperCase();
        }
        createdTaskCodes.push(ticketCode);

        // Resolve staff
        const assignedStaffId = t.assignee_email ? staffMap.get(t.assignee_email.toLowerCase().trim()) || null : null;
        const qaStaffId = t.qa_email ? staffMap.get(t.qa_email.toLowerCase().trim()) || null : null;

        // Resolve sprint
        const sprintId = t.sprint_name ? sprintMap.get(t.sprint_name.toLowerCase().trim()) || null : null;

        // Transform checklist with UUIDs and staff resolution
        const checklist = (t.checklist || []).map((c, cIdx) => {
          stats.checklistsCreated += 1;
          const checkStaffId = c.assigned_email ? staffMap.get(c.assigned_email.toLowerCase().trim()) || null : null;
          return {
            id: crypto.randomUUID(),
            title: c.title,
            completed: c.completed ?? false,
            estimated_hours: c.estimated_hours || null,
            actual_hours: c.actual_hours || null,
            assigned_staff_id: checkStaffId,
            target_week: c.target_week || null,
            due_date: c.due_date || null,
          };
        });

        const taskRow: Record<string, any> = {
          organization_id: orgId,
          project_id: targetProjectId,
          ticket_code: ticketCode,
          title: t.title,
          description: t.description || null,
          type: t.type || "task",
          status: t.status || "todo",
          priority: t.priority || "medium",
          progress_percentage: t.progress_percentage ?? 0,
          estimated_hours: t.estimated_hours ?? 0,
          actual_hours: t.actual_hours ?? 0,
          due_date: t.due_date || null,
          assigned_staff_id: assignedStaffId,
          qa_staff_id: qaStaffId,
          tags: t.tags || [],
          checklist,
          order_index: i + chunkIdx,
        };

        if (sprintId) {
          taskRow.sprint_id = sprintId;
        }

        if (t.blocked_reason) {
          taskRow.blocked_reason = t.blocked_reason;
        }

        return {
          _rawRefId: t.import_ref_id || `${i + chunkIdx + 1}`,
          _blockedByRefId: t.blocked_by_ref_id,
          taskRow,
        };
      });

      const { data: insertedTasks, error: insertErr } = await supabaseAdmin
        .from("task_items")
        .insert(rowsToInsert.map((r) => r.taskRow))
        .select("id, ticket_code");

      if (insertErr) {
        throw new Error(`Error insertando lote de tareas: ${insertErr.message}`);
      }

      if (insertedTasks) {
        stats.tasksCreated += insertedTasks.length;
        insertedTasks.forEach((it, idx) => {
          const original = rowsToInsert[idx];
          if (original._rawRefId) {
            refIdToTaskIdMap.set(original._rawRefId, it.id);
          }
          if (original._blockedByRefId) {
            pendingBlockers.push({
              taskId: it.id,
              blockerRefId: original._blockedByRefId,
            });
          }
        });
      }
    }

    // -------------------------------------------------------------
    // 7. Step 6: Phase 2 - Resolve Blockers & Dependencies
    // -------------------------------------------------------------
    for (const blocker of pendingBlockers) {
      const targetBlockerTaskId = refIdToTaskIdMap.get(blocker.blockerRefId);
      if (targetBlockerTaskId) {
        const { error: blockerErr } = await supabaseAdmin
          .from("task_items")
          .update({ blocked_by_task_id: targetBlockerTaskId })
          .eq("id", blocker.taskId);
        if (!blockerErr) {
          stats.blockersResolved += 1;
        } else {
          console.warn("[UniversalImport] Advertencia al vincular bloqueador:", blockerErr.message);
        }
      }
    }

    // -------------------------------------------------------------
    // 8. Step 7: Activity Log & Cache Revalidation
    // -------------------------------------------------------------
    try {
      await supabaseAdmin.from("task_activity_feed").insert({
        organization_id: orgId,
        action: "bulk_import",
        details: {
          source: bundle.source_system,
          tasksCount: stats.tasksCreated,
          staffCount: stats.staffCreated,
          projectsCount: stats.projectsCreated,
          sprintsCount: stats.sprintsCreated,
        },
      });
    } catch {
      // Activity feed logging is non-blocking
    }

    revalidatePath("/operations/tasks");

    return {
      success: true,
      createdStats: stats,
      createdTaskCodes,
    };
  } catch (err: any) {
    console.error("Error executing universal import:", err);
    return {
      success: false,
      error: err.message || "Error inesperado durante la importación.",
    };
  }
}
