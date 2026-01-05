
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function diagnose() {
    console.log('🔍 Starting Email System Diagnosis...');

    // 1. Check Env Vars
    console.log('\n1. Checking Environment Variables...');
    const vars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
    let missing = false;
    vars.forEach(v => {
        if (!process.env[v]) {
            console.error(`   ❌ Missing: ${v}`);
            missing = true;
        } else {
            console.log(`   ✅ Found: ${v}`);
        }
    });

    if (missing) {
        console.error('   ⚠️ Cannot proceed without env vars.');
        return;
    }

    // 2. Check Supabase / DB
    console.log('\n2. Checking Database (email_templates)...');
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Try to fetch 1 template
    const { data, error } = await sb.from('email_templates').select('slug').limit(1);

    if (error) {
        console.error(`   ❌ Database Error: ${error.message}`);
        console.error(`   👉 HINT: Did you run the '20260105_email_templates.sql' migration?`);
    } else {
        console.log(`   ✅ Table 'email_templates' exists.`);
        console.log(`   ℹ️  Found ${data.length} templates.`);
    }

    // 3. Check SMTP
    console.log('\n3. Checking SMTP Connection...');
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: true, // Assuming 465
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 5000,
    });

    try {
        await transporter.verify();
        console.log(`   ✅ SMTP Connection Successful to ${process.env.SMTP_HOST}`);
    } catch (smtpError: any) {
        console.error(`   ❌ SMTP Connection Failed: ${smtpError.message}`);
        if (smtpError.code === 'EAUTH') console.error('      👉 Check your username/password.');
        if (smtpError.code === 'ETIMEDOUT') console.error('      👉 Connection timed out. Check firewall/port.');
    }

    console.log('\nDone.');
}

diagnose().catch(console.error);
