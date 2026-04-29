import { afterEach, describe, expect, it, vi } from "vitest"
import {
    requireBearerSecret,
    requireCronSecret,
    requireNonProductionRoute,
} from "./api-route-guards"

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

describe("api route guards", () => {
    afterEach(() => {
        vi.restoreAllMocks()
        restoreEnv()
    })

    it("blocks local-only routes in production-like environments", async () => {
        process.env.VERCEL_ENV = "production"

        const response = requireNonProductionRoute()

        expect(response?.status).toBe(404)
        await expect(response?.json()).resolves.toEqual({ error: "Not found" })
    })

    it("allows local-only routes outside production-like environments", () => {
        delete process.env.VERCEL_ENV

        expect(requireNonProductionRoute()).toBeNull()
    })

    it("fails closed when a required production secret is missing", async () => {
        process.env.VERCEL_ENV = "production"
        delete process.env.CRON_SECRET
        vi.spyOn(console, "error").mockImplementation(() => undefined)

        const response = requireCronSecret(new Request("https://pixy.test/api/cron/billing"))

        expect(response?.status).toBe(401)
        await expect(response?.json()).resolves.toEqual({ error: "Unauthorized" })
    })

    it("rejects requests with missing or invalid bearer credentials", async () => {
        process.env.CRON_SECRET = "secret-value"

        const missing = requireCronSecret(new Request("https://pixy.test/api/cron/billing"))
        const invalid = requireCronSecret(new Request("https://pixy.test/api/cron/billing", {
            headers: { authorization: "Bearer wrong-value" },
        }))

        expect(missing?.status).toBe(401)
        expect(invalid?.status).toBe(401)
    })

    it("allows requests with the expected bearer secret", () => {
        process.env.CRON_SECRET = "secret-value"

        const response = requireCronSecret(new Request("https://pixy.test/api/cron/billing", {
            headers: { authorization: "Bearer secret-value" },
        }))

        expect(response).toBeNull()
    })

    it("allows missing secrets in non-production environments for local development", () => {
        delete process.env.VERCEL_ENV
        delete process.env.CRON_SECRET

        const response = requireBearerSecret(
            new Request("https://pixy.test/api/cron/billing"),
            "CRON_SECRET"
        )

        expect(response).toBeNull()
    })
})
