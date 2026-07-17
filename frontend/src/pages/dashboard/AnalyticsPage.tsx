import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './AnalyticsPage.css'

type AnalyticsData = {
  kpis: {
    totalPosts: number
    scheduled: number
    published: number
    drafts: number
    aiGenerated: number
    connectedAccounts: number
  }
  weeklyTrend: Array<{ label: string; posts: number; scheduled: number }>
  monthlyTrend: Array<{ label: string; posts: number; published: number }>
  platformAnalytics: Array<{ platform: string; posts: number; scheduled: number; published: number; drafts: number }>
  statusBreakdown: Array<{ name: string; value: number }>
  recentActivity: Array<{ title: string; detail: string; timestamp: string }>
  insights: string[]
}

const emptyAnalytics: AnalyticsData = {
  kpis: {
    totalPosts: 0,
    scheduled: 0,
    published: 0,
    drafts: 0,
    aiGenerated: 0,
    connectedAccounts: 0,
  },
  weeklyTrend: [],
  monthlyTrend: [],
  platformAnalytics: [],
  statusBreakdown: [],
  recentActivity: [],
  insights: [],
}

const colors = ['#60a5fa', '#8b5cf6', '#ec4899', '#22c55e']

const futureAnalytics = [
  'Followers growth',
  'Engagement rate',
  'Platform-wise analytics',
  'Monthly performance',
  'Campaign performance',
  'Best posting time',
]

const formatTime = (value: string) => {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function AnalyticsPage() {
  const apiUrl = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:5000', [])
  const [analytics, setAnalytics] = useState<AnalyticsData>(emptyAnalytics)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAnalytics = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${apiUrl}/api/analytics/overview`, {
        credentials: 'include',
      })
      const data = (await response.json().catch(() => null)) as AnalyticsData | { message?: string } | null

      if (!response.ok || !data) {
        throw new Error((data as { message?: string } | null)?.message || 'Unable to load analytics')
      }

      setAnalytics(data as AnalyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load analytics')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadAnalytics()
  }, [])

  const kpiCards = [
    { label: 'Total Posts', value: analytics.kpis.totalPosts, empty: 'Create your first post' },
    { label: 'Scheduled Posts', value: analytics.kpis.scheduled, empty: 'Schedule content to see queue health' },
    { label: 'Published Posts', value: analytics.kpis.published, empty: 'No posts published yet' },
    { label: 'Drafts', value: analytics.kpis.drafts, empty: 'Save a draft to build your pipeline' },
    { label: 'AI Generated Posts', value: analytics.kpis.aiGenerated, empty: 'Generate your first AI post' },
    { label: 'Connected Accounts', value: analytics.kpis.connectedAccounts, empty: 'Connect your social account' },
  ]
  const hasPosts = analytics.kpis.totalPosts > 0
  const hasAiGenerated = analytics.kpis.aiGenerated > 0
  const hasConnectedAccounts = analytics.kpis.connectedAccounts > 0
  const hasWeeklyTrend = analytics.weeklyTrend.some((item) => item.posts > 0 || item.scheduled > 0)
  const hasMonthlyTrend = analytics.monthlyTrend.some((item) => item.posts > 0 || item.published > 0)
  const hasStatusMix = analytics.statusBreakdown.some((item) => item.value > 0)
  const hasPlatformAnalytics = analytics.platformAnalytics.some((item) => item.posts > 0 || item.scheduled > 0 || item.published > 0 || item.drafts > 0)

  return (
    <div className="page-stack">
      <div className="hero-panel">
        <div>
          <p className="eyebrow">Analytics</p>
          <h2>Creator insights for every channel.</h2>
          <p>Track publishing momentum, AI usage, channel mix, and scheduling health.</p>
        </div>
        <button className="analytics-refresh-btn" type="button" onClick={() => void loadAnalytics()} disabled={isLoading}>
          <svg aria-hidden="true" viewBox="0 0 20 20">
            <path d="M16.5 10a6.5 6.5 0 1 1-2-4.7" />
            <path d="M16.5 4.5v4h-4" />
          </svg>
          {isLoading ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      {error ? <div className="notice-banner error">{error}</div> : null}

      {!isLoading && !hasPosts && !hasAiGenerated && !hasConnectedAccounts ? (
        <section className="analytics-empty-hero">
          <div>
            <p className="eyebrow">No analytics data available</p>
            <h3>Start publishing to unlock real performance insights.</h3>
            <p>Generate your first AI post, schedule content, and connect social accounts to turn this page into a live analytics command center.</p>
          </div>
          <div className="analytics-empty-actions">
            <span>Generate your first AI post</span>
            <span>Connect your social media account</span>
            <span>Publish content to track performance</span>
          </div>
        </section>
      ) : null}

      <div className="analytics-kpi-grid">
        {kpiCards.map((card) => (
          <div className={`stat-card analytics-kpi ${card.value > 0 ? 'has-data' : 'is-empty'}`} key={card.label}>
            <p>{card.label}</p>
            <h3>{isLoading ? 'Loading...' : card.value > 0 ? card.value : 'No data'}</h3>
            <span>{card.value > 0 ? 'Live workspace data' : card.empty}</span>
          </div>
        ))}
      </div>

      <div className="analytics-grid">
        <section className="panel-card chart-card wide-chart">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Weekly trend</p>
              <h3>Posts and scheduled content</h3>
            </div>
          </div>
          {hasWeeklyTrend ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={analytics.weeklyTrend}>
                <CartesianGrid stroke="rgba(248,250,252,0.08)" vertical={false} />
                <XAxis dataKey="label" stroke="#b8c0cf" tickLine={false} axisLine={false} />
                <YAxis stroke="#b8c0cf" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(248,250,252,0.12)', borderRadius: 14 }} />
                <Line type="monotone" dataKey="posts" stroke="#60a5fa" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="scheduled" stroke="#ec4899" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <AnalyticsEmptyState title="No weekly trend yet" description="Create or schedule posts this week to see your publishing rhythm." />
          )}
        </section>

        <section className="panel-card chart-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Status mix</p>
              <h3>Post state</h3>
            </div>
          </div>
          {hasStatusMix ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={analytics.statusBreakdown} dataKey="value" nameKey="name" innerRadius={62} outerRadius={94} paddingAngle={4}>
                  {analytics.statusBreakdown.map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(248,250,252,0.12)', borderRadius: 14 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <AnalyticsEmptyState title="No post states to compare" description="Draft, schedule, or publish posts to populate your status mix." />
          )}
        </section>

        <section className="panel-card chart-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Monthly trend</p>
              <h3>Publishing volume</h3>
            </div>
          </div>
          {hasMonthlyTrend ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.monthlyTrend}>
                <CartesianGrid stroke="rgba(248,250,252,0.08)" vertical={false} />
                <XAxis dataKey="label" stroke="#b8c0cf" tickLine={false} axisLine={false} />
                <YAxis stroke="#b8c0cf" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(248,250,252,0.12)', borderRadius: 14 }} />
                <Bar dataKey="posts" fill="#8b5cf6" radius={[10, 10, 0, 0]} />
                <Bar dataKey="published" fill="#60a5fa" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <AnalyticsEmptyState title="No monthly performance yet" description="Monthly publishing volume will appear once your workspace has posts." />
          )}
        </section>

        <section className="panel-card chart-card wide-chart">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Platforms</p>
              <h3>Channel analytics</h3>
            </div>
          </div>
          {hasPlatformAnalytics ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.platformAnalytics}>
                <CartesianGrid stroke="rgba(248,250,252,0.08)" vertical={false} />
                <XAxis dataKey="platform" stroke="#b8c0cf" tickLine={false} axisLine={false} />
                <YAxis stroke="#b8c0cf" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(248,250,252,0.12)', borderRadius: 14 }} />
                <Bar dataKey="posts" fill="#60a5fa" radius={[10, 10, 0, 0]} />
                <Bar dataKey="scheduled" fill="#ec4899" radius={[10, 10, 0, 0]} />
                <Bar dataKey="drafts" fill="#8b5cf6" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <AnalyticsEmptyState title="Connect accounts to unlock channels" description="Platform-wise analytics will become useful once posts and connected accounts exist." />
          )}
        </section>
      </div>

      <section className="panel-card future-analytics-card">
        <div>
          <p className="eyebrow">Future-ready analytics</p>
          <h3>Prepared for deeper performance intelligence.</h3>
          <p>These modules are structured to support richer social metrics as soon as account-level performance data is available.</p>
        </div>
        <div className="future-analytics-grid">
          {futureAnalytics.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <div className="content-grid">
        <section className="panel-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">AI insights</p>
              <h3>Recommendations</h3>
            </div>
          </div>
          <div className="insight-list">
            {analytics.insights.length ? analytics.insights.map((insight) => (
              <div className="insight-item" key={insight}>
                <span>✦</span>
                <p>{insight}</p>
              </div>
            )) : (
              <AnalyticsEmptyState title="No recommendations yet" description="Generate your first AI post to unlock analytics recommendations." compact />
            )}
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Activity</p>
              <h3>Recent timeline</h3>
            </div>
          </div>
          <div className="activity-list">
            {analytics.recentActivity.length ? analytics.recentActivity.map((item) => (
              <div className="activity-item" key={`${item.title}-${item.timestamp}`}>
                <div className="activity-dot" />
                <div>
                  <p>{item.title}</p>
                  <span>{item.detail} • {formatTime(item.timestamp)}</span>
                </div>
              </div>
            )) : (
              <div className="empty-state compact-state">
                <p>No activity yet.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function AnalyticsEmptyState({ title, description, compact = false }: { title: string; description: string; compact?: boolean }) {
  return (
    <div className={`analytics-empty-state ${compact ? 'compact' : ''}`}>
      <span className="analytics-empty-icon">✦</span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  )
}

export default AnalyticsPage
