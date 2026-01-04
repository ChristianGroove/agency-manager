
// Native fetch is available in Node 18+

async function triggerAgencyFlow() {
    console.log('[Test] Triggering Agency Flow...');

    const response = await fetch('http://localhost:3000/api/debug/trigger-test', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: "Hola, estoy interesado en sus servicios de marketing digital",
            conversationId: "conv_agency_test_123", // Mock ID
            channel: "whatsapp",
            sender: "555-000-AGENCY",
            leadId: "lead_temp_123"
        }),
    });

    if (response.ok) {
        console.log('[Test] HTTP Trigger Sent (200 OK)');
        const json = await response.json();
        console.log('[Test] Response:', json);
    } else {
        const text = await response.text();
        console.error('[Test] HTTP Error:', response.status, text);
    }
}

// Check environments where fetch might be missing (older node)
if (!globalThis.fetch) {
    console.error("Fetch API not found. Please use Node 18+");
    process.exit(1);
}

triggerAgencyFlow();
