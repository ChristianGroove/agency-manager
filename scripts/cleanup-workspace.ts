import fs from 'fs';
import path from 'path';

/**
 * Cleanup Workspace Script
 * Safely removes logs, temporary files, and build artifacts that accumulate over time.
 */

const targetFiles = [
    'debug-automation.log',
    'ngrok.log',
    'build_output.log',
    'build_output_utf8.log',
    'npm-debug.log',
    'yarn-error.log'
];

const targetDirs = [
    'tmp',
    'coverage',
    '.next/cache'
];

const rootDir = process.cwd();

console.log('🧹 Starting workspace cleanup...');

let totalFilesRemoved = 0;
let totalDirsRemoved = 0;

// Remove specific files
targetFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            console.log(`✅ Removed file: ${file}`);
            totalFilesRemoved++;
        } catch (err) {
            console.error(`❌ Error removing file ${file}:`, err);
        }
    }
});

// Remove specific directories
targetDirs.forEach(dir => {
    const dirPath = path.join(rootDir, dir);
    if (fs.existsSync(dirPath)) {
        try {
            fs.rmSync(dirPath, { recursive: true, force: true });
            console.log(`✅ Removed directory: ${dir}`);
            totalDirsRemoved++;
        } catch (err) {
            console.error(`❌ Error removing directory ${dir}:`, err);
        }
    }
});

// Remove any and all .log files in the root
const rootFiles = fs.readdirSync(rootDir);
rootFiles.forEach(file => {
    if (file.endsWith('.log') && !targetFiles.includes(file)) {
        const filePath = path.join(rootDir, file);
        try {
            fs.unlinkSync(filePath);
            console.log(`✅ Removed extra log file: ${file}`);
            totalFilesRemoved++;
        } catch (err) {
            console.error(`❌ Error removing log file ${file}:`, err);
        }
    }
});

console.log('---');
console.log(`✨ Cleanup finished! Removed ${totalFilesRemoved} files and ${totalDirsRemoved} directories.`);
console.log('🚀 Your workspace is now fresh and clean.');
