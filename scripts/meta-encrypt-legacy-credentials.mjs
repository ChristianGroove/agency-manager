// Run after the private-credential migration. Default is read-only; --apply performs encryption.
import {createClient} from '@supabase/supabase-js'
import {randomBytes,createCipheriv} from 'node:crypto'
const apply=process.argv.includes('--apply')
const url=process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY
const encryptionKey=process.env.ENCRYPTION_KEY
if(!url||!serviceKey) throw new Error('Database environment is required')
const key=Buffer.from((encryptionKey || '').padEnd(32,'0').slice(0,32))
if(apply && (!encryptionKey || Buffer.byteLength(encryptionKey)<32 || key.length!==32)) throw new Error('Existing compatible ENCRYPTION_KEY is required')
const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
let cursor=null,legacy=0,encrypted=0
while(true){
 let query=db.from('integration_connection_secrets').select('connection_id,credentials').order('connection_id').limit(100)
 if(cursor) query=query.gt('connection_id',cursor)
 const {data,error}=await query
 if(error) throw new Error('Could not read private credentials')
 if(!data?.length) break
 for(const row of data){
  if(row.credentials?._encrypted) continue
  if(row.credentials?._private) throw new Error('Unexpected nested credential reference')
  legacy++
  if(apply){
   const iv=randomBytes(16);const cipher=createCipheriv('aes-256-gcm',key,iv)
   const ciphertext=Buffer.concat([cipher.update(JSON.stringify(row.credentials),'utf8'),cipher.final()])
   const value=iv.toString('hex')+':'+cipher.getAuthTag().toString('hex')+':'+ciphertext.toString('hex')
   const result=await db.from('integration_connection_secrets').update({credentials:{_encrypted:value},updated_at:new Date().toISOString()})
    .eq('connection_id',row.connection_id).eq('credentials',JSON.stringify(row.credentials)).select('connection_id')
   if(result.error) throw new Error('Credential encryption failed')
   encrypted+=result.data.length
  }
 }
 cursor=data.at(-1).connection_id
}
console.log(JSON.stringify({mode:apply?'apply':'check',legacy,encrypted}))
