import { afterEach, describe, expect, it, vi } from "vitest"

const originalVercelEnv = process.env.VERCEL_ENV
const originalCronSecret = process.env.CRON_SECRET

function restoreEnv() {
    if (originalVercelEnv === undefined) {
        delete process.env.VERCEL_ENV
    } else {
        process.env.VERCEL_ENV = originalVercelEnv
    }

    if (originalCronSecret === undefined) {
        delete process.env.CRON_SECRET
    } else {
        process.env.CRON_SECRET = originalCronSecret
    }
}

describe("dangerous API route hardening", () => {
    afterEach(() => {
        vi.restoreAllMocks()
        restoreEnv()
    })

    it("blocks seed routes before they can mutate production data", async () => {
        process.env.VERCEL_ENV = "production"
        const { GET } = await import("@/app/api/seed/route")

        const response = await GET()

        expect(response.status).toBe(404)
        await expect(response.json()).resolves.toEqual({ error: "Not found" })
    })

    it("requires cron credentials before billing cron can run in production", async () => {
        process.env.VERCEL_ENV = "production"
        delete process.env.CRON_SECRET
        vi.spyOn(console, "error").mockImplementation(() => undefined)
        const { GET } = await import("@/app/api/cron/billing/route")

        const response = await GET(new Request("https://pixy.test/api/cron/billing"))

        expect(response.status).toBe(401)
        await expect(response.json()).resolves.toEqual({ error: "Unauthorized" })
    })
})
