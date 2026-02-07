
const now = Date.now();

function checkMatch(triggerType, lastAutoReply, resolvedAt) {
    const isSessionExpired = lastAutoReply === 0 ||
        resolvedAt > lastAutoReply ||
        (now - lastAutoReply) > (12 * 60 * 60 * 1000);

    const isEcho = lastAutoReply > 0 && (now - lastAutoReply) < 2000;

    if (isEcho) return "SKIP (ECHO)";

    // For catch-all triggers (message_received, webhook, first_contact)
    return isSessionExpired ? "MATCH" : "SKIP (ACTIVE SESSION)";
}

console.log('--- Verifying Enhanced Trigger Recurrence Logic ---');

const tests = [
    { name: 'Initial Contact', lastReply: 0, resolvedAt: 0, expected: 'MATCH' },
    { name: 'Same Session Message', lastReply: now - 30000, resolvedAt: now - 60000, expected: 'SKIP (ACTIVE SESSION)' },
    { name: 'Echo Prevention (2s)', lastReply: now - 1000, resolvedAt: 0, expected: 'SKIP (ECHO)' },
    { name: 'Recurrence after Manual Resolve', lastReply: now - 10000, resolvedAt: now - 5000, expected: 'MATCH' },
    { name: 'Recurrence after 12h Cooldown', lastReply: now - (13 * 60 * 60 * 1000), resolvedAt: 0, expected: 'MATCH' }
];

tests.forEach(t => {
    const result = checkMatch('any', t.lastReply, t.resolvedAt);
    const status = result === t.expected ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | ${t.name.padEnd(35)}: Result=${result}`);
});
