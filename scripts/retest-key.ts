
import OpenAI from 'openai';

// The key provided by user in previous turn
const NEW_KEY = process.env.TEST_OPENAI_KEY || "YOUR_KEY_HERE";

const client = new OpenAI({
    apiKey: NEW_KEY,
});

async function main() {
    console.log("--- Re-Verifying API Key (V2) ---");
    console.log(`Key being tested: ${NEW_KEY.slice(0, 10)}...${NEW_KEY.slice(-5)}`);

    try {
        const start = Date.now();
        const completion = await client.chat.completions.create({
            messages: [{ role: 'user', content: 'Say "Working"' }],
            model: 'gpt-4o-mini',
        });
        const duration = Date.now() - start;
        console.log(`✅ Success! (${duration}ms)`);
        console.log(`   Response: "${completion.choices[0].message.content}"`);
    } catch (error: any) {
        console.log("❌ Failed:", error.message);
        if (error.code === 'insufficient_quota') {
            console.log("CRITICAL: The key is indeed exhausted (429).");
        }
    }
}

main();
