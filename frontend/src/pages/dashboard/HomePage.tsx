import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type UpcomingPost = {
  id: string
  title: string
  platform: string
  scheduledAt?: string
}

type AIHistoryResponse = {
  history?: unknown[]
}

type ConnectedAccountsResponse = {
  accounts?: Array<{
    status: 'connected' | 'disconnected' | 'needs_reauth'
    account?: {
      verifiedAt?: string
    } | null
  }>
}

type StatCard = {
  label: string
  value: string
  detail: string
  tone: 'ready' | 'empty'
}

const formatSchedule = (value?: string) => {
  if (!value) {
    return 'Draft'
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function HomePage() {
  const navigate = useNavigate()
  const apiUrl = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:5000', [])
  const [scheduledPosts, setScheduledPosts] = useState<UpcomingPost[]>([])
  const [aiDrafts, setAiDrafts] = useState(0)
  const [connectedAccounts, setConnectedAccounts] = useState(0)
  const [isLoadingOverview, setIsLoadingOverview] = useState(true)

  useEffect(() => {
    let ignore = false

    const loadDashboard = async () => {
      setIsLoadingOverview(true)

      try {
        const [postsResponse, historyResponse, accountsResponse] = await Promise.all([
          fetch(`${apiUrl}/api/posts?status=scheduled&limit=50`, {
            credentials: 'include',
          }),
          fetch(`${apiUrl}/api/ai/history`, {
            credentials: 'include',
          }),
          fetch(`${apiUrl}/api/social/accounts`, {
            credentials: 'include',
          }),
        ])
        const postsData = (await postsResponse.json().catch(() => ({ posts: [] }))) as { posts?: UpcomingPost[] }
        const historyData = (await historyResponse.json().catch(() => ({ history: [] }))) as AIHistoryResponse
        const accountsData = (await accountsResponse.json().catch(() => ({ accounts: [] }))) as ConnectedAccountsResponse

        if (!ignore) {
          setScheduledPosts(postsResponse.ok ? postsData.posts ?? [] : [])
          setAiDrafts(historyResponse.ok ? historyData.history?.length ?? 0 : 0)
          setConnectedAccounts(accountsResponse.ok ? accountsData.accounts?.filter((item) => item.status === 'connected' && item.account?.verifiedAt).length ?? 0 : 0)
        }
      } catch {
        if (!ignore) {
          setScheduledPosts([])
          setAiDrafts(0)
          setConnectedAccounts(0)
        }
      } finally {
        if (!ignore) {
          setIsLoadingOverview(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      ignore = true
    }
  }, [apiUrl])

  const stats: StatCard[] = useMemo(() => {
    const scheduled = scheduledPosts.length
    const aiGenerated = aiDrafts

    return [
      {
        label: 'Scheduled posts',
        value: scheduled > 0 ? String(scheduled) : 'Get started',
        detail: scheduled > 0 ? 'Queued from your content calendar' : 'Create or schedule your first post',
        tone: scheduled > 0 ? 'ready' : 'empty',
      },
      {
        label: 'Engagement',
        value: 'No data available',
        detail: 'Connect analytics data to calculate engagement',
        tone: 'empty',
      },
      {
        label: 'AI drafts',
        value: aiGenerated > 0 ? String(aiGenerated) : 'Get started',
        detail: aiGenerated > 0 ? 'Generated captions and thumbnails saved' : 'Generate your first draft in AI Studio',
        tone: aiGenerated > 0 ? 'ready' : 'empty',
      },
      {
        label: 'Connected accounts',
        value: connectedAccounts > 0 ? String(connectedAccounts) : 'Connect your account',
        detail: connectedAccounts > 0 ? 'Verified social channels ready' : 'Securely connect a publishing channel',
        tone: connectedAccounts > 0 ? 'ready' : 'empty',
      },
    ]
  }, [aiDrafts, connectedAccounts, scheduledPosts.length])

  const activityItems = scheduledPosts.slice(0, 3).map((post) => ({ title: post.title, detail: `${post.platform} • ${formatSchedule(post.scheduledAt)}` }))

  return (
    <div className="page-stack">
      <div className="hero-panel">
        <div>
          <p className="eyebrow">Operations overview</p>
          <h2>Ship smarter with one command center.</h2>
          <p>Plan, publish, and review your content from a single polished workspace.</p>
        </div>
        <div className="hero-actions">
          <button className="primary-btn" type="button" onClick={() => navigate('/dashboard/content-copilot')}>
            Open Copilot
          </button>
          <button className="ghost-btn" type="button" onClick={() => navigate('/dashboard/onboarding')}>
            Onboarding
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((card) => (
          <div key={card.label} className={`stat-card dashboard-stat-card ${card.tone}`}>
            <p>{card.label}</p>
            <h3>{isLoadingOverview ? 'Loading...' : card.value}</h3>
            <span>{card.detail}</span>
          </div>
        ))}
      </div>

      <div className="content-grid">
        <section className="panel-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Workspace activity</p>
              <h3>Recent signals</h3>
            </div>
            <button className="ghost-btn" type="button" onClick={() => navigate('/dashboard/posts')}>
              View posts
            </button>
          </div>
          <div className="activity-list">
            {activityItems.length ? (
              activityItems.map((item) => (
                <div key={`${item.title}-${item.detail}`} className="activity-item">
                  <div className="activity-dot" />
                  <div>
                    <p>{item.title}</p>
                    <span>{item.detail}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="dashboard-empty-state">
                <strong>No data available</strong>
                <span>Create, schedule, or connect an account to populate your activity feed.</span>
              </div>
            )}
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Quick actions</p>
              <h3>Keep momentum</h3>
            </div>
          </div>
          <div className="actions-stack">
            {[
              { label: 'Open copilot', to: '/dashboard/content-copilot' },
              { label: 'Create post', to: '/dashboard/posts' },
              { label: 'Finish onboarding', to: '/dashboard/onboarding' },
              { label: 'Generate copy', to: '/dashboard/ai-studio' },
              { label: 'Review schedule', to: '/dashboard/posts' },
              { label: 'Connect a channel', to: '/dashboard/connected-accounts' },
            ].map((item) => (
              <button key={item.label} className="action-btn" type="button" onClick={() => navigate(item.to)}>
                {item.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default HomePage
