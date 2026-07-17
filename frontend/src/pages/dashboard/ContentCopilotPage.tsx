import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type CopilotAction = {
  type: string
  label: string
  status: 'completed' | 'needs_input' | 'failed'
  data?: unknown
}

type CopilotMessage = {
  role: 'user' | 'assistant'
  content: string
  actions?: CopilotAction[]
  createdAt: string
}

type CopilotSession = {
  id: string
  title: string
  messages: CopilotMessage[]
  updatedAt: string
}

type CopilotResponse = {
  session?: CopilotSession
  copilotMessage?: CopilotMessage
  message?: string
}

type CampaignIdea = {
  id?: string
  day?: number
  date?: string
  platform?: string
  format?: string
  title?: string
  caption?: string
  hashtags?: string[]
  cta?: string
  bestTime?: string
  status?: string
}

type CampaignPayload = {
  title?: string
  objective?: string
  audience?: string
  durationDays?: number
  platforms?: string[]
  ideas?: CampaignIdea[]
}

type AIStudioPayload = {
  caption?: string
  hashtags?: string[]
  ctaSuggestions?: string[]
  imageUrl?: string
  usedFallback?: boolean
}

type SchedulerPayload = {
  id?: string
  title?: string
  platform?: string
  status?: string
  scheduledAt?: string
}

type AutomationPayload = {
  name?: string
  description?: string
  status?: string
  trigger?: {
    type?: string
    runAt?: string
  }
  actions?: Array<{
    type?: string
    config?: Record<string, unknown>
  }>
}

const quickPrompts = [
  'Create a 30-day Instagram campaign for my product launch.',
  'Generate and schedule LinkedIn posts for next week.',
  'Publish my product launch campaign.',
]

const actionLabels: Record<string, string> = {
  ai_studio: 'AI Studio',
  analytics: 'Analytics',
  automation: 'Workflow',
  brand_context: 'Brand context',
  campaign: 'Campaign',
  connected_accounts: 'Accounts',
  copilot_error: 'Workflow',
  insights: 'Insights',
  scheduler: 'Scheduler',
  workspace: 'Workspace',
  zernio_publish: 'Zernio',
}

const formatTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))

const formatDate = (value?: string) => {
  if (!value) {
    return 'Recommended day'
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

const formatHistoryDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))

const toCampaignPayload = (data: unknown): CampaignPayload | null => {
  if (!data || typeof data !== 'object') {
    return null
  }

  return data as CampaignPayload
}

const toAIStudioPayload = (data: unknown): AIStudioPayload | null => {
  if (!data || typeof data !== 'object') {
    return null
  }

  return data as AIStudioPayload
}

const toSchedulerPayload = (data: unknown): SchedulerPayload | null => {
  if (!data || typeof data !== 'object') {
    return null
  }

  return data as SchedulerPayload
}

const toAutomationPayload = (data: unknown): AutomationPayload | null => {
  if (!data || typeof data !== 'object') {
    return null
  }

  return data as AutomationPayload
}

const latestPreview = (session: CopilotSession) => {
  const latest = [...session.messages].reverse().find((entry) => entry.role === 'assistant') ?? session.messages[session.messages.length - 1]
  return latest?.content.replace(/\s+/g, ' ').trim() || 'New Copilot conversation'
}

const buildCampaignCsv = (campaign: CampaignPayload) => {
  const rows = [
    ['Day', 'Date', 'Platform', 'Format', 'Title', 'Best time', 'Caption', 'Hashtags', 'CTA'],
    ...(campaign.ideas ?? []).map((idea) => [
      idea.day ?? '',
      idea.date ? formatDate(idea.date) : '',
      idea.platform ?? '',
      idea.format ?? '',
      idea.title ?? '',
      idea.bestTime ?? '',
      idea.caption ?? '',
      (idea.hashtags ?? []).join(' '),
      idea.cta ?? '',
    ]),
  ]

  return rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

const describeAction = (action: CopilotAction) => {
  const payload = action.data as Record<string, unknown> | undefined

  if (action.type === 'campaign' && payload) {
    return `${payload.durationDays ?? 'New'} days • ${Array.isArray(payload.ideas) ? payload.ideas.length : 0} ideas`
  }

  if (action.type === 'ai_studio' && payload) {
    const hashtags = Array.isArray(payload.hashtags) ? payload.hashtags.length : 0
    return `Caption ready • ${hashtags} hashtags${payload.imageUrl ? ' • thumbnail' : ''}`
  }

  if (action.type === 'scheduler' && payload) {
    return `${payload.platform ?? 'Post'} • ${payload.status ?? 'scheduled'}`
  }

  if (action.type === 'analytics' && payload && typeof payload.kpis === 'object') {
    const kpis = payload.kpis as Record<string, unknown>
    return `${kpis.totalPosts ?? 0} posts • ${kpis.scheduled ?? 0} scheduled`
  }

  if (action.type === 'connected_accounts' && Array.isArray(action.data)) {
    const connected = action.data.filter((account) => {
      const entry = account as { status?: string }
      return entry.status === 'connected'
    }).length
    return `${connected} connected channels`
  }

  if (action.type === 'automation' && payload) {
    return `${payload.status ?? 'active'} • ${Array.isArray(payload.actions) ? payload.actions.length : 0} actions`
  }

  if (action.type === 'zernio_publish' && payload) {
    return `${payload.platform ?? 'Social'} • published`
  }

  return action.status.replace('_', ' ')
}

function ContentCopilotPage() {
  const apiUrl = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:5000', [])
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<CopilotSession[]>([])
  const [activeSession, setActiveSession] = useState<CopilotSession | null>(null)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const loadSessions = async () => {
    setIsFetching(true)
    setError('')

    try {
      const response = await fetch(`${apiUrl}/api/copilot/sessions`, {
        credentials: 'include',
      })
      const data = (await response.json().catch(() => ({ sessions: [] }))) as { sessions?: CopilotSession[]; message?: string }

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load Content Copilot history')
      }

      const loadedSessions = data.sessions ?? []
      setSessions(loadedSessions)
      setActiveSession((current) => current || loadedSessions[0] || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Content Copilot history')
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    void loadSessions()
  }, [apiUrl])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [activeSession?.messages.length])

  const sendMessage = async (content: string) => {
    const trimmed = content.trim()

    if (!trimmed) {
      return
    }

    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${apiUrl}/api/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: trimmed,
          sessionId: activeSession?.id,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as CopilotResponse

      if (!response.ok || !data.session) {
        throw new Error(data.message || 'Unable to reach Content Copilot')
      }

      setActiveSession(data.session)
      setSessions((current) => {
        const withoutCurrent = current.filter((session) => session.id !== data.session?.id)
        return [data.session as CopilotSession, ...withoutCurrent]
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach Content Copilot')
      setMessage(trimmed)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    void sendMessage(message)
  }

  const startNewChat = () => {
    setActiveSession(null)
    setMessage('')
    setError('')
  }

  const downloadCampaign = (campaign: CampaignPayload) => {
    const csv = buildCampaignCsv(campaign)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${(campaign.title || 'postpilot-campaign').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const messages = activeSession?.messages ?? []

  return (
    <div className="page-stack">
      <div className="hero-panel agent-hero copilot-hero">
        <div>
          <p className="eyebrow">AI Content Copilot</p>
          <h2>Plan, generate, schedule, publish, and automate from one prompt.</h2>
          <p>Ask Copilot to create campaigns, draft posts, schedule content, publish through Zernio, inspect analytics, or build automation workflows.</p>
        </div>
        <button className="primary-btn" type="button" onClick={startNewChat}>
          New chat
        </button>
      </div>

      {error ? <div className="notice-banner error">{error}</div> : null}

      <div className="agent-layout copilot-layout">
        <aside className="panel-card agent-history-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">History</p>
              <h3>Conversations</h3>
            </div>
            <button className="mini-glass-btn" type="button" onClick={startNewChat}>+</button>
          </div>

          <div className="agent-session-list copilot-session-list">
            {isFetching ? <p className="muted-copy">Loading Copilot history...</p> : null}
            {!isFetching && sessions.length === 0 ? <p className="muted-copy">No conversations yet.</p> : null}
            {sessions.map((session) => (
              <button
                key={session.id}
                className={`agent-session-item ${activeSession?.id === session.id ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveSession(session)}
              >
                <span className="session-title-row">
                  <strong>{session.title}</strong>
                  <small>{formatHistoryDate(session.updatedAt)}</small>
                </span>
                <span>{latestPreview(session)}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="panel-card agent-chat-card">
          <div className="agent-chat-window" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="agent-empty-state">
                <span>✧</span>
                <h3>Tell Copilot what outcome you want.</h3>
                <p>Use natural language for full workflows, from a 30-day campaign to a scheduled post or a publish-ready launch.</p>
              </div>
            ) : null}

            {messages.map((entry, index) => (
              <article key={`${entry.createdAt}-${index}`} className={`agent-message ${entry.role}`}>
                <div className="agent-message-bubble">
                  <div className="agent-message-meta">
                    <span>{entry.role === 'assistant' ? 'Content Copilot' : 'You'}</span>
                    <time>{formatTime(entry.createdAt)}</time>
                  </div>
                  <p>{entry.content}</p>

                  {entry.actions?.length ? (
                    <>
                      <div className="agent-action-grid">
                        {entry.actions.map((action, actionIndex) => (
                          <div key={`${action.type}-${actionIndex}`} className={`agent-action-card ${action.status}`}>
                            <span>{actionLabels[action.type] || 'Action'}</span>
                            <strong>{action.label}</strong>
                            <small>{describeAction(action)}</small>
                          </div>
                        ))}
                      </div>

                      <div className="copilot-output-stack">
                        {entry.actions.map((action, actionIndex) => (
                          <CopilotActionOutput
                            key={`${action.type}-output-${actionIndex}`}
                            action={action}
                            onDownloadCampaign={downloadCampaign}
                          />
                        ))}
                      </div>

                      <div className="copilot-action-bar">
                        <button type="button" onClick={() => navigate('/dashboard/ai-studio')}>Open AI Studio</button>
                        <button type="button" onClick={() => navigate('/dashboard/posts')}>Schedule Posts</button>
                        <button type="button" onClick={() => navigate('/dashboard/posts')}>Publish Later</button>
                        {entry.actions.some((action) => action.type === 'campaign' && toCampaignPayload(action.data)?.ideas?.length) ? (
                          <button
                            type="button"
                            onClick={() => {
                              const campaign = entry.actions?.map((action) => toCampaignPayload(action.data)).find((payload) => payload?.ideas?.length)
                              if (campaign) {
                                downloadCampaign(campaign)
                              }
                            }}
                          >
                            Download Campaign
                          </button>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              </article>
            ))}

            {isLoading ? (
              <article className="agent-message assistant">
                <div className="agent-message-bubble agent-thinking">
                  <span className="btn-spinner" aria-hidden="true" />
                  <p>Copilot is orchestrating your content system...</p>
                </div>
              </article>
            ) : null}
          </div>

          <div className="agent-quick-prompts">
            {quickPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => void sendMessage(prompt)} disabled={isLoading}>
                {prompt}
              </button>
            ))}
          </div>

          <form className="agent-composer" onSubmit={handleSubmit}>
            <textarea
              rows={3}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask Copilot to create, schedule, publish, analyze, or automate..."
            />
            <button className="primary-btn" type="submit" disabled={isLoading || !message.trim()}>
              {isLoading ? 'Working' : 'Send'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}

function CopilotActionOutput({
  action,
  onDownloadCampaign,
}: {
  action: CopilotAction
  onDownloadCampaign: (campaign: CampaignPayload) => void
}) {
  if (action.type === 'campaign') {
    const campaign = toCampaignPayload(action.data)

    if (!campaign) {
      return null
    }

    const ideas = campaign.ideas ?? []

    return (
      <section className="copilot-rich-output">
        <div className="copilot-output-header">
          <div>
            <p className="eyebrow">Campaign summary</p>
            <h4>{campaign.title || 'Generated campaign'}</h4>
            <p>{campaign.objective || 'A complete social campaign is ready to review.'}</p>
          </div>
          <button type="button" onClick={() => onDownloadCampaign(campaign)}>Download CSV</button>
        </div>

        <div className="copilot-summary-grid">
          <span><strong>{campaign.durationDays ?? ideas.length}</strong> days</span>
          <span><strong>{ideas.length}</strong> ideas</span>
          <span><strong>{(campaign.platforms ?? []).join(', ') || 'Multi-platform'}</strong> platforms</span>
        </div>

        <div className="copilot-calendar-list">
          {ideas.slice(0, 30).map((idea, index) => (
            <article key={idea.id || `${idea.day}-${index}`}>
              <div>
                <span>Day {idea.day ?? index + 1}</span>
                <strong>{idea.title || 'Content idea'}</strong>
                <p>{idea.caption || 'Caption direction will appear here.'}</p>
                <small>{(idea.hashtags ?? []).join(' ')}</small>
              </div>
              <aside>
                <b>{idea.platform || 'Platform'}</b>
                <span>{idea.format || 'Post'}</span>
                <small>{formatDate(idea.date)} • {idea.bestTime || 'Best time'}</small>
              </aside>
            </article>
          ))}
        </div>
      </section>
    )
  }

  if (action.type === 'ai_studio') {
    const output = toAIStudioPayload(action.data)

    if (!output) {
      return null
    }

    return (
      <section className="copilot-rich-output compact">
        <div className="copilot-ai-output">
          {output.imageUrl ? <img src={output.imageUrl} alt="Generated thumbnail" /> : null}
          <div>
            <p className="eyebrow">Generated post</p>
            <h4>Caption draft</h4>
            <p>{output.caption || 'Caption generated.'}</p>
            {output.hashtags?.length ? <small>{output.hashtags.join(' ')}</small> : null}
            {output.ctaSuggestions?.length ? (
              <div className="copilot-cta-list">
                {output.ctaSuggestions.map((cta) => <span key={cta}>{cta}</span>)}
              </div>
            ) : null}
            {output.usedFallback ? <em>Fallback content was used for this draft.</em> : null}
          </div>
        </div>
      </section>
    )
  }

  if (action.type === 'scheduler') {
    const scheduled = toSchedulerPayload(action.data)

    return (
      <section className="copilot-rich-output compact">
        <p className="eyebrow">Scheduling plan</p>
        <h4>{scheduled?.title || action.label}</h4>
        <p>{scheduled?.platform || 'Selected platform'} content is marked as {scheduled?.status || 'scheduled'}.</p>
        {scheduled?.scheduledAt ? <small>{new Date(scheduled.scheduledAt).toLocaleString()}</small> : null}
      </section>
    )
  }

  if (action.type === 'automation') {
    const workflow = toAutomationPayload(action.data)

    return (
      <section className="copilot-rich-output compact">
        <p className="eyebrow">Automation workflow</p>
        <h4>{workflow?.name || action.label}</h4>
        <p>{workflow?.description || 'Workflow created for this content operation.'}</p>
        <div className="copilot-workflow-steps">
          {(workflow?.actions ?? []).map((step, index) => (
            <span key={`${step.type}-${index}`}>{index + 1}. {step.type || 'Action'}</span>
          ))}
        </div>
      </section>
    )
  }

  if (action.type === 'zernio_publish') {
    return (
      <section className="copilot-rich-output compact">
        <p className="eyebrow">Publishing</p>
        <h4>{action.status === 'completed' ? 'Publish request completed' : 'Publishing needs attention'}</h4>
        <p>{action.label}</p>
      </section>
    )
  }

  return null
}

export default ContentCopilotPage
