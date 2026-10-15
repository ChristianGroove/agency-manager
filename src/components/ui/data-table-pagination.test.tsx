import React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { DataTablePagination } from "./data-table-pagination"
afterEach(cleanup)
describe("DataTablePagination", () => {
  it("reports server totals and requests the next page without fetching or slicing rows", () => {
    const onPageChange = vi.fn()
    render(<DataTablePagination totalCount={101} page={2} pageSize={25} onPageChange={onPageChange} onPageSizeChange={vi.fn()} />)
    expect(screen.getByRole("status")).toHaveTextContent("Mostrando 26 - 50 de 101 registros")
    fireEvent.click(screen.getByRole("button", {name: "Página siguiente"}))
    expect(onPageChange).toHaveBeenCalledWith(3)
    fireEvent.click(screen.getByRole("button", {name: "Página anterior"}))
    expect(onPageChange).toHaveBeenLastCalledWith(1)
  })
  it("disables empty and pending navigation", () => {
    const props = { onPageChange: vi.fn(), onPageSizeChange: vi.fn(), page: 1, pageSize: 25 }
    const { rerender } = render(<DataTablePagination {...props} totalCount={0} />)
    expect(screen.getByRole("button", {name: "Página anterior"})).toBeDisabled()
    expect(screen.getByRole("button", {name: "Página siguiente"})).toBeDisabled()
    rerender(<DataTablePagination {...props} totalCount={100} disabled />)
    expect(screen.getByRole("combobox")).toBeDisabled()
    expect(screen.getByRole("button", {name: "Página siguiente"})).toBeDisabled()
  })
})
