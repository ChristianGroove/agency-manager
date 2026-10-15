import React, { Fragment, useState } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PaginatedDataTable } from "./paginated-data-table"
import { TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "./table"
import { BulkActionsFloatingBar } from "@/modules/core/ui/components/bulk-actions-floating-bar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu"
afterEach(cleanup)
const records = Array.from({length: 31}, (_, id) => ({id: String(id), name: "Registro " + id}))
function SelectionTable({onDelete, onOpen}: {onDelete: (ids: string[]) => void; onOpen: (id: string) => void}) {
  const [selected, setSelected] = useState(new Set<string>())
  return <>
    <BulkActionsFloatingBar selectedCount={selected.size} onDelete={() => onDelete([...selected])} onClearSelection={() => setSelected(new Set())} />
    <PaginatedDataTable>
      <TableHeader><TableRow><TableHead><input type="checkbox" aria-label="Seleccionar todos los resultados" checked={selected.size === records.length} onChange={() => setSelected(selected.size === records.length ? new Set() : new Set(records.map(row => row.id)))} /></TableHead><TableHead>Registro</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
      <TableBody>{records.map(row => <TableRow key={row.id}>
        <TableCell><input type="checkbox" aria-label={"Seleccionar " + row.id} checked={selected.has(row.id)} onChange={() => setSelected(previous => {const next = new Set(previous); if(next.has(row.id)) next.delete(row.id); else next.add(row.id); return next})} /></TableCell>
        <TableCell>{row.name}</TableCell>
        <TableCell><DropdownMenu><DropdownMenuTrigger asChild><button aria-label={"Acciones " + row.id}>Abrir</button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => onOpen(row.id)}>Editar registro</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
      </TableRow>)}</TableBody>
    </PaginatedDataTable>
  </>
}
describe("standard local table adapter", () => {
  it("preserves selections across pages and sends exactly those IDs to the floating action", () => {
    const onDelete = vi.fn()
    render(<SelectionTable onDelete={onDelete} onOpen={vi.fn()} />)
    fireEvent.click(screen.getByRole("checkbox", {name: "Seleccionar 0"}))
    fireEvent.click(screen.getByRole("button", {name: "Página siguiente"}))
    fireEvent.click(screen.getByRole("checkbox", {name: "Seleccionar 25"}))
    fireEvent.click(screen.getByRole("button", {name: "Eliminar selección"}))
    expect(onDelete).toHaveBeenCalledWith(["0", "25"])
    fireEvent.click(screen.getByRole("button", {name: "Página anterior"}))
    expect(screen.getByRole("checkbox", {name: "Seleccionar 0"})).toBeChecked()
    fireEvent.click(screen.getByRole("button", {name: "Cancelar selección"}))
    expect(screen.queryByRole("button", {name: "Eliminar selección"})).not.toBeInTheDocument()
  })
  it("preserves the caller's select-all scope across all filtered results", () => {
    const onDelete = vi.fn()
    render(<SelectionTable onDelete={onDelete} onOpen={vi.fn()} />)
    fireEvent.click(screen.getByRole("checkbox", {name: "Seleccionar todos los resultados"}))
    fireEvent.click(screen.getByRole("button", {name: "Página siguiente"}))
    expect(screen.getByRole("checkbox", {name: "Seleccionar 30"})).toBeChecked()
    fireEvent.click(screen.getByRole("button", {name: "Eliminar selección"}))
    expect(onDelete).toHaveBeenCalledWith(records.map(row => row.id))
  })
  it("keeps dropdown callbacks attached to the correct record on page two", async () => {
    const onOpen = vi.fn()
    render(<SelectionTable onDelete={vi.fn()} onOpen={onOpen} />)
    fireEvent.click(screen.getByRole("button", {name: "Página siguiente"}))
    fireEvent.keyDown(screen.getByRole("button", {name: "Acciones 25"}), {key:"Enter"})
    fireEvent.click(await screen.findByRole("menuitem", {name: "Editar registro"}))
    expect(onOpen).toHaveBeenCalledWith("25")
  })
  it("keeps expanded detail rows grouped with their record and leaves totals intact", () => {
    render(<PaginatedDataTable><tbody>{records.map(row => <Fragment key={row.id}><tr><td>{row.name}</td></tr><tr><td>{"Detalle " + row.id}</td></tr></Fragment>)}</tbody><TableFooter><TableRow><TableCell>Total completo</TableCell></TableRow></TableFooter></PaginatedDataTable>)
    expect(screen.getByText("Detalle 24")).toBeInTheDocument()
    expect(screen.queryByText("Detalle 25")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", {name: "Página siguiente"}))
    expect(screen.getByText("Registro 25")).toBeInTheDocument()
    expect(screen.getByText("Detalle 25")).toBeInTheDocument()
    expect(screen.getByText("Total completo")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Mostrando 26 - 31 de 31 registros")
  })
  it("keeps the empty placeholder without counting it as a record", () => {
    render(<PaginatedDataTable><TableBody><TableRow><TableCell colSpan={3}>Sin resultados</TableCell></TableRow></TableBody></PaginatedDataTable>)
    expect(screen.getByText("Sin resultados")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Mostrando 0 - 0 de 0 registros")
  })
})
