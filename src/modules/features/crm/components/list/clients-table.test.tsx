import React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ClientsTable } from "./clients-table"
import { ClientsProvider } from "../../context/clients-context"
import { TooltipProvider } from "@/components/ui/tooltip"
vi.mock("@/modules/core/i18n/use-translation", () => ({useTranslation: () => ({t: (key: string) => key})}))
afterEach(cleanup)
const ana = {id: "a", name: "Ana", company_name: "A"}
const bob = {id: "b", name: "Bob", company_name: "B"}
const actions = {onManage: vi.fn(), onDelete: vi.fn(), onCommunication: vi.fn(), onInvoices: vi.fn(), onConnectivity: vi.fn(), onPortal: vi.fn(), onGoToPortal: vi.fn(), onNotes: vi.fn()}
function Wrapper({children}: {children: React.ReactNode}) {return <ClientsProvider><TooltipProvider>{children}</TooltipProvider></ClientsProvider>}
describe("ClientsTable pagination integration", () => {
  it("preserves selection across pages and only clears the current page", () => {
    const {rerender} = render(<ClientsTable clients={[ana]} loading={false} {...actions} />, {wrapper: Wrapper})
    fireEvent.click(screen.getByRole("checkbox", {name: "Seleccionar clientes de esta página"}))
    expect(screen.getByRole("checkbox", {name: "Seleccionar Ana"})).toBeChecked()
    rerender(<ClientsTable clients={[bob]} loading={false} {...actions} />)
    expect(screen.getByRole("checkbox", {name: "Seleccionar clientes de esta página"})).not.toBeChecked()
    fireEvent.click(screen.getByRole("checkbox", {name: "Seleccionar clientes de esta página"}))
    fireEvent.click(screen.getByRole("checkbox", {name: "Seleccionar clientes de esta página"}))
    expect(screen.getByRole("checkbox", {name: "Seleccionar Bob"})).not.toBeChecked()
    rerender(<ClientsTable clients={[ana]} loading={false} {...actions} />)
    expect(screen.getByRole("checkbox", {name: "Seleccionar Ana"})).toBeChecked()
  })
  it("keeps quick actions and dropdown actions attached to their client", async () => {
    render(<ClientsTable clients={[ana]} loading={false} {...actions} />, {wrapper: Wrapper})
    fireEvent.click(screen.getByRole("button", {name: "Notas Rápidas"}))
    expect(actions.onNotes).toHaveBeenCalledWith(ana)
    fireEvent.keyDown(screen.getByRole("button", {name: "Acciones del cliente"}), {key: "Enter"})
    fireEvent.click(await screen.findByRole("menuitem", {name: "clients.actions.manage"}))
    expect(actions.onManage).toHaveBeenCalledWith(ana)
  })
})
