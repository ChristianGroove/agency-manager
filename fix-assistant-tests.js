const fs = require('fs');
const files = [
    'src/modules/assistant/tests/assistant-voice-readiness.test.ts',
    'src/modules/assistant/tests/assistant-model-adapter.test.ts',
    'src/modules/assistant/tests/assistant-voice-runtime.test.ts'
];
for (const f of files) {
    if (!fs.existsSync(f)) continue;
    let file = fs.readFileSync(f, 'utf8');
    file = file.replace(
        'select: vi.fn().mockReturnThis(),',
        'select: vi.fn().mockReturnThis(),\n        auth: { getUser: vi.fn(async () => ({ data: { user: { id: "mock-user" } } })) },'
    );
    fs.writeFileSync(f, file);
}
console.log('Fixed assistant tests');
