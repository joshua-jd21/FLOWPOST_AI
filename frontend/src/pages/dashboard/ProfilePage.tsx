import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

type ConnectedAccount = {
  id: string
  provider: 'linkedin' | 'x' | 'instagram'
  accountName: string
  status: 'connected' | 'disconnected' | 'needs_reauth'
  updatedAt?: string
}

type ProfileResponse = {
  user?: {
    id: string
    name: string
    email: string
    avatar?: string
    isActive?: boolean
  }
  connectedAccounts?: ConnectedAccount[]
  totalAIGenerations?: number
  message?: string
}

const providerLabel: Record<ConnectedAccount['provider'], string> = {
  linkedin: 'LinkedIn',
  x: 'X',
  instagram: 'Instagram',
}

function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const apiUrl = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:5000', [])
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadProfile = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${apiUrl}/api/users/profile`, {
        credentials: 'include',
      })
      const data = (await response.json().catch(() => ({}))) as ProfileResponse

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load profile')
      }

      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [apiUrl])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const currentUser = profile?.user || user
  const initials = currentUser?.name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PP'
  const connectedAccounts = profile?.connectedAccounts ?? []
  const connectedCount = connectedAccounts.filter((account) => account.status === 'connected').length

  return (
    <div className="page-stack">
      <div className="hero-panel profile-hero-panel">
        <div className="profile-identity-row">
          {currentUser?.avatar ? <img src={currentUser.avatar} alt={currentUser.name} /> : <span>{initials}</span>}
          <div>
            <p className="eyebrow">Creator Profile</p>
            <h2>{currentUser?.name || 'PostPilot Creator'}</h2>
            <p>{currentUser?.email || 'Signed in workspace member'}</p>
          </div>
        </div>
        <button className="ghost-btn" type="button" onClick={() => void handleLogout()}>
          Logout
        </button>
      </div>

      {error ? <div className="notice-banner error">{error}</div> : null}

      <div className="profile-grid">
        <section className="panel-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Account</p>
              <h3>User details</h3>
            </div>
          </div>

          {isLoading ? (
            <p className="muted-copy">Loading profile...</p>
          ) : (
            <div className="profile-detail-list">
              <div>
                <span>Name</span>
                <strong>{currentUser?.name || 'Not available'}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{currentUser?.email || 'Not available'}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{currentUser?.isActive === false ? 'Inactive' : 'Active'}</strong>
              </div>
            </div>
          )}
        </section>

        <section className="panel-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Workspace metrics</p>
              <h3>Creator activity</h3>
            </div>
          </div>

          <div className="profile-stat-grid">
            <div>
              <span>AI generations</span>
              <strong>{profile?.totalAIGenerations ?? 0}</strong>
            </div>
            <div>
              <span>Connected accounts</span>
              <strong>{connectedCount}</strong>
            </div>
          </div>
        </section>

        <section className="panel-card profile-wide-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Channels</p>
              <h3>Connected accounts</h3>
            </div>
            <button className="ghost-btn" type="button" onClick={() => navigate('/dashboard/connected-accounts')}>
              Manage
            </button>
          </div>

          <div className="profile-account-list">
            {connectedAccounts.length ? (
              connectedAccounts.map((account) => (
                <div key={account.id || account.provider} className="profile-account-item">
                  <div>
                    <strong>{providerLabel[account.provider]}</strong>
                    <span>{account.accountName}</span>
                  </div>
                  <span className={`status-pill ${account.status}`}>{account.status.replace('_', ' ')}</span>
                </div>
              ))
            ) : (
              <p className="muted-copy">No connected accounts yet. Connect LinkedIn, X, or Instagram when you are ready.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default ProfilePage
