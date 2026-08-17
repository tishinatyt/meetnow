import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function Profile() {
  const { profile, supaUser, signOut, refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile?.name ?? '')
  const [age, setAge] = useState(String(profile?.age ?? ''))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSave() {
    if (!supaUser) return
    setSaving(true)
    await supabase.from('users').update({ name: name.trim(), age: parseInt(age) }).eq('id', supaUser.id)
    await refreshProfile()
    setSaving(false)
    setEditing(false)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !supaUser) return
    setUploading(true)
    const path = `${supaUser.id}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) {
      console.error('Avatar upload error:', upErr.message)
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('users').update({ avatar_url: urlData.publicUrl }).eq('id', supaUser.id)
    await refreshProfile()
    setUploading(false)
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24">
      <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">👤 Профіль</h1>
        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          className="text-indigo-600 text-sm font-medium"
        >
          {saving ? 'Зберігаємо...' : editing ? 'Зберегти' : 'Редагувати'}
        </button>
      </div>

      <div className="px-4 pt-6 max-w-lg mx-auto">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-24 h-24 object-cover" />
              ) : (
                <div className="w-24 h-24 flex items-center justify-center text-5xl">👤</div>
              )}
            </div>
            {editing && (
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-1.5 text-sm"
              >
                {uploading ? '⏳' : '📷'}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

          {!editing && (
            <>
              <h2 className="text-2xl font-bold mt-3 text-gray-900">{profile.name}</h2>
              <div className="flex items-center gap-2 mt-1 text-gray-500">
                <span>{profile.age} р.</span>
                <span>·</span>
                <span>{profile.gender === 'male' ? 'Чоловік' : 'Жінка'}</span>
                {profile.google_verified && (
                  <span className="text-blue-600 text-xs bg-blue-50 px-2 py-0.5 rounded-full">✓ Google</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Edit form */}
        {editing && (
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5 font-medium">Ім'я</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5 font-medium">Вік</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm text-center">
            <div className="text-3xl font-bold text-indigo-600">0</div>
            <div className="text-sm text-gray-500 mt-1">Зустрічей</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm text-center">
            <div className="text-3xl font-bold text-amber-500">5.0</div>
            <div className="text-sm text-gray-500 mt-1">⭐ Рейтинг</div>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="w-full border border-red-200 text-red-500 py-3 rounded-2xl hover:bg-red-50 transition-colors"
        >
          Вийти
        </button>
      </div>
    </div>
  )
}
