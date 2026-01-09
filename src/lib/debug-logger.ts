"use server"
import * as fs from 'fs';
import * as path from 'path';

export async function logDebug(message: string, data?: any) {
    const logPath = path.join(process.cwd(), 'debug_quote.log');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message} ${data ? JSON.stringify(data, null, 2) : ''}\n`;

    try {
        await fs.promises.appendFile(logPath, logEntry);
    } catch (e) {
        console.error("Failed to write log", e);
    }
}
