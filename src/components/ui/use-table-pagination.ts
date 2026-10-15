"use client"
import { useCallback, useEffect, useState } from "react"
import { getPaginationRange, parseTablePage, parseTablePageSize } from "./table-pagination"

/** Only use with a complete local result set, after filtering and sorting. */
export function useClientTablePagination<T>(items: readonly T[], resetKey?: string) {
  const [state, setState] = useState({ page: 1, pageSize: 25, resetKey })
  const { safePage } = getPaginationRange(items.length, state.resetKey === resetKey ? state.page : 1, state.pageSize)
  if (state.resetKey !== resetKey || state.page !== safePage) {
    setState({ ...state, page: safePage, resetKey })
  }
  const onPageChange = useCallback((page: number) => setState(previous => ({ ...previous, page: parseTablePage(page) })), [])
  const onPageSizeChange = useCallback((pageSize: number) => setState(previous => ({ ...previous, page: 1, pageSize: parseTablePageSize(pageSize) })), [])
  const start = (safePage - 1) * state.pageSize
  return { rows: items.slice(start, start + state.pageSize), pagination: {
    totalCount: items.length, page: safePage, pageSize: state.pageSize, onPageChange, onPageSizeChange,
  } }
}

export interface TablePage<T> { rows: T[]; totalCount: number }
/** Stable loader required (useCallback). Ignores stale responses and corrects empty final pages. */
export function useRemoteTablePagination<T>(loadPage: (page: number, pageSize: number) => Promise<TablePage<T>>) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{
    data: TablePage<T>; page: number; pageSize: number; revision: number
    loadPage: typeof loadPage; error: string | null
  } | null>(null)
  const loading = result === null || result.page !== page || result.pageSize !== pageSize || result.revision !== revision || result.loadPage !== loadPage
  const error = loading ? null : result.error
  useEffect(() => {
    let active = true
    loadPage(page, pageSize).then(next => {
      if (!active) return
      const { safePage } = getPaginationRange(next.totalCount, page, pageSize)
      if (safePage !== page) { setPage(safePage); return }
      setResult({ data: next, page, pageSize, revision, loadPage, error: null })
    }).catch(() => {
      if (!active) return
      setResult({ data: { rows: [], totalCount: 0 }, page, pageSize, revision, loadPage,
        error: "No se pudo cargar la tabla. Reintenta la consulta." })
    })
    return () => { active = false }
  }, [loadPage, page, pageSize, revision])
  const refresh = useCallback(() => setRevision(value => value + 1), [])
  const onPageChange = useCallback((value: number) => setPage(parseTablePage(value)), [])
  const onPageSizeChange = useCallback((value: number) => { setPageSize(parseTablePageSize(value)); setPage(1) }, [])
  return { rows: result?.data.rows || [], loading, error, refresh,
    pagination: { totalCount: result?.data.totalCount || 0, page, pageSize, onPageChange, onPageSizeChange, disabled: loading || error !== null } }
}
