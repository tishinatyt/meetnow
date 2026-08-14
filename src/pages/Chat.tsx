import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMessages } from '@/hooks/useMessages'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Match } from '@/types'

export default function Chat() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { supaUser } = useAuth()
  const { messages, loading, sendMessage } = useMessages(matchId!)
  const [text, setText] = useState('')
  const [match, setMatch] = useState<Match | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!matchId || !supaUser) return

    supabase
      .from('matches')
      .select(`
        *,
        user1:users!matches_user1_id_fkey(id, name, avatar_url),
        user2:users!matches_user2_id_fkey(id, name, avatar_url)
      `)
      .eq('id', matchId)
      .single()
      .then(({ data }) => {
        if (!data) { navigate('/chats'); return }
        if (data.user1_id !== supaUser.id && data.user2_id !== supaUser.id) {
          navigate('/chats')
          return
        }
        const enriched = {
          ...data,
          other_user: data.user1_id === supaUser.id ? data.user2 : data.user1,
        }
        setMatch(enriched as Match)
      })
  }, [matchId, supaUser, navigate])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!text.trim() || !supaUser) return
    const msg = text.trim()
    setText('')
    await sendMessage(supaUser.id, msg)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white/95 backdrop-blur shadow-sm">
        <button onClick={() => navigate('/chats')} className="text-gray-400 hover:text-gray-700 pr-1">←</button>
        <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {match?.other_user?.avatar_url ? (
            <img src={match.other_user.avatar_url} alt="" className="w-9 h-9 object-cover" />
          ) : (
            <div className="w-9 h-9 flex items-center justify-center">👤</div>
          )}
        </div>
        <span className="font-semibold text-gray-900">{match?.other_user?.name ?? '...'}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading && <div className="text-center text-gray-400 py-8">Завантажуємо...</div>}

        {!loading && messages.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <div className="text-3xl mb-2">👋</div>
            <p>Ви зробили мэтч! Напишіть перше повідомлення</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === supaUser?.id
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm shadow-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white pb-safe">
        <div className="flex gap-2 items-end">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Написати повідомлення..."
            rows={1}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 resize-none text-sm transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-2xl px-4 py-3 transition-all active:scale-95"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}
