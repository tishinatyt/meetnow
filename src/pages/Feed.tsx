import { useState, useEffect } from 'react'
import { useActivities } from '@/hooks/useActivities'
import ActivityCard from '@/components/ActivityCard'
import AdCard from '@/components/AdCard'
import { supabase } from '@/lib/supabase'
import type { AdCard as AdCardType, ActivityType, Gender } from '@/types'
import { ACTIVITY_META, ACTIVITY_TYPES } from '@/lib/activityMeta'

export default function Feed() {
  const { activities, loading, filters, setFilters, refresh } = useActivities()
  const [ads, setAds] = useState<AdCardType[]>([])
  const [matchToast, setMatchToast] = useState(false)

  useEffect(() => {
    supabase.from('ad_cards').select('*').eq('active', true).then(({ data }) => {
      if (data) setAds(data as AdCardType[])
    })
  }, [])

  function handleMatch() {
    setMatchToast(true)
    setTimeout(() => setMatchToast(false), 4000)
  }

  function buildFeed() {
    const items: Array<{ type: 'activity' | 'ad'; data: unknown; key: string }> = []
    let adIdx = 0
    activities.forEach((act, i) => {
      items.push({ type: 'activity', data: act, key: act.id })
      if ((i + 1) % 6 === 0 && ads.length > 0) {
        const ad = ads[adIdx % ads.length]
        items.push({ type: 'ad', data: ad, key: `ad-${adIdx}` })
        adIdx++
      }
    })
    return items
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur z-10 px-4 pt-4 pb-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">⚡ MeetNow</h1>
          <button onClick={refresh} className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
            🔄
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value as ActivityType | 'all' })}
            className="bg-gray-50 border border-gray-200 text-sm text-gray-900 rounded-xl px-3 py-1.5 flex-shrink-0 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Всі типи</option>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>{ACTIVITY_META[t].emoji} {ACTIVITY_META[t].label}</option>
            ))}
          </select>

          <select
            value={filters.gender}
            onChange={(e) => setFilters({ ...filters, gender: e.target.value as Gender | 'all' })}
            className="bg-gray-50 border border-gray-200 text-sm text-gray-900 rounded-xl px-3 py-1.5 flex-shrink-0 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Будь-яка стать</option>
            <option value="male">Хлопці</option>
            <option value="female">Дівчата</option>
          </select>

          <select
            value={`${filters.age_min}-${filters.age_max}`}
            onChange={(e) => {
              const [min, max] = e.target.value.split('-').map(Number)
              setFilters({ ...filters, age_min: min, age_max: max })
            }}
            className="bg-gray-50 border border-gray-200 text-sm text-gray-900 rounded-xl px-3 py-1.5 flex-shrink-0 focus:outline-none focus:border-indigo-500"
          >
            <option value="18-60">Будь-який вік</option>
            <option value="18-25">18–25</option>
            <option value="25-35">25–35</option>
            <option value="35-50">35–50</option>
          </select>
        </div>
      </div>

      {/* Feed */}
      <div className="px-4 pt-4 space-y-3">
        {loading && (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-36 animate-pulse border border-gray-200 shadow-sm" />
          ))
        )}

        {!loading && activities.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">😶</div>
            <p className="text-gray-500">Поки немає активностей поруч</p>
            <p className="text-sm mt-1">Будь першим — створи свою!</p>
          </div>
        )}

        {!loading && buildFeed().map((item) =>
          item.type === 'activity' ? (
            <ActivityCard
              key={item.key}
              activity={item.data as Parameters<typeof ActivityCard>[0]['activity']}
              onMatch={handleMatch}
            />
          ) : (
            <AdCard key={item.key} ad={item.data as AdCardType} />
          )
        )}
      </div>

      {/* Match toast */}
      {matchToast && (
        <div className="fixed top-4 inset-x-4 bg-green-500 text-white rounded-2xl p-4 shadow-xl z-50 text-center animate-bounce">
          🎉 Мэтч! Тепер можна спілкуватись у вкладці «Мэтчі»
        </div>
      )}
    </div>
  )
}
