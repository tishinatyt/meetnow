interface Props {
  category: string
  /** Tailwind height + width classes, e.g. "h-32 w-full" or "h-52 w-full" */
  className?: string
}

// Each entry: full Tailwind gradient string + emoji for this category
const META: Record<string, { gradient: string; emoji: string }> = {
  cinema:  { gradient: 'from-blue-900 via-indigo-800 to-violet-900',  emoji: '🎬' },
  theatre: { gradient: 'from-rose-900 via-red-800 to-amber-700',      emoji: '🎭' },
  bar:     { gradient: 'from-amber-700 via-yellow-700 to-amber-900',  emoji: '🍺' },
  sport:   { gradient: 'from-green-600 via-emerald-600 to-lime-600',  emoji: '🏃' },
  music:   { gradient: 'from-pink-600 via-fuchsia-700 to-purple-800', emoji: '🎵' },
  food:    { gradient: 'from-orange-500 via-red-500 to-yellow-500',   emoji: '🍕' },
  games:   { gradient: 'from-indigo-700 via-blue-700 to-cyan-600',    emoji: '🎲' },
  walk:    { gradient: 'from-teal-500 via-cyan-500 to-sky-500',       emoji: '🚶' },
  art:     { gradient: 'from-red-400 via-pink-500 to-rose-600',       emoji: '🎨' },
  other:   { gradient: 'from-gray-500 via-slate-500 to-gray-600',     emoji: '✨' },
}

export default function CategoryPlaceholder({ category, className = 'h-32 w-full' }: Props) {
  const meta = META[category] ?? META.other
  return (
    <div
      className={`${className} bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}
    >
      <span className="text-5xl opacity-30 select-none">{meta.emoji}</span>
    </div>
  )
}
