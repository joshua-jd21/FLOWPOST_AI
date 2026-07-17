import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

type TopbarProps = {
  title: string
  subtitle: string
  onMenuToggle?: () => void
}

function Topbar({ title, subtitle, onMenuToggle }: TopbarProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <header className="dashboard-topbar">
      <div className="topbar-left">
        <button className="mobile-menu-btn" onClick={onMenuToggle} type="button">
          <span>☰</span>
        </button>
        <div>
          <p className="topbar-title">{title}</p>
          <p className="topbar-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="topbar-actions">
        <button className="create-post-btn" type="button" onClick={() => navigate('/dashboard/posts')}>
          <span className="button-icon create-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20">
              <path d="M10 4v12M4 10h12" />
            </svg>
          </span>
          Create
        </button>
        <div className="profile-menu">
          <button
            className="profile-trigger"
            type="button"
            onClick={() => setShowMenu((value) => !value)}
          >
            <span className="profile-avatar-glow" aria-hidden="true" />
            <span className="profile-initials">{user?.name?.slice(0, 2).toUpperCase() || 'U'}</span>
          </button>
          {showMenu && (
            <div className="profile-dropdown">
              <p className="dropdown-name">{user?.name}</p>
              <p className="dropdown-email">{user?.email}</p>
              <button
                className="dropdown-action"
                type="button"
                onClick={async () => {
                  await logout()
                  window.location.assign('/login')
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Topbar
