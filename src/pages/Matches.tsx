import { useNavigate } from 'react-router-dom'
import { useMatches } from '@/hooks/useMatches'
import type { Match } from '@/types'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} хв тому`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} год тому`
  return `${Math.floor(hrs / 24)} дн тому`
}

export default function Matches() {
  const { matches, loading } = useMatches()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24">
      <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-4">
        <h1 className="text-xl font-bold">💬 Мої мэтчі</h1>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {loading && (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-200 shadow-sm" />
          ))
        )}

        {!loading && matches.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">💭</div>
            <p className="text-gray-500">Поки немає мэтчів</p>
            <p className="text-sm mt-1">Вираз інтерес до активностей у стрічці!</p>
          </div>
        )}

        {!loading && matches.map((match: Match) => (
          <button
            key={match.id}
            onClick={() => navigate(`/chat/${match.id}`)}
            className="w-full bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center gap-3 text-left hover:border-indigo-300 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
              {match.other_user?.avatar_url ? (
                <img src={match.other_user.avatar_url} alt="" className="w-12 h-12 object-cover" />
              ) : (
                <div className="w-12 h-12 flex items-center justify-center text-2xl">👤</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">{match.other_user?.name ?? 'Користувач'}</span>
                <span className="text-xs text-gray-400">{timeAgo(match.created_at)}</span>
              </div>
              <p className="text-sm text-gray-500 truncate mt-0.5">
                {match.activity?.description ?? 'Активність'}
              </p>
            </div>
            <span className="text-indigo-500 text-xl">›</span>
          </button>
        ))}
      </div>
    </div>
  )
}
