import { loadEnvConfig } from '@next/env';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

loadEnvConfig(process.cwd());

async function check() {
  console.log('ENV CHECK:');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'EXISTS' : 'NONE');
  console.log('POSTGRES_URL:', process.env.POSTGRES_URL ? 'EXISTS' : 'NONE');
  console.log('SUPABASE_DB_URL:', process.env.SUPABASE_DB_URL ? 'EXISTS' : 'NONE');

  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.SUPABASE_DB_URL,
    'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    'postgresql://postgres:postgres@localhost:54322/postgres',
    'postgresql://postgres:postgres@127.0.0.1:5432/postgres',
    'postgresql://postgres:postgres@localhost:5432/postgres',
    'postgresql://postgres:postgres@127.0.0.1:6543/postgres',
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    try {
      console.log('Trying connection:', c.replace(/:[^:@]+@/, ':***@'));
      const sql = postgres(c, { max: 1, connect_timeout: 3 });
      const res = await sql`SELECT 1 as connected`;
      console.log('✅ Connected successfully to:', c.replace(/:[^:@]+@/, ':***@'), res);
      await sql.end();
      return c;
    } catch (e: any) {
      console.log('❌ Failed:', e.message);
    }
  }
}

check();
