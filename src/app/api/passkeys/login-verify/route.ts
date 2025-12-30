// Login Verify Route
// Verifies WebAuthn authentication response and signs in user

import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/types'
import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const body = await request.json()
        const credential: AuthenticationResponseJSON = body.credential
        const email: string = body.email

        if (!email || !credential) {
            return NextResponse.json(
                { error: 'Email and credential required' },
                { status: 400 }
            )
        }

        // Get stored challenge
        const { data: challengeData, error: challengeError } = await supabase
            .from('passkey_challenges')
            .select('*')
            .eq('email', email)
            .eq('type', 'authentication')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (challengeError || !challengeData) {
            return NextResponse.json(
                { error: 'Challenge not found or expired' },
                { status: 400 }
            )
        }

        // Check if challenge is expired
        if (new Date(challengeData.expires_at) < new Date()) {
            return NextResponse.json(
                { error: 'Challenge expired' },
                { status: 400 }
            )
        }

        // Get passkey from database
        const credentialIDBase64 = credential.id
        const { data: passkey, error: passkeyError } = await supabase
            .from('user_passkeys')
            .select('*')
            .eq('credential_id', credentialIDBase64)
            .single()

        if (passkeyError || !passkey) {
            return NextResponse.json(
                { error: 'Passkey not found' },
                { status: 404 }
            )
        }

        // Get RP configuration
        const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost'
        const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        // Verify authentication response
        const verification = await verifyAuthenticationResponse({
            response: credential,
            expectedChallenge: challengeData.challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: {
                credentialID: passkey.credential_id,
                credentialPublicKey: new Uint8Array(Buffer.from(passkey.credential_public_key, 'base64')),
                counter: passkey.counter,
            },
        })

        if (!verification.verified) {
            return NextResponse.json(
                { error: 'Verification failed' },
                { status: 400 }
            )
        }

        // Update counter and last_used_at
        await supabase
            .from('user_passkeys')
            .update({
                counter: verification.authenticationInfo.newCounter,
                last_used_at: new Date().toISOString(),
            })
            .eq('id', passkey.id)

        // Delete used challenge
        await supabase
            .from('passkey_challenges')
            .delete()
            .eq('id', challengeData.id)

        // Get user data to create session
        const { data: userData } = await supabase.auth.admin.listUsers()
        const user = userData?.users?.find(u => u.id === passkey.user_id)

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        // Create session token
        // Note: This is a simplified approach. In production, you'd want to use
        // Supabase's signInWithPassword or create a custom JWT
        const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: user.email!,
        })

        if (sessionError || !sessionData) {
            return NextResponse.json(
                { error: 'Failed to create session' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            verified: true,
            session: sessionData,
            user: {
                id: user.id,
                email: user.email,
            },
        })
    } catch (error) {
        console.error('Authentication verification error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
