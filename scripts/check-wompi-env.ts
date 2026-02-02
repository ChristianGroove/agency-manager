
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function check() {
    console.log("--- Wompi Diagnostic ---");
    const secret = process.env.WOMPI_INTEGRITY_SECRET;
    const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;

    console.log(`WOMPI_INTEGRITY_SECRET Present: ${!!secret}`);
    if (secret) console.log(`WOMPI_INTEGRITY_SECRET Length: ${secret.length}`);

    console.log(`NEXT_PUBLIC_WOMPI_PUBLIC_KEY Present: ${!!publicKey}`);
    if (publicKey) console.log(`NEXT_PUBLIC_WOMPI_PUBLIC_KEY: ${publicKey.slice(0, 10)}...`);

    // Test Signature Generation (USD)
    const reference = 'TEST-REF-123';
    const amountInCents = 2900;
    const currency = 'USD';
    const raw = `${reference}${amountInCents}${currency}${secret || ''}`;
    const sig = crypto.createHash('sha256').update(raw).digest('hex');
    console.log(`Test Signature (USD): ${sig}`);

    // Test Signature Generation (COP)
    const currencyCOP = 'COP';
    const rawCOP = `${reference}${amountInCents}${currencyCOP}${secret || ''}`;
    const sigCOP = crypto.createHash('sha256').update(rawCOP).digest('hex');
    console.log(`Test Signature (COP): ${sigCOP}`);
}

check();
