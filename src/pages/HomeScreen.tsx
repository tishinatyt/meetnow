import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentPosition } from '@/lib/geo'
import CategoryPlaceholder from '@/components/CategoryPlaceholder'

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  cinema: '🎬', theatre: '🎭', bar: '🍺', sport: '🏃',
  music: '🎵', food: '🍕', games: '🎲', walk: '🚶', art: '🎨', other: '💬',
}

const CATEGORY_LABEL: Record<string, string> = {
  cinema: 'Кіно', theatre: 'Театр', bar: 'Бар', sport: 'Спорт',
  music: 'Музика', food: 'Їжа', games: 'Ігри', walk: 'Прогулянка',
  art: 'Мистецтво', other: 'Інше',
}

const GENDER_LABEL: Record<string, string> = {
  any: 'Будь-хто', male: 'Хлопці', female: 'Дівчата',
}


const TABS = [
  { key: 'all',     label: 'Усі' },
  { key: 'cinema',  label: 'Кіно' },
  { key: 'theatre', label: 'Театр' },
  { key: 'bar',     label: 'Бар' },
  { key: 'sport',   label: 'Спорт' },
  { key: 'music',   label: 'Музика' },
  { key: 'food',    label: 'Їжа' },
  { key: 'games',   label: 'Ігри' },
  { key: 'walk',    label: 'Прогулянка' },
  { key: 'art',     label: 'Мистецтво' },
  { key: 'other',   label: 'Інше' },
]

const PAGE_SIZE = 10

const RADIUS_OPTIONS = [
  { value: 1,  label: '1 км' },
  { value: 3,  label: '3 км' },
  { value: 5,  label: '5 км' },
  { value: 10, label: '10 км' },
  { value: 50, label: 'Вся Чернігівщина' },
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrganizerInfo {
  id: string
  name: string
  avatar_url: string | null
  google_verified: boolean
}

interface ParticipantInfo {
  user_id: string
  user: { id: string; name: string; avatar_url: string | null } | null
}

interface MyEvent {
  eventId: string
  role: 'organizer' | 'participant'
  title: string
  category: string
  address_text: string
  event_datetime: string
  min_age: number
  max_age: number
  gender_filter: string
  cover_photo_url: string | null
  max_participants: number
  organizer: OrganizerInfo | null
  participants: ParticipantInfo[]
}

interface PublicEvent {
  id: string
  title: string
  category: string
  address_text: string
  event_datetime: string
  created_at?: string
  min_age: number
  max_age: number
  gender_filter: string
  cover_photo_url: string | null
  max_participants: number
  participant_count: number
  distance_km: number | null
  organizer: OrganizerInfo | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatShortDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('uk-UA', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

function toSingle<T>(val: T | T[] | null | undefined): T | null {
  if (val === null || val === undefined) return null
  return Array.isArray(val) ? (val[0] ?? null) : val
}

// ── AvatarStack ───────────────────────────────────────────────────────────────

function AvatarStack({
  users,
  max = 5,
}: {
  users: { avatar_url: string | null; name?: string }[]
  max?: number
}) {
  const shown = users.slice(0, max)
  const extra = users.length - max
  return (
    <div className="flex items-center">
      {shown.map((u, i) => (
        <div
          key={i}
          className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white overflow-hidden flex-shrink-0 -ml-1 first:ml-0 shadow-sm"
          title={u.name}
        >
          {u.avatar_url ? (
            <img src={u.avatar_url} alt={u.name ?? ''} className="w-7 h-7 object-cover" />
          ) : (
            <div className="w-7 h-7 flex items-center justify-center text-xs">👤</div>
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="w-7 h-7 rounded-full bg-brand-border border-2 border-white flex items-center justify-center text-xs text-brand-ink-muted -ml-1 shadow-sm">
          +{extra}
        </div>
      )}
    </div>
  )
}


// ── MyEventCard ───────────────────────────────────────────────────────────────

function MyEventCard({ event }: { event: MyEvent }) {
  const navigate = useNavigate()
  const isOrganizer = event.role === 'organizer'
  const emoji = CATEGORY_EMOJI[event.category] ?? '💬'
  const categoryLabel = CATEGORY_LABEL[event.category] ?? event.category

  return (
    <div
      className="bg-white rounded-2xl border border-brand-border shadow-sm overflow-visible transition-all duration-200 hover:-rotate-[0.5deg] hover:shadow-lg cursor-pointer"
    >
      {/* Organizer row */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {event.organizer?.avatar_url ? (
            <img
              src={event.organizer.avatar_url}
              alt={event.organizer.name}
              className="w-10 h-10 object-cover"
            />
          ) : (
            <div className="w-10 h-10 flex items-center justify-center text-lg">👤</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-brand-ink font-semibold text-sm truncate">
              {event.organizer?.name ?? 'Організатор'}
            </span>
            {event.organizer?.google_verified && (
              <span className="text-brand-petrol text-xs bg-brand-petrol/10 px-1 rounded">✓</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                isOrganizer
                  ? 'text-brand-petrol bg-brand-petrol/10'
                  : 'text-green-600 bg-green-50'
              }`}
            >
              {isOrganizer ? 'Ведучий' : 'Учасник'}
            </span>
            <span className="text-xs text-brand-ink-muted">{formatShortDateTime(event.event_datetime)}</span>
          </div>
        </div>
      </div>

      {/* Ticket perforation divider */}
      <div className="relative flex items-center px-0 py-0">
        {/* Left notch */}
        <div className="absolute -left-2.5 w-5 h-5 rounded-full bg-brand-bg z-10" />
        {/* Dashed line */}
        <div className="flex-1 border-t-2 border-dashed border-brand-border mx-2" />
        {/* Right notch */}
        <div className="absolute -right-2.5 w-5 h-5 rounded-full bg-brand-bg z-10" />
      </div>

      {/* Title */}
      <div className="px-4 pt-3 pb-3">
        <h3 className="text-brand-ink font-bold text-base leading-tight line-clamp-2 font-display">
          {emoji} {event.title}
        </h3>
        <div className="flex items-center gap-1 mt-1.5 text-xs text-brand-ink-muted">
          <span>📍</span>
          <span className="truncate">{event.address_text || 'Місце не вказано'}</span>
        </div>
      </div>

      {/* Tags */}
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        <span className="text-xs bg-brand-border border border-brand-border-strong text-brand-ink-soft px-2.5 py-1 rounded-full">
          👤 {event.min_age}–{event.max_age} р.
        </span>
        <span className="text-xs bg-brand-border border border-brand-border-strong text-brand-ink-soft px-2.5 py-1 rounded-full">
          {GENDER_LABEL[event.gender_filter] ?? event.gender_filter}
        </span>
        <span className="text-xs bg-brand-petrol/10 border border-brand-petrol/20 text-brand-petrol px-2.5 py-1 rounded-full">
          {emoji} {categoryLabel}
        </span>
      </div>

      {/* Participant avatars */}
      {event.participants.length > 0 && (
        <div className="px-4 pb-3">
          <AvatarStack
            users={event.participants.map((p) => ({
              avatar_url: p.user?.avatar_url ?? null,
              name: p.user?.name,
            }))}
            max={5}
          />
        </div>
      )}

      {/* Single button: Chat */}
      <div className="px-4 pb-4">
        <button
          onClick={() => navigate(`/event/${event.eventId}/chat`)}
          className="w-full py-2.5 rounded-xl text-sm font-semibold bg-brand-petrol hover:bg-brand-petrol-light text-white transition-all active:scale-95"
        >
          💬 Чат
        </button>
      </div>
    </div>
  )
}

// ── PublicEventCard ───────────────────────────────────────────────────────────

function PublicEventCard({ event, isNew = false }: { event: PublicEvent; isNew?: boolean }) {
  const navigate = useNavigate()
  const emoji = CATEGORY_EMOJI[event.category] ?? '💬'
  const categoryLabel = CATEGORY_LABEL[event.category] ?? event.category

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm overflow-visible flex flex-col transition-all duration-200 hover:-rotate-[0.5deg] hover:shadow-lg cursor-pointer ${
        isNew ? 'border-brand-amber ring-2 ring-brand-amber/40' : 'border-brand-border'
      }`}
    >
      {/* Cover */}
      <div className="overflow-hidden rounded-t-2xl">
        {event.cover_photo_url ? (
          <div className="h-32 w-full overflow-hidden">
            <img src={event.cover_photo_url} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <CategoryPlaceholder category={event.category} className="h-32 w-full" />
        )}
      </div>

      {/* Ticket perforation divider */}
      <div className="relative flex items-center px-0 py-0">
        {/* Left notch */}
        <div className="absolute -left-2.5 w-5 h-5 rounded-full bg-brand-bg z-10" />
        {/* Dashed line */}
        <div className="flex-1 border-t-2 border-dashed border-brand-border mx-2" />
        {/* Right notch */}
        <div className="absolute -right-2.5 w-5 h-5 rounded-full bg-brand-bg z-10" />
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Category badge + distance */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs bg-brand-petrol/10 border border-brand-petrol/20 text-brand-petrol px-2.5 py-1 rounded-full">
            {emoji} {categoryLabel}
          </span>
          {event.distance_km !== null && (
            <span className="text-xs text-brand-ink-muted">{event.distance_km.toFixed(1)} км</span>
          )}
        </div>

        {/* NEW badge */}
        {isNew && (
          <div className="mb-2">
            <span className="text-xs bg-brand-amber text-white px-2.5 py-1 rounded-full ring-1 ring-brand-amber">
              ✨ Нова подія
            </span>
          </div>
        )}

        {/* Title */}
        <h3 className="text-brand-ink font-bold text-sm leading-tight line-clamp-2 mb-2 font-display">
          {event.title}
        </h3>

        {/* Location & time */}
        <div className="text-xs text-brand-ink-muted space-y-0.5 mb-3">
          <div className="flex items-center gap-1">
            <span>📍</span>
            <span className="truncate">{event.address_text || 'Місце не вказано'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🕐</span>
            <span>{formatShortDateTime(event.event_datetime)}</span>
          </div>
        </div>

        {/* Participants count */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1 bg-brand-border rounded-full overflow-hidden">
            <div
              className="h-1 bg-brand-petrol rounded-full"
              style={{
                width: `${Math.min((event.participant_count / event.max_participants) * 100, 100)}%`,
              }}
            />
          </div>
          <span className="text-xs text-brand-ink-soft flex-shrink-0">
            <span className="text-brand-ink font-semibold">{event.participant_count}</span>
            /{event.max_participants}
          </span>
        </div>

        {/* Single button: Details → /event/:id where join CTA lives */}
        <button
          onClick={() => navigate(`/event/${event.id}`)}
          className="w-full mt-auto py-2 rounded-xl text-xs font-semibold bg-brand-petrol hover:bg-brand-petrol-light text-white transition-all active:scale-95"
        >
          Деталі →
        </button>
      </div>
    </div>
  )
}

// ── HomeScreen ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { supaUser } = useAuth()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [publicPage, setPublicPage] = useState(1)
  const [radiusKm, setRadiusKm] = useState(5)

  const [myEvents, setMyEvents] = useState<MyEvent[]>([])
  const [allPublicEvents, setAllPublicEvents] = useState<PublicEvent[]>([])
  const [myEventIds, setMyEventIds] = useState<Set<string>>(new Set())

  const [loadingMy, setLoadingMy] = useState(true)
  const [loadingPublic, setLoadingPublic] = useState(true)
  const [newEventId, setNewEventId] = useState<string | null>(null)

  // ── Fetch "Мої події" ──────────────────────────────────────────────────────

  const fetchMyEvents = useCallback(async () => {
    if (!supaUser) return
    setLoadingMy(true)

    console.log('[DEBUG] current session:', await supabase.auth.getSession())
    console.log('[DEBUG] current user id:', (await supabase.auth.getUser()).data.user?.id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: participations, error: partError, status: partStatus, statusText: partStatusText } = await (supabase as any)
      .from('event_participants')
      .select('event_id, role')
      .eq('user_id', supaUser.id)
      .eq('status', 'joined')

    if (partError) console.error('[fetchMyEvents] participations error:', partError)
    console.log('[Step1] participations:', participations, 'error:', partError)
    console.log('[DEBUG] Step1 full response (data+error+status+statusText):', { data: participations, error: partError, status: partStatus, statusText: partStatusText })

    if (!participations || participations.length === 0) {
      setMyEvents([])
      setMyEventIds(new Set())
      setLoadingMy(false)
      return
    }

    const roleByEvent = new Map<string, string>(
      (participations as { event_id: string; role: string }[]).map((p) => [p.event_id, p.role])
    )
    const eventIds = [...roleByEvent.keys()]

    console.log('[Step2] eventIds:', eventIds)
    setMyEventIds(new Set(eventIds))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [eventsRes, allPartsRes] = await Promise.all([
      (supabase as any)
        .from('events')
        .select(`
          id, title, category, address_text, event_datetime,
          min_age, max_age, gender_filter, cover_photo_url, max_participants,
          organizer:users!events_organizer_id_fkey(id, name, avatar_url, google_verified)
        `)
        .in('id', eventIds),
      (supabase as any)
        .from('event_participants')
        .select(`
          event_id, user_id,
          user:users!event_participants_user_id_fkey(id, name, avatar_url)
        `)
        .in('event_id', eventIds)
        .eq('status', 'joined'),
    ])

    if (eventsRes.error) console.error('[fetchMyEvents] events error:', eventsRes.error)
    console.log('[Step2] events result:', eventsRes.data, 'error:', eventsRes.error)
    console.log('[Step3] participants:', allPartsRes.data, 'error:', allPartsRes.error)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventsById = new Map<string, any>((eventsRes.data ?? []).map((e: any) => [e.id, e]))

    const partsByEvent = new Map<string, ParticipantInfo[]>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of (allPartsRes.data ?? []) as any[]) {
      const list = partsByEvent.get(p.event_id) ?? []
      list.push({ user_id: p.user_id, user: toSingle(p.user) })
      partsByEvent.set(p.event_id, list)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: MyEvent[] = eventIds
      .map((eid) => {
        const ev = eventsById.get(eid)
        if (!ev) {
          console.error('[fetchMyEvents] event not visible for event_id:', eid, '— RLS may be blocking it')
          return null
        }
        return {
          eventId: ev.id,
          role: (roleByEvent.get(eid) ?? 'participant') as 'organizer' | 'participant',
          title: ev.title,
          category: ev.category,
          address_text: ev.address_text,
          event_datetime: ev.event_datetime,
          min_age: ev.min_age,
          max_age: ev.max_age,
          gender_filter: ev.gender_filter,
          cover_photo_url: ev.cover_photo_url,
          max_participants: ev.max_participants,
          organizer: toSingle(ev.organizer) as OrganizerInfo | null,
          participants: partsByEvent.get(ev.id) ?? [],
        }
      })
      .filter(Boolean) as MyEvent[]

    console.log('[Final] merged myEvents:', mapped)
    setMyEvents(mapped)
    setLoadingMy(false)
  }, [supaUser])

  // ── Fetch public events ────────────────────────────────────────────────────

  const fetchPublicEvents = useCallback(async () => {
    setLoadingPublic(true)

    const geo = await getCurrentPosition()

    const { data } = await supabase.rpc('events_nearby', {
      user_lat: geo.lat,
      user_lng: geo.lng,
      radius_km: 100,
    })

    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const events: PublicEvent[] = (data as any[]).map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        address_text: e.address_text,
        event_datetime: e.event_datetime,
        created_at: e.created_at,
        min_age: e.min_age,
        max_age: e.max_age,
        gender_filter: e.gender_filter,
        cover_photo_url: e.cover_photo_url,
        max_participants: e.max_participants,
        participant_count: e.participant_count ?? 0,
        distance_km: e.distance_km ?? null,
        organizer: e.organizer ?? null,
      }))
      // Sort by created_at DESC so newest events appear at top of feed
      events.sort((a, b) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      )
      setAllPublicEvents(events)
    } else {
      setAllPublicEvents([])
    }

    setLoadingPublic(false)
  }, [])

  useEffect(() => { fetchMyEvents() }, [fetchMyEvents])
  useEffect(() => { fetchPublicEvents() }, [fetchPublicEvents])

  // ── Realtime: new public events ───────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel('public-events-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events', filter: 'is_public=eq.true' },
        async (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const raw = payload.new as any

          const [organizerRes, countRes] = await Promise.all([
            supabase
              .from('users')
              .select('id, name, avatar_url, google_verified')
              .eq('id', raw.organizer_id)
              .single(),
            supabase
              .from('event_participants')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', raw.id),
          ])

          const newEvent: PublicEvent = {
            id: raw.id,
            title: raw.title,
            category: raw.category,
            address_text: raw.address_text,
            event_datetime: raw.event_datetime,
            min_age: raw.min_age,
            max_age: raw.max_age,
            gender_filter: raw.gender_filter,
            cover_photo_url: raw.cover_photo_url ?? null,
            max_participants: raw.max_participants,
            participant_count: countRes.count ?? 0,
            distance_km: null,
            organizer: organizerRes.data
              ? {
                  id: organizerRes.data.id,
                  name: organizerRes.data.name,
                  avatar_url: organizerRes.data.avatar_url ?? null,
                  google_verified: organizerRes.data.google_verified ?? false,
                }
              : null,
          }

          setAllPublicEvents((prev) => [newEvent, ...prev])
          setNewEventId(raw.id)
          // Clear highlight after 3 seconds
          setTimeout(() => setNewEventId(null), 3000)
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Realtime: participant count changes ───────────────────────────────────

  useEffect(() => {
    const participantsChannel = supabase
      .channel('event-participants-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'event_participants' },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const eventId = (payload.new as any).event_id as string
          setAllPublicEvents((prev) =>
            prev.map((e) =>
              e.id === eventId
                ? { ...e, participant_count: e.participant_count + 1 }
                : e,
            ),
          )
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'event_participants' },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const eventId = (payload.old as any).event_id as string
          setAllPublicEvents((prev) =>
            prev.map((e) =>
              e.id === eventId
                ? { ...e, participant_count: Math.max(0, e.participant_count - 1) }
                : e,
            ),
          )
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(participantsChannel) }
  }, [])

  // ── Derived / filtered lists ───────────────────────────────────────────────

  const filteredPublic = allPublicEvents
    .filter((e) => !myEventIds.has(e.id))
    .filter((e) => selectedCategory === 'all' || e.category === selectedCategory)
    .filter((e) => !searchQuery || e.title.toLowerCase().includes(searchQuery.toLowerCase()))
    // Radius filter: skip if distance unknown (no geo), otherwise apply
    .filter((e) => e.distance_km === null || e.distance_km <= radiusKm)

  const filteredMy = myEvents.filter(
    (e) => !searchQuery || e.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const shownPublic = filteredPublic.slice(0, publicPage * PAGE_SIZE)
  const hasMorePublic = filteredPublic.length > publicPage * PAGE_SIZE

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-brand-bg text-brand-ink pb-24">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 bg-brand-bg/95 backdrop-blur z-20 border-b border-brand-border px-4 pt-4 pb-3 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Logo */}
            {/* Logo wordmark — Fraunces, 'oo' accented in brand-amber to echo "nearby dots" */}
            <Link to="/" className="font-display flex-shrink-0 hover:opacity-80 transition-opacity tracking-tight text-[1.35rem] font-semibold text-brand-petrol leading-none">
              por<span className="text-brand-amber">oo</span>ch
            </Link>

            {/* City selector */}
            <div className="hidden sm:flex items-center gap-1 text-sm bg-white rounded-xl px-3 py-1.5 flex-shrink-0 cursor-default border border-brand-border">
              <span>📍</span>
              <span className="text-brand-ink-soft text-xs font-medium">Чернігів, Україна</span>
              <span className="text-brand-ink-muted text-xs">▾</span>
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink-muted text-sm pointer-events-none">
                🔍
              </span>
              <input
                type="text"
                placeholder="Пошук подій..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-brand-border rounded-xl pl-9 pr-4 py-1.5 text-sm text-brand-ink placeholder-brand-ink-muted focus:outline-none focus:border-brand-petrol transition-colors"
              />
            </div>

            {/* Radius selector */}
            <select
              value={radiusKm}
              onChange={(e) => { setRadiusKm(Number(e.target.value)); setPublicPage(1) }}
              className="flex-shrink-0 bg-white border border-brand-border rounded-xl px-2 py-1.5 text-xs text-brand-ink-soft focus:outline-none focus:border-brand-petrol transition-colors cursor-pointer"
              aria-label="Радіус пошуку"
            >
              {RADIUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Notifications */}
            <button
              className="w-9 h-9 bg-white rounded-xl flex items-center justify-center hover:bg-brand-bg transition-colors flex-shrink-0 border border-brand-border"
              aria-label="Сповіщення"
            >
              <span className="text-lg">🔔</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ──────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pt-5">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── LEFT: Мої події ─────────────────────────────────────────── */}
          <div className="w-full lg:w-[400px] flex-shrink-0">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-brand-ink font-display">Мої події</h2>
              <p className="text-xs text-brand-ink-muted mt-0.5">
                Особисті події, які ви створили або до яких запрошені
              </p>
            </div>

            {/* Skeleton */}
            {loadingMy && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl h-52 animate-pulse border border-brand-border shadow-sm"
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loadingMy && filteredMy.length === 0 && (
              <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-8 text-center mb-3">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-brand-ink-soft text-sm">Ви ще не в жодній події</p>
                <p className="text-brand-ink-muted text-xs mt-1">
                  Створіть свою або приєднайтесь до громадської
                </p>
              </div>
            )}

            {/* Cards */}
            {!loadingMy && filteredMy.length > 0 && (
              <div className="space-y-3">
                {filteredMy.map((event) => (
                  <MyEventCard key={event.eventId} event={event} />
                ))}
              </div>
            )}

          </div>

          {/* ── RIGHT: Громадські події ──────────────────────────────────── */}
          <div className="flex-1 min-w-0 w-full">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-brand-ink font-display">Громадські події</h2>
              <p className="text-xs text-brand-ink-muted mt-0.5">
                Відкриті події, до яких може приєднатися кожен
              </p>
            </div>

            {/* Category tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setSelectedCategory(tab.key)
                    setPublicPage(1)
                  }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    selectedCategory === tab.key
                      ? 'bg-brand-petrol text-white'
                      : 'bg-white text-brand-ink-soft hover:bg-brand-bg hover:text-brand-ink border border-brand-border'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Skeleton */}
            {loadingPublic && (
              <div className="grid sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl h-72 animate-pulse border border-brand-border shadow-sm"
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loadingPublic && shownPublic.length === 0 && (
              <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-8 text-center">
                <div className="text-4xl mb-3">
                  {selectedCategory !== 'all' ? (CATEGORY_EMOJI[selectedCategory] ?? '🔍') : '🌐'}
                </div>
                <p className="text-brand-ink-soft text-sm">
                  {selectedCategory !== 'all'
                    ? `Поки немає подій у категорії «${CATEGORY_LABEL[selectedCategory] ?? selectedCategory}»`
                    : 'Публічних подій поки немає'}
                </p>
                <p className="text-brand-ink-muted text-xs mt-1">
                  {selectedCategory !== 'all'
                    ? 'Спробуйте іншу категорію або збільшіть радіус пошуку'
                    : 'Збільшіть радіус або перевірте пізніше'}
                </p>
              </div>
            )}

            {/* Cards grid */}
            {!loadingPublic && shownPublic.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-3">
                {shownPublic.map((event) => (
                  <PublicEventCard key={event.id} event={event} isNew={event.id === newEventId} />
                ))}
              </div>
            )}

            {/* Load more */}
            {hasMorePublic && (
              <button
                onClick={() => setPublicPage((p) => p + 1)}
                className="w-full mt-4 py-3 rounded-2xl text-sm font-semibold bg-white hover:bg-brand-bg text-brand-ink-soft border border-brand-border transition-all active:scale-95 shadow-sm"
              >
                Показати більше подій ({filteredPublic.length - shownPublic.length} залишилось)
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
