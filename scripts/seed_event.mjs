// Seed script: signs up a temp user, inserts test event, prints event ID
// Usage: node scripts/seed_event.mjs

import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const SUPABASE_URL = 'https://pqasdmiqnlyyjwmmqeyc.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_Ni_SuVPhfR9U2iSpWpOSFw_8qIudiYt'

const clientOpts = {
  auth: { persistSession: false },
  realtime: { transport: ws },
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOpts)

const TEST_EMAIL = `seed.${Date.now()}@gmail.com`
const TEST_PASS  = 'Seed_Pass_2026!'

async function main() {
  // 1. Sign up temp user
  console.log('→ Signing up temp user:', TEST_EMAIL)
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASS,
  })
  if (signUpErr) throw new Error('signUp: ' + signUpErr.message)
  const authUser = signUpData.user
  const accessToken = signUpData.session?.access_token
  if (!authUser || !accessToken) throw new Error('No user/session returned from signUp')
  console.log('  user id:', authUser.id)

  // 2. Authenticated client with the new user's JWT
  const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...clientOpts,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })

  // 3. Create public.users profile (required by FK on events)
  console.log('→ Creating public.users profile…')
  const { error: profileErr } = await authed.from('users').upsert({
    id: authUser.id,
    name: 'Тест Організатор',
    age: 27,
    gender: 'male',
    avatar_url: 'https://ui-avatars.com/api/?name=Тест&background=6366f1&color=fff&size=200',
    google_verified: false,
  })
  if (profileErr) throw new Error('users upsert: ' + profileErr.message)

  // 4. Tomorrow at 17:00 Kyiv time
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(17, 0, 0, 0)
  const eventDatetime = tomorrow.toISOString()

  // 5. Insert event using events_point helper (or raw location string)
  console.log('→ Inserting test event…')
  // PostgREST doesn't support function calls in values, so we use an RPC
  // Instead: we'll call a wrapper RPC that inserts and returns the id
  // Fallback: insert without location first, then update via RPC if available

  const { data: eventData, error: eventErr } = await authed
    .from('events')
    .insert({
      title:            'Кава та розмови',
      description:      'Зустрічаємось, знайомимось, спілкуємось за чашкою кави',
      category:         'food',
      is_public:        true,
      organizer_id:     authUser.id,
      cover_photo_url:  null,
      address_text:     "Кав'ярня White Cup, Чернігів",
      event_datetime:   eventDatetime,
      max_participants: 10,
      min_age:          18,
      max_age:          35,
      gender_filter:    'any',
      status:           'upcoming',
    })
    .select('id')
    .single()

  if (eventErr) throw new Error('events insert: ' + eventErr.message)
  const eventId = eventData.id
  console.log('  event id:', eventId)

  // 6. Set location via SQL RPC (events_point helper)
  // We'll call a helper RPC if available, otherwise skip (map won't render)
  const { error: locErr } = await authed.rpc('set_event_location', {
    p_event_id: eventId,
    p_lat: 51.4982,
    p_lng: 31.2893,
  })
  if (locErr) {
    console.warn('  ⚠ set_event_location RPC not found — location not set (map will be hidden).')
    console.warn('    Run this manually in SQL Editor:')
    console.warn(`    UPDATE public.events SET location = ST_SetSRID(ST_MakePoint(31.2893, 51.4982), 4326)::geography WHERE id = '${eventId}';`)
  } else {
    console.log('  location set via RPC ✓')
  }

  console.log('\n✅ Done!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Event URL: http://localhost:5173/event/' + eventId)
  console.log('Event ID:  ' + eventId)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch((e) => { console.error('❌', e.message); process.exit(1) })
