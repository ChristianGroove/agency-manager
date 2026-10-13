// Dedicated reviewed-candidate pilot. It refuses any remote Supabase configuration.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import dotenv from 'dotenv'

const root = fs.realpathSync(process.cwd())
const env = { ...process.env, ...dotenv.parse(fs.readFileSync(path.join(root, '.env.local'))) }
for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL']) {
    if (env[key]) {
        const url = new URL(env[key])
        if (url.hostname !== '127.0.0.1' || url.port !== '55321') throw new Error('Verified local Supabase API 55321 required')
    }
}
if (!env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('Missing local Supabase API configuration')
for (const key of ['SUPABASE_DB_URL', 'DATABASE_URL']) {
    if (env[key]) {
        const url = new URL(env[key])
        if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '55322') throw new Error('Local database 55322 required')
    }
}
if (!fs.existsSync(path.join(root, '.next/BUILD_ID'))) throw new Error('Build the candidate before starting this pilot')
env.NODE_ENV = 'production'
env.NEXT_PUBLIC_APP_URL = 'http://127.0.0.1:3005'
env.NEXT_PUBLIC_SITE_URL = env.NEXT_PUBLIC_APP_URL
env.PIXY_HELP_V2_ENABLED = 'true'
env.PIXY_HELP_V2_TENANTS = 'db9d1288-80ab-48df-b130-a0739881c6f2,91aa45c4-a7c4-4af6-96df-5f0fb1a35af7'
env.PIXY_HELP_TASKS_PORTAL_ENABLED = 'true'
env.PIXY_HELP_TASKS_PORTAL_TENANTS = '91aa45c4-a7c4-4af6-96df-5f0fb1a35af7'
env.PIXY_HELP_DIAGNOSTICS_ENABLED = 'true'
console.log('Help release candidate: localhost:3005, Supabase local:55321. Dashboard: Pixy/Movilservicios; portal: Movilservicios.')
const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3005'], { cwd: root, env, stdio: 'inherit' })
child.on('error', () => { console.error('Could not start the local candidate'); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
