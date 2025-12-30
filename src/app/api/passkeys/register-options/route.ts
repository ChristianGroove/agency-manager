// Register Options Route
// Generates WebAuthn registration options for a user

import { generateRegistrationOptions } from '@simplewebauthn/server'
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get RP (Relying Party) configuration from environment
        const rpName = process.env.NEXT_PUBLIC_APP_NAME || 'Pixy Agency Manager'
        const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost'

        // Check existing passkeys for this user
        const { data: existingPasskeys } = await supabase
            .from('user_passkeys')
            .select('credential_id')
            .eq('user_id', user.id)

        // Generate registration options
        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userID: new Uint8Array(Buffer.from(user.id)),
            userName: user.email || user.id,
            userDisplayName: user.email || 'User',
            attestationType: 'none',
            excludeCredentials: existingPasskeys?.map(pk => ({
                id: pk.credential_id,
                type: 'public-key' as const,
            })) || [],
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform', // Prefer built-in authenticators (TouchID, Windows Hello)
            },
        })

        // Store challenge in database
        const { error: challengeError } = await supabase
            .from('passkey_challenges')
            .insert({
                challenge: options.challenge,
                user_id: user.id,
                type: 'registration',
            })

        if (challengeError) {
            console.error('Failed to store challenge:', challengeError)
            return NextResponse.json(
                { error: 'Failed to generate registration options' },
                { status: 500 }
            )
        }

        return NextResponse.json(options)
    } catch (error) {
        console.error('Registration options error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
