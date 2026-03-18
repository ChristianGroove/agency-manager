
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://amwlwmkejdjskukdfwut.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd2x3bWtlamRqc2t1a2Rmd3V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTg0ODY5NSwiZXhwIjoyMDgxNDI0Njk1fQ.r6qkZ37-B82CcKEZlIPi8ZRAaHQa8_aOoMAoCTiKCPQ'
)

async function diagnostic() {
  const convId = '80e73396-607b-4a70-9dd6-c3a5ff5d6460'
  const { data: conv } = await supabase.from('conversations').select('*').eq('id', convId).single()
  
  console.log('Conversation Data:', JSON.stringify(conv, null, 2))

  const payload = {
    conversation_id: convId,
    organization_id: conv?.organization_id,
    direction: 'outbound',
    channel: conv?.channel,
    content: { type: 'text', text: 'Diagnostic' },
    status: 'sent',
    sender_id: 'Diagnostic'
  }

  console.log('Attempting insert with:', JSON.stringify(payload, null, 2))

  const { error } = await supabase.from('messages').insert(payload)

  if (error) {
    console.log('Error Code:', error.code)
    console.log('Error Message:', error.message)
    console.log('Error Details:', error.details)
    console.log('Error Hint:', error.hint)
  } else {
    console.log('Insert SUCCESS during diagnostic!')
  }
}

diagnostic()
