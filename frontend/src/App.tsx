import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { useAuth } from './context/AuthContext'
import DashboardLayout from './components/dashboard/Layout'
import AuthPage from './pages/AuthPage'
import DemoModePage from './pages/DemoModePage'
import LandingPage from './pages/LandingPage'
import AIHistoryPage from './pages/dashboard/AIHistoryPage'
import AIStudioPage from './pages/dashboard/AIStudioPage'
import AnalyticsPage from './pages/dashboard/AnalyticsPage'
import ConnectedAccountsPage from './pages/dashboard/ConnectedAccountsPage'
import ContentCopilotPage from './pages/dashboard/ContentCopilotPage'
import HomePage from './pages/dashboard/HomePage'
import OnboardingPage from './pages/dashboard/OnboardingPage'
import ProfilePage from './pages/dashboard/ProfilePage'
import SchedulerPage from './pages/dashboard/SchedulerPage'
import SettingsPage from './pages/dashboard/SettingsPage'

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div className="route-loading">Preparing your workspace...</div>
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div className="route-loading">Securing your workspace...</div>
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<DemoModePage />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthPage mode="login" />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <AuthPage mode="signup" />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout title="Dashboard" subtitle="A polished view of your social operations" />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="content-copilot" element={<ContentCopilotPage />} />
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route path="posts" element={<SchedulerPage />} />
          <Route path="create-post" element={<Navigate to="/dashboard/posts" replace />} />
          <Route path="ai-studio" element={<AIStudioPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="ai-history" element={<AIHistoryPage />} />
          <Route path="scheduled-posts" element={<Navigate to="/dashboard/posts" replace />} />
          <Route path="connected-accounts" element={<ConnectedAccountsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
