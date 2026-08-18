import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import BottomNav from '@/components/BottomNav'
import HomeScreen from '@/pages/HomeScreen'
import Profile from '@/pages/Profile'
import EventDetail from '@/pages/EventDetail'
import EventChat from '@/pages/EventChat'
import Chats from '@/pages/Chats'
import CreateEvent from '@/pages/CreateEvent'

// Routes with their own full-screen bottom CTA — BottomNav would cover them
const HIDE_NAV_PATTERNS = [/^\/event\//]

function AppLayout() {
  const { pathname } = useLocation()
  const hideNav = HIDE_NAV_PATTERNS.some((re) => re.test(pathname))

  return (
    <>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/chats" element={<Chats />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/event/:id/chat" element={<EventChat />} />
        <Route path="/create" element={<CreateEvent />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      </AuthProvider>
    </BrowserRouter>
  )
}
