import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { RestaurantStoreProvider } from './hooks/useRestaurantStore'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import OverviewPage from './pages/OverviewPage'
import PayoutsPage from './pages/PayoutsPage'
import TrendsPage from './pages/TrendsPage'
import AdsPage from './pages/AdsPage'
import ReviewsPage from './pages/ReviewsPage'
import UploadPage from './pages/UploadPage'

function AppRoutes() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--color-muted)', background: 'var(--color-bg)' }}>
        Loading…
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/"        element={<OverviewPage />} />
        <Route path="/payouts" element={<PayoutsPage />} />
        <Route path="/trends"  element={<TrendsPage />} />
        <Route path="/ads"     element={<AdsPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/upload"  element={<UploadPage />} />
        <Route path="*"        element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RestaurantStoreProvider>
          <AppRoutes />
        </RestaurantStoreProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
