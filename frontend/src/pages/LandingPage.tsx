import { Link } from 'react-router-dom'
import PostPilotLogo from '../components/PostPilotLogo'

const modules = [
  'AI Content Copilot',
  'Scheduler',
  'Analytics',
  'Zernio publishing',
]

const proofCards = [
  { label: '30-day campaign', value: 'Generated' },
  { label: 'Connected channels', value: '4' },
  { label: 'Automation workflows', value: 'Live' },
]

function LandingPage() {
  return (
    <main className="landing-shell">
      <nav className="landing-nav">
        <Link className="brand-lockup landing-brand" to="/">
          <PostPilotLogo />
          <span>
            <span className="brand-title">PostPilot AI</span>
            <span className="brand-subtitle">Creator SaaS</span>
          </span>
        </Link>
        <div className="landing-nav-actions">
          <Link className="ghost-btn" to="/demo">Demo</Link>
          <Link className="primary-btn" to="/signup">Start free</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow">AI social media operating system</p>
          <h1>Plan, create, schedule, and publish campaigns from one premium workspace.</h1>
          <p>
            PostPilot AI brings content strategy, brand voice, AI generation, campaign planning,
            analytics, connected accounts, and automation into a single creator command center.
          </p>
          <div className="landing-cta-row">
            <Link className="primary-btn" to="/signup">Create workspace</Link>
            <Link className="ghost-btn" to="/demo">View sample workspace</Link>
          </div>
        </div>

        <div className="landing-preview" aria-label="PostPilot AI workspace preview">
          <div className="preview-toolbar">
            <span />
            <span />
            <span />
          </div>
          <div className="preview-grid">
            <div className="preview-card preview-card-wide">
              <p className="eyebrow">Copilot</p>
              <h3>Create a 30-day Instagram launch plan.</h3>
              <div className="preview-progress">
                <span style={{ width: '86%' }} />
              </div>
            </div>
            {proofCards.map((card) => (
              <div className="preview-card" key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div>
          <p className="eyebrow">Built for full-funnel content work</p>
          <h2>Every module works together.</h2>
        </div>
        <div className="landing-module-grid">
          {modules.map((module) => (
            <article className="landing-module-card" key={module}>
              <span>{module.slice(0, 1)}</span>
              <h3>{module}</h3>
              <p>Connected to your workspace data, brand context, and publishing flow.</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default LandingPage
