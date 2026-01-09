
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import https from 'https';

// The key provided by user
const NEW_KEY = process.env.TEST_OPENAI_KEY || "YOUR_KEY_HERE";

const client = new OpenAI({
    apiKey: NEW_KEY,
});

async function main() {
    console.log("--- Testing Whisper (Audio) Capability ---");

    // 1. Download a tiny sample audio file (for testing)
    const audioPath = path.join(process.cwd(), 'scripts', 'test.ogg');
    const file = fs.createWriteStream(audioPath);

    console.log("Downloading sample audio...");
    // A small beep or silence OGG file
    const audioUrl = "https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg";

    https.get(audioUrl, function (response) {
        response.pipe(file);
        file.on('finish', async function () {
            file.close();
            console.log("Download complete. Sending to OpenAI Whisper...");

            try {
                const start = Date.now();
                const transcription = await client.audio.transcriptions.create({
                    file: fs.createReadStream(audioPath),
                    model: 'whisper-1',
                });
                const duration = Date.now() - start;
                console.log(`✅ WHISPER SUCCESS! (${duration}ms)`);
                console.log(`   Transcription: "${transcription.text}"`);

                // Clean up
                fs.unlinkSync(audioPath);

            } catch (error: any) {
                console.log("\n❌ WHISPER FAILED:", error.message);
                if (error.code === 'insufficient_quota') {
                    console.log("\n➡️  CONCLUSION: This key works for Chat but has NO QUOTA for Audio/Whisper.");
                    console.log("   (OpenAI often requires a paid credit balance ($5+) to use Whisper, even if Chat is free/trial).");
                }
            }
        });
    });
}

main();
