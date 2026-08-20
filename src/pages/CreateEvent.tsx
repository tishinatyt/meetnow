import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'cinema',  label: 'Кіно',        emoji: '🎬' },
  { value: 'theatre', label: 'Театр',        emoji: '🎭' },
  { value: 'bar',     label: 'Бар',          emoji: '🍺' },
  { value: 'sport',   label: 'Спорт',        emoji: '🏃' },
  { value: 'music',   label: 'Музика',       emoji: '🎵' },
  { value: 'food',    label: 'Їжа',          emoji: '🍕' },
  { value: 'games',   label: 'Ігри',         emoji: '🎲' },
  { value: 'walk',    label: 'Прогулянка',   emoji: '🚶' },
  { value: 'art',     label: 'Мистецтво',    emoji: '🎨' },
  { value: 'other',   label: 'Інше',         emoji: '✨' },
] as const

const GENDER_OPTIONS = [
  { value: 'any',    label: 'Будь-хто' },
  { value: 'male',   label: 'Чоловіки' },
  { value: 'female', label: 'Жінки' },
] as const

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns local datetime string compatible with <input type="datetime-local"> */
function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/** Default start: 1 hour from now, rounded to the next full hour */
function defaultStart(): string {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return toLocalDatetimeString(d)
}

/** Default end: 2 hours from now */
function defaultEnd(): string {
  const d = new Date()
  d.setHours(d.getHours() + 2, 0, 0, 0)
  return toLocalDatetimeString(d)
}

// ── Leaflet CSS injected once (mirrors EventMap.tsx pattern) ──────────────────

let cssInjected = false
function injectLeafletCSS() {
  if (cssInjected) return
  cssInjected = true
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
  document.head.appendChild(link)
}

// ── CreateMap component ───────────────────────────────────────────────────────

interface CreateMapProps {
  lat: number | null
  lng: number | null
  onPick: (lat: number, lng: number) => void
}

function CreateMap({ lat, lng, onPick }: CreateMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null)

  // Store onPick in a ref so the click handler closure stays current without
  // needing to re-create the map on every render.
  const onPickRef = useRef(onPick)
  useEffect(() => { onPickRef.current = onPick }, [onPick])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    injectLeafletCSS()

    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return

      // Fix default icon paths broken by bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      // Default center: Chernihiv, Ukraine
      const initLat = lat ?? 51.4982
      const initLng = lng ?? 31.2893

      const map = L.map(containerRef.current!, {
        center:           [initLat, initLng],
        zoom:             14,
        zoomControl:      true,
        scrollWheelZoom:  false,
        attributionControl: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map)

      // Place marker at initial coords if already set
      if (lat !== null && lng !== null) {
        markerRef.current = L.marker([lat, lng])
          .addTo(map)
          .bindPopup('Місце події', { closeButton: false })
          .openPopup()
      }

      // Click handler: place / move marker
      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        const { lat: clickLat, lng: clickLng } = e.latlng

        if (markerRef.current) {
          markerRef.current.setLatLng([clickLat, clickLng])
        } else {
          markerRef.current = L.marker([clickLat, clickLng])
            .addTo(map)
            .bindPopup('Місце події', { closeButton: false })
            .openPopup()
        }

        onPickRef.current(clickLat, clickLng)
      })

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
    // Intentionally run once on mount — marker updates handled separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync marker position when lat/lng change from outside (e.g. clear)
  useEffect(() => {
    if (!mapRef.current) return
    import('leaflet').then((L) => {
      if (lat === null || lng === null) {
        if (markerRef.current) {
          markerRef.current.remove()
          markerRef.current = null
        }
      } else if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
        mapRef.current?.panTo([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng])
          .addTo(mapRef.current)
          .bindPopup('Місце події', { closeButton: false })
          .openPopup()
        mapRef.current?.panTo([lat, lng])
      }
    })
  }, [lat, lng])

  return (
    <div
      ref={containerRef}
      className="w-full h-56 rounded-2xl overflow-hidden border border-brand-border cursor-crosshair"
      style={{ zIndex: 0 }}
    />
  )
}

// ── Form state type ───────────────────────────────────────────────────────────

interface FormState {
  is_public:       boolean
  title:           string
  description:     string
  category:        string
  cover_photo_url: string
  event_datetime:  string
  end_datetime:    string
  address_text:    string
  lat:             number | null
  lng:             number | null
  max_participants: number
  min_age:         number
  max_age:         number
  gender_filter:   'any' | 'male' | 'female'
}

// ── CreateEvent ───────────────────────────────────────────────────────────────

export default function CreateEvent() {
  const navigate = useNavigate()
  const { supaUser } = useAuth()

  const [form, setForm] = useState<FormState>({
    is_public:        true,
    title:            '',
    description:      '',
    category:         'other',
    cover_photo_url:  '',
    event_datetime:   defaultStart(),
    end_datetime:     defaultEnd(),
    address_text:     '',
    lat:              null,
    lng:              null,
    max_participants: 10,
    min_age:          16,
    max_age:          99,
    gender_filter:    'any',
  })

  const [errors, setErrors]     = useState<Partial<Record<keyof FormState | 'submit', string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [geocoding, setGeocoding] = useState(false)

  // When event_datetime changes for a PRIVATE event, auto-set end_datetime = start + 1h
  useEffect(() => {
    if (!form.is_public && form.event_datetime) {
      const start = new Date(form.event_datetime)
      if (!isNaN(start.getTime())) {
        const end = new Date(start.getTime() + 60 * 60 * 1000)
        setForm((f) => ({ ...f, end_datetime: toLocalDatetimeString(end) }))
      }
    }
  }, [form.event_datetime, form.is_public])

  // When switching public → private, recalculate end from current start
  useEffect(() => {
    if (!form.is_public && form.event_datetime) {
      const start = new Date(form.event_datetime)
      if (!isNaN(start.getTime())) {
        const end = new Date(start.getTime() + 60 * 60 * 1000)
        setForm((f) => ({ ...f, end_datetime: toLocalDatetimeString(end) }))
      }
    }
  // Only re-run when is_public toggles
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.is_public])

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }, [])

  const handleMapPick = useCallback(async (lat: number, lng: number) => {
    setForm((f) => ({ ...f, lat, lng }))
    setErrors((e) => ({ ...e, lat: undefined }))

    // Reverse-geocode via Nominatim (OSM) to auto-fill address_text.
    // Guaranteed fallback: always sets address_text to coordinates if geocoding fails.
    const coordFallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    setGeocoding(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=uk`,
        { headers: { 'User-Agent': 'meetnow-app/1.0 (porooch)' } }
      )
      if (res.ok) {
        const json = await res.json()
        const address = (json.display_name as string | undefined) || coordFallback
        setForm((f) => ({ ...f, address_text: address }))
      } else {
        // Non-2xx (rate limit, server error, etc.) — use coordinate fallback
        console.warn('[CreateEvent] Nominatim returned', res.status, '— using coord fallback')
        setForm((f) => ({ ...f, address_text: f.address_text || coordFallback }))
      }
      setErrors((e) => ({ ...e, address_text: undefined }))
    } catch (err) {
      // Network error (CORS, offline, etc.) — guaranteed fallback
      console.warn('[CreateEvent] Nominatim fetch failed:', err)
      setForm((f) => ({ ...f, address_text: f.address_text || coordFallback }))
      setErrors((e) => ({ ...e, address_text: undefined }))
    } finally {
      setGeocoding(false)
    }
  }, [])

  // ── Validation ──────────────────────────────────────────────────────────────

  function validate(): boolean {
    const errs: typeof errors = {}

    if (!form.title.trim()) {
      errs.title = 'Назва події обовʼязкова'
    }

    if (!form.event_datetime) {
      errs.event_datetime = 'Вкажіть дату і час початку'
    } else {
      const start = new Date(form.event_datetime)
      if (isNaN(start.getTime())) {
        errs.event_datetime = 'Невірний формат дати'
      } else if (start <= new Date()) {
        errs.event_datetime = 'Дата початку повинна бути у майбутньому'
      }
    }

    if (form.is_public && form.end_datetime) {
      const start = new Date(form.event_datetime)
      const end   = new Date(form.end_datetime)
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
        errs.end_datetime = 'Час завершення повинен бути пізніше початку'
      }
    }

    if (form.min_age > form.max_age) {
      errs.min_age = 'Мінімальний вік не може перевищувати максимальний'
    }

    if (!form.address_text.trim()) {
      errs.address_text = 'Вкажіть адресу або клікніть на карті — вона підставиться автоматично'
    }

    if (form.lat === null || form.lng === null) {
      errs.lat = 'Клікніть на карту, щоб вказати місце події'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supaUser) return
    if (!validate()) return

    setSubmitting(true)
    setErrors({})

    const locationWKT = form.lat !== null && form.lng !== null
      ? `POINT(${form.lng} ${form.lat})`
      : null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = {
      organizer_id:     supaUser.id,
      title:            form.title.trim(),
      description:      form.description.trim() || null,
      category:         form.category,
      is_public:        form.is_public,
      cover_photo_url:  form.cover_photo_url.trim() || null,
      event_datetime:   new Date(form.event_datetime).toISOString(),
      end_datetime:     form.end_datetime ? new Date(form.end_datetime).toISOString() : null,
      address_text:     form.address_text.trim(),
      location:         locationWKT,
      max_participants: form.max_participants,
      min_age:          form.min_age,
      max_age:          form.max_age,
      gender_filter:    form.gender_filter,
      status:           'upcoming',
    }

    // Defensive guard — block if address_text is still empty despite validation
    if (!payload.address_text) {
      console.error('[CreateEvent] address_text is empty at INSERT time — blocked')
      setErrors({ submit: 'Вкажіть адресу події перед відправкою' })
      setSubmitting(false)
      return
    }

    // DEBUG: session validity + organizer_id check before INSERT
    const { data: sessionData } = await supabase.auth.getSession()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = sessionData.session?.expires_at ?? 0
    console.log('[CreateEvent] session before insert:', {
      has_access_token: !!sessionData.session?.access_token,
      expires_at: expiresAt,
      now_unix: now,
      token_expired: expiresAt < now,
      seconds_until_expiry: expiresAt - now,
      organizer_id_being_sent: payload.organizer_id,
      current_auth_uid: authUser?.id,
      ids_match: payload.organizer_id === authUser?.id,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('events')
      .insert(payload)
      .select('id')
      .single()

    if (error || !data?.id) {
      console.error('[CreateEvent] insert error:', error)
      setErrors({ submit: error?.message ?? 'Не вдалося створити подію. Спробуйте ще раз.' })
      setSubmitting(false)
      return
    }

    navigate(`/event/${data.id}`)
  }

  // ── Shared input classes ────────────────────────────────────────────────────

  const inputCls = (field: keyof FormState) =>
    `w-full bg-white border ${errors[field] ? 'border-red-400' : 'border-brand-border'} ` +
    `rounded-xl px-4 py-2.5 text-sm text-brand-ink placeholder-brand-ink-muted ` +
    `focus:outline-none focus:border-brand-petrol transition-colors`

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-brand-bg text-brand-ink pb-32">

      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 bg-brand-bg/95 backdrop-blur z-20 border-b border-brand-border px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-brand-ink-muted hover:text-brand-ink transition-colors p-1 -ml-1"
          aria-label="Назад"
        >
          ←
        </button>
        <span className="font-semibold text-base flex-1 text-brand-ink font-display">Нова подія</span>
        <Link
          to="/"
          className="text-brand-ink-muted hover:text-brand-ink transition-colors p-1"
          aria-label="На головну"
        >
          🏠
        </Link>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="px-4 pt-5 space-y-5 max-w-lg mx-auto">

          {/* ── Public / Private toggle ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-4">
            <p className="text-xs text-brand-ink-muted uppercase tracking-wider mb-3">Тип події</p>
            <div className="flex rounded-xl overflow-hidden border border-brand-border">
              <button
                type="button"
                onClick={() => set('is_public', true)}
                className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                  form.is_public
                    ? 'bg-brand-petrol text-white'
                    : 'bg-white text-brand-ink-soft hover:bg-brand-bg'
                }`}
              >
                🌐 Публічна подія
              </button>
              <button
                type="button"
                onClick={() => set('is_public', false)}
                className={`flex-1 py-2.5 text-sm font-medium transition-all border-l border-brand-border ${
                  !form.is_public
                    ? 'bg-brand-amber text-white'
                    : 'bg-white text-brand-ink-soft hover:bg-brand-bg'
                }`}
              >
                🔒 Приватна подія
              </button>
            </div>
            <p className="text-xs text-brand-ink-muted mt-2">
              {form.is_public
                ? 'Видима всім у стрічці подій. Будь-хто може приєднатись.'
                : 'Видима тільки запрошеним. Тривалість — 1 година.'}
            </p>
          </div>

          {/* ── Title ──────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-4 space-y-1">
            <label className="text-xs text-brand-ink-muted uppercase tracking-wider" htmlFor="title">
              Назва події <span className="text-red-400">*</span>
            </label>
            <input
              id="title"
              type="text"
              placeholder="Наприклад: Кіно в суботу ввечері"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              maxLength={120}
              className={inputCls('title')}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* ── Description ────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-4 space-y-1">
            <label className="text-xs text-brand-ink-muted uppercase tracking-wider" htmlFor="description">
              Опис
            </label>
            <textarea
              id="description"
              rows={3}
              placeholder="Розкажіть детальніше про подію..."
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              maxLength={1000}
              className={`${inputCls('description')} resize-none`}
            />
          </div>

          {/* ── Category ───────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-4">
            <p className="text-xs text-brand-ink-muted uppercase tracking-wider mb-3">Категорія</p>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => set('category', cat.value)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all ${
                    form.category === cat.value
                      ? 'border-brand-petrol bg-brand-petrol/10 text-brand-petrol'
                      : 'border-brand-border bg-brand-bg text-brand-ink-soft hover:border-brand-border-strong hover:bg-white'
                  }`}
                >
                  <span className="text-xl">{cat.emoji}</span>
                  <span className="text-[10px] font-medium leading-tight text-center">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Cover photo URL ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-4 space-y-1">
            <label className="text-xs text-brand-ink-muted uppercase tracking-wider" htmlFor="cover_photo_url">
              Фото обкладинки (URL, необовʼязково)
            </label>
            <input
              id="cover_photo_url"
              type="url"
              placeholder="https://..."
              value={form.cover_photo_url}
              onChange={(e) => set('cover_photo_url', e.target.value)}
              className={inputCls('cover_photo_url')}
            />
            {form.cover_photo_url && (
              <div className="mt-2 h-28 rounded-xl overflow-hidden border border-brand-border">
                <img
                  src={form.cover_photo_url}
                  alt="Прев'ю"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
            )}
          </div>

          {/* ── Date & time ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-4 space-y-3">
            <p className="text-xs text-brand-ink-muted uppercase tracking-wider">Дата і час</p>

            {/* Start */}
            <div className="space-y-1">
              <label className="text-xs text-brand-ink-soft" htmlFor="event_datetime">
                Початок <span className="text-red-400">*</span>
              </label>
              <input
                id="event_datetime"
                type="datetime-local"
                value={form.event_datetime}
                min={toLocalDatetimeString(new Date())}
                onChange={(e) => set('event_datetime', e.target.value)}
                className={inputCls('event_datetime')}
              />
              {errors.event_datetime && (
                <p className="text-xs text-red-500">{errors.event_datetime}</p>
              )}
            </div>

            {/* End */}
            {form.is_public ? (
              <div className="space-y-1">
                <label className="text-xs text-brand-ink-soft" htmlFor="end_datetime">
                  Завершення
                </label>
                <input
                  id="end_datetime"
                  type="datetime-local"
                  value={form.end_datetime}
                  min={form.event_datetime}
                  onChange={(e) => set('end_datetime', e.target.value)}
                  className={inputCls('end_datetime')}
                />
                {errors.end_datetime && (
                  <p className="text-xs text-red-500">{errors.end_datetime}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-brand-amber/10 border border-brand-amber/20 rounded-xl px-4 py-2.5">
                <span className="text-brand-amber">⏱</span>
                <span className="text-sm text-brand-amber font-medium">Тривалість: 1 година</span>
              </div>
            )}
          </div>

          {/* ── Location ────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-4 space-y-3">
            <p className="text-xs text-brand-ink-muted uppercase tracking-wider">Місце</p>

            <div className="space-y-1">
              <label className="text-xs text-brand-ink-soft" htmlFor="address_text">
                Адреса <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="address_text"
                  type="text"
                  placeholder="Вул. Шевченка, 10, Чернігів"
                  value={form.address_text}
                  onChange={(e) => set('address_text', e.target.value)}
                  className={`${inputCls('address_text')} ${geocoding ? 'pr-8' : ''}`}
                />
                {geocoding && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-ink-muted text-xs animate-pulse">
                    ⏳
                  </span>
                )}
              </div>
              {geocoding && (
                <p className="text-xs text-brand-ink-muted">Визначаємо адресу…</p>
              )}
              {errors.address_text && (
                <p className="text-xs text-red-500">{errors.address_text}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-brand-ink-soft">
                Клікніть на карту, щоб вказати точне місце{' '}
                <span className="text-red-400">*</span>
              </p>

              <CreateMap lat={form.lat} lng={form.lng} onPick={handleMapPick} />

              {form.lat !== null && form.lng !== null ? (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <span>✓</span>
                  Координати вказані: {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                </p>
              ) : (
                <p className="text-xs text-brand-ink-muted">Місце не вибрано</p>
              )}
              {errors.lat && <p className="text-xs text-red-500">{errors.lat}</p>}
            </div>
          </div>

          {/* ── Max participants ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-brand-ink-muted uppercase tracking-wider">Максимум учасників</p>
              <span className="text-sm font-bold text-brand-petrol">{form.max_participants}</span>
            </div>
            <input
              type="range"
              min={2}
              max={1000}
              step={1}
              value={form.max_participants}
              onChange={(e) => set('max_participants', Number(e.target.value))}
              className="w-full accent-brand-petrol"
            />
            <div className="flex justify-between text-xs text-brand-ink-muted">
              <span>2</span>
              <span>1000</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[5, 10, 20, 50, 100].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set('max_participants', n)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                    form.max_participants === n
                      ? 'bg-brand-petrol text-white border-brand-petrol'
                      : 'bg-brand-bg text-brand-ink-soft border-brand-border hover:border-brand-border-strong'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* ── Age range ───────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-4 space-y-3">
            <p className="text-xs text-brand-ink-muted uppercase tracking-wider">Віковий діапазон</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-brand-ink-soft" htmlFor="min_age">Від</label>
                <input
                  id="min_age"
                  type="number"
                  min={16}
                  max={100}
                  value={form.min_age}
                  onChange={(e) => set('min_age', Number(e.target.value))}
                  className={inputCls('min_age')}
                />
              </div>
              <span className="text-brand-ink-muted mt-5">—</span>
              <div className="flex-1 space-y-1">
                <label className="text-xs text-brand-ink-soft" htmlFor="max_age">До</label>
                <input
                  id="max_age"
                  type="number"
                  min={16}
                  max={100}
                  value={form.max_age}
                  onChange={(e) => set('max_age', Number(e.target.value))}
                  className={inputCls('max_age')}
                />
              </div>
            </div>
            {errors.min_age && <p className="text-xs text-red-500">{errors.min_age}</p>}
            <p className="text-xs text-brand-ink-muted">Учасники поза цим діапазоном не зможуть приєднатись</p>
          </div>

          {/* ── Gender filter ───────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-4">
            <p className="text-xs text-brand-ink-muted uppercase tracking-wider mb-3">Стать учасників</p>
            <div className="flex rounded-xl overflow-hidden border border-brand-border">
              {GENDER_OPTIONS.map((opt, idx) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('gender_filter', opt.value)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                    idx > 0 ? 'border-l border-brand-border' : ''
                  } ${
                    form.gender_filter === opt.value
                      ? 'bg-brand-petrol text-white'
                      : 'bg-white text-brand-ink-soft hover:bg-brand-bg'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Submit error ────────────────────────────────────────────────── */}
          {errors.submit && (
            <div className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl border border-red-100">
              {errors.submit}
            </div>
          )}

        </div>

        {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
        <div className="fixed bottom-0 inset-x-0 bg-brand-bg/95 backdrop-blur border-t border-brand-border px-4 py-4 safe-area-bottom shadow-sm z-20">
          <div className="max-w-lg mx-auto">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-petrol hover:bg-brand-petrol-light disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all active:scale-95"
            >
              {submitting ? 'Створюємо подію...' : '✨ Створити подію'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
