import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PostPilotLogo from '../components/PostPilotLogo'
import { useAuth } from '../context/AuthContext'
import './AuthPage.css'

type AuthMode = 'login' | 'signup'

type FormState = {
  name: string
  email: string
  password: string
}

type FormErrors = Partial<Record<keyof FormState | 'general', string>>

const initialState: FormState = {
  name: '',
  email: '',
  password: '',
}

function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState<FormState>(initialState)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = () => {
    const nextErrors: FormErrors = {}

    if (mode === 'signup' && form.name.trim().length < 2) {
      nextErrors.name = 'Name must be at least 2 characters'
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = 'Please enter a valid email address'
    }

    if (form.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login'
    const payload = mode === 'signup' ? form : { email: form.email, password: form.password }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({ message: 'Authentication failed' }))

      if (!response.ok) {
        setErrors({ general: data.message || 'Authentication failed' })
        return
      }

      login(data.user)
      navigate('/dashboard', { replace: true })
    } catch {
      setErrors({ general: 'Unable to reach PostPilot AI. Please check your connection and try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-showcase">
        <div className="brand-lockup">
          <PostPilotLogo />
          <div>
            <p className="brand-title">PostPilot AI</p>
            <p className="brand-subtitle">AI social media command center</p>
          </div>
        </div>

        <div className="auth-showcase-copy">
          <p className="eyebrow">Premium creator OS</p>
          <h2>The AI Operating System for Social Media.</h2>
          <h3>Generate. Schedule. Publish. Automate. Scale.</h3>
          <p>
            Create AI-powered social media campaigns, connect your accounts securely, automate
            publishing, and manage your entire social media workflow from one premium workspace.
          </p>
        </div>

        <div className="auth-platforms" aria-label="Supported social platforms">
          <span className="platform-icon instagram" aria-label="Instagram">IG</span>
          <span className="platform-icon linkedin" aria-label="LinkedIn">in</span>
          <span className="platform-icon x" aria-label="X">X</span>
          <span className="platform-icon facebook" aria-label="Facebook">f</span>
          <span className="platform-icon youtube" aria-label="YouTube">▶</span>
        </div>

          <div className="auth-metrics auth-highlights">
            <div>
              <strong>AI Studio</strong>
              <span>Generate captions and thumbnails instantly.</span>
            </div>
            <div>
              <strong>Posts</strong>
              <span>Create, schedule, and manage every post.</span>
            </div>
            <div>
              <strong>Connected Accounts</strong>
              <span>Securely connect and manage social media platforms.</span>
            </div>
            <div>
              <strong>Analytics</strong>
              <span>Track performance, publishing momentum, and content health.</span>
            </div>
          </div>
      </section>
      <div className="auth-card">
        <div className="auth-hero">
          <div className="auth-badge">{mode === 'login' ? 'Creator login' : 'Creator access'}</div>
          <h1>{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h1>
          <p>
            {mode === 'login'
              ? 'Return to your AI-powered social workspace.'
              : 'Start building your AI-powered publishing system.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {errors.general && <div role="alert">{errors.general}</div>}

          {mode === 'signup' && (
            <label>
              <span>Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Alex Morgan"
              />
              {errors.name && <small>{errors.name}</small>}
            </label>
          )}

          <label>
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="you@example.com"
            />
            {errors.email && <small>{errors.email}</small>}
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="••••••••"
            />
            {errors.password && <small>{errors.password}</small>}
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <p className="auth-link">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <Link to={mode === 'login' ? '/signup' : '/login'}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </Link>
        </p>
        <p className="auth-link auth-secondary-link">
          <Link to="/demo">Explore demo mode</Link>
        </p>
      </div>
    </div>
  )
}

export default AuthPage
