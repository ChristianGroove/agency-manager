import React from "react"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { InvoicesView } from "./invoices-view"
import type { Invoice } from "@/types"
vi.mock("next/navigation", () => ({useRouter: () => ({push: vi.fn(), refresh: vi.fn()})}))
vi.mock("@/modules/core/i18n/use-translation", () => ({useTranslation: () => ({t: (key: string) => key, locale: "es"})}))
vi.mock("@/modules/core/database/supabase", () => ({supabase: {from: vi.fn()}}))
vi.mock("../billing-actions", () => ({getInvoices: vi.fn()}))
vi.mock("./create-invoice-sheet", () => ({CreateInvoiceSheet: () => null}))
afterEach(cleanup)
const invoices = Array.from({length: 31}, (_, id) => ({id: String(id), number: "INV-TEST-" + id, client: {name: "Cliente " + id}, date: "2026-10-15T12:00:00Z", due_date: "2026-11-15T12:00:00Z", total: 1000, status: "pending"})) as Invoice[]
describe("InvoicesView with shared pagination", () => {
  it("keeps the active multi-selection and page after a parent data refresh", () => {
    const {rerender} = render(<InvoicesView initialInvoices={invoices} />)
    fireEvent.click(within(screen.getByRole("row", {name: /INV-TEST-0 /})).getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", {name: "Página siguiente"}))
    expect(screen.getByRole("status")).toHaveTextContent("Mostrando 26 - 31 de 31 registros")
    expect(screen.getByRole("button", {name: "Eliminar selección"})).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole("row", {name: /INV-TEST-25 /})).getByRole("checkbox"))
    rerender(<InvoicesView initialInvoices={[...invoices]} />)
    expect(screen.getByRole("status")).toHaveTextContent("Mostrando 26 - 31 de 31 registros")
    expect(within(screen.getByRole("row", {name: /INV-TEST-25 /})).getByRole("checkbox")).toBeChecked()
    fireEvent.click(screen.getByRole("button", {name: "Página anterior"}))
    expect(within(screen.getByRole("row", {name: /INV-TEST-0 /})).getByRole("checkbox")).toBeChecked()
  })
  it("retains the full filtered selection scope of the existing invoice header", () => {
    render(<InvoicesView initialInvoices={invoices} />)
    fireEvent.click(screen.getAllByRole("checkbox")[0])
    fireEvent.click(screen.getByRole("button", {name: "Página siguiente"}))
    expect(within(screen.getByRole("row", {name: /INV-TEST-30 /})).getByRole("checkbox")).toBeChecked()
    expect(screen.getByText("seleccionados").parentElement).toHaveTextContent("31")
    fireEvent.click(screen.getByRole("button", {name: "Cancelar selección"}))
    expect(screen.queryByRole("button", {name: "Eliminar selección"})).not.toBeInTheDocument()
  })
})
