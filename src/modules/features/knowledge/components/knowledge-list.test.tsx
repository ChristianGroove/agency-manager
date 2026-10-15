import React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { KnowledgeList } from "./knowledge-list"
import type { KnowledgeEntry } from "../knowledge-actions"
vi.mock("@/modules/core/ui/components/search-filter-bar", () => ({SearchFilterBar: ({searchTerm, onSearchChange}: {searchTerm: string; onSearchChange: (value: string) => void}) => <input aria-label="Buscar conocimiento" value={searchTerm} onChange={event => onSearchChange(event.target.value)} />}))
afterEach(cleanup)
const data = Array.from({length: 30}, (_, index) => ({id: String(index), question: "Pregunta " + index, answer: "Respuesta " + index, category: "General", source: "manual", created_at: "2026-10-15T12:00:00Z"})) as KnowledgeEntry[]
describe("KnowledgeList standard table", () => {
  it("paginates filtered results and resets when searching from a later page", () => {
    render(<KnowledgeList data={data} onDelete={vi.fn()} onEdit={vi.fn()} />)
    expect(screen.getByText("Pregunta 0")).toBeInTheDocument()
    expect(screen.queryByText("Pregunta 25")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", {name: "Página siguiente"}))
    expect(screen.getByText("Pregunta 25")).toBeInTheDocument()
    fireEvent.change(screen.getByRole("textbox", {name: "Buscar conocimiento"}), {target: {value: "Pregunta 1"}})
    expect(screen.getByText("Pregunta 1")).toBeInTheDocument()
    expect(screen.getByLabelText("Página 1 de 1")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Mostrando 1 - 11 de 11 entradas")
  })
  it("keeps dropdown edit actions attached to rows on the next page", async () => {
    const onEdit = vi.fn()
    render(<KnowledgeList data={data} onDelete={vi.fn()} onEdit={onEdit} />)
    fireEvent.click(screen.getByRole("button", {name: "Página siguiente"}))
    fireEvent.keyDown(screen.getAllByRole("button", {name: "Acciones de la entrada"})[0], {key: "Enter"})
    fireEvent.click(await screen.findByRole("menuitem", {name: "Editar"}))
    expect(onEdit).toHaveBeenCalledWith(data[25])
  })
})
