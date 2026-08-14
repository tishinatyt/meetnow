import { useParams, useNavigate } from 'react-router-dom'

export default function EventChatPlaceholder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white/95 backdrop-blur shadow-sm">
        <button onClick={() => navigate(`/event/${id}`)} className="text-gray-400 hover:text-gray-700 pr-1">←</button>
        <span className="font-semibold text-gray-900">Чат події</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">💬</div>
        <h2 className="text-xl font-bold mb-2 text-gray-900">Груповий чат</h2>
        <p className="text-gray-500 text-sm max-w-xs">
          Груповий чат події буде реалізований на наступному етапі.
          Ви успішно приєдналися до події!
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-8 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-2xl transition-all active:scale-95"
        >
          До головної
        </button>
      </div>
    </div>
  )
}
