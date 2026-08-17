import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const sb = createClient(
  'https://pqasdmiqnlyyjwmmqeyc.supabase.co',
  'sb_publishable_Ni_SuVPhfR9U2iSpWpOSFw_8qIudiYt',
  { auth: { persistSession: false }, realtime: { transport: ws } }
)

// Try anonymous sign-in
const anon = await sb.auth.signInAnonymously()
console.log('ANON result:', JSON.stringify({
  user_id: anon.data?.user?.id,
  has_session: !!anon.data?.session,
  access_token: anon.data?.session?.access_token?.slice(0, 30) + '...',
  error: anon.error?.message,
}))
