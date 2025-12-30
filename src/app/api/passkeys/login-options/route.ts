// Login Options Route
// Generates WebAuthn authentication options

import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const body = await request.json()
        const email = body.email

        if (!email) {
            return NextResponse.json(
                { error: 'Email required' },
                { status: 400 }
            )
        }

        // Find user by email
        const { data: userData, error: userError } = await supabase.auth.admin.listUsers()

        const user = userData?.users?.find((u: any) => u.email === email)

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        // Get user's passkeys
        const { data: passkeys, error: passkeysError } = await supabase
            .from('user_passkeys')
            .select('credential_id, transports')
            .eq('user_id', user.id)

        if (passkeysError || !passkeys || passkeys.length === 0) {
            return NextResponse.json(
                { error: 'No passkeys registered for this user' },
                { status: 404 }
            )
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
        const { error: challengeError } = await supabase
            .from('passkey_challenges')
            .insert({
                challenge: options.challenge,
                user_id: user.id,
                email,
                type: 'authentication',
            })

        if (challengeError) {
            console.error('Failed to store challenge:', challengeError)
            return NextResponse.json(
                { error: 'Failed to generate authentication options' },
                { status: 500 }
            )
        }

        return NextResponse.json(options)
    } catch (error) {
        console.error('Authentication options error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
