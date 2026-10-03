"use client"

import React, { useState, useEffect } from "react"
import {
  GitBranch,
  GitPullRequest,
  GitCommit,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  RotateCcw,
  Rocket
} from "lucide-react"
import { TaskItem, TaskProject } from "../../types"
import { TaskVcsLink, generateGitBranchName } from "../../types/vcs"
import { getTaskVcsLinksAction } from "../../actions/task-vcs-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

export interface TaskVcsStripProps {
  task: TaskItem
  project?: { id?: string; name?: string; color?: string; settings?: any } | TaskProject | null
}

export function TaskVcsStrip({ task, project }: TaskVcsStripProps) {
  const [links, setLinks] = useState<TaskVcsLink[]>(task.vcs_links || [])
  const [copiedBranch, setCopiedBranch] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)

  const vcsConfig = project?.settings?.vcs

  useEffect(() => {
    // If links were not preloaded or empty, fetch asynchronously
    let isMounted = true
    async function fetchLinks() {
      if (task.id) {
        setLoading(true)
        try {
          const remoteLinks = await getTaskVcsLinksAction(task.id)
          if (isMounted && remoteLinks.length > 0) {
            setLinks(remoteLinks)
          }
        } catch (e) {
          console.error("Error fetching VCS links:", e)
        } finally {
          if (isMounted) setLoading(false)
        }
      }
    }

    if (!links || links.length === 0) {
      fetchLinks()
    }

    return () => {
      isMounted = false
    }
  }, [task.id])

  const handleEnableDemo = () => {
    const repoName = vcsConfig?.repository || "pixy-agency/core-platform"
    const slugTitle = task.title ? task.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) : "modulo-auth"
    const demoBranchName = `feature/${task.ticket_code.toLowerCase()}-${slugTitle}`

    const demoLinks: TaskVcsLink[] = [
      {
        id: "demo-branch-1",
        organization_id: "demo-org",
        task_id: task.id,
        provider: "bitbucket",
        resource_type: "branch",
        external_id: demoBranchName,
        repository_name: repoName,
        title: demoBranchName,
        url: `https://bitbucket.org/${repoName}/branch/${demoBranchName}`,
        status: "OPEN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "demo-pr-1",
        organization_id: "demo-org",
        task_id: task.id,
        provider: "bitbucket",
        resource_type: "pull_request",
        external_id: "14",
        repository_name: repoName,
        title: `PR #14: ${task.title || "Implementación del requerimiento"}`,
        url: `https://bitbucket.org/${repoName}/pull-requests/14`,
        status: "OPEN",
        metadata: {
          ci_status: "SUCCESSFUL",
          reviewers: ["Natalia Dev", "Tech Lead"]
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "demo-commit-1",
        organization_id: "demo-org",
        task_id: task.id,
        provider: "bitbucket",
        resource_type: "commit",
        external_id: "7a35c24",
        repository_name: repoName,
        title: `${task.ticket_code}: Estructura inicial y componentes`,
        url: `https://bitbucket.org/${repoName}/commits/7a35c24`,
        status: "OPEN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "demo-commit-2",
        organization_id: "demo-org",
        task_id: task.id,
        provider: "bitbucket",
        resource_type: "commit",
        external_id: "9f81a12",
        repository_name: repoName,
        title: `${task.ticket_code} [1.5h]: Pruebas unitarias y ajustes`,
        url: `https://bitbucket.org/${repoName}/commits/9f81a12`,
        status: "OPEN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ]

    setLinks(demoLinks)
    setIsDemoMode(true)
  }

  const handleResetDemo = () => {
    setLinks(task.vcs_links || [])
    setIsDemoMode(false)
  }

  const handleTogglePrStatus = () => {
    setLinks((prev) =>
      prev.map((l) => {
        if (l.resource_type === "pull_request") {
          const nextStatus = l.status === "OPEN" ? "MERGED" : "OPEN"
          return { ...l, status: nextStatus }
        }
        return l
      })
    )
  }

  const activeBranches = links.filter((l) => l.resource_type === "branch" && l.status !== "DELETED")
  const deletedBranches = links.filter((l) => l.resource_type === "branch" && l.status === "DELETED")
  const pullRequests = links.filter((l) => l.resource_type === "pull_request")
  const commits = links.filter((l) => l.resource_type === "commit")

  const hasActiveResources = activeBranches.length > 0 || pullRequests.length > 0 || commits.length > 0

  // Generate suggested branch name if none exist yet using canonical helper
  const suggestedBranch = generateGitBranchName(task.ticket_code, task.title)

  const copyBranchCommand = (branchName: string) => {
    const cmd = `git checkout -b ${branchName}`
    navigator.clipboard.writeText(cmd)
    setCopiedBranch(true)
    setTimeout(() => setCopiedBranch(false), 2000)
  }

  // Check CI/CD status from latest PR or commit metadata
  const latestCiStatus = links.find((l) => l.metadata?.ci_status)?.metadata

  const hasOpenOrMergedPr = pullRequests.some((pr) => {
    const s = (pr.status || "OPEN").toUpperCase()
    return s === "OPEN" || s === "MERGED"
  })

  const primaryBranch = activeBranches[0]
  const workspaceVcs = (project as any)?.workspace?.settings?.vcs
  const rawRepoFullName =
    primaryBranch?.repository_name ||
    vcsConfig?.repository ||
    (Array.isArray(vcsConfig?.repositories) && vcsConfig.repositories[0]) ||
    workspaceVcs?.repository ||
    (Array.isArray(workspaceVcs?.repositories) && workspaceVcs.repositories[0]) ||
    ""
  const cleanRepoFullName = rawRepoFullName
    .trim()
    .replace(/^https?:\/\/[^/]+\//, "")
    .replace(/^git@[^:]+:/, "")
    .replace(/\.git$/i, "")
    .replace(/^\/+|\/+$/g, "")

  const destBranch = vcsConfig?.default_branch || workspaceVcs?.default_branch || "main"
  const rawSourceBranch = primaryBranch?.title || primaryBranch?.external_id || ""
  const sourceBranch = rawSourceBranch.replace(/^refs\/heads\//, "")
  const prTitle = `${task.ticket_code}: ${task.title || ""}`.trim()
  const prDesc = `Implementación de ticket ${task.ticket_code} - ${task.title || ""}\n\n${task.description || ""}`.trim()

  const createBitbucketPrUrl = cleanRepoFullName
    ? `https://bitbucket.org/${cleanRepoFullName}/pull-requests/new?source=${encodeURIComponent(sourceBranch)}&dest=${encodeURIComponent(destBranch)}&title=${encodeURIComponent(prTitle)}&description=${encodeURIComponent(prDesc)}`
    : "#"

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-blue-500" />
          <span>Control de Versiones (Git)</span>
        </label>
        <div className="flex items-center gap-2">
          {isDemoMode && (
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 py-0 h-4">
                Demo
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleTogglePrStatus}
                className="h-5 px-1.5 text-[10px] text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 rounded cursor-pointer border border-purple-500/20"
                title="Alternar estado del PR entre Abierto y Fusionado (Merged)"
              >
                <RefreshCw className="h-2.5 w-2.5 mr-1" />
                Alternar PR
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetDemo}
                className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer"
                title="Restaurar estado original"
              >
                <RotateCcw className="h-2.5 w-2.5 mr-0.5" />
                Quitar Demo
              </Button>
            </div>
          )}
          {cleanRepoFullName && !isDemoMode && (
            <span className="text-[10px] font-mono text-muted-foreground/70 bg-muted/30 px-2 py-0.5 rounded-md border border-border/40">
              {cleanRepoFullName}
            </span>
          )}
        </div>
      </div>

      <div className="p-2.5 rounded-xl bg-muted/20 border border-border/60 text-xs space-y-2">
        {!hasActiveResources && (
          // Empty State or Suggestion when no active branch/PR/commit exists
          <div className="flex items-center justify-between gap-2 py-1">
            <div className="flex items-center gap-2 min-w-0 text-muted-foreground">
              <GitBranch className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
              <span className="truncate font-mono text-[11px] text-foreground/80 select-all">
                {suggestedBranch}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyBranchCommand(suggestedBranch)}
                className="h-6 px-2 text-[11px] gap-1 shrink-0 rounded-md border-border/60 hover:bg-muted cursor-pointer"
              >
                {copiedBranch ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    <span className="text-emerald-600 font-medium">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copiar Rama</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleEnableDemo}
                className="h-6 px-2 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 gap-1 rounded-md cursor-pointer border border-blue-500/20"
                title="Sembrar datos de demostración para ver cómo luce la experiencia completa de control de versiones"
              >
                <Sparkles className="h-3 w-3 text-blue-500" />
                <span>Simular Repositorio</span>
              </Button>
            </div>
          </div>
        )}

        {(hasActiveResources || deletedBranches.length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Active Branches Pills */}
            {activeBranches.map((branch) => (
              <div
                key={branch.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border/60 text-[11px] font-mono hover:border-blue-500/40 transition-colors"
              >
                <GitBranch className="h-3 w-3 text-blue-500 shrink-0" />
                <span className="truncate max-w-[160px]" title={branch.title}>
                  {branch.title}
                </span>
                <button
                  type="button"
                  onClick={() => copyBranchCommand(branch.title)}
                  title="Copiar comando git checkout"
                  className="text-muted-foreground hover:text-foreground p-0.5"
                >
                  <Copy className="h-2.5 w-2.5" />
                </button>
                {branch.url && (
                  <a
                    href={branch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-blue-500 p-0.5"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            ))}

            {/* Deep-Link 1-Click "Crear Pull Request" */}
            {activeBranches.length > 0 && !hasOpenOrMergedPr && (
              <a
                href={createBitbucketPrUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="open-bitbucket-pr-btn"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
                title={`Abrir Pull Request para ${sourceBranch} hacia ${destBranch}`}
              >
                <Rocket className="h-3 w-3 text-white shrink-0" />
                <span>Crear Pull Request</span>
                <ExternalLink className="h-2.5 w-2.5 text-white/80 shrink-0" />
              </a>
            )}

            {/* Deleted Branches Pills (historical / audit) */}
            {deletedBranches.map((branch) => (
              <div
                key={branch.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/50 border border-border/40 text-[11px] font-mono opacity-60"
              >
                <GitBranch className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate max-w-[140px] line-through text-muted-foreground" title={branch.title}>
                  {branch.title}
                </span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-muted-foreground/30 text-muted-foreground">
                  Eliminada
                </Badge>
              </div>
            ))}

            {/* Pull Requests Pills */}
            {pullRequests.map((pr) => {
              const state = (pr.status || "OPEN").toUpperCase()
              let badgeColor = "bg-blue-500/10 text-blue-600 border-blue-500/30"
              if (state === "MERGED") {
                badgeColor = "bg-purple-500/10 text-purple-600 border-purple-500/30 dark:bg-purple-500/20 dark:text-purple-300"
              } else if (state === "DECLINED" || state === "REJECTED") {
                badgeColor = "bg-rose-500/10 text-rose-600 border-rose-500/30"
              }

              return (
                <a
                  key={pr.id}
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-opacity hover:opacity-85 ${badgeColor}`}
                >
                  <GitPullRequest className="h-3 w-3 shrink-0" />
                  <span className="truncate max-w-[280px]">
                    {pr.title?.startsWith("PR #") ? pr.title : `PR #${pr.external_id}: ${pr.title}`}
                  </span>
                  {pr.metadata?.target_branch && (
                    <span className="text-[10px] font-mono text-muted-foreground/80 opacity-80 shrink-0">
                      → {pr.metadata.target_branch}
                    </span>
                  )}
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 uppercase font-bold border-current/40 shrink-0">
                    {state}
                  </Badge>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60 shrink-0" />
                </a>
              )
            })}

            {/* Commits Pill with Interactive Popover */}
            {commits.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border border-border/60 hover:border-amber-500/50 hover:bg-amber-500/5 text-[11px] font-mono text-muted-foreground cursor-pointer transition-colors"
                    title="Ver commits vinculados a este ticket"
                  >
                    <GitCommit className="h-3 w-3 text-amber-500" />
                    <span className="font-semibold text-foreground">{commits.length}</span>
                    <span>commit{commits.length > 1 ? "s" : ""}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 p-3 space-y-2 text-xs shadow-lg">
                  <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                    <span className="font-semibold flex items-center gap-1.5 text-foreground">
                      <GitCommit className="h-3.5 w-3.5 text-amber-500" />
                      Commits vinculados ({commits.length})
                    </span>
                    <span className="text-[10px] text-muted-foreground">Git Activity</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {commits.map((c) => (
                      <div key={c.id} className="p-2 rounded-md bg-muted/30 border border-border/40 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                            #{c.external_id?.slice(0, 7) || "hash"}
                          </span>
                          {c.url && (
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-muted-foreground hover:text-blue-500 flex items-center gap-1"
                            >
                              Ver en Bitbucket <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                        <p className="text-[11px] text-foreground/90 font-medium leading-snug">
                          {c.title}
                        </p>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* CI/CD Status Indicator if available */}
            {latestCiStatus?.ci_status && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border border-border/40">
                {latestCiStatus.ci_status === "SUCCESSFUL" ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span className="text-emerald-600">CI Pasó</span>
                  </>
                ) : latestCiStatus.ci_status === "FAILED" ? (
                  <>
                    <XCircle className="h-3 w-3 text-rose-500" />
                    <span className="text-rose-600">CI Falló</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3 text-amber-500 animate-spin" />
                    <span className="text-amber-600">CI Ejecutando</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
