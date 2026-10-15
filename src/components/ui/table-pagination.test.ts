import { describe, expect, it } from "vitest"
import { getPaginationRange, parseTablePage, parseTablePageSize } from "./table-pagination"
describe("table pagination", () => {
  it("uses safe defaults for malformed URL parameters", () => {
    for (const value of [undefined, "", "NaN", "-1", "0", "1.5", "Infinity", ["2"]]) expect(parseTablePage(value)).toBe(1)
    for (const value of [undefined, "10", "0", "-25", "Infinity", ["50"]]) expect(parseTablePageSize(value)).toBe(25)
    expect(parseTablePage("3")).toBe(3)
    expect(parseTablePageSize("50")).toBe(50)
    expect(parseTablePageSize("100")).toBe(100)
  })
  it("represents an empty table and disables navigation through its bounds", () => {
    expect(getPaginationRange(0, 9, 25)).toEqual({totalPages: 1, safePage: 1, startRecord: 0, endRecord: 0})
  })
  it("clamps a page after deleting the final row or narrowing results", () => {
    expect(getPaginationRange(26, 2, 25)).toEqual({totalPages: 2, safePage: 2, startRecord: 26, endRecord: 26})
    expect(getPaginationRange(25, 2, 25)).toEqual({totalPages: 1, safePage: 1, startRecord: 1, endRecord: 25})
  })
  it("handles page-size changes and partial final pages", () => {
    expect(getPaginationRange(101, 3, 50)).toEqual({totalPages: 3, safePage: 3, startRecord: 101, endRecord: 101})
    expect(getPaginationRange(101, 3, 100)).toEqual({totalPages: 2, safePage: 2, startRecord: 101, endRecord: 101})
  })
})
