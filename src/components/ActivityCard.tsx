import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Activity } from '@/types'

interface Props {
  activity: Activity
  onMatch?: () => void
}

const EMOJI_MAP: Record<string, string> = {
  cafe:  '☕',
  walk:  '🚶',
  sport: '🏃',
  bar:   '🍺',
  kino:  '🎬',
  board: '🎲',
  food:  '🍕',
  other: '💬',
  cinema:     '🎬',
  boardgames: '🎲',
  eat:        '🍕',
}

const LABEL_MAP: Record<string, string> = {
  cafe:  'Кафе',
  walk:  'Прогулянка',
  sport: 'Спорт',
  bar:   'Бар',
  kino:  'Кіно',
  board: 'Настолки',
  food:  'Поїсти',
  other: 'Інше',
  cinema:     'Кіно',
  boardgames: 'Настолки',
  eat:        'Поїсти',
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('uk-UA', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function ActivityCard({ activity, onMatch }: Props) {
  const { supaUser } = useAuth()
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const emoji = EMOJI_MAP[activity.type] ?? '💬'
  const label = LABEL_MAP[activity.type] ?? activity.type

  const avatarUrl = activity.user_avatar_url ?? activity.author?.avatar_url ?? null
  const userName = activity.user_name ?? activity.author?.name ?? 'Користувач'
  const googleVerified = activity.user_google_verified ?? activity.author?.google_verified ?? false

  const isOwn = supaUser?.id === activity.user_id

  async function handleInterest() {
    if (!supaUser || isOwn) return
    setLoading(true)

    const { data: existing } = await supabase
      .from('interests')
      .select('id')
      .eq('activity_id', activity.id)
      .eq('user_id', supaUser.id)
      .single()

    if (!existing) {
      await supabase.from('interests').insert({ activity_id: activity.id, user_id: supaUser.id })

      const { data: mutual } = await supabase
        .from('interests')
        .select('id')
        .eq('activity_id', activity.id)
        .eq('user_id', activity.user_id)
        .single()

      if (mutual) {
        onMatch?.()
      }
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <span>{emoji}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-gray-900 font-semibold text-sm truncate">{userName}</span>
            {googleVerified && (
              <span title="Верифіковано Google" className="text-blue-600 text-xs">✓</span>
            )}
            <span className="text-gray-400 text-xs ml-auto flex-shrink-0">
              {activity.distance_km != null ? `${activity.distance_km.toFixed(1)} км` : ''}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-indigo-600 text-xs bg-indigo-50 px-2 py-0.5 rounded-full">
              {emoji} {label}
            </span>
          </div>

          <p className="text-gray-600 text-sm mt-2 line-clamp-2">{activity.description}</p>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-gray-400 space-y-0.5">
              <div>🕐 {formatTime(activity.when_time)}</div>
              <div>📍 {activity.location}</div>
              <div>
                👤 {activity.looking_for_gender === 'any' ? 'Будь-хто' : activity.looking_for_gender === 'male' ? 'Хлопець' : 'Дівчина'},&nbsp;
                {activity.age_min}–{activity.age_max} р.
              </div>
            </div>

            {!isOwn && (
              <button
                onClick={handleInterest}
                disabled={sent || loading}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                  sent
                    ? 'bg-green-50 text-green-600 border border-green-200'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {loading ? '...' : sent ? 'Надіслано ✓' : 'Написати'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
