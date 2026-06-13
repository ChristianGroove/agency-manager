// Login Options Route
// Generates WebAuthn authentication options

import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { NextRequest, NextResponse } from 'next/server'
import { logPasskeyRouteError, normalizePasskeyEmail, passkeyLoginUnavailableResponse, requirePasskeyPublicRateLimit } from '../_utils'
import { createClient } from "@/modules/core/database/supabase-server";

export async function POST(request: NextRequest) {
    const rateLimited = requirePasskeyPublicRateLimit(request)
    if (rateLimited) return rateLimited

    try {
        const body = await request.json()
        const email = normalizePasskeyEmail(body.email)

        if (!email) {
            return NextResponse.json(
                { error: 'Email required' },
                { status: 400 }
            )
        }

        // Find user by email
        const { data: userData, error: userError } = await (await createClient()).auth.admin.listUsers()

        if (userError) {
            logPasskeyRouteError('Failed to list users for passkey login:', userError)
            return NextResponse.json(
                { error: 'Failed to generate authentication options' },
                { status: 500 }
            )
        }

        const user = userData?.users?.find((u: any) => u.email?.toLowerCase() === email)

        if (!user) {
            return passkeyLoginUnavailableResponse()
        }

        // Get user's passkeys
        const { data: passkeys, error: passkeysError } = await (await createClient())
            .from('user_passkeys')
            .select('credential_id, transports')
            .eq('user_id', user.id)

        if (passkeysError || !passkeys || passkeys.length === 0) {
            return passkeyLoginUnavailableResponse()
        }

        // Get RP configuration
        const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost'

        // Generate authentication options
        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials: passkeys.map((pk: any) => ({
                id: pk.credential_id,
                type: 'public-key' as const,
                transports: pk.transports as AuthenticatorTransport[] | undefined,
            })),
            userVerification: 'preferred',
        })

        // Store challenge
        const { error: challengeError } = await (await createClient())
            .from('passkey_challenges')
            .insert({
                challenge: options.challenge,
                user_id: user.id,
                email,
                type: 'authentication',
            })

        if (challengeError) {
            logPasskeyRouteError('Failed to store challenge:', challengeError)
            return NextResponse.json(
                { error: 'Failed to generate authentication options' },
                { status: 500 }
            )
        }

        return NextResponse.json(options)
    } catch (error) {
        logPasskeyRouteError('Authentication options error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
