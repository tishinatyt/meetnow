import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types'

export interface EventDetail {
  id: string
  title: string
  description: string
  category: string
  is_public: boolean
  organizer_id: string
  cover_photo_url: string | null
  address_text: string
  event_datetime: string
  max_participants: number
  min_age: number
  max_age: number
  gender_filter: string
  status: string
  created_at: string
  location_lat: number | null
  location_lng: number | null
  organizer: User | null
}

export interface EventParticipant {
  id: string
  event_id: string
  user_id: string
  role: 'organizer' | 'participant'
  joined_at: string
  status: 'joined' | 'left'
  user: User | null
}

export function useEvent(eventId: string) {
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [participants, setParticipants] = useState<EventParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) return
    load()
  }, [eventId])

  async function load() {
    setLoading(true)
    setError(null)

    const [eventResult, participantsResult, coordsResult] = await Promise.all([
      supabase
        .from('events')
        .select(`
          id, title, description, category, is_public,
          organizer_id, cover_photo_url, address_text,
          event_datetime, max_participants, min_age, max_age,
          gender_filter, status, created_at,
          organizer:users!events_organizer_id_fkey(
            id, name, age, gender, avatar_url, google_verified, created_at
          )
        `)
        .eq('id', eventId)
        .single(),
      supabase
        .from('event_participants')
        .select(`
          id, event_id, user_id, role, joined_at, status,
          user:users!event_participants_user_id_fkey(
            id, name, age, gender, avatar_url, google_verified, created_at
          )
        `)
        .eq('event_id', eventId)
        .eq('status', 'joined'),
      // Graceful: may fail if get_event_coords function not yet deployed
      (supabase.rpc('get_event_coords', { p_event_id: eventId }).single() as unknown) as Promise<{ data: { lat: number; lng: number } | null; error: unknown }>,
    ])

    if (eventResult.error || !eventResult.data) {
      setError(eventResult.error?.message ?? 'Event not found')
      setLoading(false)
      return
    }

    const raw = eventResult.data
    const organizer = Array.isArray(raw.organizer)
      ? (raw.organizer[0] as User | null)
      : (raw.organizer as User | null)

    setEvent({
      id: raw.id,
      title: raw.title,
      description: raw.description,
      category: raw.category,
      is_public: raw.is_public,
      organizer_id: raw.organizer_id,
      cover_photo_url: raw.cover_photo_url,
      address_text: raw.address_text,
      event_datetime: raw.event_datetime,
      max_participants: raw.max_participants,
      min_age: raw.min_age,
      max_age: raw.max_age,
      gender_filter: raw.gender_filter,
      status: raw.status,
      created_at: raw.created_at,
      organizer,
      location_lat: coordsResult.data?.lat ?? null,
      location_lng: coordsResult.data?.lng ?? null,
    })

    if (participantsResult.data) {
      setParticipants(
        participantsResult.data.map((p) => ({
          ...p,
          role: p.role as 'organizer' | 'participant',
          status: p.status as 'joined' | 'left',
          user: Array.isArray(p.user)
            ? (p.user[0] as User | null)
            : (p.user as User | null),
        }))
      )
    }

    setLoading(false)
  }

  async function joinEvent(userId: string): Promise<{ error: string | null }> {
    const { error: err } = await supabase
      .from('event_participants')
      .insert({ event_id: eventId, user_id: userId, role: 'participant', status: 'joined' })

    if (err) return { error: err.message }
    // Reload participants list
    const { data } = await supabase
      .from('event_participants')
      .select(`
        id, event_id, user_id, role, joined_at, status,
        user:users!event_participants_user_id_fkey(
          id, name, age, gender, avatar_url, google_verified, created_at
        )
      `)
      .eq('event_id', eventId)
      .eq('status', 'joined')
    if (data) {
      setParticipants(
        data.map((p) => ({
          ...p,
          role: p.role as 'organizer' | 'participant',
          status: p.status as 'joined' | 'left',
          user: Array.isArray(p.user)
            ? (p.user[0] as User | null)
            : (p.user as User | null),
        }))
      )
    }
    return { error: null }
  }

  return { event, participants, loading, error, joinEvent }
}
