import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'" }
const tokenFrom = (req: NextRequest) => { const token = req.nextUrl.searchParams.get('token'); return token && /^[a-f0-9]{64}$/.test(token) ? token : null }
export async function GET(req: NextRequest) {
    const token = tokenFrom(req)
    if (!token) return new NextResponse('Enlace no válido.', { status: 400, headers })
    // Link scanners and previews must not revoke permission by issuing a GET.
    return new NextResponse(`<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dejar de recibir correos</title><body style="font-family:Arial;max-width:480px;margin:64px auto;padding:24px"><h1>Dejar de recibir correos</h1><p>Confirma para detener los correos comerciales de esta empresa. No cambia tus otras comunicaciones.</p><form method="post" action="?token=${token}"><button type="submit">Confirmar baja</button></form></body></html>`,
        { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } })
}
export async function POST(req: NextRequest) {
    const token = tokenFrom(req)
    if (!token) return new NextResponse('Enlace no válido.', { status: 400, headers })
    const result = await supabaseAdmin.rpc('unsubscribe_marketing_email', { p_hash: createHash('sha256').update(token).digest('hex') })
    if (result.error) return new NextResponse('No se pudo guardar la baja. Intenta nuevamente.', { status: 503, headers })
    if (result.data !== true) return new NextResponse('Enlace no válido.', { status: 400, headers })
    return new NextResponse('Baja registrada. No recibirás más correos comerciales de esta empresa.', { headers })
}
