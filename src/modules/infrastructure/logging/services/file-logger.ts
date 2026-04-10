
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'debug-automation.log');

export const fileLogger = {
    log: (message: string, data?: any) => {
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] ${message} ${data ? JSON.stringify(data) : ''}\n`;
        try {
            fs.appendFileSync(LOG_FILE, logLine);
            // Also log to console for dev
            console.log(message, data || '');
        } catch (e) {
            console.error('Failed to write to log file', e);
        }
    },
    clear: () => {
        try {
            fs.writeFileSync(LOG_FILE, '');
        } catch (e) { }
    },
    read: () => {
        try {
            if (!fs.existsSync(LOG_FILE)) return 'No logs yet.';
            return fs.readFileSync(LOG_FILE, 'utf-8');
        } catch (e) {
            return `Error reading log: ${e}`;
        }
    }
};
