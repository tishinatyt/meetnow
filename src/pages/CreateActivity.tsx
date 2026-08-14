import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentPosition } from '@/lib/geo'
import { ACTIVITY_META, ACTIVITY_TYPES } from '@/lib/activityMeta'
import type { ActivityType, Gender } from '@/types'

export default function CreateActivity() {
  const navigate = useNavigate()
  const { supaUser } = useAuth()

  const [type, setType] = useState<ActivityType>('walk')
  const [description, setDescription] = useState('')
  const [gender, setGender] = useState<Gender>('any')
  const [ageMin, setAgeMin] = useState('18')
  const [ageMax, setAgeMax] = useState('40')
  const [whenTime, setWhenTime] = useState('')
  const [location, setLocation] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function detectLocation() {
    setGeoLoading(true)
    const pos = await getCurrentPosition()
    setCoords(pos)
    if (!location) setLocation('Моє місцезнаходження')
    setGeoLoading(false)
  }

  async function handleSubmit() {
    if (!description.trim() || !whenTime || !location.trim()) {
      setError('Заповни опис, час та місце')
      return
    }
    setSaving(true)
    setError('')

    const pos = coords ?? await getCurrentPosition()

    const { error: err } = await supabase.from('activities').insert({
      user_id: supaUser!.id,
      type,
      description: description.trim(),
      looking_for_gender: gender,
      age_min: parseInt(ageMin),
      age_max: parseInt(ageMax),
      when_time: whenTime,
      location: location.trim(),
      lat: pos.lat,
      lng: pos.lng,
      status: 'active',
    })

    if (err) { setError(err.message); setSaving(false); return }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24">
      <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-4">
        <h1 className="text-xl font-bold">➕ Нова активність</h1>
      </div>

      <div className="px-4 pt-5 space-y-5 max-w-lg mx-auto">
        {error && (
          <div className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl border border-red-100">{error}</div>
        )}

        {/* Type */}
        <div>
          <label className="block text-sm text-gray-600 mb-2 font-medium">Тип активності</label>
          <div className="grid grid-cols-4 gap-2">
            {ACTIVITY_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex flex-col items-center py-3 rounded-xl border text-xs transition-all ${
                  type === t
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                }`}
              >
                <span className="text-2xl mb-1">{ACTIVITY_META[t].emoji}</span>
                {ACTIVITY_META[t].label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm text-gray-600 mb-1.5 font-medium">Опис</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Розкажи детальніше що плануєш..."
            rows={3}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 resize-none transition-colors"
          />
        </div>

        {/* Looking for gender */}
        <div>
          <label className="block text-sm text-gray-600 mb-1.5 font-medium">Шукаю</label>
          <div className="flex gap-2">
            {(['any', 'male', 'female'] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`flex-1 py-2.5 rounded-xl border text-sm transition-all ${
                  gender === g
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                }`}
              >
                {g === 'any' ? '🙋 Будь-хто' : g === 'male' ? '👨 Хлопця' : '👩 Дівчину'}
              </button>
            ))}
          </div>
        </div>

        {/* Age range */}
        <div>
          <label className="block text-sm text-gray-600 mb-1.5 font-medium">Вік (від–до)</label>
          <div className="flex gap-3 items-center">
            <input
              type="number"
              value={ageMin}
              onChange={(e) => setAgeMin(e.target.value)}
              min={16} max={100}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <span className="text-gray-400">—</span>
            <input
              type="number"
              value={ageMax}
              onChange={(e) => setAgeMax(e.target.value)}
              min={16} max={100}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* When */}
        <div>
          <label className="block text-sm text-gray-600 mb-1.5 font-medium">Коли</label>
          <input
            type="datetime-local"
            value={whenTime}
            onChange={(e) => setWhenTime(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm text-gray-600 mb-1.5 font-medium">Місце</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Парк Шевченка, Чернігів"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              onClick={detectLocation}
              disabled={geoLoading}
              title="Визначити моє місцезнаходження"
              className="bg-white border border-gray-200 rounded-xl px-3 py-3 text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
            >
              {geoLoading ? '⏳' : '📍'}
            </button>
          </div>
          {coords && (
            <p className="text-xs text-green-600 mt-1">📍 Координати визначено</p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all active:scale-95"
        >
          {saving ? 'Публікуємо...' : '⚡ Опублікувати'}
        </button>
      </div>
    </div>
  )
}
