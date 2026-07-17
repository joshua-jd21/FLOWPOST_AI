import { NavLink } from 'react-router-dom'
import PostPilotLogo from '../PostPilotLogo'

type IconName =
  | 'dashboard'
  | 'analytics'
  | 'copilot'
  | 'onboarding'
  | 'studio'
  | 'profile'
  | 'settings'
  | 'history'
  | 'posts'
  | 'accounts'

type NavItem = {
  label: string
  to: string
  icon: IconName
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: 'dashboard' },
  { label: 'Analytics', to: '/dashboard/analytics', icon: 'analytics' },
  { label: 'Content Copilot', to: '/dashboard/content-copilot', icon: 'copilot' },
  { label: 'Onboarding', to: '/dashboard/onboarding', icon: 'onboarding' },
  { label: 'Posts', to: '/dashboard/posts', icon: 'posts' },
  { label: 'AI Studio', to: '/dashboard/ai-studio', icon: 'studio' },
  { label: 'Profile', to: '/dashboard/profile', icon: 'profile' },
  { label: 'Settings', to: '/dashboard/settings', icon: 'settings' },
  { label: 'AI History', to: '/dashboard/ai-history', icon: 'history' },
  { label: 'Connected Accounts', to: '/dashboard/connected-accounts', icon: 'accounts' },
]

const iconPaths: Record<IconName, string[]> = {
  dashboard: ['M4 5.5h7v7H4z', 'M13 5.5h7v4h-7z', 'M13 11.5h7v7h-7z', 'M4 14.5h7v4H4z'],
  analytics: ['M5 18V9', 'M12 18V5', 'M19 18v-6', 'M4 18h16'],
  copilot: ['M12 3l1.8 5.1L19 10l-5.2 1.9L12 17l-1.8-5.1L5 10l5.2-1.9z', 'M4 18h16'],
  onboarding: ['M5 12h14', 'M12 5l7 7-7 7'],
  studio: ['M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z'],
  profile: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4 20a8 8 0 0 1 16 0'],
  settings: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z', 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1'],
  history: ['M4 12a8 8 0 1 0 2.4-5.7', 'M4 4v5h5', 'M12 8v5l3 2'],
  posts: ['M6 4h9l3 3v13H6z', 'M14 4v4h4', 'M9 12h6M9 16h4', 'M18 15l2 2-4 4h-2v-2z'],
  accounts: ['M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M16 11a2.5 2.5 0 1 0 0-5', 'M3 20a5 5 0 0 1 10 0', 'M13 18a4.5 4.5 0 0 1 8 2'],
}

function SidebarIcon({ name }: { name: IconName }) {
  return (
    <svg aria-hidden="true" className="sidebar-svg-icon" viewBox="0 0 24 24">
      {iconPaths[name].map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-brand">
        <PostPilotLogo />
        <div>
          <p className="brand-title">PostPilot AI</p>
          <p className="brand-subtitle">Studio</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onNavigate}
          >
            <span className="sidebar-icon"><SidebarIcon name={item.icon} /></span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
