
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://amwlwmkejdjskukdfwut.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd2x3bWtlamRqc2t1a2Rmd3V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTg0ODY5NSwiZXhwIjoyMDgxNDI0Njk1fQ.r6qkZ37-B82CcKEZlIPi8ZRAaHQa8_aOoMAoCTiKCPQ'
)

async function verifyFix() {
  const convId = '80e73396-607b-4a70-9dd6-c3a5ff5d6460'
  const orgId = '91aa45c4-a7c4-4af6-96df-5f0fb1a35af7'

  console.log('--- Testing Insert WITH Channel ---')
  const { data, error: insertError } = await supabase
    .from('messages')
    .insert({
      conversation_id: convId,
      organization_id: orgId,
      direction: 'outbound',
      channel: 'whatsapp', // The fix
      content: { type: 'text', text: 'Verification SUCCESS ' + new Date().toISOString() },
      status: 'sent'
    })
    .select()
    .single()

  if (insertError) {
    console.error('Insert Error:', JSON.stringify(insertError, null, 2))
  } else {
    console.log('Insert Succeeded! Message ID:', data.id)
    
    // Check if conversation updated
    const { data: conv } = await supabase.from('conversations').select('last_message, unread_count').eq('id', convId).single()
    console.log('Conversation Check:', conv?.last_message, 'Unread:', conv?.unread_count)
  }
}

verifyFix()
