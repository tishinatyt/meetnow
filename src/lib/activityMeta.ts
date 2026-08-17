import type { ActivityType } from '@/types'

export const ACTIVITY_META: Record<ActivityType, { label: string; emoji: string }> = {
  walk:       { label: 'Прогулянка', emoji: '🚶' },
  cafe:       { label: 'Кафе',       emoji: '☕' },
  bar:        { label: 'Бар',        emoji: '🍺' },
  sport:      { label: 'Спорт',      emoji: '⚽' },
  cinema:     { label: 'Кіно',       emoji: '🎬' },
  boardgames: { label: 'Настолки',   emoji: '🎲' },
  eat:        { label: 'Поїсти',     emoji: '🍽️' },
  other:      { label: 'Інше',       emoji: '✨' },
}

export const ACTIVITY_TYPES = Object.keys(ACTIVITY_META) as ActivityType[]
