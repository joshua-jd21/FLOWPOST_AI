import { useNavigate } from 'react-router-dom'

const onboardingSteps = [
  {
    title: 'Review your dashboard',
    detail: 'Check your workspace summary, activity, and recent publishing signals.',
    action: 'Open Dashboard',
    to: '/dashboard',
  },
  {
    title: 'Connect publishing channels',
    detail: 'Prepare LinkedIn, Instagram, X, and Facebook connections through Zernio.',
    action: 'Manage accounts',
    to: '/dashboard/connected-accounts',
  },
  {
    title: 'Create content in AI Studio',
    detail: 'Generate captions, hashtags, CTAs, and thumbnails from a single prompt.',
    action: 'Open AI Studio',
    to: '/dashboard/ai-studio',
  },
  {
    title: 'Schedule posts',
    detail: 'Use the Posts module to create drafts, queue content, and publish later.',
    action: 'Open Posts',
    to: '/dashboard/posts',
  },
]

function OnboardingPage() {
  const navigate = useNavigate()

  return (
    <div className="page-stack">
      <div className="hero-panel onboarding-hero">
        <div>
          <p className="eyebrow">Workspace onboarding</p>
          <h2>Set up a production-ready content system.</h2>
          <p>Complete these foundation steps to get better AI outputs, cleaner scheduling, and safer publishing.</p>
        </div>
        <button className="primary-btn" type="button" onClick={() => navigate('/dashboard/content-copilot')}>
          Ask Copilot
        </button>
      </div>

      <section className="onboarding-grid">
        {onboardingSteps.map((step, index) => (
          <article className="panel-card onboarding-card" key={step.title}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h3>{step.title}</h3>
            <p>{step.detail}</p>
            <button className="ghost-btn" type="button" onClick={() => navigate(step.to)}>
              {step.action}
            </button>
          </article>
        ))}
      </section>
    </div>
  )
}

export default OnboardingPage
