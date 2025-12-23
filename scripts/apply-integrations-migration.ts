
import { Client } from 'pg'
import fs from 'fs'
import path from 'path'

const dbUrl = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres'

async function applyMigration() {
    console.log('🔌 Connecting to database...')
    const client = new Client({
        connectionString: dbUrl,
    })

    try {
        await client.connect()
        console.log('✅ Connected.')

        const sqlPath = path.join(process.cwd(), 'supabase', 'integrations.sql')
        const sql = fs.readFileSync(sqlPath, 'utf8')

        console.log('🛠️ Applying migration: integrations.sql...')
        await client.query(sql)
        console.log('✅ Migration applied successfully.')

    } catch (error) {
        console.error('❌ Error executing SQL:', error)
    } finally {
        await client.end()
        console.log('🔌 Disconnected.')
    }
}

applyMigration()
