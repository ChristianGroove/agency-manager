"use client"
import * as React from "react"
import { DataTable } from "./data-table"
import { TableBody } from "./table"
import { DataTablePagination } from "./data-table-pagination"
import { useClientTablePagination } from "./use-table-pagination"

type ChildProps = { children?: React.ReactNode; colSpan?: number }
function element(value: React.ReactNode): value is React.ReactElement<ChildProps> { return React.isValidElement(value) }

/** Local-only adapter for complete, already filtered row sets. Keeps keyed fragments (record + detail rows) together.
 * Does not change header selection, row handlers, menus, or floating bulk actions owned by the caller.
 * Never use on a backend page/cursor; those use DataTable + a controlled pagination component.
 */
export function PaginatedDataTable({ children, resetKey, itemLabel = "registros", loading = false, ...props }:
  React.ComponentProps<typeof DataTable> & { resetKey?: string; itemLabel?: string; loading?: boolean }) {
  const sections = React.Children.toArray(children)
  const body = sections.find(node => element(node) && (node.type === "tbody" || node.type === TableBody))
  const rows = element(body) ? React.Children.toArray(body.props.children).filter(element) : []
  const placeholder = rows.length === 1 && React.Children.toArray(rows[0].props.children).some(cell => element(cell) && Number(cell.props.colSpan) > 1)
  const key = resetKey ?? rows.map(row => String(row.key)).join("|")
  const { rows: pageRows, pagination } = useClientTablePagination(placeholder ? [] : rows, key)
  const content = sections.map(section => section === body && element(section)
    ? React.cloneElement(section, {children: placeholder || loading ? rows : pageRows}) : section)
  return <div className="min-w-0 space-y-3">
    <DataTable {...props} aria-busy={loading}>{content}</DataTable>
    {body && <DataTablePagination {...pagination} itemLabel={itemLabel} disabled={loading} />}
  </div>
}
