import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentPosition } from '@/lib/geo'

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

const CATEGORY_GRADIENT: Record<string, string> = {
  cinema:  'from-purple-100 to-indigo-100',
  theatre: 'from-red-100 to-rose-100',
  bar:     'from-amber-100 to-yellow-100',
  sport:   'from-green-100 to-emerald-100',
  music:   'from-blue-100 to-cyan-100',
  food:    'from-orange-100 to-red-100',
  games:   'from-indigo-100 to-violet-100',
  walk:    'from-teal-100 to-green-100',
  art:     'from-pink-100 to-rose-100',
  other:   'from-gray-100 to-gray-200',
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
  { key: 'other',   label: 'Інше' },
]

const PAGE_SIZE = 10

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
        <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500 -ml-1 shadow-sm">
          +{extra}
        </div>
      )}
    </div>
  )
}

// ── CategoryCover ─────────────────────────────────────────────────────────────

function CategoryCover({ category, url }: { category: string; url: string | null }) {
  const gradient = CATEGORY_GRADIENT[category] ?? CATEGORY_GRADIENT.other
  const emoji = CATEGORY_EMOJI[category] ?? '💬'

  if (url) {
    return (
      <div className="h-32 w-full overflow-hidden">
        <img src={url} alt="" className="w-full h-full object-cover" />
      </div>
    )
  }
  return (
    <div className={`h-32 w-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
      <span className="text-5xl opacity-40">{emoji}</span>
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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
            <span className="text-gray-900 font-semibold text-sm truncate">
              {event.organizer?.name ?? 'Організатор'}
            </span>
            {event.organizer?.google_verified && (
              <span className="text-blue-600 text-xs bg-blue-50 px-1 rounded">✓</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                isOrganizer
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-green-600 bg-green-50'
              }`}
            >
              {isOrganizer ? 'Ведучий' : 'Учасник'}
            </span>
            <span className="text-xs text-gray-400">{formatShortDateTime(event.event_datetime)}</span>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pb-3">
        <h3 className="text-gray-900 font-bold text-base leading-tight line-clamp-2">
          {emoji} {event.title}
        </h3>
        <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
          <span>📍</span>
          <span className="truncate">{event.address_text || 'Місце не вказано'}</span>
        </div>
      </div>

      {/* Tags */}
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        <span className="text-xs bg-gray-100 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">
          👤 {event.min_age}–{event.max_age} р.
        </span>
        <span className="text-xs bg-gray-100 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">
          {GENDER_LABEL[event.gender_filter] ?? event.gender_filter}
        </span>
        <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-600 px-2.5 py-1 rounded-full">
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

      {/* Buttons */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={() => navigate(`/event/${event.eventId}`)}
          className="flex-1 py-2 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-all active:scale-95"
        >
          Деталі
        </button>
        <button
          onClick={() => navigate(`/event/${event.eventId}/chat`)}
          className="flex-1 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-95"
        >
          💬 Чат
        </button>
      </div>
    </div>
  )
}

// ── PublicEventCard ───────────────────────────────────────────────────────────

function PublicEventCard({
  event,
  onJoinAndChat,
}: {
  event: PublicEvent
  onJoinAndChat: (eventId: string) => Promise<void>
}) {
  const navigate = useNavigate()
  const [joining, setJoining] = useState(false)
  const emoji = CATEGORY_EMOJI[event.category] ?? '💬'
  const categoryLabel = CATEGORY_LABEL[event.category] ?? event.category

  async function handleChat() {
    setJoining(true)
    await onJoinAndChat(event.id)
    setJoining(false)
    navigate(`/event/${event.id}/chat`)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Cover */}
      <CategoryCover category={event.category} url={event.cover_photo_url} />

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Category badge + distance */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-600 px-2.5 py-1 rounded-full">
            {emoji} {categoryLabel}
          </span>
          {event.distance_km !== null && (
            <span className="text-xs text-gray-400">{event.distance_km.toFixed(1)} км</span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-gray-900 font-bold text-sm leading-tight line-clamp-2 mb-2">
          {event.title}
        </h3>

        {/* Location & time */}
        <div className="text-xs text-gray-400 space-y-0.5 mb-3">
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
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-1 bg-indigo-500 rounded-full"
              style={{
                width: `${Math.min((event.participant_count / event.max_participants) * 100, 100)}%`,
              }}
            />
          </div>
          <span className="text-xs text-gray-500 flex-shrink-0">
            <span className="text-gray-900 font-semibold">{event.participant_count}</span>
            /{event.max_participants}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 mt-auto">
          <button
            onClick={() => navigate(`/event/${event.id}`)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-all active:scale-95"
          >
            Деталі
          </button>
          <button
            onClick={handleChat}
            disabled={joining}
            className="flex-1 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all active:scale-95"
          >
            {joining ? '...' : '💬 Чат'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── HomeScreen ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigate = useNavigate()
  const { supaUser } = useAuth()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [publicPage, setPublicPage] = useState(1)

  const [myEvents, setMyEvents] = useState<MyEvent[]>([])
  const [allPublicEvents, setAllPublicEvents] = useState<PublicEvent[]>([])
  const [myEventIds, setMyEventIds] = useState<Set<string>>(new Set())

  const [loadingMy, setLoadingMy] = useState(true)
  const [loadingPublic, setLoadingPublic] = useState(true)

  // ── Fetch "Мої події" ──────────────────────────────────────────────────────

  const fetchMyEvents = useCallback(async () => {
    if (!supaUser) return
    setLoadingMy(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: participations } = await (supabase as any)
      .from('event_participants')
      .select(`
        role,
        event:events!event_participants_event_id_fkey(
          id, title, category, address_text, event_datetime,
          min_age, max_age, gender_filter, cover_photo_url, max_participants,
          organizer:users!events_organizer_id_fkey(id, name, avatar_url, google_verified)
        )
      `)
      .eq('user_id', supaUser.id)
      .eq('status', 'joined')

    if (!participations || participations.length === 0) {
      setMyEvents([])
      setMyEventIds(new Set())
      setLoadingMy(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventIds: string[] = (participations as any[])
      .map((p: any) => toSingle(p.event)?.id)
      .filter(Boolean)

    setMyEventIds(new Set(eventIds))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allParts } = await (supabase as any)
      .from('event_participants')
      .select(`
        event_id, user_id,
        user:users!event_participants_user_id_fkey(id, name, avatar_url)
      `)
      .in('event_id', eventIds)
      .eq('status', 'joined')

    const partsByEvent = new Map<string, ParticipantInfo[]>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of (allParts ?? []) as any[]) {
      const list = partsByEvent.get(p.event_id) ?? []
      list.push({ user_id: p.user_id, user: toSingle(p.user) })
      partsByEvent.set(p.event_id, list)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: MyEvent[] = (participations as any[])
      .map((p: any) => {
        const ev = toSingle(p.event)
        if (!ev) return null
        return {
          eventId: ev.id,
          role: p.role as 'organizer' | 'participant',
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
      const events: PublicEvent[] = (data as any[]).map((e: any) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        address_text: e.address_text,
        event_datetime: e.event_datetime,
        min_age: e.min_age,
        max_age: e.max_age,
        gender_filter: e.gender_filter,
        cover_photo_url: e.cover_photo_url,
        max_participants: e.max_participants,
        participant_count: e.participant_count ?? 0,
        distance_km: e.distance_km ?? null,
        organizer: e.organizer ?? null,
      }))
      setAllPublicEvents(events)
    } else {
      setAllPublicEvents([])
    }

    setLoadingPublic(false)
  }, [])

  useEffect(() => { fetchMyEvents() }, [fetchMyEvents])
  useEffect(() => { fetchPublicEvents() }, [fetchPublicEvents])

  // ── Join event then navigate to chat (with join-first logic) ───────────────

  async function handleJoinAndChat(eventId: string) {
    if (!supaUser) return
    // Insert participant record first (join), then caller navigates to chat
    await supabase
      .from('event_participants')
      .insert({ event_id: eventId, user_id: supaUser.id, role: 'participant', status: 'joined' })
  }

  // ── Derived / filtered lists ───────────────────────────────────────────────

  const filteredPublic = allPublicEvents
    .filter((e) => !myEventIds.has(e.id))
    .filter((e) => selectedCategory === 'all' || e.category === selectedCategory)
    .filter(
      (e) => !searchQuery || e.title.toLowerCase().includes(searchQuery.toLowerCase()),
    )

  const filteredMy = myEvents.filter(
    (e) => !searchQuery || e.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const shownPublic = filteredPublic.slice(0, publicPage * PAGE_SIZE)
  const hasMorePublic = filteredPublic.length > publicPage * PAGE_SIZE

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 bg-white/95 backdrop-blur z-20 border-b border-gray-200 px-4 pt-4 pb-3 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Logo */}
            <h1 className="text-xl font-bold flex-shrink-0 text-gray-900">⚡ MeetNow</h1>

            {/* City selector */}
            <div className="hidden sm:flex items-center gap-1 text-sm bg-gray-100 rounded-xl px-3 py-1.5 flex-shrink-0 cursor-default border border-gray-200">
              <span>📍</span>
              <span className="text-gray-700 text-xs font-medium">Чернігів, Україна</span>
              <span className="text-gray-400 text-xs">▾</span>
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                🔍
              </span>
              <input
                type="text"
                placeholder="Пошук подій..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Notifications */}
            <button
              className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0 border border-gray-200"
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
              <h2 className="text-lg font-bold text-gray-900">Мої події</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Особисті події, які ви створили або до яких запрошені
              </p>
            </div>

            {/* Skeleton */}
            {loadingMy && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl h-52 animate-pulse border border-gray-200 shadow-sm"
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loadingMy && filteredMy.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center mb-3">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-gray-500 text-sm">Ви ще не в жодній події</p>
                <p className="text-gray-400 text-xs mt-1">
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

            {/* Create button */}
            <button
              onClick={() => navigate('/create')}
              className="w-full mt-4 py-3 rounded-2xl text-sm font-semibold bg-white hover:bg-gray-50 text-gray-600 border border-gray-300 border-dashed transition-all active:scale-95"
            >
              + Створити особисту подію
            </button>
          </div>

          {/* ── RIGHT: Громадські події ──────────────────────────────────── */}
          <div className="flex-1 min-w-0 w-full">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900">Громадські події</h2>
              <p className="text-xs text-gray-400 mt-0.5">
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
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 border border-gray-200'
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
                    className="bg-white rounded-2xl h-72 animate-pulse border border-gray-200 shadow-sm"
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loadingPublic && shownPublic.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
                <div className="text-4xl mb-3">🌐</div>
                <p className="text-gray-500 text-sm">Публічних подій поки немає</p>
                <p className="text-gray-400 text-xs mt-1">
                  Спробуйте інший фільтр або перевірте пізніше
                </p>
              </div>
            )}

            {/* Cards grid */}
            {!loadingPublic && shownPublic.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-3">
                {shownPublic.map((event) => (
                  <PublicEventCard
                    key={event.id}
                    event={event}
                    onJoinAndChat={handleJoinAndChat}
                  />
                ))}
              </div>
            )}

            {/* Load more */}
            {hasMorePublic && (
              <button
                onClick={() => setPublicPage((p) => p + 1)}
                className="w-full mt-4 py-3 rounded-2xl text-sm font-semibold bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 transition-all active:scale-95 shadow-sm"
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
