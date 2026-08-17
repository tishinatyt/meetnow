import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const CATEGORY_EMOJI: Record<string, string> = {
  cinema: '🎬', theatre: '🎭', bar: '🍺', sport: '🏃',
  music: '🎵', food: '🍕', games: '🎲', walk: '🚶', art: '🎨', other: '💬',
}

const CATEGORY_LABEL: Record<string, string> = {
  cinema: 'Кіно', theatre: 'Театр', bar: 'Бар', sport: 'Спорт',
  music: 'Музика', food: 'Їжа', games: 'Ігри', walk: 'Прогулянка',
  art: 'Мистецтво', other: 'Інше',
}

interface ChatItem {
  eventId: string
  title: string
  category: string
  address_text: string
  role: 'organizer' | 'participant'
  chatId: string | null
}

export default function Chats() {
  const navigate = useNavigate()
  const { supaUser } = useAuth()
  const [chats, setChats] = useState<ChatItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchChats = useCallback(async () => {
    if (!supaUser) return
    setLoading(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('event_participants')
      .select(`
        role,
        event:events!event_participants_event_id_fkey(
          id, title, category, address_text,
          chats:event_chats(id)
        )
      `)
      .eq('user_id', supaUser.id)
      .eq('status', 'joined')

    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: ChatItem[] = (data as any[])
        .map((p) => {
          const ev = Array.isArray(p.event) ? p.event[0] : p.event
          if (!ev) return null
          const chatArr = Array.isArray(ev.chats) ? ev.chats : (ev.chats ? [ev.chats] : [])
          return {
            eventId: ev.id,
            title: ev.title,
            category: ev.category,
            address_text: ev.address_text,
            role: p.role as 'organizer' | 'participant',
            chatId: chatArr[0]?.id ?? null,
          }
        })
        .filter(Boolean) as ChatItem[]
      setChats(items)
    }

    setLoading(false)
  }, [supaUser])

  useEffect(() => { fetchChats() }, [fetchChats])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-4">
        <h1 className="text-xl font-bold">💬 Мої чати</h1>
      </div>

      <div className="px-4 pt-4 space-y-2 max-w-lg mx-auto">
        {/* Skeleton */}
        {loading && (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-200 shadow-sm" />
          ))
        )}

        {/* Empty */}
        {!loading && chats.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">💭</div>
            <p className="text-gray-500">Ви ще не в жодному чаті</p>
            <p className="text-sm mt-1 text-gray-400">Приєднайтесь до події на головному екрані</p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-all active:scale-95 text-sm"
            >
              До подій
            </button>
          </div>
        )}

        {/* Chat list */}
        {!loading && chats.map((item) => {
          const emoji = CATEGORY_EMOJI[item.category] ?? '💬'
          const categoryLabel = CATEGORY_LABEL[item.category] ?? item.category
          return (
            <button
              key={item.eventId}
              onClick={() => navigate(`/event/${item.eventId}/chat`)}
              className="w-full bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center gap-3 text-left hover:border-indigo-300 hover:shadow-md transition-all"
            >
              {/* Category icon */}
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl flex-shrink-0">
                {emoji}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-900 truncate text-sm">{item.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    item.role === 'organizer'
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'bg-green-50 text-green-600'
                  }`}>
                    {item.role === 'organizer' ? 'Ведучий' : 'Учасник'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {emoji} {categoryLabel} · {item.address_text || 'Місце не вказано'}
                </p>
              </div>

              <span className="text-indigo-400 text-xl flex-shrink-0">›</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
