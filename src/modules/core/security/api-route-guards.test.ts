import { afterEach, describe, expect, it, vi } from "vitest"
import { createClient } from "@/modules/core/database/supabase-server"
import {
    requireAuthenticatedUser,
    requireAuthenticatedUserOrCronSecret,
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

function mockAuthenticatedUser(user: unknown) {
    vi.mocked(createClient).mockResolvedValue({
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: { user },
                error: null,
            }),
        },
    } as never)
}

describe("api route guards", () => {
    afterEach(() => {
        vi.restoreAllMocks()
        vi.mocked(createClient).mockReset()
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

    it("rejects unauthenticated users for internal authenticated routes", async () => {
        vi.mocked(createClient).mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                    error: null,
                }),
            },
        } as never)

        const response = await requireAuthenticatedUser()

        expect(response?.status).toBe(401)
        await expect(response?.json()).resolves.toEqual({ error: "Unauthorized" })
    })

    it("allows authenticated users for internal authenticated routes", async () => {
        mockAuthenticatedUser({ id: "user-1" })

        const response = await requireAuthenticatedUser()

        expect(response).toBeNull()
    })

    it("allows internal tools with either cron secret or authenticated user", async () => {
        process.env.VERCEL_ENV = "production"
        process.env.CRON_SECRET = "secret-value"

        const secretResponse = await requireAuthenticatedUserOrCronSecret(
            new Request("https://pixy.test/api/marketing/run", {
                headers: { authorization: "Bearer secret-value" },
            })
        )

        expect(secretResponse).toBeNull()
        expect(createClient).not.toHaveBeenCalled()

        delete process.env.CRON_SECRET
        mockAuthenticatedUser({ id: "user-1" })

        const userResponse = await requireAuthenticatedUserOrCronSecret(
            new Request("https://pixy.test/api/marketing/run")
        )

        expect(userResponse).toBeNull()
    })
})
