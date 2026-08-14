import type { AdCard as AdCardType } from '@/types'

export default function AdCard({ ad }: { ad: AdCardType }) {
  return (
    <a
      href={ad.cta_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-amber-50 rounded-2xl p-4 border border-amber-200"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-amber-600 text-xs font-medium bg-amber-100 px-2 py-0.5 rounded-full">
          Реклама
        </span>
      </div>
      {ad.image_url && (
        <img src={ad.image_url} alt={ad.title} className="w-full h-32 object-cover rounded-xl mb-3" />
      )}
      <h3 className="text-gray-900 font-semibold">{ad.title}</h3>
      <p className="text-gray-600 text-sm mt-1">{ad.description}</p>
      <span className="inline-block mt-3 text-amber-600 text-sm font-medium">
        Дізнатись більше →
      </span>
    </a>
  )
}
