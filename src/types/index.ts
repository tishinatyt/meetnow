export type Gender = 'male' | 'female' | 'any'

export type ActivityType =
  | 'walk'
  | 'cafe'
  | 'bar'
  | 'sport'
  | 'cinema'
  | 'boardgames'
  | 'eat'
  | 'other'

export interface User {
  id: string
  name: string
  age: number
  gender: Gender
  avatar_url: string | null
  google_verified: boolean
  created_at: string
}

export interface Activity {
  id: string
  user_id: string
  type: string
  description: string
  looking_for_gender: Gender
  age_min: number
  age_max: number
  when_time: string
  location: string
  lat: number
  lng: number
  status: 'active' | 'closed'
  created_at: string
  distance_km?: number
  // Flat fields from activities_nearby RPC
  user_name?: string
  user_age?: number
  user_gender?: Gender
  user_avatar_url?: string | null
  user_google_verified?: boolean
  // Legacy nested author (for backwards compat)
  author?: User
}

export interface Interest {
  id: string
  activity_id: string
  user_id: string
  created_at: string
}

export interface Match {
  id: string
  activity_id: string
  user1_id: string
  user2_id: string
  created_at: string
  activity?: Activity
  other_user?: User
}

export interface Message {
  id: string
  match_id: string
  sender_id: string
  text: string
  created_at: string
}

export interface AdCard {
  id: string
  title: string
  description: string
  cta_url: string
  image_url: string | null
  active: boolean
}

export interface ActivityFilters {
  type: ActivityType | 'all'
  gender: Gender | 'all'
  age_min: number
  age_max: number
}
