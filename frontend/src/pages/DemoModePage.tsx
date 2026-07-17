import { Link } from 'react-router-dom'
import PostPilotLogo from '../components/PostPilotLogo'

const demoPosts = [
  { title: 'Founder story carousel', platform: 'Instagram', time: 'Today, 6:30 PM', status: 'Scheduled' },
  { title: 'Launch lessons thread', platform: 'X', time: 'Tomorrow, 9:30 AM', status: 'Draft' },
  { title: 'Product launch POV', platform: 'LinkedIn', time: 'Friday, 8:30 AM', status: 'Ready' },
]

const demoCampaign = [
  'Teaser reel: the pain point',
  'Carousel: three launch lessons',
  'LinkedIn post: founder narrative',
  'X poll: audience priority',
]

function DemoModePage() {
  return (
    <main className="demo-shell">
      <nav className="landing-nav">
        <Link className="brand-lockup landing-brand" to="/">
          <PostPilotLogo />
          <span>
            <span className="brand-title">PostPilot AI</span>
            <span className="brand-subtitle">Demo mode</span>
          </span>
        </Link>
        <div className="landing-nav-actions">
          <Link className="ghost-btn" to="/login">Log in</Link>
          <Link className="primary-btn" to="/signup">Create account</Link>
        </div>
      </nav>

      <section className="demo-hero">
        <div>
          <p className="eyebrow">Sample creator workspace</p>
          <h1>Explore PostPilot AI with launch-ready sample data.</h1>
          <p>This preview shows how campaigns, AI drafts, scheduling, analytics, and automation fit together before connecting real accounts.</p>
        </div>
      </section>

      <section className="demo-grid">
        <article className="panel-card demo-card demo-card-wide">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Copilot prompt</p>
              <h3>Publish my product launch campaign.</h3>
            </div>
            <span className="status-pill connected">Demo</span>
          </div>
          <div className="agent-action-grid">
            {['Campaign generated', 'Posts scheduled', 'Brand voice applied', 'Zernio ready'].map((item) => (
              <div className="agent-action-card completed" key={item}>
                <span>Workflow</span>
                <strong>{item}</strong>
                <small>Sample data</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card demo-card">
          <p className="eyebrow">Upcoming posts</p>
          <div className="activity-list">
            {demoPosts.map((post) => (
              <div className="activity-item" key={post.title}>
                <div className="activity-dot" />
                <div>
                  <p>{post.title}</p>
                  <span>{post.platform} - {post.time} - {post.status}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card demo-card">
          <p className="eyebrow">Campaign plan</p>
          <div className="demo-campaign-list">
            {demoCampaign.map((item, index) => (
              <div key={item}>
                <span>Day {index + 1}</span>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  )
}

export default DemoModePage
