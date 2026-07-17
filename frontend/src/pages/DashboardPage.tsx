import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [profile, setProfile] = useState<{ name?: string; email?: string } | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    const loadProfile = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/profile`, {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Profile request failed')
        }

        const data = await response.json()
        setProfile(data.user)
      } catch {
        await logout()
        navigate('/login', { replace: true })
      } finally {
        setIsLoadingProfile(false)
      }
    }

    void loadProfile()
  }, [logout, navigate, user])

  return (
    <div className="dashboard-shell">
      <div className="dashboard-card">
        <h1>Dashboard</h1>
        <p>Authentication is live. Your protected route is working.</p>
        {isLoadingProfile ? <p>Loading profile...</p> : null}
        {user && (
          <div className="profile-box">
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
          </div>
        )}
        {profile && (
          <div className="profile-box">
            <p><strong>Server profile:</strong> {profile.name}</p>
            <p><strong>Server email:</strong> {profile.email}</p>
          </div>
        )}
        <button
          onClick={async () => {
            await logout()
            navigate('/login', { replace: true })
          }}
        >
          Log out
        </button>
      </div>
    </div>
  )
}

export default DashboardPage
