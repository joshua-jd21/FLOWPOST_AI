import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { applyThemePreference, type ThemePreference } from '../../utils/theme'

type Settings = {
  theme: ThemePreference
  emailNotifications: boolean
  weeklyDigest: boolean
  productUpdates: boolean
}

type ProviderKey = 'linkedin' | 'x' | 'instagram'

type ProviderStatus = {
  provider: ProviderKey
  label: string
  configured: boolean
  status: 'connected' | 'disconnected' | 'needs_reauth'
  account: { accountName: string } | null
}

const defaultSettings: Settings = {
  theme: 'dark',
  emailNotifications: true,
  weeklyDigest: true,
  productUpdates: false,
}

function SettingsPage() {
  const apiUrl = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:5000', [])
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [accounts, setAccounts] = useState<ProviderStatus[]>([])
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeProvider, setActiveProvider] = useState<ProviderKey | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadSettings = async () => {
    setIsLoading(true)
    setError('')

    try {
      const [settingsResponse, accountsResponse] = await Promise.all([
        fetch(`${apiUrl}/api/users/settings`, { credentials: 'include' }),
        fetch(`${apiUrl}/api/social/accounts`, { credentials: 'include' }),
      ])
      const settingsData = (await settingsResponse.json().catch(() => ({}))) as { settings?: Settings; message?: string }
      const accountsData = (await accountsResponse.json().catch(() => ({ accounts: [] }))) as { accounts?: ProviderStatus[]; message?: string }

      if (!settingsResponse.ok) {
        throw new Error(settingsData.message || 'Unable to load settings')
      }

      if (!accountsResponse.ok) {
        throw new Error(accountsData.message || 'Unable to load connected accounts')
      }

      setSettings(settingsData.settings ?? defaultSettings)
      applyThemePreference(settingsData.settings?.theme ?? defaultSettings.theme)
      setAccounts(accountsData.accounts ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadSettings()
  }, [apiUrl])

  const saveSettings = async (nextSettings: Settings = settings, successMessage = 'Settings saved.') => {
    setIsSaving(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${apiUrl}/api/users/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(nextSettings),
      })
      const data = (await response.json().catch(() => ({}))) as { settings?: Settings; message?: string }

      if (!response.ok || !data.settings) {
        throw new Error(data.message || 'Unable to save settings')
      }

      setSettings(data.settings)
      applyThemePreference(data.settings.theme)
      setMessage(successMessage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setMessage('')

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setError('New passwords do not match.')
      setIsSaving(false)
      return
    }

    try {
      const response = await fetch(`${apiUrl}/api/users/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(passwordForm),
      })
      const data = (await response.json().catch(() => ({}))) as { message?: string }

      if (!response.ok) {
        throw new Error(data.message || 'Unable to change password')
      }

      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
      setMessage(data.message || 'Password updated successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change password')
    } finally {
      setIsSaving(false)
    }
  }

  const disconnectAccount = async (provider: ProviderKey) => {
    setActiveProvider(provider)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${apiUrl}/api/social/accounts/${provider}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = (await response.json().catch(() => ({}))) as { message?: string }

      if (!response.ok) {
        throw new Error(data.message || 'Unable to disconnect account')
      }

      setMessage('Account disconnected.')
      await loadSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to disconnect account')
    } finally {
      setActiveProvider(null)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const toggleSetting = (key: keyof Omit<Settings, 'theme'>) => {
    setSettings((value) => ({ ...value, [key]: !value[key] }))
  }

  const updateTheme = async (theme: ThemePreference) => {
    const nextSettings = { ...settings, theme }
    setSettings(nextSettings)
    applyThemePreference(theme)
    await saveSettings(nextSettings, `${theme[0].toUpperCase()}${theme.slice(1)} theme saved.`)
  }

  return (
    <div className="page-stack">
      <div className="hero-panel">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Control your creator workspace.</h2>
          <p>Manage preferences, notifications, password security, integrations, and session access.</p>
        </div>
        <button className="ghost-btn" type="button" onClick={() => void handleLogout()}>
          Logout
        </button>
      </div>

      {message ? <div className="notice-banner success">{message}</div> : null}
      {error ? <div className="notice-banner error">{error}</div> : null}

      <div className="settings-grid">
        <section className="panel-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Appearance</p>
              <h3>Theme preference</h3>
            </div>
          </div>

          <div className="settings-segmented">
            {(['dark', 'dim', 'system'] as const).map((theme) => (
              <button key={theme} className={settings.theme === theme ? 'active' : ''} type="button" onClick={() => void updateTheme(theme)}>
                {theme[0].toUpperCase() + theme.slice(1)}
              </button>
            ))}
          </div>
          <p className="muted-copy">Theme preference is saved to your account. The current premium dark UI remains the default experience.</p>
        </section>

        <section className="panel-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Notifications</p>
              <h3>Publishing alerts</h3>
            </div>
          </div>

          <div className="settings-toggle-list">
            {[
              ['emailNotifications', 'Email notifications', 'Receive important workspace and account emails.'],
              ['weeklyDigest', 'Weekly digest', 'Summarize performance and AI activity each week.'],
              ['productUpdates', 'Product updates', 'Hear about new PostPilot features.'],
            ].map(([key, label, description]) => (
              <button key={key} className="settings-toggle-item" type="button" onClick={() => toggleSetting(key as keyof Omit<Settings, 'theme'>)}>
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <i className={settings[key as keyof Omit<Settings, 'theme'>] ? 'on' : ''} />
              </button>
            ))}
          </div>

          <button className="primary-btn" type="button" onClick={() => void saveSettings()} disabled={isSaving || isLoading}>
            {isSaving ? 'Saving' : 'Save preferences'}
          </button>
        </section>

        <section className="panel-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Security</p>
              <h3>Change password</h3>
            </div>
          </div>

          <form className="ai-form" onSubmit={changePassword}>
            <label>
              <span>Current password</span>
              <input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((value) => ({ ...value, currentPassword: event.target.value }))} />
            </label>
            <label>
              <span>New password</span>
              <input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((value) => ({ ...value, newPassword: event.target.value }))} />
            </label>
            <label>
              <span>Confirm new password</span>
              <input
                type="password"
                value={passwordForm.confirmNewPassword}
                onChange={(event) => setPasswordForm((value) => ({ ...value, confirmNewPassword: event.target.value }))}
              />
            </label>
            <button
              className="ghost-btn"
              type="submit"
              disabled={
                isSaving ||
                passwordForm.currentPassword.length < 6 ||
                passwordForm.newPassword.length < 6 ||
                passwordForm.confirmNewPassword.length < 6 ||
                passwordForm.newPassword !== passwordForm.confirmNewPassword
              }
            >
              Update password
            </button>
          </form>
        </section>

        <section className="panel-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Integrations</p>
              <h3>Connected accounts</h3>
            </div>
            <button className="ghost-btn" type="button" onClick={() => navigate('/dashboard/connected-accounts')}>
              Manage
            </button>
          </div>

          <div className="settings-account-list">
            {accounts.map((account) => (
              <div key={account.provider} className="profile-account-item">
                <div>
                  <strong>{account.label}</strong>
                  <span>{account.account?.accountName || 'Not connected'}</span>
                </div>
                {account.status === 'connected' ? (
                  <button className="ghost-btn" type="button" onClick={() => void disconnectAccount(account.provider)} disabled={activeProvider === account.provider}>
                    {activeProvider === account.provider ? 'Disconnecting' : 'Disconnect'}
                  </button>
                ) : (
                  <span className={`status-pill ${account.status}`}>{account.status.replace('_', ' ')}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default SettingsPage
