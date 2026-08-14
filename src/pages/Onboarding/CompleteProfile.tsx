import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Gender } from '@/types'

export default function CompleteProfile() {
  const { supaUser, refreshProfile } = useAuth()
  const [name, setName] = useState(supaUser?.user_metadata?.full_name?.split(' ')[0] ?? '')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim() || !age) { setError('Заповни всі поля'); return }
    const ageNum = parseInt(age)
    if (ageNum < 16 || ageNum > 100) { setError('Вік має бути від 16 до 100'); return }

    setSaving(true)
    const { error: err } = await supabase.from('users').upsert({
      id: supaUser!.id,
      name: name.trim(),
      age: ageNum,
      gender,
      avatar_url: supaUser?.user_metadata?.avatar_url ?? null,
      google_verified: true,
    })
    if (err) { setError(err.message); setSaving(false); return }
    await refreshProfile()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 text-gray-900">
      <div className="max-w-sm mx-auto w-full">
        <h2 className="text-2xl font-bold mb-1">Розкажи про себе</h2>
        <p className="text-gray-500 mb-8">Це бачитимуть інші учасники</p>

        {error && <div className="mb-4 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl border border-red-100">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5 font-medium">Ім'я</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Як тебе звати?"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5 font-medium">Вік</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="18"
              min={16}
              max={100}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5 font-medium">Стать</label>
            <div className="flex gap-3">
              {(['male', 'female'] as Gender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`flex-1 py-3 rounded-xl border transition-all ${
                    gender === g
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  {g === 'male' ? '👨 Чоловік' : '👩 Жінка'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-2xl transition-all active:scale-95 mt-4"
          >
            {saving ? 'Зберігаємо...' : 'Продовжити'}
          </button>
        </div>
      </div>
    </div>
  )
}
