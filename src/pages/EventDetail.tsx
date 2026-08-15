import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEvent } from '@/hooks/useEvent'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentPosition } from '@/lib/geo'
import EventMap from '@/components/EventMap'
import CategoryPlaceholder from '@/components/CategoryPlaceholder'

// ── helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  cinema:  '🎬',
  theatre: '🎭',
  bar:     '🍺',
  sport:   '🏃',
  music:   '🎵',
  food:    '🍕',
  games:   '🎲',
  walk:    '🚶',
  art:     '🎨',
  other:   '💬',
}

const CATEGORY_LABEL: Record<string, string> = {
  cinema:  'Кіно',
  theatre: 'Театр',
  bar:     'Бар',
  sport:   'Спорт',
  music:   'Музика',
  food:    'Їжа',
  games:   'Ігри',
  walk:    'Прогулянка',
  art:     'Мистецтво',
  other:   'Інше',
}

const GENDER_LABEL: Record<string, string> = {
  any:    '🙋 Будь-хто',
  male:   '👨 Хлопці',
  female: '👩 Дівчата',
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── component ────────────────────────────────────────────────────────────────

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { supaUser } = useAuth()
  const { event, participants, loading, error, joinEvent } = useEvent(id!)

  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [bookmarked, setBookmarked] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    if (!event?.location_lat || !event?.location_lng) return
    getCurrentPosition().then((pos) => {
      if (!event.location_lat || !event.location_lng) return
      const km = haversineKm(pos.lat, pos.lng, event.location_lat, event.location_lng)
      setDistanceKm(Math.round(km * 10) / 10)
    })
  }, [event?.location_lat, event?.location_lng])

  useEffect(() => {
    if (!supaUser) return
    // Don't guard on participants.length — empty array means "not joined", which is correct
    setJoined(participants.some((p) => p.user_id === supaUser.id && p.status === 'joined'))
  }, [participants, supaUser])

  async function handleJoin() {
    if (!supaUser || !event) return
    setJoining(true)
    setJoinError(null)
    const { error: err } = await joinEvent(supaUser.id)
    if (err) {
      setJoinError(err)
      setJoining(false)
      return
    }
    // Don't navigate immediately — show "Ви приєднались ✓" + chat button instead
    setJoined(true)
    setJoining(false)
  }

  // ── render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
        <div className="h-14 bg-white border-b border-gray-200 animate-pulse" />
        <div className="flex-1 px-4 pt-5 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-200 shadow-sm" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center px-4">
        <div className="text-4xl mb-3">😕</div>
        <p className="text-gray-500">{error ?? 'Подію не знайдено'}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 text-indigo-600 hover:text-indigo-500 text-sm"
        >
          ← Назад
        </button>
      </div>
    )
  }

  const emoji = CATEGORY_EMOJI[event.category] ?? '💬'
  const categoryLabel = CATEGORY_LABEL[event.category] ?? event.category
  const activeParticipants = participants.filter((p) => p.status === 'joined')
  const isOrganizer = supaUser?.id === event.organizer_id
  const isFull = activeParticipants.length >= event.max_participants

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-36">

      {/* ── Cover photo ────────────────────────────────────────────────── */}
      <div className="relative h-52 w-full overflow-hidden">
        {event.cover_photo_url ? (
          <img
            src={event.cover_photo_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <CategoryPlaceholder category={event.category} className="h-52 w-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 bg-white/95 backdrop-blur z-20 border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-gray-700 transition-colors p-1 -ml-1"
          aria-label="Назад"
        >
          ←
        </button>
        <span className="font-semibold text-base truncate flex-1 text-gray-900">
          {emoji} {event.title}
        </span>
        <button
          onClick={() => setBookmarked((b) => !b)}
          className={`transition-colors text-xl ${bookmarked ? 'text-yellow-500' : 'text-gray-300 hover:text-gray-500'}`}
          aria-label="Зберегти"
        >
          🔖
        </button>
      </div>

      <div className="px-4 pt-5 space-y-5 max-w-lg mx-auto">

        {/* ── Organizer block ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
            {event.organizer?.avatar_url ? (
              <img
                src={event.organizer.avatar_url}
                alt={event.organizer.name}
                className="w-12 h-12 object-cover"
              />
            ) : (
              <div className="w-12 h-12 flex items-center justify-center text-2xl">👤</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 truncate">
                {event.organizer?.name ?? 'Організатор'}
              </span>
              {event.organizer?.google_verified && (
                <span className="text-blue-600 text-xs bg-blue-50 px-1.5 py-0.5 rounded-full">✓</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                Ведучий
              </span>
              <span className="text-xs text-green-500">● online</span>
            </div>
          </div>
        </div>

        {/* ── Title & description ─────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold leading-tight text-gray-900">
            {emoji} {event.title}
          </h1>
          {event.description && (
            <p className="mt-2 text-gray-600 text-sm leading-relaxed">{event.description}</p>
          )}
        </div>

        {/* ── Date / location / distance ──────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-2.5">
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">🗓</span>
            <span className="text-sm text-gray-700">{formatDateTime(event.event_datetime)}</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">📍</span>
            <div className="flex-1">
              <span className="text-sm text-gray-700">{event.address_text || 'Місце не вказано'}</span>
              {distanceKm !== null && (
                <span className="ml-2 text-xs text-gray-400">{distanceKm} км від вас</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Participants ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-900">Учасники</span>
            <span className="text-sm font-bold text-indigo-600">
              {activeParticipants.length}/{event.max_participants} слотів
            </span>
          </div>

          <div className="w-full h-1.5 bg-gray-100 rounded-full mb-3">
            <div
              className={`h-1.5 rounded-full transition-all ${isFull ? 'bg-red-400' : 'bg-indigo-500'}`}
              style={{ width: `${Math.min((activeParticipants.length / event.max_participants) * 100, 100)}%` }}
            />
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {activeParticipants.slice(0, 8).map((p) => (
              <div key={p.id} className="w-9 h-9 rounded-full bg-gray-200 border-2 border-white overflow-hidden flex-shrink-0 shadow-sm" title={p.user?.name}>
                {p.user?.avatar_url ? (
                  <img src={p.user.avatar_url} alt={p.user.name} className="w-9 h-9 object-cover" />
                ) : (
                  <div className="w-9 h-9 flex items-center justify-center text-sm">👤</div>
                )}
              </div>
            ))}
            {activeParticipants.length > 8 && (
              <div className="w-9 h-9 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500 shadow-sm">
                +{activeParticipants.length - 8}
              </div>
            )}
            {activeParticipants.length === 0 && (
              <span className="text-xs text-gray-400">Поки немає учасників — будь першим!</span>
            )}
          </div>
        </div>

        {/* ── Who fits tags ───────────────────────────────────────────── */}
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wider">Хто підходить</span>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs bg-gray-100 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full">
              {GENDER_LABEL[event.gender_filter] ?? event.gender_filter}
            </span>
            <span className="text-xs bg-gray-100 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full">
              👤 {event.min_age}–{event.max_age} р.
            </span>
            <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-600 px-3 py-1.5 rounded-full">
              {emoji} {categoryLabel}
            </span>
            {!event.is_public && (
              <span className="text-xs bg-amber-50 border border-amber-200 text-amber-600 px-3 py-1.5 rounded-full">
                🔒 Приватне
              </span>
            )}
          </div>
        </div>

        {/* ── Map ────────────────────────────────────────────────────── */}
        {event.location_lat && event.location_lng ? (
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wider block mb-2">Місце</span>
            <EventMap
              lat={event.location_lat}
              lng={event.location_lng}
              title={event.address_text || event.title}
            />
          </div>
        ) : event.address_text ? (
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm text-center text-gray-500 text-sm">
            📍 {event.address_text}
          </div>
        ) : null}

        {/* ── Join error ──────────────────────────────────────────────── */}
        {joinError && (
          <div className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl border border-red-100">
            {joinError}
          </div>
        )}
      </div>

      {/* ── Bottom CTA (sticky) ────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-4 safe-area-bottom shadow-sm">
        <div className="max-w-lg mx-auto">
          {isOrganizer ? (
            // Organizer: go straight to chat
            <button
              onClick={() => navigate(`/event/${event.id}/chat`)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-2xl transition-all active:scale-95"
            >
              💬 Перейти в чат
            </button>
          ) : joined ? (
            // Already a participant: show success badge + chat button
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-medium">
                <span className="text-green-500 text-lg">✓</span>
                Ви приєднались до події
              </div>
              <button
                onClick={() => navigate(`/event/${event.id}/chat`)}
                className="w-full bg-green-500 hover:bg-green-400 text-white font-semibold py-4 rounded-2xl transition-all active:scale-95"
              >
                💬 Перейти в чат події
              </button>
            </div>
          ) : isFull ? (
            // No slots left
            <button
              disabled
              className="w-full bg-gray-100 text-gray-400 font-semibold py-4 rounded-2xl"
            >
              🚫 Місць немає
            </button>
          ) : (
            // Main CTA: join
            <button
              onClick={handleJoin}
              disabled={joining || !supaUser}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all active:scale-95"
            >
              {joining ? 'Приєднуємось...' : 'Приєднатись'}
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
