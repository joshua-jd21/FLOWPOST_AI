import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import './DashboardPolish.css'

type DashboardLayoutProps = {
  title?: string
  subtitle?: string
}

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'Dashboard',
    subtitle: 'A polished view of your social operations',
  },
  '/dashboard/analytics': {
    title: 'Analytics',
    subtitle: 'Performance signals, publishing momentum, and channel mix',
  },
  '/dashboard/posts': {
    title: 'Posts',
    subtitle: 'Create, schedule, publish, edit, and manage every post',
  },
  '/dashboard/content-copilot': {
    title: 'Content Copilot',
    subtitle: 'Plan and execute campaigns with natural language',
  },
  '/dashboard/onboarding': {
    title: 'Onboarding',
    subtitle: 'Set up your workspace for smarter social publishing',
  },
  '/dashboard/ai-studio': {
    title: 'AI Studio',
    subtitle: 'Generate captions, hashtags, CTAs, and thumbnails',
  },
  '/dashboard/ai-history': {
    title: 'AI History',
    subtitle: 'Review generated captions, thumbnails, and saved drafts',
  },
  '/dashboard/connected-accounts': {
    title: 'Connected Accounts',
    subtitle: 'Verify and manage social publishing channels',
  },
  '/dashboard/profile': {
    title: 'Profile',
    subtitle: 'Manage your creator profile and account details',
  },
  '/dashboard/settings': {
    title: 'Settings',
    subtitle: 'Configure preferences, notifications, security, and channels',
  },
}

function DashboardLayout({ title, subtitle }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const location = useLocation()
  const meta = pageMeta[location.pathname] ?? { title: title || 'Dashboard', subtitle: subtitle || 'Manage your PostPilot AI workspace' }

  return (
    <div className="dashboard-layout">
      <Sidebar onNavigate={() => setIsSidebarOpen(false)} />
      <div className={`mobile-sidebar-backdrop ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      <div className={`mobile-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <Sidebar onNavigate={() => setIsSidebarOpen(false)} />
      </div>

      <main className="dashboard-main">
        <Topbar title={meta.title} subtitle={meta.subtitle} onMenuToggle={() => setIsSidebarOpen((value) => !value)} />
        <section className="dashboard-content">
          <Outlet />
        </section>
      </main>
    </div>
  )
}

export default DashboardLayout
