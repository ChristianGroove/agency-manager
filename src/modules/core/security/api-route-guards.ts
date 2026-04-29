import { NextResponse } from "next/server"

type HeaderReadableRequest = Pick<Request, "headers">

function isProductionLike() {
    return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production"
}

function unauthorizedResponse() {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export function requireNonProductionRoute() {
    if (!isProductionLike()) return null

    return NextResponse.json({ error: "Not found" }, { status: 404 })
}

export function requireBearerSecret(
    request: HeaderReadableRequest,
    envName: string
) {
    const expectedSecret = process.env[envName]

    if (!expectedSecret) {
        if (isProductionLike()) {
            console.error(`[API Guard] ${envName} is required for this route in production.`)
            return unauthorizedResponse()
        }

        return null
    }

    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${expectedSecret}`) {
        return unauthorizedResponse()
    }

    return null
}

export function requireCronSecret(request: HeaderReadableRequest) {
    return requireBearerSecret(request, "CRON_SECRET")
}
