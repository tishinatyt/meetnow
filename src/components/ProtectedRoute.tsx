import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Onboarding from '@/pages/Onboarding'
import CompleteProfile from '@/pages/Onboarding/CompleteProfile'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-petrol border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <Onboarding />
  if (!profile) return <CompleteProfile />

  return <>{children}</>
}
