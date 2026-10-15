import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import HostingPage from "./page"

vi.mock("@/modules/features/hosting/actions", () => ({
  getHostingAccounts: vi.fn(async () => Array.from({ length: 31 }, (_, index) => ({
    id: String(index), domain_url: `site-${index}.example`, provider_name: "Proveedor",
    plan_name: "Plan", status: "active", renewal_date: null, client: null,
  }))),
  deleteHostingAccount: vi.fn(),
}))
vi.mock("@/modules/features/hosting/components/create-hosting-sheet", () => ({ CreateHostingSheet: () => null }))
vi.mock("@/components/layout/section-header", () => ({ SectionHeader: ({ title }: { title: string }) => <div>{title}</div> }))

afterEach(cleanup)

describe("hosting accounts table", () => {
  it("shows its own pagination footer and pages the filtered account rows", async () => {
    render(<HostingPage />)
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Mostrando 1 - 25 de 31 registros"))
    expect(screen.getByText("site-0.example")).toBeInTheDocument()
    expect(screen.queryByText("site-25.example")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }))
    expect(screen.getByRole("status")).toHaveTextContent("Mostrando 26 - 31 de 31 registros")
    expect(screen.getByText("site-25.example")).toBeInTheDocument()
    expect(screen.queryByText("site-0.example")).not.toBeInTheDocument()
  })
})