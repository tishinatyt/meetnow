import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// ── Types ──────────────────────────────────────────────────────────────────

interface Sender {
  id: string
  name: string
  avatar_url: string | null
}

interface ChatMessage {
  id: string
  event_chat_id: string
  sender_id: string
  content: string
  created_at: string
  sender: Sender | null
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
}

// Supabase FK joins can return arrays — normalize to single object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(p: any): ChatMessage {
  return { ...p, sender: Array.isArray(p.sender) ? (p.sender[0] ?? null) : (p.sender ?? null) }
}

// ── Component ───────────────────────────────────────────────────────────────

export default function EventChat() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { supaUser } = useAuth()

  const [eventTitle, setEventTitle] = useState('')
  const [participantCount, setParticipantCount] = useState(0)
  const [chatId, setChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isParticipant, setIsParticipant] = useState<boolean | null>(null) // null = loading
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!id || !supaUser) return
    setLoading(true)

    const [eventRes, participantCheckRes, chatRes, countRes] = await Promise.all([
      supabase.from('events').select('title').eq('id', id).single(),
      // Check if current user is a participant (will fail/empty if not, due to RLS)
      supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', id)
        .eq('user_id', supaUser.id)
        .eq('status', 'joined')
        .maybeSingle(),
      // Get the group chat row (RLS ec_select requires being a participant)
      supabase.from('event_chats').select('id').eq('event_id', id).maybeSingle(),
      // Count participants (use head:true for count-only query)
      supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', id)
        .eq('status', 'joined'),
    ])

    setEventTitle(eventRes.data?.title ?? 'Подія')
    setParticipantCount(countRes.count ?? 0)

    const userIsParticipant = !!participantCheckRes.data
    setIsParticipant(userIsParticipant)

    if (!userIsParticipant || !chatRes.data) {
      setLoading(false)
      return
    }

    const cid = chatRes.data.id
    setChatId(cid)

    const { data: msgs } = await supabase
      .from('event_chat_messages')
      .select('*, sender:users!event_chat_messages_sender_id_fkey(id, name, avatar_url)')
      .eq('event_chat_id', cid)
      .order('created_at', { ascending: true })

    setMessages((msgs ?? []).map(normalize))
    setLoading(false)
  }, [id, supaUser])

  useEffect(() => { load() }, [load])

  // ── Realtime subscription ──────────────────────────────────────────────────

  useEffect(() => {
    if (!chatId) return

    const channel = supabase
      .channel(`event-chat:${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'event_chat_messages', filter: `event_chat_id=eq.${chatId}` },
        async (payload) => {
          // Fetch full row with sender info (payload.new lacks joined columns)
          const { data } = await supabase
            .from('event_chat_messages')
            .select('*, sender:users!event_chat_messages_sender_id_fkey(id, name, avatar_url)')
            .eq('id', (payload.new as { id: string }).id)
            .single()
          if (data) setMessages((prev) => [...prev, normalize(data)])
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [chatId])

  // ── Auto-scroll on new messages ────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: messages.length <= 1 ? 'instant' : 'smooth' })
  }, [messages])

  // ── Send ───────────────────────────────────────────────────────────────────

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || !chatId || !supaUser || sending) return
    setSending(true)
    setSendError(null)
    const { error } = await supabase.from('event_chat_messages').insert({
      event_chat_id: chatId,
      sender_id: supaUser.id,
      content: trimmed,
    })
    if (error) setSendError(error.message)
    else setText('')
    setSending(false)
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading || isParticipant === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="h-14 bg-white border-b border-gray-200 animate-pulse" />
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-white rounded-2xl animate-pulse border border-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  // Not a participant — show gate
  if (!isParticipant) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shadow-sm">
          <button
            onClick={() => navigate(`/event/${id}`)}
            className="text-gray-400 hover:text-gray-700 p-1 -ml-1"
          >
            ←
          </button>
          <span className="font-semibold text-gray-900 truncate">{eventTitle}</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Чат доступний тільки учасникам
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Приєднайтесь до події щоб побачити чат
          </p>
          <button
            onClick={() => navigate(`/event/${id}`)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-2xl transition-all active:scale-95"
          >
            Приєднатись
          </button>
        </div>
      </div>
    )
  }

  // ── Main chat UI ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">

      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur z-10 border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => navigate(`/event/${id}`)}
          className="text-gray-400 hover:text-gray-700 transition-colors p-1 -ml-1"
          aria-label="Назад"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate text-sm leading-tight">
            {eventTitle}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {participantCount} {participantCount === 1 ? 'учасник' : 'учасників'}
          </div>
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-gray-500 text-sm">
              Поки що немає повідомлень — напишіть перше!
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === supaUser!.id
          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar — only for others */}
              {!isMe && (
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 self-end">
                  {msg.sender?.avatar_url ? (
                    <img
                      src={msg.sender.avatar_url}
                      alt={msg.sender.name}
                      className="w-8 h-8 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 flex items-center justify-center text-xs">👤</div>
                  )}
                </div>
              )}

              {/* Bubble + meta */}
              <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && (
                  <span className="text-xs text-gray-400 px-1 leading-none">
                    {msg.sender?.name ?? 'Учасник'}
                  </span>
                )}
                <div
                  className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <span className={`text-xs text-gray-400 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                  {formatTime(msg.created_at)}
                </span>
              </div>
            </div>
          )
        })}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 safe-area-bottom">
        <div className="max-w-lg mx-auto flex flex-col gap-1">
          {sendError && (
            <p className="text-red-500 text-xs px-1">{sendError}</p>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              placeholder="Написати повідомлення..."
              maxLength={4000}
              className="flex-1 bg-gray-100 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:bg-white transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
              aria-label="Відправити"
            >
              ↑
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
