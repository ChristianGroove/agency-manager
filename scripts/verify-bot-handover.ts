
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runTest() {
    console.log('--- STARTING BOT HANDOVER TEST ---')
    
    // Dynamic imports to wait for dotenv
    const { inboxService } = await import('../src/modules/core/messaging/inbox-service');
    const { transferConversation } = await import('../src/modules/core/messaging/transfer-service');
    const { supabaseAdmin } = await import('../src/lib/supabase-admin');

    const testPhone = '1234567890'
    
    // Cleanup if exists
    await supabaseAdmin.from('conversations').delete().eq('phone', testPhone);
    await supabaseAdmin.from('leads').delete().eq('phone', testPhone);

    console.log('1. Simulating INBOUND message from user...')
    const inboundMsg = {
        id: 'test_inbound_1',
        externalId: 'test_inbound_1_ext',
        channel: 'whatsapp' as any,
        from: testPhone,
        senderName: 'Test User',
        content: { type: 'text', text: 'Hola bot' },
        timestamp: new Date(),
        origin: 'inbound' as any,
        metadata: {}
    }
    
    const res1 = await inboxService.handleIncomingMessage(inboundMsg)
    const convId = res1?.conversationId
    console.log('Conversation ID:', convId)
    
    let { data: conv1 } = await supabaseAdmin.from('conversations').select('is_bot_active, assigned_to').eq('id', convId).single()
    console.log('Status after inbound:', conv1?.is_bot_active ? '🤖 BOT ACTIVE' : '👤 HUMAN ACTIVE')
    
    console.log('\n2. Simulating OUTBOUND message from AGENT...')
    await inboxService.saveOutboundMessage(convId, 'Hola usuario, soy un agente', 'test_outbound_1_ext', 'Agent')
    
    let { data: conv2 } = await supabaseAdmin.from('conversations').select('is_bot_active, assigned_to').eq('id', convId).single()
    console.log('Status after agent reply:', conv2?.is_bot_active ? '🤖 BOT ACTIVE' : '👤 HUMAN ACTIVE')

    console.log('\n3. Simulating ECHO from Meta (identifying as outbound)...')
    const echoMsg = {
        id: 'test_echo_1',
        externalId: 'test_outbound_1_ext', 
        channel: 'whatsapp' as any,
        from: testPhone,
        content: { type: 'text', text: 'Hola usuario, soy un agente' },
        timestamp: new Date(),
        origin: 'outbound' as any, 
        metadata: {}
    }
    await inboxService.handleIncomingMessage(echoMsg)
    
    let { data: conv3 } = await supabaseAdmin.from('conversations').select('is_bot_active, assigned_to').eq('id', convId).single()
    console.log('Status after echo:', conv3?.is_bot_active ? '🤖 BOT ACTIVE' : '👤 HUMAN ACTIVE')
    
    if (conv3?.is_bot_active) {
        console.error('❌ FAIL: Bot re-activated by echo!')
    } else {
        console.log('✅ PASS: Bot stayed inactive after echo.')
    }

    console.log('\n4. Simulating ASSIGNMENT to agent...')
    const dummyAgentId = '4ae71120-7f2e-11ef-9366-02e078e155d2'; // We need a UUID that MIGHT exist or just check the call
    // Actually we need a valid user in organization_members.
    // I will try to find a real user id.
    const { data: realUser } = await supabaseAdmin.from('organization_members').select('user_id').limit(1).single();
    if (realUser) {
        await transferConversation(convId, null, realUser.user_id, 'Testing handover')
        let { data: conv4 } = await supabaseAdmin.from('conversations').select('is_bot_active, assigned_to').eq('id', convId).single()
        console.log('Status after assignment:', conv4?.is_bot_active ? '🤖 BOT ACTIVE' : '👤 HUMAN ACTIVE')
        console.log('Assigned to:', conv4?.assigned_to)

        console.log('\n5. Simulating ANOTHER INBOUND message (while agent is assigned)...')
        const inboundMsg2 = {
            id: 'test_inbound_2',
            externalId: 'test_inbound_2_ext',
            channel: 'whatsapp' as any,
            from: testPhone,
            content: { type: 'text', text: 'Sigues ahi?' },
            timestamp: new Date(),
            origin: 'inbound' as any,
            metadata: {}
        }
        await inboxService.handleIncomingMessage(inboundMsg2)
        
        let { data: conv5 } = await supabaseAdmin.from('conversations').select('is_bot_active, assigned_to').eq('id', convId).single()
        console.log('Status after 2nd inbound (assigned):', conv5?.is_bot_active ? '🤖 BOT ACTIVE' : '👤 HUMAN ACTIVE')

        if (conv5?.is_bot_active) {
            console.error('❌ FAIL: Bot re-activated while agent assigned!')
        } else {
            console.log('✅ PASS: Bot stayed inactive while agent assigned.')
        }
    } else {
        console.warn('⚠️ Skipping assignment test: No real user found in organization_members')
    }

    // Cleanup
    await supabaseAdmin.from('conversations').delete().eq('id', convId);

    console.log('\n--- TEST COMPLETE ---')
}

runTest().catch(console.error)
