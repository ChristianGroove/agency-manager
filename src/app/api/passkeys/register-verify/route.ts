// Verify Registration Route
// Verifies WebAuthn registration response and stores credential

import { verifyRegistrationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/types'
import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const credential: RegistrationResponseJSON = body.credential
        const deviceName: string = body.deviceName || 'Unnamed Device'

        // Get stored challenge
        const { data: challengeData, error: challengeError } = await supabase
            .from('passkey_challenges')
            .select('*')
            .eq('user_id', user.id)
            .eq('type', 'registration')
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

        // Get RP configuration
        const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost'
        const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        // Verify registration response
        const verification = await verifyRegistrationResponse({
            response: credential,
            expectedChallenge: challengeData.challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        })

        if (!verification.verified || !verification.registrationInfo) {
            return NextResponse.json(
                { error: 'Verification failed' },
                { status: 400 }
            )
        }

        const { credentialID, credentialPublicKey, counter } = verification.registrationInfo

        // Store credential in database
        const { error: insertError } = await supabase
            .from('user_passkeys')
            .insert({
                user_id: user.id,
                credential_id: Buffer.from(credentialID).toString('base64url'),
                credential_public_key: Buffer.from(credentialPublicKey).toString('base64'),
                counter,
                device_name: deviceName,
                device_type: 'platform',
                transports: credential.response.transports || [],
            })

        if (insertError) {
            console.error('Failed to store credential:', insertError)
            return NextResponse.json(
                { error: 'Failed to store credential' },
                { status: 500 }
            )
        }

        // Delete used challenge
        await supabase
            .from('passkey_challenges')
            .delete()
            .eq('id', challengeData.id)

        return NextResponse.json({
            verified: true,
            message: 'Passkey registered successfully',
        })
    } catch (error) {
        console.error('Registration verification error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
