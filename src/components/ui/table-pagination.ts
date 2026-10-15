export const TABLE_PAGE_SIZES = [25, 50, 100] as const
export function parseTablePage(value: unknown): number {
  const page = typeof value === "string" ? Number(value) : value
  return typeof page === "number" && Number.isSafeInteger(page) && page > 0 ? page : 1
}
export function parseTablePageSize(value: unknown): number {
  const size = typeof value === "string" ? Number(value) : value
  return TABLE_PAGE_SIZES.some((allowed) => allowed === size) ? Number(size) : 25
}
export function getPaginationRange(totalCount: number, page: number, pageSize: number) {
  const size = parseTablePageSize(pageSize)
  const totalPages = Math.max(1, Math.ceil(totalCount / size))
  const safePage = Math.min(parseTablePage(page), totalPages)
  return { totalPages, safePage,
    startRecord: totalCount === 0 ? 0 : (safePage - 1) * size + 1,
    endRecord: Math.min(safePage * size, totalCount) }
}
